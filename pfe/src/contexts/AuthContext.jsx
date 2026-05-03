import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

const API_BASE = 'http://localhost:8000/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined)   // undefined = loading
  const [role, setRole] = useState(null)         // 'admin' | 'user'

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)

      if (firebaseUser) {
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
          const firestoreRole = snap.exists() ? snap.data().role : 'user'
          setRole(firestoreRole)

          // Mirror role into MongoDB so the backend can enforce it
          const token = await firebaseUser.getIdToken()
          await fetch(`${API_BASE}/auth/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ role: firestoreRole }),
          }).catch(() => {}) // non-blocking — backend may be offline
        } catch {
          setRole('user')
        }
      } else {
        setRole(null)
      }
    })
    return unsubscribe
  }, [])

  return (
    <AuthContext.Provider value={{ user, role }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
