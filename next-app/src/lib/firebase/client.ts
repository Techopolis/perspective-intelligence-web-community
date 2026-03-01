import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getAuth,
  OAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  User,
  Auth,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let appleProvider: OAuthProvider | null = null;
let authInitialized = false;

function getFirebaseApp(): FirebaseApp {
  if (!app) {
    if (typeof window === "undefined") {
      throw new Error("Firebase can only be initialized on the client side");
    }
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
  }
  return app;
}

async function getFirebaseAuth(): Promise<Auth> {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  if (!authInitialized) {
    await setPersistence(auth, browserLocalPersistence);
    authInitialized = true;
  }
  return auth;
}

function getFirebaseAuthSync(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}

function getAppleProvider(): OAuthProvider {
  if (!appleProvider) {
    appleProvider = new OAuthProvider("apple.com");
    appleProvider.addScope("email");
    appleProvider.addScope("name");
  }
  return appleProvider;
}

function getHasSeenUser(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("__auth_seen_user") === "true";
}

function setHasSeenUser(value: boolean): void {
  if (typeof window === "undefined") return;
  if (value) {
    localStorage.setItem("__auth_seen_user", "true");
  } else {
    localStorage.removeItem("__auth_seen_user");
  }
}

export async function signInWithApple() {
  try {
    const authInstance = await getFirebaseAuth();
    const result = await signInWithPopup(authInstance, getAppleProvider());
    return { user: result.user, error: null };
  } catch (error: unknown) {
    const err = error as { code?: string };
    console.error("Apple sign-in error:", error);

    if (err.code === "auth/popup-blocked") {
      try {
        const authInstance = await getFirebaseAuth();
        await signInWithRedirect(authInstance, getAppleProvider());
        return { user: null, error: null };
      } catch (redirectError) {
        console.error("Apple redirect error:", redirectError);
        return {
          user: null,
          error: new Error("Unable to sign in. Please try again."),
        };
      }
    }
    if (err.code === "auth/popup-closed-by-user") {
      return { user: null, error: new Error("Sign-in cancelled.") };
    }

    return { user: null, error: error as Error };
  }
}

export async function signInWithEmail(email: string, password: string) {
  try {
    const authInstance = await getFirebaseAuth();
    const result = await signInWithEmailAndPassword(
      authInstance,
      email,
      password
    );
    return { user: result.user, error: null };
  } catch (error) {
    console.error("Email sign-in error:", error);
    return { user: null, error: error as Error };
  }
}

export async function signUpWithEmail(email: string, password: string) {
  try {
    const authInstance = await getFirebaseAuth();
    const result = await createUserWithEmailAndPassword(
      authInstance,
      email,
      password
    );
    return { user: result.user, error: null };
  } catch (error) {
    console.error("Email sign-up error:", error);
    return { user: null, error: error as Error };
  }
}

export async function signOut() {
  try {
    const authInstance = await getFirebaseAuth();
    await fetch("/api/auth/session", { method: "DELETE" }).catch(() => {});
    setHasSeenUser(false);
    await firebaseSignOut(authInstance);
    return { error: null };
  } catch (error) {
    console.error("Sign-out error:", error);
    return { error: error as Error };
  }
}

export async function getIdToken(
  forceRefresh = false
): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const authInstance = getFirebaseAuthSync();
  const user = authInstance.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken(forceRefresh);
  } catch (error) {
    console.error("Error getting ID token:", error);
    return null;
  }
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(getFirebaseAuthSync(), async (user) => {
    if (user) {
      setHasSeenUser(true);
      try {
        const token = await user.getIdToken();
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
      } catch (error) {
        console.error(
          "Error setting session during auth state change:",
          error
        );
      }
    } else {
      const hasSeenUserPreviously = getHasSeenUser();
      if (hasSeenUserPreviously) {
        await fetch("/api/auth/session", { method: "DELETE" }).catch(() => {});
        setHasSeenUser(false);
      }
    }
    callback(user);
  });
}

export async function refreshSession(): Promise<boolean> {
  try {
    const authInstance = getFirebaseAuthSync();
    const user = authInstance.currentUser;
    if (user) {
      const token = await user.getIdToken(true);
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      return res.ok;
    }
    return false;
  } catch (error) {
    console.error("Error refreshing session:", error);
    return false;
  }
}

export async function checkRedirectResult() {
  try {
    const authInstance = await getFirebaseAuth();
    const result = await getRedirectResult(authInstance);
    if (result?.user) {
      return { user: result.user, error: null };
    }
    return { user: null, error: null };
  } catch (error: unknown) {
    const err = error as { code?: string };
    console.error("Redirect result error:", err);

    if (err.code === "auth/null-user") {
      return { user: null, error: null };
    }

    return { user: null, error: error as Error };
  }
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  const authInstance = getFirebaseAuthSync();
  return authInstance.currentUser;
}

export async function reloadCurrentUser(): Promise<User | null> {
  const authInstance = getFirebaseAuthSync();
  const user = authInstance.currentUser;
  if (!user) return null;
  await user.reload();
  return authInstance.currentUser;
}

export type { User };
