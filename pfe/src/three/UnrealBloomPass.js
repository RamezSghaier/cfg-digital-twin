import {
  AdditiveBlending,
  Color,
  HalfFloatType,
  MeshBasicMaterial,
  ShaderMaterial,
  UniformsUtils,
  Vector2,
  Vector3,
  WebGLRenderTarget,
} from 'three'
import { Pass, FullScreenQuad } from './Pass.js'
import { CopyShader } from './CopyShader.js'
import { LuminosityHighPassShader } from './LuminosityHighPassShader.js'

class UnrealBloomPass extends Pass {

  constructor( resolution, strength = 1, radius, threshold ) {

    super()

    this.strength  = strength
    this.radius    = radius
    this.threshold = threshold
    this.resolution = ( resolution !== undefined )
      ? new Vector2( resolution.x, resolution.y )
      : new Vector2( 256, 256 )

    this.clearColor = new Color( 0, 0, 0 )
    this.needsSwap  = false

    // render targets
    this.renderTargetsHorizontal = []
    this.renderTargetsVertical   = []
    this.nMips = 5

    let resx = Math.round( this.resolution.x / 2 )
    let resy = Math.round( this.resolution.y / 2 )

    this.renderTargetBright = new WebGLRenderTarget( resx, resy, { type: HalfFloatType } )
    this.renderTargetBright.texture.name = 'UnrealBloomPass.bright'
    this.renderTargetBright.texture.generateMipmaps = false

    for ( let i = 0; i < this.nMips; i ++ ) {

      const h = new WebGLRenderTarget( resx, resy, { type: HalfFloatType } )
      h.texture.name = 'UnrealBloomPass.h' + i
      h.texture.generateMipmaps = false
      this.renderTargetsHorizontal.push( h )

      const v = new WebGLRenderTarget( resx, resy, { type: HalfFloatType } )
      v.texture.name = 'UnrealBloomPass.v' + i
      v.texture.generateMipmaps = false
      this.renderTargetsVertical.push( v )

      resx = Math.round( resx / 2 )
      resy = Math.round( resy / 2 )

    }

    // luminosity high pass
    const highPassShader = LuminosityHighPassShader
    this.highPassUniforms = UniformsUtils.clone( highPassShader.uniforms )
    this.highPassUniforms[ 'luminosityThreshold' ].value = threshold
    this.highPassUniforms[ 'smoothWidth' ].value = 0.4

    this.materialHighPassFilter = new ShaderMaterial( {
      uniforms: this.highPassUniforms,
      vertexShader: highPassShader.vertexShader,
      fragmentShader: highPassShader.fragmentShader,
    } )

    // gaussian blur materials
    this.separableBlurMaterials = []
    const kernelSizeArray = [ 6, 10, 14, 18, 22 ]
    resx = Math.round( this.resolution.x / 2 )
    resy = Math.round( this.resolution.y / 2 )

    for ( let i = 0; i < this.nMips; i ++ ) {
      this.separableBlurMaterials.push( this._getSeparableBlurMaterial( kernelSizeArray[ i ] ) )
      this.separableBlurMaterials[ i ].uniforms[ 'invSize' ].value = new Vector2( 1 / resx, 1 / resy )
      resx = Math.round( resx / 2 )
      resy = Math.round( resy / 2 )
    }

    // composite material
    this.compositeMaterial = this._getCompositeMaterial( this.nMips )
    this.compositeMaterial.uniforms[ 'blurTexture1' ].value = this.renderTargetsVertical[ 0 ].texture
    this.compositeMaterial.uniforms[ 'blurTexture2' ].value = this.renderTargetsVertical[ 1 ].texture
    this.compositeMaterial.uniforms[ 'blurTexture3' ].value = this.renderTargetsVertical[ 2 ].texture
    this.compositeMaterial.uniforms[ 'blurTexture4' ].value = this.renderTargetsVertical[ 3 ].texture
    this.compositeMaterial.uniforms[ 'blurTexture5' ].value = this.renderTargetsVertical[ 4 ].texture
    this.compositeMaterial.uniforms[ 'bloomStrength' ].value = strength
    this.compositeMaterial.uniforms[ 'bloomRadius' ].value = 0.1

    const bloomFactors = [ 1.0, 0.8, 0.6, 0.4, 0.2 ]
    this.compositeMaterial.uniforms[ 'bloomFactors' ].value = bloomFactors
    this.bloomTintColors = [
      new Vector3( 1, 1, 1 ), new Vector3( 1, 1, 1 ), new Vector3( 1, 1, 1 ),
      new Vector3( 1, 1, 1 ), new Vector3( 1, 1, 1 ),
    ]
    this.compositeMaterial.uniforms[ 'bloomTintColors' ].value = this.bloomTintColors

    // blend material
    this.copyUniforms = UniformsUtils.clone( CopyShader.uniforms )
    this.blendMaterial = new ShaderMaterial( {
      uniforms: this.copyUniforms,
      vertexShader: CopyShader.vertexShader,
      fragmentShader: CopyShader.fragmentShader,
      premultipliedAlpha: true,
      blending: AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      transparent: true,
    } )

    this._oldClearColor  = new Color()
    this._oldClearAlpha  = 1
    this._basic          = new MeshBasicMaterial()
    this._fsQuad         = new FullScreenQuad( null )

  }

