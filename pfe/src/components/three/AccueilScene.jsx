import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import holographicVertexShader   from '../../shaders/holographic/vertex.glsl'
import holographicFragmentShader from '../../shaders/holographic/fragment.glsl'

export default function AccueilScene() {
  const { scene } = useGLTF('/models/locomotiveFinale.glb')
  const ref = useRef()

  // Fresh material instance — doesn't conflict with Landing's module-level material
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   holographicVertexShader,
    fragmentShader: holographicFragmentShader,
    uniforms: {
      uTime:  { value: 0 },
      uColor: { value: new THREE.Color('#70c1ff') },
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
    // Continuous gentle rotation + float — no scroll dependency
    ref.current.rotation.y += 0.0025
    ref.current.position.y = 1.7 + Math.sin(clock.getElapsedTime() * 1.2) * 0.1
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
