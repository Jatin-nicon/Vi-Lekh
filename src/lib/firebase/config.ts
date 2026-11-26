import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, GoogleAuthProvider, type Auth } from "firebase/auth";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo-vilekh.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-vilekh",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "demo-vilekh.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:000000000000:web:demo",
};

// Next.js client-safe singleton initialization
const existingApps = getApps();
const app: FirebaseApp = existingApps.length > 0 ? existingApps[0] : initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Configure Google provider prompts
googleProvider.setCustomParameters({
  prompt: "select_account",
});

const isProd = process.env.NODE_ENV === "production";
const wantsEmulator =
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true" ||
  firebaseConfig.projectId.startsWith("demo-") ||
  !process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

if (!isProd && wantsEmulator && typeof window !== "undefined") {
  try {
    const emulatorHost =
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || "http://127.0.0.1:9099";
    connectAuthEmulator(auth, emulatorHost, { disableWarnings: true });
  } catch {
    // connectAuthEmulator throws if already connected in hot-reload; safe to ignore
  }
}

export const isEmulator = !isProd && wantsEmulator;

export { app, auth, googleProvider };
