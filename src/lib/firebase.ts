import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDILe8yBuwSZrM15gy352np95mmxZE75SY",
  authDomain: "breath-5f41c.firebaseapp.com",
  projectId: "breath-5f41c",
  storageBucket: "breath-5f41c.firebasestorage.app",
  messagingSenderId: "523616074857",
  appId: "1:523616074857:web:51c9490546fdc34aef36f8",
  measurementId: "G-CJWP6RWZJC"
};

const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export default app;