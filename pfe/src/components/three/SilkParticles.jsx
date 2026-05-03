import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import silkVertex   from '../../shaders/silk/vertex.glsl'
import silkFragment from '../../shaders/silk/fragment.glsl'

// Grid resolution and circular radius of the fabric
const COUNT_X  = 220
const COUNT_Z  = 220
const RADIUS   = 27   // circle radius in world units (grid spans ±RADIUS in x/z)

// Y position in world space where the fabric sits (locomotive lands at ~1.7)
const FABRIC_Y = 1.5

export default function SilkParticles({ locomotiveRef }) {
  const hasImpactedRef = useRef(false)

  const { positions, material } = useMemo(() => {
    const count = COUNT_X * COUNT_Z
    const pos   = new Float32Array(count * 3)

    for (let i = 0; i < COUNT_X; i++) {
      for (let j = 0; j < COUNT_Z; j++) {
        const idx = (i * COUNT_Z + j) * 3
        const x   = (i / (COUNT_X - 1) - 0.5) * RADIUS * 2
        const z   = (j / (COUNT_Z - 1) - 0.5) * RADIUS * 2
        if (x * x + z * z > RADIUS * RADIUS) {
          pos[idx]     = 0
          pos[idx + 1] = -9999
          pos[idx + 2] = 0
        } else {
          pos[idx]     = x
          pos[idx + 1] = 0
          pos[idx + 2] = z
        }
      }
    }

    const mat = new THREE.ShaderMaterial({
      vertexShader:   silkVertex,
      fragmentShader: silkFragment,
      uniforms: {
        uTime:         { value: 0 },
        uImpactTime:   { value: -1 },           // -1 = no impact yet
        uLocomotiveXZ: { value: new THREE.Vector2(0, 0) },
        uLocomotiveY:  { value: 20.0 },         // starts high (far above fabric)
        uPixelRatio:   { value: Math.min(window.devicePixelRatio, 2) },
      },
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
    })

    return { positions: pos, material: mat }
  }, [])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    material.uniforms.uTime.value = t

    const loco = locomotiveRef?.current
    if (!loco) return

    const { x, y, z } = loco.position

    material.uniforms.uLocomotiveXZ.value.set(x, z)
    material.uniforms.uLocomotiveY.value = y

    if (!hasImpactedRef.current && y > 0.5 && y < 2.2) {
      hasImpactedRef.current = true
      material.uniforms.uImpactTime.value = t
    }
  })

  return (
    <points position={[0, FABRIC_Y, 0]}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={COUNT_X * COUNT_Z}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </points>
  )
}
