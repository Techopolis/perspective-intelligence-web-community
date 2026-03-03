"use client";

import {
  createContext,
  useContext,
  useCallback,
  ReactNode,
} from "react";
import { SessionProvider, useSession, signIn, signOut as nextAuthSignOut } from "next-auth/react";

export interface DbUser {
  id: string;
  name: string;
  email: string;
  pictureUrl: string | null;
  bio: string | null;
  createdAt: string;
}

interface AuthContextType {
  user: {
    id: string;
    email: string;
    name: string;
    image?: string | null;
    onboardingCompleted: boolean;
    bio: string | null;
  } | null;
  dbUser: DbUser | null;
  loading: boolean;
  signInWithApple: () => Promise<{ error: Error | null }>;
  signInWithEmail: (
    email: string,
    password: string
  ) => Promise<{ error: Error | null }>;
  signUpWithEmail: (
    email: string,
    password: string
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthContextProvider({ children }: { children: ReactNode }) {
  const { data: session, status, update } = useSession();
  const loading = status === "loading";

  const user = session?.user ?? null;

  // Map session user to DbUser shape for backward compat
  const dbUser: DbUser | null = user
    ? {
        id: user.id,
        name: user.name ?? "",
        email: user.email ?? "",
        pictureUrl: user.image ?? null,
        bio: user.bio ?? null,
        createdAt: "",
      }
    : null;

  const handleSignInWithApple = useCallback(async () => {
    try {
      await signIn("apple", { redirectTo: "/chat" });
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  const handleSignInWithEmail = useCallback(
    async (email: string, password: string) => {
      try {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          return { error: new Error(result.error) };
        }

        return { error: null };
      } catch (error) {
        return { error: error as Error };
      }
    },
    []
  );

  const handleSignUpWithEmail = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
          const data = await res.json();
          return { error: new Error(data.error || "Registration failed") };
        }

        // Auto sign-in after registration
        const signInResult = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (signInResult?.error) {
          return { error: new Error(signInResult.error) };
        }

        return { error: null };
      } catch (error) {
        return { error: error as Error };
      }
    },
    []
  );

  const handleSignOut = useCallback(async () => {
    try {
      await nextAuthSignOut({ redirectTo: "/login" });
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  const refreshUser = useCallback(async () => {
    await update();
  }, [update]);

  return (
    <AuthContext.Provider
      value={{
        user,
        dbUser,
        loading,
        signInWithApple: handleSignInWithApple,
        signInWithEmail: handleSignInWithEmail,
        signUpWithEmail: handleSignUpWithEmail,
        signOut: handleSignOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthContextProvider>{children}</AuthContextProvider>
    </SessionProvider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
