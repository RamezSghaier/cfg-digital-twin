import { useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'

export default function CanvasWrapper({ children, noScrollGuard = false }) {
  const wrapperRef = useRef()

  useEffect(() => {
    const el = wrapperRef.current

    const handleDblClick = () => {
      if (!noScrollGuard && window.scrollY > 10) return

      const fullscreenElement =
        document.fullscreenElement || document.webkitFullscreenElement

      if (!fullscreenElement) {
        if (el.requestFullscreen) {
          el.requestFullscreen()
        } else if (el.webkitRequestFullscreen) {
          el.webkitRequestFullscreen()
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen()
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen()
        }
      }
    }

    // Listen on window so overlay divs (zIndex > canvas) don't block the event
    window.addEventListener('dblclick', handleDblClick)
    return () => window.removeEventListener('dblclick', handleDblClick)
  }, [])

  return (
    <div ref={wrapperRef} style={{ width: '100vw', height: '100vh' }}>
    <Canvas
      camera={{
        fov: 45,
        position: [5, 5, 5],
        near: 0.1,
        far: 100
      }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.5,
        outputColorSpace: THREE.SRGBColorSpace
      }}
      style={{
        width: '100vw',
        height: '100vh',
        background: '#000000'
      }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 3]} intensity={2} />

      {children}
    </Canvas>
    </div>
  )
}
