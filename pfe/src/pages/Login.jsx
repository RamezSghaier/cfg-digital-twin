import { useState } from 'react'
import { signInWithEmailAndPassword, signInWithPopup, getAdditionalUserInfo } from 'firebase/auth'
import { auth, googleProvider } from '../firebase/config'

export default function Login({ onSwitchToSignup, onBack }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [focused, setFocused]   = useState('')

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
      const result = await signInWithPopup(auth, googleProvider)
      const { isNewUser } = getAdditionalUserInfo(result)
      if (isNewUser) {
        // Flag for AuthContext — new user needs role selection
        sessionStorage.setItem('pendingRoleSetup', result.user.uid)
      }
    } catch (err) {
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
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'monospace',
      pointerEvents: 'all',
    }}>
      <style>{`
        ::placeholder { color: rgba(255,255,255,0.5); }
        @keyframes scanLine {
          0%   { transform: translateY(-100%); opacity: 0.3; }
          100% { transform: translateY(600%);  opacity: 0;   }
        }
      `}</style>

      <div style={{
        position: 'relative',
        width: '440px',
        overflow: 'hidden',
        backdropFilter: 'blur(48px) saturate(180%) brightness(1.15)',
        WebkitBackdropFilter: 'blur(48px) saturate(180%) brightness(1.15)',
        background: 'rgba(220, 235, 255, 0.16)',
        borderRadius: '28px',
        padding: '3.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.8rem',
      }}>

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

        {/* Scan line shimmer */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.07) 0%, transparent 50%)',
          animation: 'scanLine 7s ease-in-out 1s infinite',
        }} />

        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.6rem', letterSpacing: '0.45em', marginBottom: '1rem', textShadow: '0 0 4px #fff, 0 0 12px #70c1ff' }}>
            ACCÉDER AU SYSTÈME
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
            CONNEXION
          </h2>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.55rem', letterSpacing: '0.35em', color: 'rgba(255,255,255,0.9)', textShadow: '0 0 6px rgba(112,193,255,0.7), 0 0 16px rgba(112,193,255,0.3)' }}>EMAIL</label>
            <input
              type="email"
              placeholder="exemple@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused('')}
              required
              style={inputStyle('email')}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.55rem', letterSpacing: '0.35em', color: 'rgba(255,255,255,0.9)', textShadow: '0 0 6px rgba(112,193,255,0.7), 0 0 16px rgba(112,193,255,0.3)' }}>MOT DE PASSE</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused('')}
              required
              style={inputStyle('password')}
            />
          </div>

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
            {loading ? 'CONNEXION…' : 'SE CONNECTER'}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.15)' }} />
          <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.65rem', letterSpacing: '0.25em' }}>OU</span>
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
            color: 'rgba(255,255,255,0.8)',
            fontFamily: 'monospace', fontSize: '0.82rem', letterSpacing: '0.2em',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.25s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem',
            opacity: loading ? 0.5 : 1,
          }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.45)' }}}
          onMouseLeave={e => { if (!loading) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)' }}}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" opacity="0.8">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          CONTINUER AVEC GOOGLE
        </button>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.08em' }}>
          Pas de compte ?{' '}
          <span
            onClick={onSwitchToSignup}
            style={{ color: '#ffffff', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}
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
