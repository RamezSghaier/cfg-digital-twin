import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase/config'

const API_BASE = 'http://localhost:8000/api'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,           setUser]           = useState(undefined)  // undefined = loading
  const [role,           setRole]           = useState(null)
  const [needsRoleSetup, setNeedsRoleSetup] = useState(false)
  const [roleLoading,    setRoleLoading]    = useState(false)

  const refreshRole = useCallback(async (firebaseUser) => {
    const u = firebaseUser || auth.currentUser
    if (!u) { setRole(null); setNeedsRoleSetup(false); return }
    try {
      const token = await u.getIdToken(true)
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        if (!data.profile_exists) {
          setRole('user')
          setNeedsRoleSetup(true)
        } else {
          setRole(data.role || 'user')
          setNeedsRoleSetup(false)
        }
      } else {
        setRole('user')
        setNeedsRoleSetup(false)
      }
    } catch {
      // Backend unreachable — keep user in limbo so they can't access the app
      setRole(null)
      setNeedsRoleSetup(false)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null)
        setRole(null)
        setNeedsRoleSetup(false)
        setRoleLoading(false)
        return
      }

      setRoleLoading(true)

      // Check if a Signup flow pre-set the role in sessionStorage
      const pendingRole = sessionStorage.getItem('pendingRole')
      if (pendingRole) {
        sessionStorage.removeItem('pendingRole')
        setUser(firebaseUser)
        setRole(pendingRole)
        setNeedsRoleSetup(false)
        // Sync to MongoDB and apply the effective role (may differ if auto-promoted)
        try {
          const token = await firebaseUser.getIdToken()
          const res = await fetch(`${API_BASE}/auth/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ role: pendingRole }),
          })
          if (res.ok) {
            const data = await res.json()
            if (data.role !== pendingRole) setRole(data.role)
          }
        } catch {}
        setRoleLoading(false)
        return
      }

      // Check if this is a new Google user that needs role selection (set by Login.jsx)
      const pendingSetupUid = sessionStorage.getItem('pendingRoleSetup')
      if (pendingSetupUid === firebaseUser.uid) {
        setUser(firebaseUser)
        setRole('user')
        setNeedsRoleSetup(true)
        setRoleLoading(false)
        return
      }

      // Normal login — resolve role from MongoDB before revealing the user
      await refreshRole(firebaseUser)
      setUser(firebaseUser)
      setRoleLoading(false)
    })
    return unsubscribe
  }, [refreshRole])

  return (
    <AuthContext.Provider value={{ user, role, needsRoleSetup, roleLoading, refreshRole, setNeedsRoleSetup }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
