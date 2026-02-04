import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDhKAE3R1VdkvGlbAnINeWYmINUeTroA28",
  authDomain: "dunamis-project.firebaseapp.com",
  projectId: "dunamis-project",
  storageBucket: "dunamis-project.firebasestorage.app",
  messagingSenderId: "658049534537",
  appId: "1:658049534537:web:bd0ac611e8dff951eb0d98",
  measurementId: "G-N85N2B3C02",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
