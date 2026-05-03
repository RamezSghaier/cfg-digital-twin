import { Pass } from './Pass.js'

class RenderPass extends Pass {

  constructor( scene, camera, overrideMaterial = null, clearColor = null, clearAlpha = 0 ) {
    super()
    this.scene            = scene
    this.camera           = camera
    this.overrideMaterial = overrideMaterial
    this.clearColor       = clearColor
    this.clearAlpha       = clearAlpha
    this.clear            = true
    this.clearDepth       = false
    this.needsSwap        = false
    this._oldClearColor   = null
  }

  render( renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */ ) {
    const oldAutoClear = renderer.autoClear
    renderer.autoClear = false

    let oldClearAlpha, oldOverrideMaterial

    if ( this.overrideMaterial !== undefined ) {
      oldOverrideMaterial = this.scene.overrideMaterial
      this.scene.overrideMaterial = this.overrideMaterial
    }

    if ( this.clearColor !== null ) {
      this._oldClearColor = renderer.getClearColor( this._oldClearColor )
      oldClearAlpha = renderer.getClearAlpha()
      renderer.setClearColor( this.clearColor, this.clearAlpha )
    }

    if ( this.clearDepth ) renderer.clearDepth()

    renderer.setRenderTarget( this.renderToScreen ? null : readBuffer )

    if ( this.clear ) renderer.clear( renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil )

    renderer.render( this.scene, this.camera )

    if ( this.clearColor !== null ) {
      renderer.setClearColor( this._oldClearColor, oldClearAlpha )
    }

    if ( this.overrideMaterial !== undefined ) {
      this.scene.overrideMaterial = oldOverrideMaterial
    }

    renderer.autoClear = oldAutoClear
  }

}

export { RenderPass }
