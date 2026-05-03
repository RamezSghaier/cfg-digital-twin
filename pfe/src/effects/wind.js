import * as THREE from 'three'

// 5 000 debris particles + motion-blur streak lines for strong wind
const COUNT     = 5000
const SPREAD    = 500
const BASE_SPD  = 200   // debris horizontal speed
const STREAK_SPD = 320  // streaks fly faster for blur feel

export function activate(ctx) {
  const { scene, ambientLight, fog } = ctx

  const orig = {
    ambientColor:     ambientLight.color.getHex(),
    ambientIntensity: ambientLight.intensity,
    fogColor:         fog.color.getHex(),
    fogDensity:       fog.density,
  }

  // Dusty, slightly dimmed atmosphere
  ambientLight.color.setHex(0xbbaa88)
  ambientLight.intensity = 0.55
  fog.color.setHex(0xbba882)
  fog.density = 0.01

  // ── Debris particles (dust, pebbles, dry leaves) ─────────────────────────
  const positions = new Float32Array(COUNT * 3)
  const speeds    = new Float32Array(COUNT)
  const phases    = new Float32Array(COUNT)

  for (let i = 0; i < COUNT; i++) {
    const b = i * 3
    positions[b]     = (Math.random() - 0.5) * SPREAD
    positions[b + 1] = 1 + Math.random() * 60
    positions[b + 2] = (Math.random() - 0.5) * SPREAD
    speeds[i]  = BASE_SPD * (0.6 + Math.random() * 0.8)
    phases[i]  = Math.random() * Math.PI * 2
  }

  const debrisGeo = new THREE.BufferGeometry()
  debrisGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const debrisMat = new THREE.PointsMaterial({
    color:       0x9a8060,
    size:        0.7,
    transparent: true,
    opacity:     0.7,
    depthWrite:  false,
    sizeAttenuation: true,
  })

  const debris = new THREE.Points(debrisGeo, debrisMat)
  debris.name = '_weather_wind_debris'
  scene.add(debris)

  // ── Horizontal streak lines — thin elongated segments for motion blur ────
  const streakPos    = new Float32Array(COUNT * 6)
  const streakSpeeds = new Float32Array(COUNT)

  for (let i = 0; i < COUNT; i++) {
    const b = i * 6
    const x   = (Math.random() - 0.5) * SPREAD
    const y   = 1 + Math.random() * 50
    const z   = (Math.random() - 0.5) * SPREAD
    const len = 2 + Math.random() * 7
    // Start vertex
    streakPos[b]     = x;       streakPos[b + 1] = y; streakPos[b + 2] = z
    // End vertex (same Y/Z, offset on X for horizontal streak)
    streakPos[b + 3] = x + len; streakPos[b + 4] = y; streakPos[b + 5] = z
    streakSpeeds[i]  = STREAK_SPD * (0.7 + Math.random() * 0.6)
  }

  const streakGeo = new THREE.BufferGeometry()
  streakGeo.setAttribute('position', new THREE.BufferAttribute(streakPos, 3))

  const streakMat = new THREE.LineBasicMaterial({
    color:       0xd4c4a0,
    transparent: true,
    opacity:     0.22,
  })

  const streaks = new THREE.LineSegments(streakGeo, streakMat)
  streaks.name = '_weather_wind_streaks'
  scene.add(streaks)

  return { orig, debris, positions, speeds, phases, streaks, streakPos, streakSpeeds }
}

export function update(ctx, state, delta, elapsed) {
  const { camera } = ctx
  const { debris, positions, speeds, phases, streaks, streakPos, streakSpeeds } = state
  if (!debris) return

  // Center both systems on camera
  debris.position.x  = camera.position.x
  debris.position.z  = camera.position.z
  streaks.position.x = camera.position.x
  streaks.position.z = camera.position.z

  // Subtle camera shake — continuous small oscillation
  camera.position.x += Math.sin(elapsed * 7.3) * 0.02
  camera.position.y += Math.sin(elapsed * 5.1) * 0.015

  // ── Update debris ─────────────────────────────────────────────────────────
  for (let i = 0; i < COUNT; i++) {
    const b = i * 3
    positions[b] -= speeds[i] * delta
    // Vertical turbulence so debris bounces up and down
    positions[b + 1] += Math.sin(elapsed * 2.0 + phases[i]) * 3 * delta

    // Wrap to opposite side when debris exits left
    if (positions[b] < -SPREAD * 0.5) {
      positions[b]     = SPREAD * 0.5
      positions[b + 1] = 1 + Math.random() * 60
      positions[b + 2] = (Math.random() - 0.5) * SPREAD
    }
  }
  debris.geometry.attributes.position.needsUpdate = true

  // ── Update streaks ────────────────────────────────────────────────────────
  for (let i = 0; i < COUNT; i++) {
    const b = i * 6
    streakPos[b]     -= streakSpeeds[i] * delta
    streakPos[b + 3] -= streakSpeeds[i] * delta

    if (streakPos[b + 3] < -SPREAD * 0.5) {
      const x   = SPREAD * 0.5
      const y   = 1 + Math.random() * 50
      const z   = (Math.random() - 0.5) * SPREAD
      const len = 2 + Math.random() * 7
      streakPos[b]     = x;       streakPos[b + 1] = y; streakPos[b + 2] = z
      streakPos[b + 3] = x + len; streakPos[b + 4] = y; streakPos[b + 5] = z
    }
  }
  streaks.geometry.attributes.position.needsUpdate = true
}

export function deactivate(ctx, state) {
  const { scene, ambientLight, fog } = ctx
  const { orig, debris, streaks } = state

  scene.remove(debris)
  debris.geometry.dispose()
  debris.material.dispose()

  scene.remove(streaks)
  streaks.geometry.dispose()
  streaks.material.dispose()

  ambientLight.color.setHex(orig.ambientColor)
  ambientLight.intensity = orig.ambientIntensity
  fog.color.setHex(orig.fogColor)
  fog.density = orig.fogDensity
}
