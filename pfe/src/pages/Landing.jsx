import { useEffect, useRef, useState } from 'react'
import CanvasWrapper from '../components/layout/CanvasWrapper'
import HologramLocomotive from '../components/three/HologramLocomotive'
import SilkParticles from '../components/three/SilkParticles'
import LandingOverlay from '../components/ui/LandingOverlay'
import AuthPrompt from '../components/ui/AuthPrompt'
import Login from './Login'
import Signup from './Signup'

export default function Landing() {
  const [view, setView] = useState('landing') // 'landing' | 'login' | 'signup'
  // Shared ref: HologramLocomotive writes its Three.js object here each frame;
  // SilkParticles reads the position to drive the fabric interaction.
  const locomotiveRef = useRef(null)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div style={{ position: 'relative' }}>

      {/* Fixed 3D background */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0
      }}>
        <CanvasWrapper>
          <HologramLocomotive positionRef={locomotiveRef} />
          <SilkParticles locomotiveRef={locomotiveRef} />
        </CanvasWrapper>
      </div>

      {/* Scrollable content */}
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
          <Login onSwitchToSignup={() => setView('signup')} />
        )}

        {view === 'signup' && (
          <Signup onSwitchToLogin={() => setView('login')} />
        )}
      </div>

    </div>
  )
}
