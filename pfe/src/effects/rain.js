import * as THREE from 'three'

// One Points object — each vertex is one raindrop.
// Per-vertex velocity simulates gravity acceleration.
const COUNT = 15000

export function activate(ctx) {
  const { scene, ambientLight, fog } = ctx

  const orig = {
    ambientColor:     ambientLight.color.getHex(),
    ambientIntensity: ambientLight.intensity,
    fogColor:         fog.color.getHex(),
    fogDensity:       fog.density,
  }

  // Overcast sky
  ambientLight.color.setHex(0x8899aa)
  ambientLight.intensity = 0.35
  fog.color.setHex(0x7799bb)
  fog.density = 0.004

  // One flat position array — one vertex per raindrop (no duplicates)
  const positions  = new Float32Array(COUNT * 3)
  const velocities = new Float32Array(COUNT)   // Y velocity per drop, starts at 0

  for (let i = 0; i < COUNT; i++) {
    const b = i * 3
    positions[b]     = Math.random() * 400 - 200
    positions[b + 1] = Math.random() * 500 - 250
    positions[b + 2] = Math.random() * 400 - 200
    velocities[i]    = 0
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const mat = new THREE.PointsMaterial({
    color:       0xaaaaaa,
    size:        0.1,
    transparent: true,
  })

  const rain = new THREE.Points(geo, mat)
  rain.name = '_weather_rain'
  scene.add(rain)

  return { orig, rain, positions, velocities }
}

export function update(ctx, state) {
  const { rain, positions, velocities } = state
  if (!rain) return

  for (let i = 0; i < COUNT; i++) {
    const b = i * 3
    // Gravity: velocity grows downward each frame
    velocities[i] -= 0.1 + Math.random() * 0.1
    positions[b + 1] += velocities[i]

    // Reset drop back to the top when it exits the bottom
    if (positions[b + 1] < -200) {
      positions[b + 1] = 200
      velocities[i]    = 0
    }
  }

  rain.geometry.attributes.position.needsUpdate = true
  // Slow rotation gives a cinematic swirling look
  rain.rotation.y += 0.002
}

export function deactivate(ctx, state) {
  const { scene, ambientLight, fog } = ctx
  const { orig, rain } = state

  scene.remove(rain)
  rain.geometry.dispose()
  rain.material.dispose()

  ambientLight.color.setHex(orig.ambientColor)
  ambientLight.intensity = orig.ambientIntensity
  fog.color.setHex(orig.fogColor)
  fog.density = orig.fogDensity
}
