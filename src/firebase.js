import { initializeApp, getApps, deleteApp } from "firebase/app";
import { getAuth, setPersistence, inMemoryPersistence } from "firebase/auth";
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

// Surfaced in the UI (login screen + permission-error screen) so anyone
// can confirm at a glance which Firebase project this deployed build is
// actually talking to, without opening DevTools. A "rules are published
// and correct, but I still get permission-denied" report almost always
// means this ID doesn't match the project the rules were published to
// (e.g. a stale/incorrect VITE_FIREBASE_PROJECT_ID in the host's
// environment variables).
export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;

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
//
// Critically, this secondary instance points at the SAME Firebase
// project/API key as the primary one, so by default both can end up
// sharing the browser's persisted auth storage (localStorage/IndexedDB)
// — meaning a sign-in on the secondary instance can still bleed into,
// or knock out, the primary instance's session. Forcing the secondary
// instance to in-memory-only persistence keeps it fully isolated: it
// never touches shared browser storage, so it can't affect the Owner's
// real session no matter what it does. Skipping this was the actual
// cause of "Missing or insufficient permissions" on the Firestore write
// right after account creation — the Auth account got created fine, but
// by the time the code wrote to Firestore, the browser was no longer
// reliably authenticated as the Owner.
//
// Call disposeSecondaryAuth() once the create/reset-email call is done.
const SECONDARY_APP_NAME = 'secondary-account-creation';

export async function getSecondaryAuth() {
  const existing = getApps().find(a => a.name === SECONDARY_APP_NAME);
  const secondaryApp = existing || initializeApp(firebaseConfig, SECONDARY_APP_NAME);
  const secondaryAuth = getAuth(secondaryApp);
  await setPersistence(secondaryAuth, inMemoryPersistence);
  return secondaryAuth;
}

export async function disposeSecondaryAuth() {
  const existing = getApps().find(a => a.name === SECONDARY_APP_NAME);
  if (existing) await deleteApp(existing);
}