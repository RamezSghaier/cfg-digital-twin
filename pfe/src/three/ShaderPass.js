import * as THREE from 'three'
import { Pass, FullScreenQuad } from './Pass.js'

// Generic post-processing pass that applies a shader to the previous render buffer
export class ShaderPass extends Pass {
  constructor(shader, textureID = 'tDiffuse') {
    super()
    this.textureID = textureID

    if (shader instanceof THREE.ShaderMaterial) {
      this.uniforms = shader.uniforms
      this.material = shader
    } else {
      this.uniforms = THREE.UniformsUtils.clone(shader.uniforms)
      this.material = new THREE.ShaderMaterial({
        defines:        Object.assign({}, shader.defines),
        uniforms:       this.uniforms,
        vertexShader:   shader.vertexShader,
        fragmentShader: shader.fragmentShader,
      })
    }
    this.fsQuad = new FullScreenQuad(this.material)
  }

  render(renderer, writeBuffer, readBuffer) {
    // Feed the previous pass's output as the shader's tDiffuse texture
    if (this.uniforms[this.textureID]) {
      this.uniforms[this.textureID].value = readBuffer.texture
    }
    if (this.renderToScreen) {
      renderer.setRenderTarget(null)
    } else {
      renderer.setRenderTarget(writeBuffer)
      if (this.clear) renderer.clear()
    }
    this.fsQuad.render(renderer)
  }

  dispose() {
    this.material.dispose()
    this.fsQuad.dispose()
  }
}
