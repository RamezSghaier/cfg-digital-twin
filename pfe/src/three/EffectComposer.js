import {
  HalfFloatType,
  LinearFilter,
  RGBAFormat,
  Vector2,
  WebGLRenderTarget,
} from 'three'
import { Pass, FullScreenQuad } from './Pass.js'
import { CopyShader } from './CopyShader.js'
import { ShaderMaterial, UniformsUtils } from 'three'

class EffectComposer {

  constructor( renderer, renderTarget ) {
    this.renderer = renderer

    this._pixelRatio = renderer.getPixelRatio()

    const size = renderer.getSize( new Vector2() )
    this._width  = size.width
    this._height = size.height

    if ( renderTarget === undefined ) {
      renderTarget = new WebGLRenderTarget(
        this._width  * this._pixelRatio,
        this._height * this._pixelRatio,
        { type: HalfFloatType }
      )
      renderTarget.texture.name = 'EffectComposer.rt1'
    }

    this.renderTarget1 = renderTarget
    this.renderTarget2 = renderTarget.clone()
    this.renderTarget2.texture.name = 'EffectComposer.rt2'

    this.writeBuffer = this.renderTarget1
    this.readBuffer  = this.renderTarget2

    this.renderToScreen = true
    this.passes = []

    const copyShader = CopyShader
    this.copyUniforms = UniformsUtils.clone( copyShader.uniforms )

    this.copyMaterial = new ShaderMaterial( {
      uniforms: this.copyUniforms,
      vertexShader: copyShader.vertexShader,
      fragmentShader: copyShader.fragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    } )

    this._fsQuad = new FullScreenQuad( this.copyMaterial )
    this.clock   = { getDelta: (() => { let t = performance.now(); return () => { const n = performance.now(); const d = ( n - t ) * 0.001; t = n; return d } })() }
  }

  swapBuffers() {
    const tmp        = this.readBuffer
    this.readBuffer  = this.writeBuffer
    this.writeBuffer = tmp
  }

  addPass( pass ) {
    this.passes.push( pass )
    pass.setSize( this._width * this._pixelRatio, this._height * this._pixelRatio )
  }

  insertPass( pass, index ) {
    this.passes.splice( index, 0, pass )
    pass.setSize( this._width * this._pixelRatio, this._height * this._pixelRatio )
  }

  removePass( pass ) {
    const idx = this.passes.indexOf( pass )
    if ( idx !== -1 ) this.passes.splice( idx, 1 )
  }

  isLastEnabledPass( passIndex ) {
    for ( let i = passIndex + 1; i < this.passes.length; i++ ) {
      if ( this.passes[ i ].enabled ) return false
    }
    return true
  }

  render( deltaTime ) {
    if ( deltaTime === undefined ) deltaTime = this.clock.getDelta()

    const currentRenderTarget = this.renderer.getRenderTarget()
    const currentXrEnabled    = this.renderer.xr.enabled
    const currentShadowAutoUpdate = this.renderer.shadowMap.autoUpdate

    this.renderer.xr.enabled = false
    this.renderer.shadowMap.autoUpdate = false

    let maskActive = false

    for ( let i = 0; i < this.passes.length; i++ ) {
      const pass = this.passes[ i ]
      if ( !pass.enabled ) continue

      pass.renderToScreen = ( this.renderToScreen && this.isLastEnabledPass( i ) )
      pass.render( this.renderer, this.writeBuffer, this.readBuffer, deltaTime, maskActive )

      if ( pass.needsSwap ) {
        if ( maskActive ) {
          const stencil = this.renderer.state.buffers.stencil
          stencil.setFunc( 0x1E00, 1, 0xffffffff ) // NotEqualStencilFunc
          this.copyUniforms[ 'tDiffuse' ].value = this.writeBuffer.texture
          this._fsQuad.render( this.renderer )
          stencil.setFunc( 0x0207, 1, 0xffffffff ) // EqualStencilFunc
        }
        this.swapBuffers()
      }
    }

    this.renderer.xr.enabled = currentXrEnabled
    this.renderer.shadowMap.autoUpdate = currentShadowAutoUpdate
    this.renderer.setRenderTarget( currentRenderTarget )
  }

  setSize( width, height ) {
    this._width  = width
    this._height = height
    const w = width  * this._pixelRatio
    const h = height * this._pixelRatio
    this.renderTarget1.setSize( w, h )
    this.renderTarget2.setSize( w, h )
    for ( const pass of this.passes ) pass.setSize( w, h )
  }

  setPixelRatio( pixelRatio ) {
    this._pixelRatio = pixelRatio
    this.setSize( this._width, this._height )
  }

  dispose() {
    this.renderTarget1.dispose()
    this.renderTarget2.dispose()
    this.copyMaterial.dispose()
    this._fsQuad.dispose()
  }

}

export { EffectComposer }
