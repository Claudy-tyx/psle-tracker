// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBbz0qHWE5o3qu_dQ0DQ_4QMcQesa8Woko",
  authDomain: "psle-tracker.firebaseapp.com",
  projectId: "psle-tracker",
  storageBucket: "psle-tracker.firebasestorage.app",
  messagingSenderId: "8930512304",
  appId: "1:8930512304:web:d94fe7f1a7ac9de62ada75",
  measurementId: "G-KGZCMZTTZQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);