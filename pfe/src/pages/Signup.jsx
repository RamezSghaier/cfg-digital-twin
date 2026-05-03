import { useState } from 'react'
import { createUserWithEmailAndPassword, signInWithPopup, updateProfile } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, googleProvider, db } from '../firebase/config'

const inputStyle = {
  width: '100%',
  padding: '0.75rem 1rem',
  background: 'transparent',
  border: '1px solid #70c1ff44',
  color: '#70c1ff',
  fontFamily: 'monospace',
  fontSize: '0.85rem',
  letterSpacing: '0.1em',
  outline: 'none',
  boxSizing: 'border-box'
}

const btnPrimary = {
  width: '100%',
  padding: '0.85rem',
  background: '#70c1ff18',
  border: '1px solid #70c1ff',
  color: '#70c1ff',
  fontFamily: 'monospace',
  fontSize: '0.85rem',
  letterSpacing: '0.25em',
  cursor: 'pointer',
  textShadow: '0 0 8px #70c1ff',
  boxShadow: '0 0 20px #70c1ff22',
  transition: 'all 0.3s ease'
}

const btnGoogle = {
  width: '100%',
  padding: '0.85rem',
  background: 'transparent',
  border: '1px solid #70c1ff44',
  color: '#70c1ff',
  fontFamily: 'monospace',
  fontSize: '0.8rem',
  letterSpacing: '0.2em',
  cursor: 'pointer',
  transition: 'all 0.3s ease'
}

async function saveUserRole(user, role) {
  await setDoc(doc(db, 'users', user.uid), {
    role,
    email: user.email,
    displayName: user.displayName || '',
    createdAt: serverTimestamp()
  })
}

// ── Step 1 : Role selection ──────────────────────────────────────────────────
function RoleSelection({ onSelect }) {
  const roles = [
    {
      key: 'admin',
      label: 'ADMINISTRATEUR',
      desc: 'Accès complet — gestion des données, alertes IA, journal'
    },
    {
      key: 'user',
      label: 'UTILISATEUR',
      desc: 'Consultation — simulation 3D, météo, inspection rails'
    }
  ]

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'monospace',
      pointerEvents: 'all',
      gap: '2.5rem'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: '#70c1ff', fontSize: '0.65rem', letterSpacing: '0.4em', opacity: 0.5, marginBottom: '0.75rem' }}>
          CRÉER UN COMPTE
        </div>
        <h2 style={{
          color: '#70c1ff',
          fontSize: '1.6rem',
          letterSpacing: '0.2em',
          textShadow: '0 0 10px #70c1ff, 0 0 40px #70c1ff66',
          margin: 0
        }}>
          CHOISIR UN RÔLE
        </h2>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem' }}>
        {roles.map(({ key, label, desc }) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            style={{
              width: '220px',
              padding: '2rem 1.5rem',
              background: 'transparent',
              border: '1px solid #70c1ff44',
              color: '#70c1ff',
              fontFamily: 'monospace',
              cursor: 'pointer',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#70c1ff12'
              e.currentTarget.style.border = '1px solid #70c1ff'
              e.currentTarget.style.boxShadow = '0 0 30px #70c1ff22'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.border = '1px solid #70c1ff44'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{
              fontSize: '2rem',
              textShadow: '0 0 15px #70c1ff'
            }}>
              {key === 'admin' ? '◈' : '◇'}
            </div>
            <div style={{
              fontSize: '0.8rem',
              letterSpacing: '0.25em',
              textShadow: '0 0 8px #70c1ff'
            }}>
              {label}
            </div>
            <div style={{
              fontSize: '0.65rem',
              opacity: 0.5,
              letterSpacing: '0.05em',
              lineHeight: '1.6'
            }}>
              {desc}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Step 2 : Signup form ─────────────────────────────────────────────────────
function SignupForm({ role, onSwitchToLogin, onBack }) {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(e) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return }
    setLoading(true)
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password)
      if (displayName.trim()) await updateProfile(user, { displayName: displayName.trim() })
      await saveUserRole(user, role)
    } catch (err) {
      setError(translateError(err.code))
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setLoading(true)
    try {
      const { user } = await signInWithPopup(auth, googleProvider)
      await saveUserRole(user, role)
    } catch (err) {
      setError(translateError(err.code))
      setLoading(false)
    }
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'monospace',
      pointerEvents: 'all'
    }}>
      <div style={{ width: '360px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        <div style={{ textAlign: 'center' }}>
          {/* Role badge */}
          <div style={{
            display: 'inline-block',
            padding: '0.3rem 1.2rem',
            border: '1px solid #70c1ff44',
            color: '#70c1ff',
            fontSize: '0.65rem',
            letterSpacing: '0.3em',
            opacity: 0.7,
            marginBottom: '0.75rem'
          }}>
            {role === 'admin' ? '◈ ADMINISTRATEUR' : '◇ UTILISATEUR'}
          </div>
          <h2 style={{
            color: '#70c1ff',
            fontSize: '1.6rem',
            letterSpacing: '0.2em',
            textShadow: '0 0 10px #70c1ff, 0 0 40px #70c1ff66',
            margin: 0
          }}>
            INSCRIPTION
          </h2>
        </div>

        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input type="text" placeholder="NOM COMPLET" value={displayName} onChange={e => setDisplayName(e.target.value)} style={inputStyle} />
          <input type="email" placeholder="EMAIL" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
          <input type="password" placeholder="MOT DE PASSE" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
          <input type="password" placeholder="CONFIRMER LE MOT DE PASSE" value={confirm} onChange={e => setConfirm(e.target.value)} required style={inputStyle} />

          {error && (
            <div style={{ color: '#ff6b6b', fontSize: '0.75rem', letterSpacing: '0.1em', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.5 : 1 }}>
            {loading ? 'CRÉATION...' : "S'INSCRIRE"}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ flex: 1, height: '1px', background: '#70c1ff22' }} />
          <span style={{ color: '#70c1ff', opacity: 0.4, fontSize: '0.7rem', letterSpacing: '0.2em' }}>OU</span>
          <div style={{ flex: 1, height: '1px', background: '#70c1ff22' }} />
        </div>

        <button onClick={handleGoogle} disabled={loading} style={{ ...btnGoogle, opacity: loading ? 0.5 : 1 }}>
          CONTINUER AVEC GOOGLE
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#70c1ff', opacity: 0.5, letterSpacing: '0.1em' }}>
          <span onClick={onBack} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
            ← Changer de rôle
          </span>
          <span>
            Déjà un compte ?{' '}
            <span onClick={onSwitchToLogin} style={{ opacity: 1, cursor: 'pointer', textDecoration: 'underline' }}>
              Se connecter
            </span>
          </span>
        </div>

      </div>
    </div>
  )
}

// ── Main export ──────────────────────────────────────────────────────────────
export default function Signup({ onSwitchToLogin }) {
  const [role, setRole] = useState(null)

  if (!role) return <RoleSelection onSelect={setRole} />
  return <SignupForm role={role} onSwitchToLogin={onSwitchToLogin} onBack={() => setRole(null)} />
}

function translateError(code) {
  switch (code) {
    case 'auth/email-already-in-use': return 'Cet email est déjà utilisé.'
    case 'auth/invalid-email': return 'Adresse email invalide.'
    case 'auth/weak-password': return 'Mot de passe trop faible (min. 6 caractères).'
    default: return 'Une erreur est survenue. Réessaye.'
  }
}
