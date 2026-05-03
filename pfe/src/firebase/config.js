import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// TODO: Remplace ces valeurs par ta firebaseConfig depuis la console Firebase
const firebaseConfig = {
  apiKey: "AIzaSyADHy1KctJ-oPefzkbgx0LWD5-BfSb8B-U",
  authDomain: "jumeau-numerique-77bfa.firebaseapp.com",
  projectId: "jumeau-numerique-77bfa",
  storageBucket: "jumeau-numerique-77bfa.firebasestorage.app",
  messagingSenderId: "1028022077584",
  appId: "1:1028022077584:web:0b87f4e692cecee4863015"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
export const db = getFirestore(app)
