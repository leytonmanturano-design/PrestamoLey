// =============================================
//  PrestamoLey – firebase.js
//  Configuración de Firebase + Firestore
// =============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBf_mo6sX4Zko4Xc0ZruSrSvNa0d8YqST0",
  authDomain: "prestamoley-78ccc.firebaseapp.com",
  projectId: "prestamoley-78ccc",
  storageBucket: "prestamoley-78ccc.firebasestorage.app",
  messagingSenderId: "390658116809",
  appId: "1:390658116809:web:52a8b654f2b9f2637f1118",
  measurementId: "G-LVE2RQTZV9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const authReady = signInAnonymously(auth)
  .then(() => {
    console.log('Firebase auth anónima activada');
    return true;
  })
  .catch((error) => {
    console.error('Error al autenticar anónimamente:', error);
    return false;
  });

export const db = getFirestore(app);
