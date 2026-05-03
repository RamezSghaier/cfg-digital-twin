import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { Sky } from '../three/Sky.js'
import { EffectComposer } from '../three/EffectComposer.js'
import { RenderPass } from '../three/RenderPass.js'
import { UnrealBloomPass } from '../three/UnrealBloomPass.js'
import Stats from '../three/Stats.js'
import GUI from '../three/GUI.js'
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import { WeatherManager } from '../effects/WeatherManager.js'
import { ScenarioManager } from '../effects/ScenarioManager.js'
import { TrainAnimation } from '../animation/TrainAnimation.js'

// Load a GLB and return a Promise resolving to the GLTF object
function loadGLTF(loader, url) {
  return new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject))
}

// Auto-center a model using its bounding box, return { center, size }
function centerModel(object) {
  const box = new THREE.Box3().setFromObject(object)
  const center = new THREE.Vector3()
  const size   = new THREE.Vector3()
  box.getCenter(center)
  box.getSize(size)
  object.position.sub(center)   // shift so bbox center is at origin
  return { center, size }
}

// Apply shadow casting/receiving recursively to every mesh in a model
function applyShadows(object) {
  object.traverse(child => {
    if (child.isMesh) {
      child.castShadow    = true
      child.receiveShadow = true
    }
  })
}

// Compute sun elevation/azimuth from local time (Gafsa, TN ≈ 34.4°N)
// sunrise ≈ 06:00, sunset ≈ 19:30; sun arcs from ENE (80°) to WNW (280°) through South
function computeSunAngles(now) {
  const h = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600
  const sunrise = 6.0, sunset = 19.5
  if (h < sunrise || h > sunset) return { elevation: -5, azimuth: h < 12 ? 80 : 260 }
  const p = (h - sunrise) / (sunset - sunrise)
  return { elevation: Math.sin(p * Math.PI) * 82, azimuth: 80 + p * 200 }
}

// Map backend weather_code + conditions to a WeatherManager type string
function weatherCodeToType({ weather_code: code, temperature, wind_speed }) {
  if (code === 'rain' || code === 'heavy_rain' || code === 'storm') return 'rain'
  if (code === 'fog') return 'fog'
  if (code === 'sandstorm') return 'sandstorm'
  if (temperature > 38) return 'heatwave'
  if (wind_speed > 15) return 'wind'
  return 'clear'
}

