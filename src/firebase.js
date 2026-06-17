// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";  // <--- Importa Storage

const firebaseConfig = {
apiKey: "AIzaSyBwl2NHJxS7Yf1oI8afoe2mTC9GzujJLVM",
  authDomain: "inventoryapp-fb533.firebaseapp.com",
  projectId: "inventoryapp-fb533",
  storageBucket: "inventoryapp-fb533.firebasestorage.app",
  messagingSenderId: "791913940814",
  appId: "1:791913940814:web:5d247564d635521769401f",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);   // <--- Exporta Storage
