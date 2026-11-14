import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase safely (avoid multiple initializations)
let app: FirebaseApp;
try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
} catch (e) {
  console.warn("Firebase app initialization warning:", e);
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig, "mfa-app");
}

let db: Firestore | null = null;
try {
  db = getFirestore(app);
} catch (e) {
  console.warn("Firestore initialization deferred:", e);
}

let auth: Auth | null = null;

export function getFirebaseAuth(): Auth | null {
  if (!auth && app) {
    try {
      auth = getAuth(app);
    } catch (e) {
      console.warn("Failed to get Firebase Auth:", e);
    }
  }
  return auth;
}

export function getFirebaseDb(): Firestore | null {
  if (!db && app) {
    try {
      db = getFirestore(app);
    } catch (e) {
      console.warn("Failed to get Firestore:", e);
    }
  }
  return db;
}

export { app, db, auth };
export default app;
