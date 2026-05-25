import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import holographicVertexShader   from '../../shaders/holographic/vertex.glsl'
import holographicFragmentShader from '../../shaders/holographic/fragment.glsl'

const COLOR_SIMULATION = '#70c1ff'  // cyan  — GPS offline
const COLOR_GPS_LIVE   = '#fbbf24'  // gold  — GPS live

export default function AccueilScene({ trainPosition = null }) {
  const { scene } = useGLTF('/models/locomotiveFinale.glb')
  const ref = useRef()
  const trainPosRef = useRef(trainPosition)

  // Keep ref in sync without triggering re-renders
  useEffect(() => { trainPosRef.current = trainPosition }, [trainPosition])

  // Fresh material instance — doesn't conflict with Landing's module-level material
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   holographicVertexShader,
    fragmentShader: holographicFragmentShader,
    uniforms: {
      uTime:  { value: 0 },
      uColor: { value: new THREE.Color(COLOR_SIMULATION) },
    },
    transparent: true,
    side:        THREE.DoubleSide,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
  }), [])

  // Clone the cached GLB scene so Landing's material assignments don't bleed over
  const clonedScene = useMemo(() => {
    const clone = scene.clone()
    clone.traverse(child => {
      if (child.isMesh) child.material = material
    })
    return clone
  }, [scene, material])

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.getElapsedTime()
    if (!ref.current) return

    const pos = trainPosRef.current
    const isLive = pos &&
      (Date.now() - new Date(pos.timestamp).getTime() < 60_000)

    if (isLive) {
      // GPS live — rotation speed driven by real train speed (0→120 km/h → 0.001→0.01 rad/frame)
      const speedKmh = pos.speed_kmh ?? 0
      ref.current.rotation.y += 0.001 + (speedKmh / 120) * 0.009
      ref.current.position.y = 1.7          // stable — no floating
      material.uniforms.uColor.value.set(COLOR_GPS_LIVE)
    } else {
      // Simulation — original gentle rotation + float
      ref.current.rotation.y += 0.0025
      ref.current.position.y = 1.7 + Math.sin(clock.getElapsedTime() * 1.2) * 0.1
      material.uniforms.uColor.value.set(COLOR_SIMULATION)
    }
  })

  return (
    <>
      <OrbitControls
        enablePan={false}
        minDistance={4}
        maxDistance={16}
        enableDamping
        dampingFactor={0.06}
      />
      <primitive ref={ref} object={clonedScene} scale={0.6} position={[0, 1.7, 0]} />
    </>
  )
}

useGLTF.preload('/models/locomotiveFinale.glb')
