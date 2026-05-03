import * as rain      from './rain.js'
import * as sandstorm from './sandstorm.js'
import * as fog       from './fog.js'
import * as heatwave  from './heatwave.js'
import * as wind      from './wind.js'

const EFFECTS = { rain, sandstorm, fog, heatwave, wind }

const BUTTON_DEFS = [
  { type: 'rain',      icon: '🌧️', label: 'Heavy Rain'  },
  { type: 'sandstorm', icon: '🌬️', label: 'Sandstorm'   },
  { type: 'fog',       icon: '🌫️', label: 'Dense Fog'   },
  { type: 'heatwave',  icon: '☀️',  label: 'Heatwave'    },
  { type: 'wind',      icon: '💨', label: 'Strong Wind'  },
  { type: 'clear',     icon: '✨', label: 'Clear'        },
]

export class WeatherManager {
  constructor(scene, camera, ambientLight, dirLight, fogObj, composer) {
    // Shared context injected into every effect module
    this.ctx = { scene, camera, ambientLight, dirLight, fog: fogObj, composer }

    this.currentType   = 'clear'
    this.currentEffect = null
    this.currentState  = null

    this._btnMap = {}
    this._buildUI()
  }

  // Switch to a new weather type; deactivates the previous one first
  setWeather(type) {
    if (type === this.currentType) return

    if (this.currentEffect && this.currentState) {
      this.currentEffect.deactivate(this.ctx, this.currentState)
    }

    this.currentType   = type
    this.currentEffect = EFFECTS[type] ?? null
    this.currentState  = this.currentEffect ? this.currentEffect.activate(this.ctx) : null

    this._updateButtons(type)
  }

  // Called every frame from the animate loop
  update(delta, elapsed) {
    if (this.currentEffect && this.currentState) {
      this.currentEffect.update(this.ctx, this.currentState, delta, elapsed)
    }
  }

  // Full teardown — call from React useEffect cleanup
  dispose() {
    this.setWeather('clear')
    if (this._panel?.parentNode) this._panel.parentNode.removeChild(this._panel)
  }

  // ── Glassmorphism control panel ──────────────────────────────────────────
  _buildUI() {
    const panel = document.createElement('div')
    panel.style.cssText = [
      'position:fixed', 'bottom:24px', 'left:50%', 'transform:translateX(-50%)',
      'background:rgba(0,0,0,0.45)',
      'backdrop-filter:blur(12px)', '-webkit-backdrop-filter:blur(12px)',
      'border:1px solid rgba(255,255,255,0.15)', 'border-radius:16px',
      'padding:14px 22px', 'display:flex', 'flex-direction:column',
      'align-items:center', 'gap:10px', 'z-index:1000',
      'pointer-events:all', 'user-select:none',
      'font-family:system-ui,sans-serif',
    ].join(';')

    const title = document.createElement('div')
    title.textContent = '⛅ Weather Control'
    title.style.cssText = 'color:#fff;font-size:0.78rem;font-weight:600;letter-spacing:0.1em;opacity:0.85'
    panel.appendChild(title)

    const row = document.createElement('div')
    row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;justify-content:center'

    for (const { type, icon, label } of BUTTON_DEFS) {
      const btn = document.createElement('button')
      btn.style.cssText = [
        'display:flex', 'flex-direction:column', 'align-items:center', 'gap:3px',
        'padding:8px 12px', 'background:rgba(255,255,255,0.07)',
        'border:1px solid rgba(255,255,255,0.12)', 'border-radius:10px',
        'color:#ddd', 'font-size:0.68rem', 'cursor:pointer',
        'transition:all 0.18s ease', 'min-width:62px',
      ].join(';')

      const emoji = document.createElement('span')
      emoji.textContent = icon
      emoji.style.fontSize = '1.35rem'

      const lbl = document.createElement('span')
      lbl.textContent = label

      btn.appendChild(emoji)
      btn.appendChild(lbl)

      // Hover highlight (only when not already active)
      btn.addEventListener('mouseenter', () => {
        if (type !== this.currentType) btn.style.background = 'rgba(255,255,255,0.14)'
      })
      btn.addEventListener('mouseleave', () => {
        if (type !== this.currentType) btn.style.background = 'rgba(255,255,255,0.07)'
      })
      btn.addEventListener('click', () => this.setWeather(type))

      this._btnMap[type] = btn
      row.appendChild(btn)
    }

    panel.appendChild(row)
    document.body.appendChild(panel)
    this._panel = panel

    // Set initial active state (clear)
    this._updateButtons('clear')
  }

  // Highlight the active button with a glowing blue border; reset all others
  _updateButtons(activeType) {
    for (const [type, btn] of Object.entries(this._btnMap)) {
      if (type === activeType) {
        btn.style.background  = 'rgba(100,180,255,0.25)'
        btn.style.border      = '1px solid rgba(100,180,255,0.7)'
        btn.style.color       = '#fff'
        btn.style.boxShadow   = '0 0 10px rgba(100,180,255,0.4)'
      } else {
        btn.style.background  = 'rgba(255,255,255,0.07)'
        btn.style.border      = '1px solid rgba(255,255,255,0.12)'
        btn.style.color       = '#ddd'
        btn.style.boxShadow   = 'none'
      }
    }
  }
}
