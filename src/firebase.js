import { initializeApp, getApps, deleteApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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

export const ENTRIES_COLLECTION = 'dsr_entries';
export const INVENTORY_MASTER_COLLECTION = 'inventory_master';
export const INVENTORY_DAILY_COLLECTION = 'inventory_daily_records';
export const USERS_COLLECTION = 'users';
export const APP_CONFIG_COLLECTION = 'app_config';

// Creating another person's account with the normal client SDK
// (createUserWithEmailAndPassword) automatically signs the CURRENT
// browser in as that new account, kicking the Owner out of their own
// session — a well-known quirk of the Firebase client SDK with no
// Cloud Functions/Admin SDK involved. Spinning up a second, disposable
// Firebase app instance for account-creation calls only means the
// primary `auth` above (the Owner's real session) is never touched.
// Call disposeSecondaryAuth() once the create/reset-email call is done.
const SECONDARY_APP_NAME = 'secondary-account-creation';

export function getSecondaryAuth() {
  const existing = getApps().find(a => a.name === SECONDARY_APP_NAME);
  const secondaryApp = existing || initializeApp(firebaseConfig, SECONDARY_APP_NAME);
  return getAuth(secondaryApp);
}

export async function disposeSecondaryAuth() {
  const existing = getApps().find(a => a.name === SECONDARY_APP_NAME);
  if (existing) await deleteApp(existing);
}