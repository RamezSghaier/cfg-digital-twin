export default function AuthPrompt({ onLogin, onSignup }) {
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
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2rem',
        backdropFilter: 'blur(48px) saturate(180%) brightness(1.15)',
        WebkitBackdropFilter: 'blur(48px) saturate(180%) brightness(1.15)',
        background: 'rgba(220, 235, 255, 0.10)',
        padding: '3rem 4rem',
        borderRadius: '20px'
      }}>

        <div style={{
          color: 'rgba(255,255,255,0.6)',
          fontSize: '0.7rem',
          letterSpacing: '0.4em',
        }}>
          ACCÉDER AU SYSTÈME
        </div>

        <h2 style={{
          color: '#ffffff',
          fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
          letterSpacing: '0.2em',
          textShadow: '0 0 6px #fff, 0 0 18px #70c1ff, 0 0 45px #70c1ff',
          margin: 0
        }}>
          JUMEAU NUMÉRIQUE
        </h2>

        <div style={{ display: 'flex', gap: '1.5rem' }}>

          <button
            onClick={onLogin}
            style={{
              padding: '0.9rem 3rem',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.5)',
              color: '#ffffff',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              letterSpacing: '0.25em',
              cursor: 'pointer',
              textShadow: '0 0 8px #70c1ff',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            CONNEXION
          </button>

          <button
            onClick={onSignup}
            style={{
              padding: '0.9rem 3rem',
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.8)',
              color: '#ffffff',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              letterSpacing: '0.25em',
              cursor: 'pointer',
              textShadow: '0 0 8px #70c1ff',
              boxShadow: '0 0 20px rgba(112,193,255,0.2)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
          >
            INSCRIPTION
          </button>

        </div>

        <div style={{
          color: 'rgba(255,255,255,0.35)',
          fontSize: '0.6rem',
          letterSpacing: '0.2em',
          marginTop: '0.5rem'
        }}>
          PROJET FIN D'ÉTUDES — 2026
        </div>

      </div>
    </div>
  )
}