  dispose() {
    for ( let i = 0; i < this.renderTargetsHorizontal.length; i ++ ) this.renderTargetsHorizontal[ i ].dispose()
    for ( let i = 0; i < this.renderTargetsVertical.length;   i ++ ) this.renderTargetsVertical[ i ].dispose()
    this.renderTargetBright.dispose()
    for ( let i = 0; i < this.separableBlurMaterials.length;  i ++ ) this.separableBlurMaterials[ i ].dispose()
    this.compositeMaterial.dispose()
    this.blendMaterial.dispose()
    this._basic.dispose()
    this._fsQuad.dispose()
  }

  setSize( width, height ) {
    let resx = Math.round( width  / 2 )
    let resy = Math.round( height / 2 )
    this.renderTargetBright.setSize( resx, resy )
    for ( let i = 0; i < this.nMips; i ++ ) {
      this.renderTargetsHorizontal[ i ].setSize( resx, resy )
      this.renderTargetsVertical[ i ].setSize( resx, resy )
      this.separableBlurMaterials[ i ].uniforms[ 'invSize' ].value = new Vector2( 1 / resx, 1 / resy )
      resx = Math.round( resx / 2 )
      resy = Math.round( resy / 2 )
    }
  }

  render( renderer, writeBuffer, readBuffer, deltaTime, maskActive ) {

    renderer.getClearColor( this._oldClearColor )
    this._oldClearAlpha = renderer.getClearAlpha()
    const oldAutoClear = renderer.autoClear
    renderer.autoClear = false
    renderer.setClearColor( this.clearColor, 0 )

    if ( maskActive ) renderer.state.buffers.stencil.setTest( false )

    if ( this.renderToScreen ) {
      this._fsQuad.material = this._basic
      this._basic.map = readBuffer.texture
      renderer.setRenderTarget( null )
      renderer.clear()
      this._fsQuad.render( renderer )
    }

    // 1. Extract bright areas
    this.highPassUniforms[ 'tDiffuse' ].value          = readBuffer.texture
    this.highPassUniforms[ 'luminosityThreshold' ].value = this.threshold
    this._fsQuad.material = this.materialHighPassFilter
    renderer.setRenderTarget( this.renderTargetBright )
    renderer.clear()
    this._fsQuad.render( renderer )

    // 2. Blur mips progressively
    let inputRenderTarget = this.renderTargetBright
    for ( let i = 0; i < this.nMips; i ++ ) {
      this._fsQuad.material = this.separableBlurMaterials[ i ]
      this.separableBlurMaterials[ i ].uniforms[ 'colorTexture' ].value = inputRenderTarget.texture
      this.separableBlurMaterials[ i ].uniforms[ 'direction' ].value    = UnrealBloomPass.BlurDirectionX
      renderer.setRenderTarget( this.renderTargetsHorizontal[ i ] )
      renderer.clear()
      this._fsQuad.render( renderer )

      this.separableBlurMaterials[ i ].uniforms[ 'colorTexture' ].value = this.renderTargetsHorizontal[ i ].texture
      this.separableBlurMaterials[ i ].uniforms[ 'direction' ].value    = UnrealBloomPass.BlurDirectionY
      renderer.setRenderTarget( this.renderTargetsVertical[ i ] )
      renderer.clear()
      this._fsQuad.render( renderer )

      inputRenderTarget = this.renderTargetsVertical[ i ]
    }

    // 3. Composite all mips
    this._fsQuad.material = this.compositeMaterial
    this.compositeMaterial.uniforms[ 'bloomStrength' ].value    = this.strength
    this.compositeMaterial.uniforms[ 'bloomRadius' ].value      = this.radius
    this.compositeMaterial.uniforms[ 'bloomTintColors' ].value  = this.bloomTintColors
    renderer.setRenderTarget( this.renderTargetsHorizontal[ 0 ] )
    renderer.clear()
    this._fsQuad.render( renderer )

    // 4. Blend additively over input
    this._fsQuad.material = this.blendMaterial
    this.copyUniforms[ 'tDiffuse' ].value = this.renderTargetsHorizontal[ 0 ].texture

    if ( maskActive ) renderer.state.buffers.stencil.setTest( true )

    if ( this.renderToScreen ) {
      renderer.setRenderTarget( null )
      this._fsQuad.render( renderer )
    } else {
      renderer.setRenderTarget( readBuffer )
      this._fsQuad.render( renderer )
    }

    renderer.setClearColor( this._oldClearColor, this._oldClearAlpha )
    renderer.autoClear = oldAutoClear

  }

