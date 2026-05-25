import * as sparks from './sparks.js'

const DEG = Math.PI / 180

// Rotation thresholds for full-derailment spark behaviour (in radians)
const SPARKS_MOVE_AT  = -32.4 * DEG   // start drifting emitters when X reaches this
const SPARKS_STOP_AT  = -40.0 * DEG   // kill sparks when X reaches this

// Target Y offsets per emitter once movement starts
const SPARKS_Y_TARGETS = [-9.5, -10, -10]

const ALERT_DEFS = {
  normal: null,

  heatload: {
    icon:    '⚠️',
    title:   'CANICULE + SURCHARGE',
    message: 'Dilatation thermique critique — risque de flambement rail. Vitesse réduite de 50 %.',
    color:   '#f97316',
    bg:      'rgba(249,115,22,0.15)',
    border:  'rgba(249,115,22,0.55)',
  },

  rainbrake: {
    icon:    '🚨',
    title:   'PLUIE + FREINAGE D\'URGENCE',
    message: 'Adhérence rail/roue critique — distance de freinage ×3.4. Vitesse fortement réduite.',
    color:   '#ef4444',
    bg:      'rgba(239,68,68,0.15)',
    border:  'rgba(239,68,68,0.55)',
  },

  sandwear: {
    icon:    '🚨',
    title:   'TEMPÊTE DE SABLE + USURE CRITIQUE',
    message: 'Visibilité nulle + usure voie à 89 % du seuil — maintenance immédiate requise.',
    color:   '#dc2626',
    bg:      'rgba(220,38,38,0.15)',
    border:  'rgba(220,38,38,0.55)',
  },

  fogbrake: {
    icon:    '🌫️',
    title:   'BROUILLARD DENSE — VISIBILITÉ RÉDUITE',
    message: 'Visibilité inférieure à 50 m — distance de freinage critique. Réduction de vitesse obligatoire.',
    color:   '#94a3b8',
    bg:      'rgba(148,163,184,0.12)',
    border:  'rgba(148,163,184,0.45)',
  },

  curve: {
    icon:    '📐',
    title:   'COURBURE CRITIQUE DÉTECTÉE',
    message: 'Rayon de courbure sous le seuil minimal (300 m) — risque de déraillement à vitesse normale. Ralentissement imposé.',
    color:   '#a855f7',
    bg:      'rgba(168,85,247,0.12)',
    border:  'rgba(168,85,247,0.45)',
  },

  derail_partial: {
    icon:    '⚠️',
    title:   'DÉRAILLEMENT PARTIEL',
    message: 'Sortie partielle des rails détectée — instabilité latérale critique. Arrêt d\'urgence en cours.',
    color:   '#fb923c',
    bg:      'rgba(251,146,60,0.15)',
    border:  'rgba(251,146,60,0.55)',
  },

  derail_full: {
    icon:    '💥',
    title:   'DÉRAILLEMENT TOTAL — INCIDENT CRITIQUE',
    message: 'Locomotive hors voie — basculement complet. Intervention d\'urgence requise immédiatement.',
    color:   '#ff2020',
    bg:      'rgba(220,20,20,0.18)',
    border:  'rgba(255,32,32,0.65)',
  },
}

function lerp(a, b, t) { return a + (b - a) * t }

export class ScenarioManager {
  constructor({ weatherManager, trainAnim }) {
    this.weatherManager  = weatherManager
    this.trainAnim       = trainAnim
    this._scene          = weatherManager.ctx.scene
    this.currentScenario = 'normal'
    this._sparksStates   = [null, null, null]

    this.sparksOffsets = [
      { x:  6.2, y: -0.2, z: 0 },
      { x: -4.1, y: -0.2, z: 0 },
      { x:  3.8, y: -0.2, z: 0 },
    ]

    // Derailment animation state
    this._derailPhase     = 'none'
    this._derailTargetX   = 0
    this._derailTargetY   = null
    this._derailOrigRot   = null
    this._derailTimer     = 0
    this._derailStopAfter = 0
    this._derailStopped   = false
    this._savedSparksY    = null   // saved emitter Y values for full-derail restore

    this._buildAlert()
  }

