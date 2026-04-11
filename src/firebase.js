import { initializeApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithPopup,
  onAuthStateChanged, signOut as fbSignOut, deleteUser
} from 'firebase/auth';
import {
  getFirestore, collection, addDoc, getDocs, doc,
  updateDoc, deleteDoc, query, where, serverTimestamp,
  orderBy, getDoc, setDoc
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const fbApp = initializeApp(firebaseConfig);
export const auth = getAuth(fbApp);
export const db = getFirestore(fbApp);
export const provider = new GoogleAuthProvider();

export {
  signInWithPopup, onAuthStateChanged, fbSignOut, deleteUser,
  collection, addDoc, getDocs, doc, updateDoc, deleteDoc,
  query, where, serverTimestamp, getDoc, setDoc
};
