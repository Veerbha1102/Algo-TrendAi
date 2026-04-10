import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBW-Acv-UjsM1CjA1jNje0EdByhSciFkko",
  authDomain: "algopilot-3940a.firebaseapp.com",
  projectId: "algopilot-3940a",
  storageBucket: "algopilot-3940a.firebasestorage.app",
  messagingSenderId: "902062891754",
  appId: "1:902062891754:web:9f13ea21a8f11899fd6d93",
  measurementId: "G-25CGZGFJ6V"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Analytics is only available in browser
export const initAnalytics = () => {
  if (typeof window !== "undefined") {
    return getAnalytics(app);
  }
  return null;
};
