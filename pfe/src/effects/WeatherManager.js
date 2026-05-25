import * as rain      from './rain.js'
import * as sandstorm from './sandstorm.js'
import * as fog       from './fog.js'
import * as heatwave  from './heatwave.js'
import * as wind      from './wind.js'

const EFFECTS = { rain, sandstorm, fog, heatwave, wind }

export class WeatherManager {
  constructor(scene, camera, ambientLight, dirLight, fogObj, composer) {
    // Shared context injected into every effect module
    this.ctx = { scene, camera, ambientLight, dirLight, fog: fogObj, composer }

    this.currentType   = 'clear'
    this.currentEffect = null
    this.currentState  = null
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
  }
}
