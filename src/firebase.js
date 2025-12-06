import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Suas chaves (mantive as mesmas que você mandou)
const firebaseConfig = {
  apiKey: "AIzaSyDzCyAncyWYHMjO57nwvkg6asieTBkHWUA",
  authDomain: "contador-album-hello-kitty.firebaseapp.com",
  projectId: "contador-album-hello-kitty",
  storageBucket: "contador-album-hello-kitty.firebasestorage.app",
  messagingSenderId: "203642323210",
  appId: "1:203642323210:web:fc44c24d0220664a6cbaf3",
  measurementId: "G-5ZZNK8FPJJ"
};

// Inicializa o app
const app = initializeApp(firebaseConfig);

// Exporta apenas o que usamos (sem analytics)
export const db = getFirestore(app);
export const auth = getAuth(app);