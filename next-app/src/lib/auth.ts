import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb, users } from "@/lib/db";

const db = getDb();

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" },

  pages: {
    signIn: "/login",
    newUser: "/onboarding",
  },

  providers: [
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        const user = await db.query.users.findFirst({
          where: eq(users.email, email.toLowerCase().trim()),
        });

        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.pictureUrl,
          onboardingCompleted: user.onboardingCompleted,
          bio: user.bio,
        };
      },
    }),

  ],

  callbacks: {
    async jwt({ token, user, trigger }) {
      // On initial sign-in, populate token from user
      if (user) {
        token.id = user.id!;
        token.onboardingCompleted = (user as { onboardingCompleted?: boolean }).onboardingCompleted ?? false;
        token.bio = (user as { bio?: string | null }).bio ?? null;
      }

      // On update trigger (e.g. after onboarding), re-fetch from DB
      if (trigger === "update" && token.id) {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, token.id as string),
        });
        if (dbUser) {
          token.name = dbUser.name;
          token.email = dbUser.email;
          token.picture = dbUser.pictureUrl;
          token.onboardingCompleted = dbUser.onboardingCompleted;
          token.bio = dbUser.bio;
        }
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.onboardingCompleted = token.onboardingCompleted as boolean;
      session.user.bio = token.bio as string | null;
      return session;
    },

    // Route protection is handled in middleware.ts
  },

});
