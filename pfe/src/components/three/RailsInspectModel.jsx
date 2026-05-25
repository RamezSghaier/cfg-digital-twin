import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

export default function RailsInspectModel({ modelPath = '/models/rails_inspect.glb' }) {
  const { scene } = useGLTF(modelPath)
  const groupRef  = useRef()

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true)
    clone.updateMatrixWorld(true)

    const box    = new THREE.Box3().setFromObject(clone)
    const center = new THREE.Vector3()
    const size   = new THREE.Vector3()
    box.getCenter(center)
    box.getSize(size)

    // Center at origin, scale to a fixed viewport size
    clone.position.sub(center)
    clone.scale.setScalar(4.5 / Math.max(size.x, size.y, size.z))

    clone.traverse(child => {
      if (!child.isMesh || !child.material) return
      child.material = child.material.clone()
      child.material.metalness = Math.max(child.material.metalness ?? 0, 0.72)
      child.material.roughness = Math.min(child.material.roughness ?? 1, 0.28)
    })
    return clone
  }, [scene])

 

  return (
    <>
      <OrbitControls enablePan={false} minDistance={4} maxDistance={20} enableDamping dampingFactor={0.06} />
      {/* Blue rim from behind — gives rails that holographic steel sheen */}
      <directionalLight color="#3a7bd5" intensity={2.8} position={[-6, 3, -8]} />
      {/* Warm top key */}
      <directionalLight color="#fff4e0" intensity={1.8} position={[5, 9, 6]} />

      <group ref={groupRef} position={[0, 2.2, 0]}>
        <primitive object={clonedScene} />
      </group>
    </>
  )
}

useGLTF.preload('/models/rails_inspect.glb')
useGLTF.preload('/models/voie_bibloc.glb')
