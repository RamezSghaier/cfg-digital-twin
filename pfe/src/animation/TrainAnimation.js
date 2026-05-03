import * as THREE from 'three'

const BIN_COUNT = 200
// Safe t range — stay away from the endpoint region where the spline can extrapolate
const T_START = 0.02
const T_END   = 0.97

// Build a CatmullRomCurve3 from a filtered set of world-space vertices
function buildCurveFromVerts(verts, axis) {
  if (verts.length < 3) return null

  const railBbox = new THREE.Box3()
  verts.forEach(v => railBbox.expandByPoint(v))
  const minA  = railBbox.min[axis]
  const range = (railBbox.max[axis] - minA) || 1
  const binW  = range / BIN_COUNT

  const sumX   = new Float64Array(BIN_COUNT)
  const sumY   = new Float64Array(BIN_COUNT)
  const sumZ   = new Float64Array(BIN_COUNT)
  const counts = new Int32Array(BIN_COUNT)

  for (const v of verts) {
    const idx = Math.max(0, Math.min(BIN_COUNT - 1, Math.floor((v[axis] - minA) / binW)))
    sumX[idx] += v.x; sumY[idx] += v.y; sumZ[idx] += v.z; counts[idx]++
  }

  const waypoints = []
  for (let i = 0; i < BIN_COUNT; i++) {
    if (counts[i] > 0) {
      waypoints.push(new THREE.Vector3(
        sumX[i] / counts[i],
        sumY[i] / counts[i],
        sumZ[i] / counts[i],
      ))
    }
  }

  waypoints.sort((a, b) => a[axis] - b[axis])

  const trim    = Math.max(3, Math.floor(waypoints.length * 0.06))
  const clipped = waypoints.slice(trim, waypoints.length - trim)
  if (clipped.length < 3) return null

  for (let pass = 0; pass < 3; pass++) {
    for (let i = 1; i < clipped.length - 1; i++) {
      clipped[i].x = (clipped[i - 1].x + clipped[i].x + clipped[i + 1].x) / 3
      clipped[i].y = (clipped[i - 1].y + clipped[i].y + clipped[i + 1].y) / 3
      clipped[i].z = (clipped[i - 1].z + clipped[i].z + clipped[i + 1].z) / 3
    }
  }

  return new THREE.CatmullRomCurve3(clipped, false, 'catmullrom', 0.5)
}

// ── Extract both rail paths, return [nearest, other] relative to locoPos ─────
function extractBothCurves(railsScene, locoPos) {
  const allVerts = []

  railsScene.traverse(child => {
    if (!child.isMesh) return
    child.updateMatrixWorld(true)
    const pos = child.geometry.attributes.position
    if (!pos) return
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i)
      v.applyMatrix4(child.matrixWorld)
      allVerts.push(v)
    }
  })

  if (allVerts.length < 3) return [null, null]

  const bbox = new THREE.Box3()
  allVerts.forEach(v => bbox.expandByPoint(v))
  const size = new THREE.Vector3()
  bbox.getSize(size)
  const axis     = size.x >= size.z ? 'x' : 'z'
  const perpAxis = axis === 'x' ? 'z' : 'x'

  const perpVals = allVerts.map(v => v[perpAxis]).sort((a, b) => a - b)
  const median   = perpVals[Math.floor(perpVals.length / 2)]

  const curveA = buildCurveFromVerts(allVerts.filter(v => v[perpAxis] >= median), axis)
  const curveB = buildCurveFromVerts(allVerts.filter(v => v[perpAxis] <  median), axis)

  if (!curveA && !curveB) return [null, null]
  if (!curveA) return [curveB, null]
  if (!curveB) return [curveA, null]

  function minXZDistSq(curve) {
    const SAMPLES = 80
    let minD = Infinity
    for (let i = 0; i <= SAMPLES; i++) {
      const t = T_START + (T_END - T_START) * i / SAMPLES
      const p = curve.getPointAt(t)
      const dx = p.x - locoPos.x, dz = p.z - locoPos.z
      const d = dx * dx + dz * dz
      if (d < minD) minD = d
    }
    return minD
  }

  const dA = minXZDistSq(curveA)
  const dB = minXZDistSq(curveB)
  // nearest first, other second — swapRail() flips between them
  const nearest = dA <= dB ? curveA : curveB
  const other   = dA <= dB ? curveB : curveA
  console.log('[TrainAnimation] Auto-selected', dA <= dB ? 'A' : 'B',
    '— minXZDist²:', Math.min(dA, dB).toFixed(1), '(call swapRail() to use the other one)')
  return [nearest, other]
}

// ── TrainAnimation ─────────────────────────────────────────────────────────
export class TrainAnimation {
  constructor(loco, railsScene) {
    this.loco         = loco
    this._initialLocoY = loco.position.y   // reference Y — never changes
    this._curves      = extractBothCurves(railsScene, loco.position)
    this._railIdx     = 0
    this.curve        = this._curves[0]

    this._pitchX    = loco.rotation.x
    this.playing    = true
    this.speed      = 0.035
    this._wagons    = []
    this._wagonGapT = 0.04

    this._initFromCurve()
  }

  // Recompute yOffset from the original loco placement height, not the animated position
  _initFromCurve() {
    if (this.curve) {
      this.t = T_START
      const cp      = this.curve.getPointAt(this.t)
      this._yOffset = this._initialLocoY - cp.y
      console.log('[TrainAnimation] Path ready —', this.curve.points.length,
        'waypoints, Δy =', this._yOffset.toFixed(2))
    } else {
      this.t        = 0
      this._yOffset = 2.5
      console.warn('[TrainAnimation] Rail path extraction failed — loco will stay still')
    }
  }

  // Switch between the two detected rails
  swapRail() {
    this._railIdx = 1 - this._railIdx
    const next = this._curves[this._railIdx]
    if (!next) { console.warn('[TrainAnimation] No other rail to swap to'); return }
    this.curve = next
    this._initFromCurve()
    console.log('[TrainAnimation] Swapped to rail', this._railIdx)
  }

  setWagons(wagons) { this._wagons    = wagons }
  setWagonGap(gapT) { this._wagonGapT = gapT   }

  update(delta) {
    if (!this.playing || !this.curve) return

    this.t += this.speed * delta

    if (this.t >= T_END) {
      this.t = T_START
      this.wrapped = true
    } else {
      this.wrapped = false
    }

    const position = this.curve.getPointAt(this.t)
    this.loco.position.x = position.x
    this.loco.position.y = position.y + this._yOffset
    this.loco.position.z = position.z

    // Move each wagon behind the locomotive along the curve
    for (let i = 0; i < this._wagons.length; i++) {
      const wt = Math.max(T_START, this.t - this._wagonGapT * (i + 1))
      const wp = this.curve.getPointAt(wt)
      this._wagons[i].position.x = wp.x
      this._wagons[i].position.y = wp.y + this._yOffset
      this._wagons[i].position.z = wp.z
    }
  }

  setPlaying(v) { this.playing = Boolean(v) }
  setSpeed(v)   { this.speed = Math.max(0.001, v) }

  dispose() { /* pure data — nothing to release */ }
}
