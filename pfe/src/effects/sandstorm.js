import * as THREE from 'three'

// 20 000 dust particles flying horizontally with sine-wave turbulence
const COUNT    = 20000
const SPREAD_X = 800
const SPREAD_Y = 80
const SPREAD_Z = 800
const BASE_SPD = 120   // units/sec base horizontal speed

export function activate(ctx) {
  const { scene, ambientLight, dirLight, fog } = ctx

  const orig = {
    ambientColor:     ambientLight.color.getHex(),
    ambientIntensity: ambientLight.intensity,
    dirColor:         dirLight.color.getHex(),
    fogColor:         fog.color.getHex(),
    fogDensity:       fog.density,
  }

  // Warm, hazy desert lighting
  ambientLight.color.setHex(0xcc9955)
  ambientLight.intensity = 0.6
  dirLight.color.setHex(0xdd8844)
  fog.color.setHex(0xd4874a)
  fog.density = 0.022

  // Per-particle data: position, speed (X), phase (for sine turbulence)
  const positions = new Float32Array(COUNT * 3)
  const speeds    = new Float32Array(COUNT)
  const phases    = new Float32Array(COUNT)

  for (let i = 0; i < COUNT; i++) {
    const b = i * 3
    positions[b]     = (Math.random() - 0.5) * SPREAD_X
    positions[b + 1] = Math.random() * SPREAD_Y
    positions[b + 2] = (Math.random() - 0.5) * SPREAD_Z
    speeds[i]  = BASE_SPD * (0.7 + Math.random() * 0.6)
    phases[i]  = Math.random() * Math.PI * 2
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const mat = new THREE.PointsMaterial({
    color:       0xc2a06e,
    size:        0.35,
    transparent: true,
    opacity:     0.65,
    depthWrite:  false,
  })

  const particles = new THREE.Points(geo, mat)
  particles.name = '_weather_sandstorm'
  scene.add(particles)

  // Semi-transparent sand plane laid over the rails — fades in over 3 seconds
  const planeGeo = new THREE.PlaneGeometry(700, 700)
  const planeMat = new THREE.MeshBasicMaterial({
    color:       0xc2a06e,
    transparent: true,
    opacity:     0,
    depthWrite:  false,
    side:        THREE.DoubleSide,
  })
  const sandPlane = new THREE.Mesh(planeGeo, planeMat)
  sandPlane.rotation.x = -Math.PI / 2
  sandPlane.position.y = 0.25
  sandPlane.name = '_weather_sand_plane'
  scene.add(sandPlane)

  // Full-viewport warm tint overlay — 8% opacity sandy color
  const overlay = document.createElement('div')
  overlay.id = '_weather_overlay'
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'pointer-events:none',
    'background:rgba(180,120,50,0.08)', 'z-index:100',
  ].join(';')
  document.body.appendChild(overlay)

  return { orig, particles, positions, speeds, phases, sandPlane, planeMat, overlay, startTime: performance.now() }
}

export function update(ctx, state, delta, elapsed) {
  const { camera } = ctx
  const { particles, positions, speeds, phases, planeMat, startTime } = state
  if (!particles) return

  // Keep particle field centered on camera
  particles.position.x = camera.position.x
  particles.position.z = camera.position.z

  for (let i = 0; i < COUNT; i++) {
    const b = i * 3
    // Drive particles left (negative X) at individual speed
    positions[b] -= speeds[i] * delta
    // Vertical turbulence via sine — gives swirling, not linear flight
    positions[b + 1] += Math.sin(elapsed * 1.5 + phases[i]) * 2.5 * delta
    // Slight Z drift for depth variation
    positions[b + 2] += Math.sin(elapsed * 0.7 + phases[i] + 1.3) * 5 * delta

    // Wrap: when a particle exits left edge, reset to right edge
    if (positions[b] < -SPREAD_X * 0.5) {
      positions[b]     = SPREAD_X * 0.5
      positions[b + 1] = Math.random() * SPREAD_Y
      positions[b + 2] = (Math.random() - 0.5) * SPREAD_Z
    }
  }
  particles.geometry.attributes.position.needsUpdate = true

  // Ramp sand plane opacity 0 → 0.85 over the first 3 seconds
  const age = (performance.now() - startTime) / 1000
  planeMat.opacity = Math.min(age / 3, 0.38)
}

export function deactivate(ctx, state) {
  const { scene, ambientLight, dirLight, fog } = ctx
  const { orig, particles, sandPlane, overlay } = state

  scene.remove(particles)
  particles.geometry.dispose()
  particles.material.dispose()

  scene.remove(sandPlane)
  sandPlane.geometry.dispose()
  sandPlane.material.dispose()

  if (overlay?.parentNode) overlay.parentNode.removeChild(overlay)

  ambientLight.color.setHex(orig.ambientColor)
  ambientLight.intensity = orig.ambientIntensity
  dirLight.color.setHex(orig.dirColor)
  fog.color.setHex(orig.fogColor)
  fog.density = orig.fogDensity
}
