import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'
import holographicVertexShader from '../../shaders/holographic/vertex.glsl'
import holographicFragmentShader from '../../shaders/holographic/fragment.glsl'

const material = new THREE.ShaderMaterial({
  vertexShader: holographicVertexShader,
  fragmentShader: holographicFragmentShader,
  uniforms: {
    uTime:  { value: 0 },
    uColor: { value: new THREE.Color('#70c1ff') }
  },
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false,
  blending: THREE.AdditiveBlending
})

export default function HologramLocomotive({ positionRef }) {
  const { scene } = useGLTF('/models/locomotiveFinale.glb')
  const ref = useRef()

  const rawMouse = useRef({ x: 0, y: 0 })
  const smoothMouse = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e) => {
      rawMouse.current.x = (e.clientX / window.innerWidth) * 2 - 1
      rawMouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Apply material once after model loads, not on every render
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) child.material = material
    })
  }, [scene])

  // Sync positionRef once after mount — ref.current is stable after first frame
  useEffect(() => {
    if (positionRef) positionRef.current = ref.current
  }, [positionRef])

  useScrollAnimation(ref)

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime()
    material.uniforms.uTime.value = time

    if (!ref.current) return

    const maxScroll = document.body.scrollHeight - window.innerHeight
    const t = maxScroll > 0 ? window.scrollY / maxScroll : 0

    if (t === 0) {
      const introProgress = Math.min(time / 2.5, 1)

      smoothMouse.current.x = THREE.MathUtils.lerp(smoothMouse.current.x, rawMouse.current.x, 0.05)
      smoothMouse.current.y = THREE.MathUtils.lerp(smoothMouse.current.y, rawMouse.current.y, 0.05)

      ref.current.rotation.y = smoothMouse.current.x * 0.4
      // add subtle tilt on top of the intro landing tilt
      ref.current.rotation.x += smoothMouse.current.y * 0.08

      // float once intro landing animation is done
      ref.current.position.y += Math.sin(time * 1.5) * 0.08 * introProgress
    }
  })

  return (
    <primitive
      ref={ref}
      object={scene}
      position={[0, 15, 0]}
      scale={0.6}
    />
  )
}

useGLTF.preload('/models/locomotiveFinale.glb')
