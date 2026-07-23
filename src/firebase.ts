import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, indexedDBLocalPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAzGC2Ks8-qkgk5ykx9hxk7S2iwRUcUYn4",
  authDomain: "smt-family.firebaseapp.com",
  databaseURL: "https://smt-family-default-rtdb.firebaseio.com",
  projectId: "smt-family",
  storageBucket: "smt-family.firebasestorage.app",
  messagingSenderId: "860143785842",
  appId: "1:860143785842:web:ba928e157fc7052c26afeb",
  measurementId: "G-K5VLJQC5K6",
};

const app = initializeApp(firebaseConfig);

// Firebase Services
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
});
export const firestore = getFirestore(app);
export const realtimeDB = getDatabase(app);
export const storage = getStorage(app);

// Enable Firestore offline persistence (multi-tab safe)
enableMultiTabIndexedDbPersistence(firestore).catch((err: any) => {
  if (err.code === "failed-precondition") {
    console.warn("Firestore persistence: multiple tabs open, falling back to single-tab cache");
  } else if (err.code === "unimplemented") {
    console.warn("Firestore persistence: browser not supported");
  }
});

// Analytics (Optional)
let analytics: ReturnType<typeof getAnalytics> | undefined;

isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

export { app, analytics };