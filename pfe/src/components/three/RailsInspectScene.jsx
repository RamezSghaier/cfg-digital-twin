import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

export default function RailsInspectScene() {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    let w = mount.clientWidth || window.innerWidth
    let h = mount.clientHeight || window.innerHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x04091a)
    scene.fog = new THREE.FogExp2(0x04091a, 0.018)

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 500)
    camera.position.set(0, 6, 16)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(w, h)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)

    // Key light — warm top-front
    const dirLight = new THREE.DirectionalLight(0xfff4e0, 2.5)
    dirLight.position.set(6, 12, 8)
    dirLight.castShadow = true
    scene.add(dirLight)

    // Blue rim from behind
    const rimLight = new THREE.DirectionalLight(0x3a7bd5, 2.2)
    rimLight.position.set(-8, 4, -10)
    scene.add(rimLight)

    // Soft blue fill underneath
    const fillLight = new THREE.DirectionalLight(0x70c1ff, 0.7)
    fillLight.position.set(0, -6, 4)
    scene.add(fillLight)

    // Ambient
    scene.add(new THREE.AmbientLight(0x8ab4d4, 0.4))

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.55
    controls.enablePan = false
    controls.minDistance = 4
    controls.maxDistance = 40
    controls.target.set(0, 0, 0)
    controls.update()

    const loader = new GLTFLoader()
    loader.load('/models/rails_inspect.glb', gltf => {
      const model = gltf.scene

      const box = new THREE.Box3().setFromObject(model)
      const center = new THREE.Vector3()
      const size = new THREE.Vector3()
      box.getCenter(center)
      box.getSize(size)
      model.position.sub(center)

      const maxDim = Math.max(size.x, size.y, size.z)
      const scale = 13 / maxDim
      model.scale.setScalar(scale)

      model.traverse(child => {
        if (!child.isMesh) return
        child.castShadow = true
        child.receiveShadow = true
        // Boost metallic sheen on rail steel
        if (child.material) {
          child.material = child.material.clone()
          child.material.metalness = Math.max(child.material.metalness ?? 0, 0.65)
          child.material.roughness = Math.min(child.material.roughness ?? 1, 0.35)
        }
      })
      scene.add(model)

      // Fit camera to scaled model
      camera.position.set(0, size.y * scale + 3, size.z * scale + 9)
      controls.update()
    }, undefined, err => {
      console.error('[RailsInspectScene] load failed:', err)
    })

    function onResize() {
      w = mount.clientWidth
      h = mount.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    let frameId
    function animate() {
      frameId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', onResize)
      controls.dispose()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
}
