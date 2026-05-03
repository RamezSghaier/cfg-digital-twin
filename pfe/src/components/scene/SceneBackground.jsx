import { forwardRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Sky, MeshReflectorMaterial } from '@react-three/drei'
import * as THREE from 'three'

function Scene() {
  return (
    <>
      <Sky
        distance={450000}
        sunPosition={[0, 0.003, -1]}
        turbidity={12}
        rayleigh={3}
        mieCoefficient={0.005}
        mieDirectionalG={0.995}
      />

      {/* Reflective water plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[2000, 2000]} />
        <MeshReflectorMaterial
          resolution={1024}
          blur={[200, 100]}
          mixBlur={0.8}
          mixStrength={1.5}
          roughness={0.15}
          depthScale={1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#050a0a"
          metalness={0.9}
          mirror={0.9}
        />
      </mesh>
    </>
  )
}

const SceneBackground = forwardRef(function SceneBackground({ isActive }, ref) {
  return (
    <Canvas
      camera={{ fov: 60, position: [0, 0.5, 0.1], near: 0.1, far: 1000000 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.2,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      style={{ width: '100vw', height: '100vh' }}
    >
      <Scene />
    </Canvas>
  )
})

export default SceneBackground
