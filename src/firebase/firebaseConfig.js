import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDm7_LkPAYhju5A81YwH0uQ2S4a2cgWFP8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "chatting-afe71.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "chatting-afe71",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "chatting-afe71.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "91791514173",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:91791514173:web:chatting-afe71"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
