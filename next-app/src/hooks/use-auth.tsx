"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  User,
  onAuthChange,
  signInWithApple,
  signInWithEmail,
  signUpWithEmail,
  signOut,
  getIdToken,
  checkRedirectResult,
  refreshSession,
  getCurrentUser,
  reloadCurrentUser,
} from "@/lib/firebase/client";

export interface DbUser {
  id: string;
  name: string;
  email: string;
  pictureUrl: string | null;
  bio: string | null;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  dbUser: DbUser | null;
  loading: boolean;
  signInWithApple: () => Promise<{ user: User | null; error: Error | null }>;
  signInWithEmail: (
    email: string,
    password: string
  ) => Promise<{ user: User | null; error: Error | null }>;
  signUpWithEmail: (
    email: string,
    password: string
  ) => Promise<{ user: User | null; error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
  getCurrentUser: () => User | null;
  refreshUser: () => Promise<void>;
  refreshDbUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    async function handleRedirectResult() {
      const { user, error } = await checkRedirectResult();
      if (error) {
        console.error("Redirect auth error:", error);
      }
      if (user) {
        const storedRedirect = sessionStorage.getItem("auth_redirect");
        sessionStorage.removeItem("auth_redirect");
        const safeRedirect =
          storedRedirect &&
          storedRedirect.startsWith("/") &&
          !storedRedirect.startsWith("//")
            ? storedRedirect
            : "/chat";
        router.push(safeRedirect);
      }
    }

    handleRedirectResult();
  }, [mounted, router]);

  useEffect(() => {
    if (!mounted) return;

    const unsubscribe = onAuthChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [mounted]);

  useEffect(() => {
    if (!mounted || !user) return;

    const refreshInterval = setInterval(() => {
      refreshSession();
    }, 30 * 60 * 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && user) {
        refreshSession();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [mounted, user]);

  const refreshUser = async () => {
    const refreshedUser = await reloadCurrentUser();
    if (refreshedUser) {
      setUser(refreshedUser);
    }
  };

  const fetchDbUser = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch("/api/users/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDbUser(data);
      }
    } catch (error) {
      console.error("Error fetching DB user:", error);
    }
  }, []);

  // Fetch DB user when Firebase user is available
  useEffect(() => {
    if (!mounted || !user) {
      setDbUser(null);
      return;
    }
    fetchDbUser();
  }, [mounted, user, fetchDbUser]);

  // Listen for profile-updated events
  useEffect(() => {
    const handler = () => fetchDbUser();
    window.addEventListener("profile-updated", handler);
    return () => window.removeEventListener("profile-updated", handler);
  }, [fetchDbUser]);

  const value: AuthContextType = {
    user,
    dbUser,
    loading,
    signInWithApple,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    getIdToken,
    getCurrentUser,
    refreshUser,
    refreshDbUser: fetchDbUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