  setScenario(type) {
    if (type === this.currentScenario) return
    this.currentScenario = type
    this._apply(type)
  }

  update(delta, _elapsed) {
    for (const state of this._sparksStates) {
      if (state) sparks.update(state, delta)
    }

    if (this._derailPhase === 'none') return
    const loco = this.trainAnim?.loco
    if (!loco) return

    // ── Progressive X-axis tilt ───────────────────────────────────────────
    loco.rotation.x = lerp(loco.rotation.x, this._derailTargetX, 0.003)

    // ── Timer: progressive speed decay then freeze ────────────────────────
    if (!this._derailStopped) {
      this._derailTimer += delta
      const DECEL_START = 2  // seconds at normal speed before braking begins
      if (this._derailTimer < DECEL_START) {
        this.trainAnim.setSpeed(0.035)
      } else {
        const progress = Math.min(
          (this._derailTimer - DECEL_START) / (this._derailStopAfter - DECEL_START), 1
        )
        this.trainAnim.setSpeed(0.035 * Math.pow(1 - progress, 2))
      }

      if (this._derailTimer >= this._derailStopAfter) {
        this._derailStopped = true
        this.trainAnim.setPlaying(false)
        if (this._derailPhase === 'partial') this._stopSparks()
        // Full-derail sparks are stopped by rotation threshold below
      }
    }

    // ── Full-derail only: rotation-based spark behaviour ──────────────────
    if (this._derailPhase === 'full') {
      const rx = loco.rotation.x

      if (rx <= SPARKS_STOP_AT) {
        // Kill all sparks once tilt passes -40°
        this._stopSparks()

      } else if (rx <= SPARKS_MOVE_AT) {
        // Between -32.4° and -40°: drift emitter Y offsets toward targets
        for (let i = 0; i < 3; i++) {
          this.sparksOffsets[i].y = lerp(
            this.sparksOffsets[i].y,
            SPARKS_Y_TARGETS[i],
            0.025,
          )
        }
      }

      // After train stops: lerp Y position to final resting value
      if (this._derailStopped && this._derailTargetY !== null) {
        loco.position.y = lerp(loco.position.y, this._derailTargetY, 0.01)
      }
    }
  }

  dispose() {
    this._resetDerail()
    this._stopSparks()
    if (this._alertEl?.parentNode) this._alertEl.parentNode.removeChild(this._alertEl)
  }

  // ── private ─────────────────────────────────────────────────────────────────

  _apply(type) {
    const { weatherManager, trainAnim } = this

    this._stopSparks()
    this._resetDerail()

    switch (type) {
      case 'normal':
        weatherManager.setWeather('clear')
        trainAnim?.setSpeed(0.035)
        trainAnim?.setPlaying(true)
        this._hideAlert()
        break

      case 'heatload':
        weatherManager.setWeather('heatwave')
        trainAnim?.setSpeed(0.018)
        trainAnim?.setPlaying(true)
        this._showAlert(ALERT_DEFS.heatload)
        break

      case 'rainbrake':
        weatherManager.setWeather('rain')
        trainAnim?.setSpeed(0.008)
        trainAnim?.setPlaying(true)
        this._showAlert(ALERT_DEFS.rainbrake)
        this._startSparks()
        break

      case 'sandwear':
        weatherManager.setWeather('sandstorm')
        trainAnim?.setSpeed(0.012)
        trainAnim?.setPlaying(true)
        this._showAlert(ALERT_DEFS.sandwear)
        break

      case 'fogbrake':
        weatherManager.setWeather('fog')
        trainAnim?.setSpeed(0.010)
        trainAnim?.setPlaying(true)
        this._showAlert(ALERT_DEFS.fogbrake)
        break

      case 'curve':
        weatherManager.setWeather('clear')
        trainAnim?.setSpeed(0.015)
        trainAnim?.setPlaying(true)
        this._showAlert(ALERT_DEFS.curve)
        break

      case 'derail_partial':
        weatherManager.setWeather('rain')
        trainAnim?.setSpeed(0.035)
        trainAnim?.setPlaying(true)
        this._saveDerailRotation()
        this._derailPhase     = 'partial'
        this._derailTargetX   = -5.9 * DEG
        this._derailTargetY   = null
        this._derailStopAfter = 7
        this._startSparks()
        this._showAlert(ALERT_DEFS.derail_partial)
        break

      case 'derail_full':
        weatherManager.setWeather('sandstorm')
        trainAnim?.setSpeed(0.035)
        trainAnim?.setPlaying(true)
        this._saveDerailRotation()
        // Save emitter Y values so they can be restored on reset
        this._savedSparksY = this.sparksOffsets.map(o => o.y)
        this._derailPhase     = 'full'
        this._derailTargetX   = -67.8 * DEG
        this._derailTargetY   = 52
        this._derailStopAfter = 9
        this._startSparks()
        this._showAlert(ALERT_DEFS.derail_full)
        break
    }
  }

