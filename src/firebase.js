import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
const firebaseConfig = {
  apiKey: "AIzaSyCRKiIcrJcvFufk90x1VqJZIx7fc_ZF08s",
  authDomain: "shogaisupotsu.firebaseapp.com",
  projectId: "shogaisupotsu",
  storageBucket: "shogaisupotsu.firebasestorage.app",
  messagingSenderId: "895749806943",
  appId: "1:895749806943:web:3cbcc3c561b0a149cef4ea"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
