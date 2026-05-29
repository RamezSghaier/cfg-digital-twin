const FONT = 'monospace'
const CYAN = '#70c1ff'
const WHITE = '#fff'

const glass = {
  backdropFilter:       'blur(48px) saturate(180%) brightness(1.15)',
  WebkitBackdropFilter: 'blur(48px) saturate(180%) brightness(1.15)',
  background:           'rgba(220, 235, 255, 0.10)',
}

const text = { fontFamily: FONT, color: WHITE }

export default function LandingOverlay() {
  return (
    <>
      <style>{`
        @keyframes glassReveal {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes scanLine {
          0%   { transform: translateY(-100%); opacity: 0.3; }
          100% { transform: translateY(600%);  opacity: 0;   }
        }
      `}</style>

      <div>

        <div style={{ height: '100vh', pointerEvents: 'none' }} />

        {/* ── PHASE 1 ── */}
        <div style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            ...glass,
            position: 'relative',
            overflow: 'hidden',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            padding: 'clamp(2.5rem, 5vh, 4rem) 0',
            animation: 'glassReveal 1.0s cubic-bezier(0.22, 1, 0.36, 1) 1.2s both'
          }}>

            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.08) 0%, transparent 50%)',
              animation: 'scanLine 6s ease-in-out 2.8s infinite',
              pointerEvents: 'none'
            }} />

            <h1 style={{
              ...text,
              fontSize: 'clamp(1.8rem, 4vw, 3.2rem)',
              letterSpacing: '0.35em',
              textAlign: 'center',
              margin: 0,
              textShadow: `0 0 6px ${WHITE}, 0 0 18px ${CYAN}, 0 0 45px ${CYAN}, 0 0 90px ${CYAN}bb`
            }}>
              JUMEAU NUMÉRIQUE
            </h1>

            <div style={{
              width: '240px',
              height: '1px',
              background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.6), transparent)'
            }} />

            <p style={{
              ...text,
              fontSize: 'clamp(0.75rem, 1.4vw, 0.95rem)',
              lineHeight: '2',
              color: 'rgba(255,255,255,0.88)',
              textAlign: 'center',
              margin: 0,
              maxWidth: '560px',
              letterSpacing: '0.05em',
            }}>
              Surveillance intelligente et prédiction des risques
              pour locomotives en temps réel — propulsé par
              l'intelligence artificielle.
            </p>

            <div style={{
              ...text,
              marginTop: '0.5rem',
              opacity: 0.55,
              fontSize: '0.68rem',
              letterSpacing: '0.3em',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.4rem',
            }}>
              <div>DÉFILER</div>
              <div style={{ fontSize: '1.1rem' }}>↓</div>
            </div>

          </div>
        </div>

        {/* ── PHASE 2 ── */}
        <div style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          pointerEvents: 'none',
        }}>
          <div style={{
            ...glass,
            position: 'relative',
            overflow: 'hidden',
            width: '42vw',
            minWidth: '300px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.7rem',
            padding: 'clamp(2rem, 4vh, 3rem) clamp(2rem, 4vw, 3.5rem)',
          }}>

            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.07) 0%, transparent 50%)',
              animation: 'scanLine 7s ease-in-out 1.5s infinite',
              pointerEvents: 'none'
            }} />

            <div style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.35)' }} />

            <div style={{ ...text, fontSize: '0.65rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.55)' }}>
              LOCOMOTIVE — 001
            </div>

            <h2 style={{
              ...text,
              fontSize: 'clamp(1rem, 2vw, 1.5rem)',
              letterSpacing: '0.15em',
              margin: 0,
              textShadow: `0 0 6px ${WHITE}, 0 0 22px ${CYAN}, 0 0 55px ${CYAN}`,
            }}>
              EMD GT42ACL
            </h2>

            <p style={{
              ...text,
              fontSize: 'clamp(0.7rem, 1.2vw, 0.85rem)',
              lineHeight: '1.9',
              color: 'rgba(255,255,255,0.82)',
              margin: 0,
            }}>
              Locomotive diesel-électrique en service sur le réseau
              SNCFT. Ce jumeau numérique évalue les conditions
              météorologiques et l'état de l'infrastructure, prédit
              les risques et simule des scénarios de danger grâce
              à l'intelligence artificielle.
            </p>

          </div>
        </div>

        {/* ── PHASE 3 ── */}
        <div style={{ height: '100vh' }} />

      </div>
    </>
  )
}
