import { useState } from 'react'
import { createUserWithEmailAndPassword, signInWithPopup, updateProfile } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, googleProvider, db } from '../firebase/config'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api'

async function saveUserRole(user, role) {
  await setDoc(doc(db, 'users', user.uid), {
    role,
    email: user.email,
    displayName: user.displayName || '',
    createdAt: serverTimestamp(),
  })
}

async function syncRoleMongo(user, role) {
  try {
    const token = await user.getIdToken()
    await fetch(`${API_BASE}/auth/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ role }),
    })
  } catch {}
}

const SHARED_STYLES = `
  ::placeholder { color: rgba(255,255,255,0.5); }
  @keyframes scanLine {
    0%   { transform: translateY(-100%); opacity: 0.3; }
    100% { transform: translateY(600%);  opacity: 0;   }
  }
`

// ── Step 1 : Role selection ──────────────────────────────────────────────────
function RoleSelection({ onSelect, onBack }) {
  const roles = [
    {
      key: 'admin',
      icon: '◈',
      label: 'ADMINISTRATEUR',
      desc: 'Accès complet — nécessite l\'approbation d\'un administrateur existant',
    },
    {
      key: 'user',
      icon: '◇',
      label: 'UTILISATEUR',
      desc: 'Consultation — simulation 3D, météo, inspection rails',
    },
  ]

  return (
    <div style={{
      height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'monospace', pointerEvents: 'all',
    }}>
      <style>{SHARED_STYLES}</style>

      <div style={{
        position: 'relative',
        overflow: 'hidden',
        backdropFilter: 'blur(48px) saturate(180%) brightness(1.15)',
        WebkitBackdropFilter: 'blur(48px) saturate(180%) brightness(1.15)',
        backdropFilter: 'blur(48px) saturate(180%) brightness(1.15)',
        WebkitBackdropFilter: 'blur(48px) saturate(180%) brightness(1.15)',
        background: 'rgba(220, 235, 255, 0.10)',
        borderRadius: '28px',
        padding: '3.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2.5rem',
      }}>

        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.07) 0%, transparent 50%)',
          animation: 'scanLine 7s ease-in-out 1s infinite',
        }} />

        {/* Back button */}
        {onBack && (
          <button
            onClick={onBack}
            style={{
              position: 'absolute', top: '1.2rem', left: '1.2rem',
              background: 'transparent', border: 'none',
              color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              fontFamily: 'monospace', fontSize: '0.62rem', letterSpacing: '0.2em',
              padding: '0.4rem 0.6rem', borderRadius: '8px',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            RETOUR
          </button>
        )}

        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#fff', fontSize: '0.6rem', letterSpacing: '0.45em', marginBottom: '1rem', textShadow: '0 0 5px #fff, 0 0 16px #70c1ff, 0 0 32px #70c1ff' }}>
            CRÉER UN COMPTE
          </div>
          <div style={{
            width: '40px', height: '1px',
            background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.5), transparent)',
            margin: '0 auto 1.2rem',
          }} />
          <h2 style={{
            color: '#ffffff',
            fontSize: '1.8rem',
            letterSpacing: '0.25em',
            textShadow: '0 0 6px #fff, 0 0 20px #70c1ff, 0 0 50px #70c1ff',
            margin: 0,
          }}>
            CHOISIR UN RÔLE
          </h2>
        </div>

        {/* Role cards */}
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          {roles.map(({ key, icon, label, desc }) => (
            <button
              key={key}
              onClick={() => onSelect(key)}
              style={{
                width: '240px',
                padding: '2.2rem 1.8rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.22)',
                borderRadius: '20px',
                color: '#ffffff',
                fontFamily: 'monospace',
                cursor: 'pointer',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(112,193,255,0.12)'
                e.currentTarget.style.borderColor = 'rgba(112,193,255,0.6)'
                e.currentTarget.style.boxShadow = '0 0 36px rgba(112,193,255,0.18)'
                e.currentTarget.style.transform = 'translateY(-3px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div style={{ fontSize: '2.4rem', textShadow: '0 0 20px #70c1ff, 0 0 40px #70c1ff' }}>
                {icon}
              </div>
              <div style={{ fontSize: '0.82rem', letterSpacing: '0.28em', textShadow: '0 0 8px #70c1ff' }}>
                {label}
              </div>
              <div style={{
                fontSize: '0.65rem',
                color: 'rgba(255,255,255,0.55)',
                letterSpacing: '0.04em',
                lineHeight: '1.7',
              }}>
                {desc}
              </div>
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}

// ── Step 2 : Signup form ─────────────────────────────────────────────────────
function SignupForm({ role, onSwitchToLogin, onBack }) {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [error, setError]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [focused, setFocused]         = useState('')

  async function handleSignup(e) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 6)  { setError('Le mot de passe doit contenir au moins 6 caractères.'); return }
    setLoading(true)
    // Admin requests become pending_admin until approved
    const actualRole = role === 'admin' ? 'pending_admin' : 'user'
    try {
      // Set sessionStorage BEFORE creating account so AuthContext reads it on onAuthStateChanged
      sessionStorage.setItem('pendingRole', actualRole)
      const { user } = await createUserWithEmailAndPassword(auth, email, password)
      if (displayName.trim()) await updateProfile(user, { displayName: displayName.trim() })
      await saveUserRole(user, actualRole)
      await syncRoleMongo(user, actualRole)
    } catch (err) {
      sessionStorage.removeItem('pendingRole')
      setError(translateError(err.code))
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setLoading(true)
    const actualRole = role === 'admin' ? 'pending_admin' : 'user'
    try {
      sessionStorage.setItem('pendingRole', actualRole)
      const { user } = await signInWithPopup(auth, googleProvider)
      await saveUserRole(user, actualRole)
      await syncRoleMongo(user, actualRole)
    } catch (err) {
      sessionStorage.removeItem('pendingRole')
      setError(translateError(err.code))
      setLoading(false)
    }
  }

  const inputStyle = (name) => ({
    width: '100%',
    padding: '1rem 1.2rem',
    background: focused === name ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.09)',
    border: `1px solid ${focused === name ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.45)'}`,
    borderRadius: '12px',
    color: '#ffffff',
    fontFamily: 'monospace',
    fontSize: '0.88rem',
    letterSpacing: '0.08em',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'all 0.2s ease',
  })

  return (
    <div style={{
      height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'monospace', pointerEvents: 'all',
    }}>
      <style>{SHARED_STYLES}</style>

      <div style={{
        position: 'relative',
        width: '440px',
        overflow: 'hidden',
        backdropFilter: 'blur(48px) saturate(180%) brightness(1.15)',
        WebkitBackdropFilter: 'blur(48px) saturate(180%) brightness(1.15)',
        backdropFilter: 'blur(48px) saturate(180%) brightness(1.15)',
        WebkitBackdropFilter: 'blur(48px) saturate(180%) brightness(1.15)',
        background: 'rgba(220, 235, 255, 0.10)',
        borderRadius: '28px',
        padding: '3.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.6rem',
      }}>

        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.07) 0%, transparent 50%)',
          animation: 'scanLine 7s ease-in-out 1s infinite',
        }} />

        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.35rem 1.2rem',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: '30px',
            color: 'rgba(255,255,255,0.75)',
            fontSize: '0.62rem',
            letterSpacing: '0.28em',
            marginBottom: '1.2rem',
          }}>
            {role === 'admin' ? '◈' : '◇'}
            {role === 'admin' ? 'ADMINISTRATEUR' : 'UTILISATEUR'}
          </div>
          <div style={{
            width: '40px', height: '1px',
            background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.5), transparent)',
            margin: '0 auto 1.2rem',
          }} />
          <h2 style={{
            color: '#ffffff',
            fontSize: '1.8rem',
            letterSpacing: '0.25em',
            textShadow: '0 0 6px #fff, 0 0 20px #70c1ff, 0 0 50px #70c1ff',
            margin: 0,
          }}>
            INSCRIPTION
          </h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {[
            { name: 'name',     type: 'text',     label: 'NOM COMPLET',            placeholder: 'Votre nom',         value: displayName, onChange: setDisplayName, required: false },
            { name: 'email',    type: 'email',    label: 'EMAIL',                  placeholder: 'exemple@email.com', value: email,       onChange: setEmail,       required: true  },
            { name: 'password', type: 'password', label: 'MOT DE PASSE',           placeholder: '••••••••',          value: password,    onChange: setPassword,    required: true  },
            { name: 'confirm',  type: 'password', label: 'CONFIRMER MOT DE PASSE', placeholder: '••••••••',          value: confirm,     onChange: setConfirm,     required: true  },
          ].map(({ name, type, label, placeholder, value, onChange, required }) => (
            <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.55rem', letterSpacing: '0.35em', color: '#fff', textShadow: '0 0 4px #fff, 0 0 14px #70c1ff, 0 0 28px #70c1ff' }}>{label}</label>
              <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={e => onChange(e.target.value)}
                onFocus={() => setFocused(name)}
                onBlur={() => setFocused('')}
                required={required}
                style={inputStyle(name)}
              />
            </div>
          ))}

          {error && (
            <div style={{
              color: '#ff6b6b', fontSize: '0.75rem', letterSpacing: '0.08em',
              textAlign: 'center', padding: '0.6rem 1rem',
              background: 'rgba(255,107,107,0.08)', borderRadius: '8px',
              border: '1px solid rgba(255,107,107,0.2)',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '0.4rem',
              width: '100%', padding: '1.1rem',
              background: 'rgba(112,193,255,0.18)',
              border: '1px solid rgba(112,193,255,0.6)',
              borderRadius: '14px',
              color: '#ffffff',
              fontFamily: 'monospace', fontSize: '0.88rem', letterSpacing: '0.3em',
              cursor: loading ? 'not-allowed' : 'pointer',
              textShadow: '0 0 10px #70c1ff',
              boxShadow: '0 0 24px rgba(112,193,255,0.15)',
              transition: 'all 0.25s ease',
              opacity: loading ? 0.5 : 1,
            }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = 'rgba(112,193,255,0.32)'; e.currentTarget.style.boxShadow = '0 0 36px rgba(112,193,255,0.3)' }}}
            onMouseLeave={e => { if (!loading) { e.currentTarget.style.background = 'rgba(112,193,255,0.18)'; e.currentTarget.style.boxShadow = '0 0 24px rgba(112,193,255,0.15)' }}}
          >
            {loading ? 'CRÉATION…' : "S'INSCRIRE"}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.15)' }} />
          <span style={{ color: '#fff', fontSize: '0.65rem', letterSpacing: '0.25em', textShadow: '0 0 4px #fff, 0 0 14px #70c1ff, 0 0 28px #70c1ff' }}>OU</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{
            width: '100%', padding: '1rem',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.22)',
            borderRadius: '14px',
            color: '#fff',
            fontFamily: 'monospace', fontSize: '0.82rem', letterSpacing: '0.2em',
            textShadow: '0 0 4px #fff, 0 0 14px #70c1ff, 0 0 28px #70c1ff',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.25s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem',
            opacity: loading ? 0.5 : 1,
          }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.45)' }}}
          onMouseLeave={e => { if (!loading) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)' }}}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          CONTINUER AVEC GOOGLE
        </button>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#fff', letterSpacing: '0.06em', textShadow: '0 0 4px #fff, 0 0 12px #70c1ff' }}>
          <span onClick={onBack} style={{ color: 'rgba(255,255,255,0.7)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
            ← Changer de rôle
          </span>
          <span>
            Déjà un compte ?{' '}
            <span onClick={onSwitchToLogin} style={{ color: '#ffffff', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
              Se connecter
            </span>
          </span>
        </div>

      </div>
    </div>
  )
}

// ── Main export ──────────────────────────────────────────────────────────────
export default function Signup({ onSwitchToLogin, onBack }) {
  const [role, setRole] = useState(null)

  if (!role) return <RoleSelection onSelect={setRole} onBack={onBack} />
  return <SignupForm role={role} onSwitchToLogin={onSwitchToLogin} onBack={() => setRole(null)} />
}

function translateError(code) {
  switch (code) {
    case 'auth/email-already-in-use': return 'Cet email est déjà utilisé.'
    case 'auth/invalid-email':        return 'Adresse email invalide.'
    case 'auth/weak-password':        return 'Mot de passe trop faible (min. 6 caractères).'
    default:                          return 'Une erreur est survenue. Réessaye.'
  }
}
