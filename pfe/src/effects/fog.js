import * as THREE from 'three'

// 3 large transparent planes at different heights simulate volumetric fog layers
const PLANE_CONFIGS = [
  { y: 2,  baseOpacity: 0.35, driftSpeed: 3.0 },
  { y: 9,  baseOpacity: 0.22, driftSpeed: 1.8 },
  { y: 20, baseOpacity: 0.14, driftSpeed: 1.1 },
]

export function activate(ctx) {
  const { scene, ambientLight, fog } = ctx

  const orig = {
    ambientColor:     ambientLight.color.getHex(),
    ambientIntensity: ambientLight.intensity,
    fogColor:         fog.color.getHex(),
    fogDensity:       fog.density,
  }

  // Cold grey-white overcast atmosphere
  ambientLight.color.setHex(0xaabbcc)
  ambientLight.intensity = 0.3
  fog.color.setHex(0xc8d0d8)
  fog.density = 0.035

  // Build layered fog planes — large flat quads drifting slowly across the scene
  const fogPlanes = PLANE_CONFIGS.map(({ y, baseOpacity, driftSpeed }, i) => {
    const geo = new THREE.PlaneGeometry(1400, 1400)
    const mat = new THREE.MeshBasicMaterial({
      color:       0xc8d0d8,
      transparent: true,
      opacity:     baseOpacity,
      depthWrite:  false,
      side:        THREE.DoubleSide,
    })
    const plane = new THREE.Mesh(geo, mat)
    plane.rotation.x = -Math.PI / 2
    plane.position.y = y
    plane.name = `_weather_fog_${i}`
    scene.add(plane)
    return { plane, mat, baseOpacity, driftSpeed, offsetX: Math.random() * 100 }
  })

  return { orig, fogPlanes }
}

export function update(ctx, state, delta, elapsed) {
  const { camera, fog } = ctx
  const { fogPlanes } = state
  if (!fogPlanes) return

  for (const { plane, mat, baseOpacity, driftSpeed, offsetX } of fogPlanes) {
    // Follow camera so fog is always visible
    plane.position.x = camera.position.x + Math.sin(elapsed * 0.05 + offsetX) * 40
    plane.position.z = camera.position.z + Math.cos(elapsed * 0.04 + offsetX) * 30

    // Gently pulse opacity to make the fog feel alive
    mat.opacity = baseOpacity + Math.sin(elapsed * driftSpeed * 0.3) * 0.04
  }

  // Slowly pulse overall fog density for atmospheric breathing effect
  fog.density = 0.035 + Math.sin(elapsed * 0.25) * 0.005
}

export function deactivate(ctx, state) {
  const { scene, ambientLight, fog } = ctx
  const { orig, fogPlanes } = state

  for (const { plane } of fogPlanes) {
    scene.remove(plane)
    plane.geometry.dispose()
    plane.material.dispose()
  }

  ambientLight.color.setHex(orig.ambientColor)
  ambientLight.intensity = orig.ambientIntensity
  fog.color.setHex(orig.fogColor)
  fog.density = orig.fogDensity
}
