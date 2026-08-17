import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// NOTE: these must match the variable names in your .env file exactly.
// The previous version read VITE_STORAGE_BUCKET / VITE_MESSAGING_SENDER_ID /
// VITE_APP_ID / VITE_MEASUREMENT_ID, but the actual .env defines
// VITE_FIREBASE_STORAGE_BUCKET / VITE_FIREBASE_MESSAGING_SENDER_ID /
// VITE_FIREBASE_APP_ID / VITE_FIREBASE_MEASUREMENT_ID — so those four
// fields were silently undefined in production. apiKey/authDomain/projectId
// happened to be named consistently, which is why auth and Firestore still
// worked; but Analytics and anything touching Firebase Storage would not.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// IMPORTANT: every read/write of DSR entries anywhere in the app must
// import this constant rather than hardcoding a path. The previous
// version had the CSV importer writing to a different, nested path
// (artifacts/{appId}/users/{uid}/dsr_entries) than everything else
// (dsr_entries), so imported data silently never showed up.
export const ENTRIES_COLLECTION = 'dsr_entries';
