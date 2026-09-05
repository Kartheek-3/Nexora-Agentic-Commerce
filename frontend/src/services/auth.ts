import { GoogleAuthProvider, createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut, type User } from "firebase/auth";
import { auth } from "../lib/firebase";

function requireAuth() {
  if (!auth) {
    throw new Error("Firebase is not configured. Provide frontend Firebase environment variables or use demo mode.");
  }
  return auth;
}

export function loginWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(requireAuth(), email, password);
}

export function registerWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(requireAuth(), email, password);
}

export function loginWithGoogle() {
  return signInWithPopup(requireAuth(), new GoogleAuthProvider());
}

export function resetPassword(email: string) {
  return sendPasswordResetEmail(requireAuth(), email);
}

export function logout() {
  return signOut(requireAuth());
}

export function getCurrentUser() {
  return auth?.currentUser ?? null;
}

export async function waitForAuthReady() {
  if (!auth) return null;
  const currentAuth = auth;
  if ("authStateReady" in currentAuth && typeof currentAuth.authStateReady === "function") {
    await currentAuth.authStateReady();
    return currentAuth.currentUser;
  }
  if (currentAuth.currentUser) return currentAuth.currentUser;
  return new Promise<User | null>((resolve) => {
    const unsubscribe = onAuthStateChanged(currentAuth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

export async function getCurrentIdToken(forceRefresh = false) {
  console.log("[auth-api] auth ready");
  const user = await waitForAuthReady();
  console.log("[auth-api] Firebase user present:", Boolean(user));
  console.log("[auth-api] user uid present:", Boolean(user?.uid));
  if (!user) {
    throw new Error("Authentication required.");
  }
  console.log("[auth-api] requesting ID token");
  const token = await user.getIdToken(forceRefresh);
  console.log("[auth-api] ID token obtained:", Boolean(token));
  if (!token) {
    throw new Error("Authentication token unavailable.");
  }
  return token;
}

export function observeAuthState(callback: (user: User | null) => void) {
  if (!auth) return () => undefined;
  return onAuthStateChanged(auth, callback);
}

export function mapFirebaseError(error: unknown) {
  if (error instanceof Error && error.message.includes("Firebase is not configured")) return error.message;
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
  if (code === "auth/invalid-email") return "Enter a valid email address.";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") return "Incorrect email or password.";
  if (code === "auth/email-already-in-use") return "An account already exists with this email.";
  if (code === "auth/weak-password") return "Use at least 6 characters for your password.";
  if (code === "auth/popup-closed-by-user") return "Google sign-in was cancelled.";
  if (code === "auth/popup-blocked") return "Your browser blocked the Google sign-in popup.";
  if (code === "auth/network-request-failed") return "Network error. Check your connection and try again.";
  if (code === "auth/configuration-not-found") return "Firebase sign-in method is not enabled for this project.";
  return "Authentication failed. Please try again.";
}