export default function HomePage() {
  const mountRef = useRef(null)
  const loaderRef = useRef(null)
  const navigate  = useNavigate()

  // Live clock and weather display state
  const [clockTime,   setClockTime]   = useState('--:--:--')
  const [weatherInfo, setWeatherInfo] = useState(null)

  // Refs so the weather-polling effect can hand data to the Three.js render loop
  const weatherManagerRef = useRef(null)
  const skyUniformsRef    = useRef(null)
  const pendingWeatherRef = useRef(null)
  const lastSunMinuteRef  = useRef(-1)

  useEffect(() => {
    const mount = mountRef.current

    // ── Loading indicator ─────────────────────────────────────────────────────
    const loadingDiv = document.createElement('div')
    loadingDiv.innerText = 'Loading scene...'
    loadingDiv.style.cssText = [
      'position:fixed', 'inset:0', 'display:flex',
      'align-items:center', 'justify-content:center',
      'font-family:monospace', 'font-size:1.1rem',
      'color:#fff', 'background:rgba(0,0,0,0.75)',
      'z-index:9999', 'letter-spacing:0.2em',
      'pointer-events:none',
    ].join(';')
    document.body.appendChild(loadingDiv)
    loaderRef.current = loadingDiv

    let animFrameId
    let weatherManager
    let scenarioManager
    let trainAnim
    let cleanupHotspots = null
    const clock = new THREE.Clock()

    // ── Camera intro + follow state ───────────────────────────────────────────
    // 'intro' → cinematic zoom-in, 'follow' → locked on train, 'free' → user OrbitControls
    let camPhase  = 'intro'
    let camIntroT = 0                                          // 0..1 intro progress
    const _camStart   = new THREE.Vector3(-385, 80, 340)      // far establishing shot
    const _camEnd     = new THREE.Vector3(-385, 18, 108)      // where follow picks up
    const _camLocoRef = new THREE.Vector3(-385, 3.1, 32.8)    // train's initial world pos

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, outputBufferType: THREE.HalfFloatType })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.toneMapping         = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.1
    renderer.shadowMap.enabled   = true
    renderer.shadowMap.type      = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)

    // ── CSS2D label renderer (hotspot layer, sits on top of the canvas) ───────
    const labelRenderer = new CSS2DRenderer()
    labelRenderer.setSize(window.innerWidth, window.innerHeight)
    Object.assign(labelRenderer.domElement.style, {
      position: 'absolute', top: '0', left: '0',
      width: '100%', height: '100%',
      pointerEvents: 'none', overflow: 'hidden',
      zIndex: '10',   // sit above the WebGL canvas
    })
    mount.appendChild(labelRenderer.domElement)

    // ── Scene & Camera ────────────────────────────────────────────────────────
    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000)
    camera.position.copy(_camStart)     // start far for the intro zoom


    // ── Fog — warm dusty haze that fades the horizon ──────────────────────────
    scene.fog = new THREE.FogExp2(0xd4b483, 0.002)

    // ── Ground fog — layered drifting planes at terrain level ────────────────
    const GROUND_FOG_LAYERS = [
      { y: 1.5, opacity: 0.38, speed: 2.8 },
      { y: 5.0, opacity: 0.24, speed: 1.6 },
      { y: 11,  opacity: 0.14, speed: 1.0 },
    ]
    const groundFogPlanes = GROUND_FOG_LAYERS.map(({ y, opacity, speed }, i) => {
      const mat = new THREE.MeshBasicMaterial({
        color:       0xd4bc8a,
        transparent: true,
        opacity,
        depthWrite:  false,
        side:        THREE.DoubleSide,
      })
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), mat)
      mesh.rotation.x = -Math.PI / 2
      mesh.position.set(-385, y, 32.9)
      mesh.renderOrder = 1
      scene.add(mesh)
      return { mesh, mat, baseOpacity: opacity, speed, offset: i * 37.3 }
    })

    // ── Sky (existing — untouched) ────────────────────────────────────────────
    const sky = new Sky()
    sky.scale.setScalar(10000)
    scene.add(sky)

    const skyUniforms = sky.material.uniforms
    skyUniforms['turbidity'].value      = 10
    skyUniforms['rayleigh'].value       = 2
    skyUniforms['mieCoefficient'].value = 0.005
    skyUniforms['mieDirectionalG'].value = 0.8
    skyUniforms['cloudCoverage'].value  = 0.4
    skyUniforms['cloudDensity'].value   = 0.5
    skyUniforms['cloudElevation'].value = 1
    skyUniformsRef.current = skyUniforms

    // ── Sun ───────────────────────────────────────────────────────────────────
    const sun = new THREE.Vector3()
    const _initSun = computeSunAngles(new Date())
    const parameters = { elevation: _initSun.elevation, azimuth: _initSun.azimuth, exposure: 0.1 }
    const pmremGenerator = new THREE.PMREMGenerator(renderer)
    const sceneEnv = new THREE.Scene()
    let renderTarget

    function updateSun() {
      const phi   = THREE.MathUtils.degToRad(90 - parameters.elevation)
      const theta = THREE.MathUtils.degToRad(parameters.azimuth)
      sun.setFromSphericalCoords(1, phi, theta)
      skyUniforms['sunPosition'].value.copy(sun)
      if (renderTarget) renderTarget.dispose()
      sceneEnv.add(sky)
      renderTarget = pmremGenerator.fromScene(sceneEnv)
      scene.add(sky)
      scene.environment = renderTarget.texture
    }

    updateSun()

    // ── Lighting ──────────────────────────────────────────────────────────────
    // Ambient light — soft warm fill so shadows don't go pitch black
    const ambientLight = new THREE.AmbientLight(0xffe8c0, 0.5)
    scene.add(ambientLight)

    // Directional light — simulates the sun, casts sharp shadows across terrain
    const dirLight = new THREE.DirectionalLight(0xfff4cc, 2)
    dirLight.position.set(80, 120, -60)   // above and angled
    dirLight.castShadow              = true
    dirLight.shadow.mapSize.width    = 2048
    dirLight.shadow.mapSize.height   = 2048
    dirLight.shadow.camera.near      = 1
    dirLight.shadow.camera.far       = 1000
    dirLight.shadow.camera.left      = -300
    dirLight.shadow.camera.right     = 300
    dirLight.shadow.camera.top       = 300
    dirLight.shadow.camera.bottom    = -300
    dirLight.shadow.bias             = -0.0005
    scene.add(dirLight)

    // ── Bloom ─────────────────────────────────────────────────────────────────
    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5, 0.4, 0.85
    )
    bloomPass.threshold = 0.4
    bloomPass.strength  = 0
    bloomPass.radius    = 0.8
    composer.addPass(bloomPass)

    // ── OrbitControls ─────────────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.maxPolarAngle = Math.PI * 0.495
    controls.target.set(-385, 3, 32.9)
    controls.minDistance = 10.0
    controls.maxDistance = 800.0
    controls.enabled = false        // disabled until user switches to Free camera
    controls.update()

    // ── Stats ─────────────────────────────────────────────────────────────────
    const stats = new Stats()
    mount.appendChild(stats.dom)

    // ── GUI ───────────────────────────────────────────────────────────────────
    const gui = new GUI()

    const folderSky = gui.addFolder('Sky')
    folderSky.add(parameters, 'elevation', 0, 90, 0.1).onChange(updateSun)
    folderSky.add(parameters, 'azimuth', -180, 180, 0.1).onChange(updateSun)
    folderSky.add(parameters, 'exposure', 0, 1, 0.0001).onChange(v => { renderer.toneMappingExposure = v })
    folderSky.open()

    const folderBloom = gui.addFolder('Bloom')
    folderBloom.add(bloomPass, 'strength', 0, 3, 0.01)
    folderBloom.add(bloomPass, 'radius', 0, 1, 0.01)
    folderBloom.open()

    const folderClouds = gui.addFolder('Clouds')
    folderClouds.add(skyUniforms.cloudCoverage,  'value', 0, 1, 0.01).name('coverage')
    folderClouds.add(skyUniforms.cloudDensity,   'value', 0, 1, 0.01).name('density')
    folderClouds.add(skyUniforms.cloudElevation, 'value', 0, 1, 0.01).name('elevation')
    folderClouds.open()

    // ── Weather system ────────────────────────────────────────────────────────
    weatherManager = new WeatherManager(scene, camera, ambientLight, dirLight, scene.fog, composer)
    weatherManagerRef.current = weatherManager

    // ── Load all 3 GLB models ─────────────────────────────────────────────────
    const loader = new GLTFLoader()

    Promise.all([
      loadGLTF(loader, '/models/terrainFinal.glb'),
      loadGLTF(loader, '/models/RailsPath.glb'),
      loadGLTF(loader, '/models/locomotiveFinale.glb'),
      loadGLTF(loader, '/models/wagonFinal.glb'),
    ]).then(([terrainGLTF, railsGLTF, locoGLTF, wagonGLTF]) => {

      // Helper: add to scene, compute world bbox, then reposition so that
      // bbox.min.y = targetY and the model is centered on X/Z
      function placeOnSurface(object, targetY) {
        scene.add(object)
        object.updateMatrixWorld(true)
        const box = new THREE.Box3().setFromObject(object)
        // Center horizontally
        object.position.x -= (box.max.x + box.min.x) / 2
        object.position.z -= (box.max.z + box.min.z) / 2
        // Lift/lower so bbox bottom sits exactly at targetY
        object.position.y += targetY - box.min.y
        object.updateMatrixWorld(true)
        // Return the updated bbox so next model can stack on top
        return new THREE.Box3().setFromObject(object)
      }

      // ── TERRAIN — bottom at Y=0 (world ground level) ─────────────────────
      const terrain = terrainGLTF.scene
      applyShadows(terrain)
      const terrainBox = placeOnSurface(terrain, 0)
      console.log('[Terrain] min:', terrainBox.min, 'max:', terrainBox.max)

      // ── RAILS — user-confirmed position ──────────────────────────────────
      const rails = railsGLTF.scene
      applyShadows(rails)
      placeOnSurface(rails, terrainBox.max.y)
      rails.position.set(-372.7, -28.6, 0)
      rails.rotation.set(0, THREE.MathUtils.degToRad(90), 0)
      rails.updateMatrixWorld(true)
      const railsBox = new THREE.Box3().setFromObject(rails)
      console.log('[Rails]   min:', railsBox.min,   'max:', railsBox.max)

      // ── LOCOMOTIVE — user-confirmed position ──────────────────────────────
      const loco = locoGLTF.scene
      applyShadows(loco)
      placeOnSurface(loco, railsBox.max.y)
      loco.position.set(-385, 51.4, 32.9)
      loco.rotation.set(THREE.MathUtils.degToRad(-1.8), 0, 0)
      loco.scale.setScalar(1.55)
      loco.updateMatrixWorld(true)
      const locoBox = new THREE.Box3().setFromObject(loco)
      console.log('[Loco]    min:', locoBox.min,    'max:', locoBox.max)

      console.log('Terrain top Y:', terrainBox.max.y.toFixed(3))
      console.log('Rails top Y:  ', railsBox.max.y.toFixed(3))
      console.log('Loco top Y:   ', locoBox.max.y.toFixed(3))

      
      // ── GUI: Rails transform controls ─────────────────────────────────────
      const railsParams = {
        x: rails.position.x, y: rails.position.y, z: rails.position.z,
        rotX: 0, rotY: 90, rotZ: 0,
      }
      const folderRails = gui.addFolder('Rails position')
      folderRails.add(railsParams, 'x', -500, 500, 0.1).name('pos X').onChange(v => { rails.position.x = v })
      folderRails.add(railsParams, 'y', -500, 500, 0.1).name('pos Y').onChange(v => { rails.position.y = v })
      folderRails.add(railsParams, 'z', -500, 500, 0.1).name('pos Z').onChange(v => { rails.position.z = v })
      folderRails.add(railsParams, 'rotX', -180, 180, 0.1).name('rot X°').onChange(v => { rails.rotation.x = THREE.MathUtils.degToRad(v) })
      folderRails.add(railsParams, 'rotY', -180, 180, 0.1).name('rot Y°').onChange(v => { rails.rotation.y = THREE.MathUtils.degToRad(v) })
      folderRails.add(railsParams, 'rotZ', -180, 180, 0.1).name('rot Z°').onChange(v => { rails.rotation.z = THREE.MathUtils.degToRad(v) })
      folderRails.open()

      // ── GUI: Locomotive transform controls ────────────────────────────────
      const locoParams = {
        x: loco.position.x, y: loco.position.y, z: loco.position.z,
        rotX: 0, rotY: 0, rotZ: 0,
        scale: loco.scale.z, 
      }
      const folderLoco = gui.addFolder('Locomotive position')
      folderLoco.add(locoParams, 'x', -500, 500, 0.1).name('pos X').onChange(v => { loco.position.x = v })
      folderLoco.add(locoParams, 'y', -500, 500, 0.1).name('pos Y').onChange(v => { loco.position.y = v })
      folderLoco.add(locoParams, 'z', -500, 500, 0.1).name('pos Z').onChange(v => { loco.position.z = v })
      folderLoco.add(locoParams, 'rotX', -180, 180, 0.1).name('rot X°').onChange(v => { loco.rotation.x = THREE.MathUtils.degToRad(v) })
      folderLoco.add(locoParams, 'rotY', -180, 180, 0.1).name('rot Y°').onChange(v => { loco.rotation.y = THREE.MathUtils.degToRad(v) })
      folderLoco.add(locoParams, 'rotZ', -180, 180, 0.1).name('rot Z°').onChange(v => { loco.rotation.z = THREE.MathUtils.degToRad(v) })
      folderLoco.add(locoParams, 'scale', 0.01, 10, 0.01).name('scale').onChange(v => { loco.scale.setScalar(v) })
      folderLoco.open()

      // ── Train animation along the rails path ──────────────────────────────
      trainAnim = new TrainAnimation(loco, rails)

      // ── Wagon — single model from wagonFinal.glb ─────────────────────────
      const wagon = wagonGLTF.scene
      applyShadows(wagon)
      wagon.rotation.copy(loco.rotation)
      wagon.scale.setScalar(loco.scale.x)
      scene.add(wagon)
      trainAnim.setWagons([wagon])
      trainAnim.setWagonGap(0.012)

      const wagonParams = { gap: 0.012 }
      const folderWagon = gui.addFolder('Wagons')
      folderWagon.add(wagonParams, 'gap', 0.001, 0.15, 0.0001).name('gap (t-space)').onChange(v => trainAnim.setWagonGap(v))
      folderWagon.open()

      // ── Scenario manager (needs both weatherManager and trainAnim) ────────
      scenarioManager = new ScenarioManager({ weatherManager, trainAnim })

      // ── Sparks emitters — one GUI folder per emitter ─────────────────────
      ;[1, 2, 3].forEach(n => {
        const off = scenarioManager.sparksOffsets[n - 1]
        const p   = { x: off.x, y: off.y, z: off.z }
        const f   = gui.addFolder(`Sparks emitter ${n}`)
        f.add(p, 'x', -20, 20, 0.1).name('offset X').onChange(v => { off.x = v })
        f.add(p, 'y', -20, 20, 0.1).name('offset Y').onChange(v => { off.y = v })
        f.add(p, 'z', -20, 20, 0.1).name('offset Z').onChange(v => { off.z = v })
        f.open()
      })

      const trainParams = { playing: true, speed: 0.035, voie: 'Voie Normale' }
      const folderTrain = gui.addFolder('Train')
      folderTrain.add(trainParams, 'playing').name('Play / Pause').onChange(v => trainAnim.setPlaying(v))
      folderTrain.add(trainParams, 'speed', 0.005, 0.15, 0.005).name('speed').onChange(v => trainAnim.setSpeed(v))
      folderTrain.add(trainParams, 'voie', ['Voie Normale', 'Traverse Béton Bibloc'])
        .name('Voie').onChange(() => trainAnim.swapRail())
      folderTrain.open()

      // ── Camera mode toggle ────────────────────────────────────────────────
      const camParams = { mode: 'Follow train' }
      const folderCam = gui.addFolder('Camera')
      folderCam.add(camParams, 'mode', ['Follow train', 'Free camera']).name('mode').onChange(v => {
        if (v === 'Free camera') {
          camPhase = 'free'
          controls.enabled = true
          controls.target.copy(loco.position)
          controls.update()
        } else {
          camPhase = 'follow'
          controls.enabled = false
        }
      })
      folderCam.open()

      // ── Hotspot dot factory ───────────────────────────────────────────────
      function makeDot(key) {
        const onClick = () => navigate(`/inspect/${key}`)
        const wrap = document.createElement('div')
        wrap.className = 'hs-wrap'
        wrap.style.cssText = [
          'position:relative',
          'display:flex', 'flex-direction:column', 'align-items:center',
          'padding-top:18px',   // room for the ring that overflows the dot
          'cursor:pointer', 'pointer-events:auto',
        ].join(';')

        // Outer pulsing ring
        const ring = document.createElement('div')
        ring.className = 'hs-ring'

        // Inner solid dot
        const dot = document.createElement('div')
        dot.className = 'hs-dot'

        // Tooltip shown on hover
        const tip = document.createElement('div')
        tip.className = 'hs-tip'
        tip.textContent = 'INSPECT'

        wrap.appendChild(ring)
        wrap.appendChild(dot)
        wrap.appendChild(tip)
        wrap.addEventListener('click', onClick)
        return new CSS2DObject(wrap)
      }

      // ── Train hotspot — parented to loco so it follows the animation ─────
      // Position in loco LOCAL space: centre XZ, above the roof
      const locoHeight = (locoBox.max.y - locoBox.min.y) / loco.scale.y
      const trainDot   = makeDot('train')
      trainDot.position.set(0, locoHeight * 0.5 + 2, 0)   // local Y above roof
      loco.add(trainDot)

      // ── Rails hotspot — parented to loco so it follows the animation.
      // Offset to the side (local X) and at rail height so it sits beside
      // the loco rather than overlapping the train dot above it.
      const railsDot = makeDot('rails')
      railsDot.position.set(8, 0, 0)   // local space: side + rail level
      loco.add(railsDot)

      cleanupHotspots = () => { loco.remove(trainDot); loco.remove(railsDot) }

      // ── Hide loading indicator once everything is ready ────────────────────
      if (loadingDiv.parentNode) loadingDiv.parentNode.removeChild(loadingDiv)

    }).catch(err => {
      console.error('Model loading failed:', err)
      loadingDiv.innerText = 'Failed to load scene. Check console.'
    })

    // ── Resize ────────────────────────────────────────────────────────────────
    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
      composer.setSize(window.innerWidth, window.innerHeight)
      labelRenderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onWindowResize)

    // ── Animate ───────────────────────────────────────────────────────────────
    // Reusable vectors — allocated once to avoid GC pressure
    const _tgt  = new THREE.Vector3()
    const _side = new THREE.Vector3()

    function animate() {
      animFrameId = requestAnimationFrame(animate)
      const delta   = clock.getDelta()
      const elapsed = performance.now() * 0.001

      skyUniforms['time'].value = elapsed
      weatherManager?.update(delta, elapsed)
      scenarioManager?.update(delta, elapsed)
      trainAnim?.update(delta)

      // ── Auto sun position — update once per real-world minute ─────────────
      const _now = new Date()
      const _min = _now.getHours() * 60 + _now.getMinutes()
      if (_min !== lastSunMinuteRef.current) {
        lastSunMinuteRef.current = _min
        const { elevation: el, azimuth: az } = computeSunAngles(_now)
        parameters.elevation = el
        parameters.azimuth   = az
        updateSun()
      }

      // ── Apply queued weather data from polling effect ─────────────────────
      if (pendingWeatherRef.current) {
        const _wd = pendingWeatherRef.current
        pendingWeatherRef.current = null
        weatherManager?.setWeather(weatherCodeToType(_wd))
        const cf = (_wd.clouds_pct ?? 0) / 100
        skyUniforms['cloudCoverage'].value = cf
        skyUniforms['cloudDensity'].value  = 0.3 + cf * 0.5
      }

      // ── Ground fog drift ──────────────────────────────────────────────────
      for (const { mesh, mat, baseOpacity, speed, offset } of groundFogPlanes) {
        mesh.position.x = camera.position.x + Math.sin(elapsed * 0.04 + offset) * 50
        mesh.position.z = camera.position.z + Math.cos(elapsed * 0.03 + offset) * 40
        mat.opacity = baseOpacity + Math.sin(elapsed * speed * 0.25 + offset) * 0.05
      }

      // ── Camera phases ─────────────────────────────────────────────────────
      const locoPos = trainAnim?.loco?.position ?? _camLocoRef

      if (camPhase === 'intro') {
        // Cubic ease-out zoom from the far establishing shot toward the train
        camIntroT = Math.min(camIntroT + delta / 2.8, 1)
        const ease = 1 - Math.pow(1 - camIntroT, 3)
        camera.position.lerpVectors(_camStart, _camEnd, ease)
        camera.lookAt(locoPos)
        if (camIntroT >= 1) camPhase = 'follow'

      } else if (camPhase === 'follow' && trainAnim?.curve) {
        const tangent = trainAnim.curve.getTangentAt(Math.min(trainAnim.t, 0.9999)).clone().normalize()

        // Right-hand perpendicular in XZ plane
        _side.set(tangent.z, 0, -tangent.x)

        // Right-front: offset to the right + ahead of the loco so the front is visible
        _tgt.copy(locoPos)
          .addScaledVector(_side, 32)    // 32 units to the right
          .addScaledVector(tangent, 18)  // 18 units ahead of the loco
        _tgt.y = locoPos.y + 9

        const lerpFactor = trainAnim.wrapped ? 1 : 0.06
        camera.position.lerp(_tgt, lerpFactor)

        // Look at the train — front-right angle reveals the locomotive face
        camera.lookAt(locoPos.x, locoPos.y + 2, locoPos.z)
      } else if (camPhase === 'free') {
        controls.update()
      }

      composer.render()
      labelRenderer.render(scene, camera)
      stats.update()
    }
    animate()

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animFrameId)
      window.removeEventListener('resize', onWindowResize)
      for (const { mesh } of groundFogPlanes) {
        scene.remove(mesh)
        mesh.geometry.dispose()
        mesh.material.dispose()
      }
      weatherManager?.dispose()
      scenarioManager?.dispose()
      trainAnim?.dispose()
      cleanupHotspots?.()
      gui.destroy()
      controls.dispose()
      composer.dispose()
      renderer.dispose()
      if (renderTarget) renderTarget.dispose()
      pmremGenerator.dispose()
      if (mount.contains(renderer.domElement))      mount.removeChild(renderer.domElement)
      if (mount.contains(labelRenderer.domElement)) mount.removeChild(labelRenderer.domElement)
      if (mount.contains(stats.dom))                mount.removeChild(stats.dom)
      if (loadingDiv.parentNode)                    loadingDiv.parentNode.removeChild(loadingDiv)
    }
  }, [])

  // ── Live clock — updates every second ─────────────────────────────────────
  useEffect(() => {
    function tick() {
      setClockTime(new Date().toLocaleTimeString('fr-TN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // ── Weather polling — every 10 minutes, applies to scene via ref ──────────
  useEffect(() => {
    let cancelled = false
    async function poll() {
      try {
        const res = await fetch('http://localhost:8000/api/weather/scene')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!cancelled) {
          setWeatherInfo(data)
          pendingWeatherRef.current = data
        }
      } catch (e) {
        console.warn('[Weather] Poll failed:', e.message)
      }
    }
    poll()
    const id = setInterval(poll, 10 * 60 * 1000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <style>{`
        .hs-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          pointer-events: auto;
        }
        .hs-dot {
          width: 18px; height: 18px;
          background: #70c1ff;
          border-radius: 50%;
          border: 2.5px solid #fff;
          box-shadow: 0 0 14px 4px rgba(112,193,255,0.85),
                      0 0 30px 6px rgba(112,193,255,0.4);
          animation: hs-pulse 1.8s ease-in-out infinite;
          position: relative; z-index: 2;
        }
        .hs-ring {
          position: absolute;
          width: 36px; height: 36px;
          border-radius: 50%;
          border: 2px solid rgba(112,193,255,0.6);
          animation: hs-ring 1.8s ease-out infinite;
          pointer-events: none;
        }
        @keyframes hs-pulse {
          0%,100% { transform: scale(1);    box-shadow: 0 0 14px 4px rgba(112,193,255,0.85), 0 0 30px 6px rgba(112,193,255,0.4); }
          50%      { transform: scale(1.25); box-shadow: 0 0 20px 8px rgba(112,193,255,1),    0 0 50px 12px rgba(112,193,255,0.6); }
        }
        @keyframes hs-ring {
          0%   { transform: scale(0.6); opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .hs-tip {
          opacity: 0;
          background: rgba(4,9,26,0.9);
          color: #70c1ff;
          font-family: system-ui, sans-serif;
          font-size: 0.62rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          padding: 4px 10px;
          border-radius: 20px;
          border: 1px solid rgba(112,193,255,0.35);
          white-space: nowrap;
          pointer-events: none;
          transform: translateY(4px);
          transition: opacity 0.2s ease, transform 0.2s ease;
          margin-top: 6px;
        }
        .hs-wrap:hover .hs-tip { opacity: 1; transform: translateY(0); }
        .hs-wrap:hover .hs-dot {
          background: #fff;
          box-shadow: 0 0 24px 8px rgba(255,255,255,0.9), 0 0 50px 14px rgba(112,193,255,0.7);
        }
      `}</style>

      <div ref={mountRef} style={{ position: 'relative', width: '100%', height: '100%' }} />

      {/* ── Live clock + weather HUD ─────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: '16px', right: '16px',
        fontFamily: 'monospace', color: '#e8f4ff',
        background: 'rgba(4,9,26,0.55)', backdropFilter: 'blur(6px)',
        border: '1px solid rgba(112,193,255,0.25)',
        borderRadius: '10px', padding: '10px 16px',
        zIndex: 50, pointerEvents: 'none', minWidth: '160px',
        textAlign: 'center', userSelect: 'none',
      }}>
        <div style={{ fontSize: '1.5rem', letterSpacing: '0.12em', fontWeight: 700 }}>
          {clockTime}
        </div>
        {weatherInfo && (
          <div style={{ marginTop: '6px', borderTop: '1px solid rgba(112,193,255,0.2)', paddingTop: '6px' }}>
            <div style={{ fontSize: '0.72rem', opacity: 0.7, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Gafsa, TN
            </div>
            <div style={{ fontSize: '0.85rem', marginTop: '2px' }}>
              {weatherInfo.condition}
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '2px' }}>
              {Math.round(weatherInfo.temperature)}°C · {Math.round(weatherInfo.wind_speed)} m/s
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