  _getSeparableBlurMaterial( kernelRadius ) {
    const coefficients = []
    const sigma = kernelRadius / 3
    for ( let i = 0; i < kernelRadius; i ++ ) {
      coefficients.push( 0.39894 * Math.exp( - 0.5 * i * i / ( sigma * sigma ) ) / sigma )
    }
    return new ShaderMaterial( {
      defines: { 'KERNEL_RADIUS': kernelRadius },
      uniforms: {
        'colorTexture':        { value: null },
        'invSize':             { value: new Vector2( 0.5, 0.5 ) },
        'direction':           { value: new Vector2( 0.5, 0.5 ) },
        'gaussianCoefficients':{ value: coefficients },
      },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }`,
      fragmentShader: /* glsl */`
        #include <common>
        varying vec2 vUv;
        uniform sampler2D colorTexture;
        uniform vec2 invSize;
        uniform vec2 direction;
        uniform float gaussianCoefficients[KERNEL_RADIUS];

        void main() {
          float weightSum = gaussianCoefficients[0];
          vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * weightSum;
          for ( int i = 1; i < KERNEL_RADIUS; i ++ ) {
            float x = float( i );
            float w = gaussianCoefficients[i];
            vec2 uvOffset = direction * invSize * x;
            vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
            vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
            diffuseSum += ( sample1 + sample2 ) * w;
          }
          gl_FragColor = vec4( diffuseSum, 1.0 );
        }`,
    } )
  }

  _getCompositeMaterial( nMips ) {
    return new ShaderMaterial( {
      defines: { 'NUM_MIPS': nMips },
      uniforms: {
        'blurTexture1':   { value: null },
        'blurTexture2':   { value: null },
        'blurTexture3':   { value: null },
        'blurTexture4':   { value: null },
        'blurTexture5':   { value: null },
        'bloomStrength':  { value: 1.0 },
        'bloomFactors':   { value: null },
        'bloomTintColors':{ value: null },
        'bloomRadius':    { value: 0.0 },
      },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }`,
      fragmentShader: /* glsl */`
        varying vec2 vUv;
        uniform sampler2D blurTexture1;
        uniform sampler2D blurTexture2;
        uniform sampler2D blurTexture3;
        uniform sampler2D blurTexture4;
        uniform sampler2D blurTexture5;
        uniform float bloomStrength;
        uniform float bloomRadius;
        uniform float bloomFactors[NUM_MIPS];
        uniform vec3 bloomTintColors[NUM_MIPS];

        float lerpBloomFactor( const in float factor ) {
          float mirrorFactor = 1.2 - factor;
          return mix( factor, mirrorFactor, bloomRadius );
        }

        void main() {
          vec3 bloom = 3.0 * bloomStrength * (
            lerpBloomFactor( bloomFactors[0] ) * bloomTintColors[0] * texture2D( blurTexture1, vUv ).rgb +
            lerpBloomFactor( bloomFactors[1] ) * bloomTintColors[1] * texture2D( blurTexture2, vUv ).rgb +
            lerpBloomFactor( bloomFactors[2] ) * bloomTintColors[2] * texture2D( blurTexture3, vUv ).rgb +
            lerpBloomFactor( bloomFactors[3] ) * bloomTintColors[3] * texture2D( blurTexture4, vUv ).rgb +
            lerpBloomFactor( bloomFactors[4] ) * bloomTintColors[4] * texture2D( blurTexture5, vUv ).rgb
          );
          float bloomAlpha = max( bloom.r, max( bloom.g, bloom.b ) );
          gl_FragColor = vec4( bloom, bloomAlpha );
        }`,
    } )
  }

}

UnrealBloomPass.BlurDirectionX = new Vector2( 1.0, 0.0 )
UnrealBloomPass.BlurDirectionY = new Vector2( 0.0, 1.0 )

export { UnrealBloomPass }
