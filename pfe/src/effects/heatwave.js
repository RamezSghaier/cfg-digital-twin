import * as THREE from 'three'
import { ShaderPass } from '../three/ShaderPass.js'

// Heat shimmer: distorts UV in the lower screen half where rails/terrain live
const HeatShimmerShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime:    { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float     uTime;
    varying vec2      vUv;
    void main() {
      vec2 uv = vUv;
      // Blend factor: 1 at the bottom, 0 above the midpoint
      float blend = clamp((0.55 - uv.y) * 5.0, 0.0, 1.0);
      // Classic heat-shimmer sine distortion
      uv.x += sin(uv.y * 40.0 + uTime * 3.0) * 0.003 * blend;
      uv.y += sin(uv.x * 20.0 + uTime * 2.5) * 0.002 * blend;
      gl_FragColor = texture2D(tDiffuse, uv);
    }
  `,
}

export function activate(ctx) {
  const { scene, ambientLight, dirLight, fog, composer } = ctx

  const orig = {
    ambientColor:     ambientLight.color.getHex(),
    ambientIntensity: ambientLight.intensity,
    dirColor:         dirLight.color.getHex(),
    dirIntensity:     dirLight.intensity,
    fogColor:         fog.color.getHex(),
    fogDensity:       fog.density,
  }

  // Scorching midday sun — very warm, high-intensity lighting
  ambientLight.color.setHex(0xffcc77)
  ambientLight.intensity = 1.8
  dirLight.color.setHex(0xff9944)
  dirLight.intensity = 3.5
  fog.color.setHex(0xe8c87a)
  fog.density = 0.001  // near-zero: heat haze makes horizon bright, not dark

  // Add shimmer pass at the end of the post-processing chain
  const shimmerPass = new ShaderPass(HeatShimmerShader)
  composer.addPass(shimmerPass)

  // Washed-out viewport overlay — desaturates the whole scene slightly
  const overlay = document.createElement('div')
  overlay.id = '_weather_overlay'
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'pointer-events:none', 'z-index:100',
    'background:rgba(255,200,100,0.06)',
    'backdrop-filter:saturate(0.65)',
    '-webkit-backdrop-filter:saturate(0.65)',
  ].join(';')
  document.body.appendChild(overlay)

  return { orig, shimmerPass, overlay }
}

export function update(ctx, state, delta, elapsed) {
  // Drive the shimmer distortion with elapsed time
  state.shimmerPass.uniforms.uTime.value = elapsed
}

export function deactivate(ctx, state) {
  const { ambientLight, dirLight, fog, composer } = ctx
  const { orig, shimmerPass, overlay } = state

  // Remove shimmer pass from the pipeline so bloom becomes the final pass again
  const idx = composer.passes.indexOf(shimmerPass)
  if (idx !== -1) composer.passes.splice(idx, 1)
  shimmerPass.dispose()

  if (overlay?.parentNode) overlay.parentNode.removeChild(overlay)

  ambientLight.color.setHex(orig.ambientColor)
  ambientLight.intensity = orig.ambientIntensity
  dirLight.color.setHex(orig.dirColor)
  dirLight.intensity = orig.dirIntensity
  fog.color.setHex(orig.fogColor)
  fog.density = orig.fogDensity
}
