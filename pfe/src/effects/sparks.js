/**
 * sparks.js — 2D canvas overlay friction sparks
 *
 * Approach: a transparent <canvas> fixed on top of the WebGL canvas (same as
 * CSS2DRenderer), so sparks always originate from the train's exact screen
 * position regardless of 3D coordinate issues.
 *
 * Each frame:
 *  1. Project wheel-rail contact point → screen (px).
 *  2. Derive screen-space backward direction from the 3D curve tangent.
 *  3. Spawn new particles from that point with cone-spread velocities.
 *  4. Integrate 2D physics (velocity + gravity) for all live particles.
 *  5. Draw with radialGradient + globalCompositeOperation:'lighter' (additive).
 */

import * as THREE from 'three'

// ─── Config ───────────────────────────────────────────────────────────────────
const SPAWN_RATE     = 160         // particles / second at full intensity
const RAMP_DURATION  = 2.0         // seconds to reach full rate (progressive braking)
const GRAVITY_PX     = 380         // screen-space gravity  px / s²
const CONE_SPREAD    = 1.05        // half-angle of emission cone (radians ≈ 60°) — wide spread
const SPEED_MIN      = 55          // px / s
const SPEED_MAX      = 260         // px / s  (high spread = varied streak lengths)
const UPWARD_BIAS    = 45          // extra upward px/s injected on spawn
const WHEEL_Y_OFFSET = -2.5        // world units below loco centre → contact point
const TRAIL_TIME     = 0.055       // seconds of trail behind each particle (streak length)

// ─── Reusable Three.js vectors (avoid per-frame allocation) ──────────────────
const _wp1 = new THREE.Vector3()
const _wp2 = new THREE.Vector3()

/**
 * Project a world-space position to canvas pixel coordinates.
 * @param {THREE.Vector3} worldPos
 * @param {THREE.Camera}  camera
 * @param {number} W  canvas pixel width
 * @param {number} H  canvas pixel height
 * @param {THREE.Vector3} out  reusable vector
 * @returns {{ x:number, y:number }}
 */
