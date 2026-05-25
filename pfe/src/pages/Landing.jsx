import { useEffect, useRef, useState } from 'react'
import CanvasWrapper from '../components/layout/CanvasWrapper'
import HologramLocomotive from '../components/three/HologramLocomotive'
import SilkParticles from '../components/three/SilkParticles'
import LandingOverlay from '../components/ui/LandingOverlay'
import AuthPrompt from '../components/ui/AuthPrompt'
import Login from './Login'
import Signup from './Signup'

// ── App logo: twin diamonds (physical ◆ + digital ◇) ─────────────────────────
function AppLogo() {
  return (
    <svg width="38" height="30" viewBox="0 0 48 32" fill="none">
      {/* Left diamond — solid cyan (physical twin) */}
      <polygon
        points="12,2 22,16 12,30 2,16"
        fill="rgba(112,193,255,0.08)"
        stroke="#70c1ff"
        strokeWidth="1.6"
      />
      {/* Right diamond — white dashed (digital twin) */}
      <polygon
        points="36,2 46,16 36,30 26,16"
        fill="none"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="1.2"
        strokeDasharray="3.5 2.5"
      />
      {/* Bridge between twins */}
      <line x1="22" y1="16" x2="26" y2="16" stroke="rgba(112,193,255,0.45)" strokeWidth="1.2"/>
      {/* Anchor dots */}
      <circle cx="12" cy="16" r="2" fill="#70c1ff"/>
      <circle cx="36" cy="16" r="2" fill="rgba(255,255,255,0.55)"/>
    </svg>
  )
}


export default function Landing() {
  const [view, setView] = useState('landing')
  const locomotiveRef  = useRef(null)

  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <div style={{ position: 'relative' }}>

      <style>{`
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to   { opacity: 1; transform: translateY(0);     }
        }
        @keyframes logoPulse {
          0%,100% { filter: drop-shadow(0 0 3px rgba(112,193,255,0.35)); }
          50%      { filter: drop-shadow(0 0 10px rgba(112,193,255,0.85)); }
        }
        @keyframes btnShimmer {
          0%   { box-shadow: 0 0 0px rgba(112,193,255,0);    }
          50%  { box-shadow: 0 0 18px rgba(112,193,255,0.22); }
          100% { box-shadow: 0 0 0px rgba(112,193,255,0);    }
        }
      `}</style>

      {/* ── Fixed 3D background ── */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0 }}>
        <CanvasWrapper>
          <HologramLocomotive positionRef={locomotiveRef} />
          <SilkParticles locomotiveRef={locomotiveRef} />
        </CanvasWrapper>
      </div>

      {/* ── Fixed top bar — only visible on landing view ── */}
      {view === 'landing' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 36px',
          pointerEvents: 'none',
        }}>

          {/* Left: app logo + SNCFT */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            pointerEvents: 'all',
            animation: 'fadeSlideDown 0.7s cubic-bezier(0.22,1,0.36,1) 0.2s both',
          }}>

            {/* App logo */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '9px',
              animation: 'logoPulse 4s ease-in-out 1.2s infinite',
            }}>
              <AppLogo />
              <div style={{ fontFamily: 'monospace', lineHeight: 1.35 }}>
                <div style={{ color: '#ffffff', fontSize: '0.74rem', letterSpacing: '0.22em', textShadow: '0 0 8px #70c1ff' }}>
                  JUMEAU
                </div>
                <div style={{ color: '#ffffff', fontSize: '0.74rem', letterSpacing: '0.22em', textShadow: '0 0 8px #70c1ff' }}>
                  NUMÉRIQUE
                </div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.14)' }} />

            {/* SNCFT */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <img
                src="/Logo_-_SNCFT.png"
                alt="SNCFT"
                style={{ height: 28, width: 'auto', filter: 'brightness(0) invert(1)', opacity: 0.85 }}
              />
              <div style={{ fontFamily: 'monospace', lineHeight: 1.4 }}>
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.66rem', letterSpacing: '0.3em' }}>
                  SNCFT
                </div>
                <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.47rem', letterSpacing: '0.14em' }}>
                  ZONE SUD-OUEST
                </div>
              </div>
            </div>
          </div>

          {/* Right: login button */}
          <button
            onClick={() => setView('login')}
            style={{
              pointerEvents: 'all',
              animation: 'fadeSlideDown 0.7s cubic-bezier(0.22,1,0.36,1) 0.45s both, btnShimmer 3.5s ease-in-out 1.5s infinite',
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '0.6rem 1.5rem',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.28)',
              borderRadius: '30px',
              color: '#ffffff',
              fontFamily: 'monospace',
              fontSize: '0.72rem',
              letterSpacing: '0.28em',
              cursor: 'pointer',
              textShadow: '0 0 8px rgba(112,193,255,0.6)',
              transition: 'background 0.25s ease, border-color 0.25s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(112,193,255,0.18)'
              e.currentTarget.style.borderColor = 'rgba(112,193,255,0.65)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.28)'
            }}
          >
            CONNEXION
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>

        </div>
      )}

      {/* ── Scrollable content ── */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {view === 'landing' && (
          <>
            <LandingOverlay />
            <AuthPrompt
              onLogin={() => setView('login')}
              onSignup={() => setView('signup')}
            />
          </>
        )}

        {view === 'login' && (
          <Login onSwitchToSignup={() => setView('signup')} onBack={() => setView('landing')} />
        )}

        {view === 'signup' && (
          <Signup onSwitchToLogin={() => setView('login')} onBack={() => setView('landing')} />
        )}
      </div>

    </div>
  )
}