  _saveDerailRotation() {
    if (!this.trainAnim?.loco || this._derailOrigRot) return
    const r = this.trainAnim.loco.rotation
    this._derailOrigRot = { x: r.x, y: r.y, z: r.z }
  }

  _resetDerail() {
    if (this._derailPhase === 'none') return
    const loco = this.trainAnim?.loco
    if (loco && this._derailOrigRot) {
      loco.rotation.x = this._derailOrigRot.x
      loco.rotation.y = this._derailOrigRot.y
      loco.rotation.z = this._derailOrigRot.z
    }
    // Restore spark emitter Y offsets
    if (this._savedSparksY) {
      this.sparksOffsets.forEach((o, i) => { o.y = this._savedSparksY[i] })
      this._savedSparksY = null
    }
    this.trainAnim?.setPlaying(true)
    this._derailPhase     = 'none'
    this._derailOrigRot   = null
    this._derailTargetX   = 0
    this._derailTargetY   = null
    this._derailTimer     = 0
    this._derailStopAfter = 0
    this._derailStopped   = false
  }

  _startSparks() {
    if (!this.trainAnim) return
    const camera = this.weatherManager.ctx.camera
    this._sparksStates = this.sparksOffsets.map(offset =>
      sparks.activate(camera, this.trainAnim, offset)
    )
  }

  _stopSparks() {
    for (let i = 0; i < this._sparksStates.length; i++) {
      if (this._sparksStates[i]) {
        sparks.deactivate(this._scene, this._sparksStates[i])
        this._sparksStates[i] = null
      }
    }
  }

  // ── Alert banner ─────────────────────────────────────────────────────────
  _buildAlert() {
    const el = document.createElement('div')
    el.style.cssText = [
      'position:fixed', 'top:28px', 'left:50%',
      'transform:translateX(-50%) translateY(-200%)',
      'z-index:2000', 'pointer-events:none',
      'font-family:system-ui,sans-serif',
      'transition:transform 0.45s cubic-bezier(0.16,1,0.3,1)',
      'max-width:520px', 'min-width:320px', 'width:max-content',
    ].join(';')
    document.body.appendChild(el)
    this._alertEl = el
  }

  _showAlert({ icon, title, message, color, bg, border }) {
    this._alertEl.innerHTML = `
      <div style="
        background:${bg};
        backdrop-filter:blur(16px);
        -webkit-backdrop-filter:blur(16px);
        border:1px solid ${border};
        border-radius:14px;
        padding:16px 22px;
        display:flex;
        gap:14px;
        align-items:flex-start;
        box-shadow:0 8px 32px rgba(0,0,0,0.5);
      ">
        <span style="font-size:1.9rem;line-height:1;flex-shrink:0">${icon}</span>
        <div>
          <div style="
            color:${color};font-size:0.7rem;font-weight:700;
            letter-spacing:0.18em;margin-bottom:5px;
          ">${title}</div>
          <div style="color:rgba(255,255,255,0.88);font-size:0.82rem;line-height:1.55">
            ${message}
          </div>
        </div>
      </div>
    `
    requestAnimationFrame(() => {
      this._alertEl.style.transform = 'translateX(-50%) translateY(0)'
    })
  }

  _hideAlert() {
    this._alertEl.style.transform = 'translateX(-50%) translateY(-200%)'
  }

}
