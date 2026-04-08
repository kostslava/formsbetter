import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyADgT9wFdca22Br1j--Q6RnJW3JCpgvr6Q",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "pontune.site",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "gooningproject",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "gooningproject.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1002954461696",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1002954461696:web:fac5843fd95942127abee5",
};

function isUsableFirebaseConfig(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.apiKey.startsWith("AIza") &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId
  );
}

const canInitializeFirebase =
  typeof window !== "undefined" && isUsableFirebaseConfig();

const app: FirebaseApp | null = canInitializeFirebase
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

export const firebaseAuth = app ? getAuth(app) : null;
export const googleProvider = app ? new GoogleAuthProvider() : null;

if (googleProvider) {
  googleProvider.setCustomParameters({ prompt: "select_account" });
}
