import { useState } from 'react'
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../firebase/config'

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

export default function Login({ onSwitchToSignup }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      setError(translateError(err.code))
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setLoading(true)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      setError(translateError(err.code))
    } finally {
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

      <div style={{
        width: '360px',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>

        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#70c1ff', fontSize: '0.65rem', letterSpacing: '0.4em', opacity: 0.5, marginBottom: '0.75rem' }}>
            ACCÉDER AU SYSTÈME
          </div>
          <h2 style={{
            color: '#70c1ff',
            fontSize: '1.6rem',
            letterSpacing: '0.2em',
            textShadow: '0 0 10px #70c1ff, 0 0 40px #70c1ff66',
            margin: 0
          }}>
            CONNEXION
          </h2>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="email"
            placeholder="EMAIL"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="MOT DE PASSE"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={inputStyle}
          />

          {error && (
            <div style={{ color: '#ff6b6b', fontSize: '0.75rem', letterSpacing: '0.1em', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.5 : 1 }}>
            {loading ? 'CONNEXION...' : 'SE CONNECTER'}
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

        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#70c1ff', opacity: 0.5, letterSpacing: '0.1em' }}>
          Pas de compte ?{' '}
          <span
            onClick={onSwitchToSignup}
            style={{ opacity: 1, cursor: 'pointer', textDecoration: 'underline' }}
          >
            S'inscrire
          </span>
        </div>

      </div>
    </div>
  )
}

function translateError(code) {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email ou mot de passe incorrect.'
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Réessaye plus tard.'
    case 'auth/invalid-email':
      return 'Adresse email invalide.'
    default:
      return 'Une erreur est survenue. Réessaye.'
  }
}
