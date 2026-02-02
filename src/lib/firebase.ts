import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDGX5GeLA4gKbLtrSryFkTelSGsGHp5nfs",
  authDomain: "life-timer-2f64e.firebaseapp.com",
  projectId: "life-timer-2f64e",
  storageBucket: "life-timer-2f64e.firebasestorage.app",
  messagingSenderId: "1019217241532",
  appId: "1:1019217241532:web:ad3ebe5637561ba44537b9",
  measurementId: "G-Z1FXZ1HVDD"
};

// Initialize Firebase (prevent re-initialization in hot reload)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