function toScreen(worldPos, camera, W, H, out) {
  out.copy(worldPos).project(camera)
  return {
    x: (out.x + 1) * 0.5 * W,
    y: (-out.y + 1) * 0.5 * H,
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Create the 2D canvas overlay and return the mutable state object.
 *
 * @param {THREE.Camera}    camera
 * @param {TrainAnimation}  trainAnim
 * @returns {object}  state — pass to update() / deactivate()
 */
export function activate(camera, trainAnim, offset) {
  const canvas = document.createElement('canvas')
  canvas.width  = window.innerWidth
  canvas.height = window.innerHeight
  Object.assign(canvas.style, {
    position:      'fixed',
    top:           '0',
    left:          '0',
    width:         '100%',
    height:        '100%',
    pointerEvents: 'none',
    zIndex:        '15',   // above WebGL canvas (z:0) and label renderer (z:10)
  })
  document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')

  function onResize() {
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
  }
  window.addEventListener('resize', onResize)

  return {
    canvas,
    ctx,
    camera,
    trainAnim,
    offset,                // shared reference — GUI mutations apply immediately
    particles:  [],
    elapsed:    0,
    spawnAccum: 0,
    onResize,
  }
}

/**
 * Advance simulation by one frame and redraw.
 *
 * @param {object} state     — from activate()
 * @param {number} delta     — seconds since last frame
 */
export function update(state, delta) {
  const { canvas, ctx, camera, trainAnim, particles, offset } = state

  const W = canvas.width
  const H = canvas.height

  // Clear previous frame
  ctx.clearRect(0, 0, W, H)

  const loco = trainAnim?.loco
  if (!loco || !trainAnim?.curve) return

  // ── Emission point — GUI-controlled offset applied in world space ────────
  _wp1.copy(loco.position)
  _wp1.x += offset.x
  _wp1.y += offset.y
  _wp1.z += offset.z
  const origin = toScreen(_wp1, camera, W, H, _wp2)

  // ── Screen-space backward direction from 3D tangent ─────────────────────
  const t = Math.min(Math.max(trainAnim.t, 0.001), 0.999)
  const tangent = trainAnim.curve.getTangentAt(t)

  _wp1.copy(loco.position)
  _wp1.x += offset.x
  _wp1.y += offset.y
  _wp1.z += offset.z
  _wp1.addScaledVector(tangent, 2)
  const tip = toScreen(_wp1, camera, W, H, _wp2)

  let bx = origin.x - tip.x                           // backward X
  let by = origin.y - tip.y                           // backward Y
  const bLen = Math.sqrt(bx * bx + by * by)
  if (bLen > 0.5) { bx /= bLen; by /= bLen }
  else            { bx = 0;      by = -1 }            // fallback: straight up

  // ── Progressive spawn rate (ramp-up simulates brakes being applied) ──────
  state.elapsed    += delta
  const intensity   = Math.min(state.elapsed / RAMP_DURATION, 1.0)
  state.spawnAccum += SPAWN_RATE * intensity * delta
  const toSpawn     = Math.floor(state.spawnAccum)
  state.spawnAccum -= toSpawn

  for (let s = 0; s < toSpawn; s++) {
    // Rotate backward direction by a random angle within the wide cone
    const angle = (Math.random() - 0.5) * 2 * CONE_SPREAD
    const cos   = Math.cos(angle)
    const sin   = Math.sin(angle)
    const dx    =  bx * cos - by * sin
    const dy    =  bx * sin + by * cos
    const speed = SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN)

    particles.push({
      x:       origin.x + (Math.random() - 0.5) * 5,
      y:       origin.y + (Math.random() - 0.5) * 3,
      vx:      dx * speed + (Math.random() - 0.5) * 30,
      vy:      dy * speed - UPWARD_BIAS - Math.random() * 50,
      life:    0,
      maxLife: 0.20 + Math.random() * 0.60,
      width:   0.6 + Math.random() * 1.6,   // stroke thickness (thin = real spark)
      seed:    Math.random(),
    })
  }

  // ── Update + draw ─────────────────────────────────────────────────────────
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.life += delta

    if (p.life >= p.maxLife) { particles.splice(i, 1); continue }

    // Physics: gravity + tiny random turbulence so paths curve naturally
    p.vx += (Math.random() - 0.5) * 18 * delta
    p.vy += GRAVITY_PX * delta
    p.x  += p.vx * delta
    p.y  += p.vy * delta

    const age = p.life / p.maxLife      // 0 → 1

    // ── Colour at head (tip) ─────────────────────────────────────────────
    // 0.00 – 0.25 : white-hot / yellow
    // 0.25 – 0.65 : yellow → orange
    // 0.65 – 1.00 : orange → deep red
    let hr, hg, hb, alpha
    if (age < 0.25) {
      const k = age / 0.25
      hr = 255; hg = Math.round(255 - k * 45); hb = Math.round(180 - k * 180)
      alpha = 1.0
    } else if (age < 0.65) {
      const k = (age - 0.25) / 0.40
      hr = 255; hg = Math.round(210 - k * 175); hb = 0
      alpha = 1 - k * 0.35
    } else {
      const k = (age - 0.65) / 0.35
      hr = Math.round(255 - k * 130); hg = Math.round(35 - k * 35); hb = 0
      alpha = (1 - age) * 1.1
    }

    // Flicker: subtle, high-freq, per-particle
    const flicker = 0.78 + 0.22 * Math.sin(p.seed * 113.7 + p.life * 71)
    const a = Math.max(0, alpha * flicker)

    // ── Streak: line from tail to head ────────────────────────────────────
    // Tail position = where particle was TRAIL_TIME seconds ago at current velocity
    const tailX = p.x - p.vx * TRAIL_TIME
    const tailY = p.y - p.vy * TRAIL_TIME

    const streak = ctx.createLinearGradient(tailX, tailY, p.x, p.y)
    streak.addColorStop(0, `rgba(${hr},${Math.round(hg * 0.5)},0,0)`)          // tail: transparent
    streak.addColorStop(0.6, `rgba(${hr},${hg},${hb},${(a * 0.55).toFixed(3)})`)
    streak.addColorStop(1, `rgba(${hr},${hg},${hb},${a.toFixed(3)})`)           // head: full colour

    ctx.beginPath()
    ctx.moveTo(tailX, tailY)
    ctx.lineTo(p.x, p.y)
    ctx.lineWidth  = p.width * (1 - age * 0.65)
    ctx.strokeStyle = streak
    ctx.stroke()

    // ── Tiny bright tip dot (young sparks only) ───────────────────────────
    if (age < 0.40) {
      const tipA  = (1 - age / 0.40) * a * 0.9
      const tipR  = p.width * 2.2
      const tip   = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, tipR)
      tip.addColorStop(0, `rgba(255,255,230,${tipA.toFixed(3)})`)
      tip.addColorStop(1, `rgba(255,200,50,0)`)
      ctx.beginPath()
      ctx.arc(p.x, p.y, tipR, 0, Math.PI * 2)
      ctx.fillStyle = tip
      ctx.fill()
    }
  }

  ctx.restore()
}

/**
 * Remove the canvas overlay and clean up.
 * First param is `scene` (unused here) for API symmetry with WeatherManager effects.
 */
export function deactivate(_scene, state) {
  window.removeEventListener('resize', state.onResize)
  if (state.canvas?.parentNode) state.canvas.parentNode.removeChild(state.canvas)
  state.particles.length = 0
}
