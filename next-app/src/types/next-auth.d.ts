import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
      onboardingCompleted: boolean;
      bio: string | null;
    };
  }

  interface User {
    onboardingCompleted?: boolean;
    bio?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    onboardingCompleted: boolean;
    bio: string | null;
  }
}
