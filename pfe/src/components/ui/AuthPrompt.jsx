export default function AuthPrompt({ onLogin, onSignup }) {
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '2rem',
      fontFamily: 'monospace',
      pointerEvents: 'all'
    }}>

      <div style={{
        color: '#70c1ff',
        fontSize: '0.7rem',
        letterSpacing: '0.4em',
        opacity: 0.5
      }}>
        ACCÉDER AU SYSTÈME
      </div>

      <h2 style={{
        color: '#70c1ff',
        fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
        letterSpacing: '0.2em',
        textShadow: '0 0 10px #70c1ff, 0 0 40px #70c1ff66',
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
            border: '1px solid #70c1ff88',
            color: '#70c1ff',
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            letterSpacing: '0.25em',
            cursor: 'pointer',
            textShadow: '0 0 8px #70c1ff',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#70c1ff15'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          CONNEXION
        </button>

        <button
          onClick={onSignup}
          style={{
            padding: '0.9rem 3rem',
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
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#70c1ff33'}
          onMouseLeave={e => e.currentTarget.style.background = '#70c1ff18'}
        >
          INSCRIPTION
        </button>

      </div>

      <div style={{
        color: '#70c1ff',
        fontSize: '0.6rem',
        letterSpacing: '0.2em',
        opacity: 0.25,
        marginTop: '1rem'
      }}>
        PROJET FIN D'ÉTUDES — 2026
      </div>

    </div>
  )
}
