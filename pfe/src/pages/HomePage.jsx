import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { SuspensionBanner, SuspensionPanel } from '../components/ui/SuspensionPanel'
import * as THREE from 'three'

const API_BASE = 'http://localhost:8000/api'

/* ── Reusable glass card ── */
function GCard({ children, style }) {
  return (
    <div style={{
      background: 'rgba(4,9,22,0.78)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(112,193,255,0.08)', borderRadius: '12px',
      color: '#70c1ff', fontFamily: 'monospace',
      ...style,
    }}>{children}</div>
  )
}
function Label({ children }) {
  return <div style={{ fontSize: '0.48rem', letterSpacing: '0.36em', opacity: 0.32, marginBottom: '4px' }}>{children}</div>
}
function Bar({ value, max = 100, color }) {
  return (
    <div style={{ height: '3px', background: 'rgba(112,193,255,0.07)', borderRadius: '2px', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${(value / max) * 100}%`, background: color, borderRadius: '2px', boxShadow: `0 0 5px ${color}55` }} />
    </div>
  )
}
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

const SEGMENTS_LOADING = [
  { id: '...', name: '—', health: 50, degres_par_km: 0, color: 'rgba(112,193,255,0.2)', status: '—' },
  { id: '...', name: '—', health: 50, degres_par_km: 0, color: 'rgba(112,193,255,0.2)', status: '—' },
  { id: '...', name: '—', health: 50, degres_par_km: 0, color: 'rgba(112,193,255,0.2)', status: '—' },
]

export default function HomePage() {
  const mountRef      = useRef(null)
  const loaderRef     = useRef(null)
  const currentVoieRef = useRef('Voie Normale')
  const navigate      = useNavigate()
  const { user, role } = useAuth()
  const { isDark } = useTheme()
  const isAdmin = role === 'admin'

  // All overlays use the same material as the sidebar
  const sidebarBg     = isDark ? 'rgba(30,30,30,0.82)'    : 'rgba(255,255,255,0.95)'
  const sidebarBorder = isDark ? 'rgba(255,255,255,0.1)'  : 'rgba(0,0,0,0.08)'
  const sidebarShadow = isDark ? '0 8px 32px rgba(0,0,0,0.45)' : '0 8px 32px rgba(0,0,0,0.12)'

  const glassCard    = sidebarBg
  const glassBorder  = sidebarBorder
  const glassText    = isDark ? 'rgba(255,255,255,0.55)'  : '#475569'
  const glassActive  = isDark ? 'rgba(112,193,255,0.14)'  : 'rgba(99,102,241,0.1)'
  const glassActiveBd= isDark ? 'rgba(112,193,255,0.4)'  : 'rgba(99,102,241,0.45)'
  const glassActiveCol=isDark ? '#70c1ff'                 : '#6366f1'

  // Notification panel — same material, slightly more opaque
  const panelBg      = isDark ? 'rgba(30,30,30,0.95)'    : 'rgba(255,255,255,0.98)'
  const panelBorder  = sidebarBorder
  const panelText    = isDark ? 'rgba(255,255,255,0.75)' : '#1e293b'
  const panelMuted   = isDark ? 'rgba(255,255,255,0.38)' : '#64748b'
  const panelDivider = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'

  // Drawer — same material, full opaque panel
  const drawerBg         = isDark ? 'rgba(30,30,30,0.97)'    : 'rgba(255,255,255,0.98)'
  const drawerBorder     = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.09)'
  const drawerCardBg     = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(248,250,252,0.85)'
  const drawerCardBd     = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  const drawerCardShadow = isDark ? 'none'                   : '0 1px 4px rgba(0,0,0,0.05)'
  const dText    = isDark ? '#e8f4ff'                 : '#0f172a'
  const dMuted   = isDark ? 'rgba(255,255,255,0.38)'  : '#64748b'
  const dFaint   = isDark ? 'rgba(255,255,255,0.2)'   : '#94a3b8'
  const dSubtle  = isDark ? 'rgba(255,255,255,0.05)'  : 'rgba(0,0,0,0.04)'
  const dDivider = isDark ? 'rgba(255,255,255,0.08)'  : 'rgba(0,0,0,0.06)'
  const dBtnBg   = isDark ? 'rgba(255,255,255,0.05)'  : 'rgba(0,0,0,0.025)'
  const dBtnBd   = isDark ? 'rgba(255,255,255,0.08)'  : 'rgba(0,0,0,0.07)'
  const arcTrack = isDark ? 'rgba(255,255,255,0.08)'  : 'rgba(0,0,0,0.08)'
  const wVal     = isDark ? '#d0e8ff'                 : '#334155'

  // Origin page when arriving via "Jouer la simulation"
  const [scenarioOrigin, setScenarioOrigin] = useState(() => {
    const o = sessionStorage.getItem('scenarioOrigin')
    if (o) sessionStorage.removeItem('scenarioOrigin')
    return o
  })

  // Panel state
  const [panelOpen,     setPanelOpen]     = useState(false)
  const [notifOpen,     setNotifOpen]     = useState(false)
  const [simSpeed,      setSimSpeed]      = useState(62)
  const [voie,          setVoie]          = useState('Voie Normale')

  // Live clock and weather display state
  const [clockTime,   setClockTime]   = useState('--:--:--')
  const [weatherInfo, setWeatherInfo] = useState(null)

  // API data
  const [segments,       setSegments]       = useState(SEGMENTS_LOADING)
  const [trainPosition,  setTrainPosition]  = useState(null)
  const [alerts,         setAlerts]         = useState([])
  const [suspension,     setSuspension]     = useState(null)
  const [pendingAdmins,  setPendingAdmins]  = useState([])

  // Active 3D scenario (for scenario picker UI)
  const [activeScenario, setActiveScenario] = useState('normal')

  // Refs so the weather-polling effect can hand data to the Three.js render loop
  const weatherManagerRef   = useRef(null)
  const skyUniformsRef      = useRef(null)
  const pendingWeatherRef   = useRef(null)
  const lastSunMinuteRef    = useRef(-1)
  const trainAnimRef        = useRef(null)
  const railsRef            = useRef(null)
  const scenarioManagerRef  = useRef(null)
  const userRef             = useRef(user)
  const lastRecordedRef     = useRef(null)

  // Keep userRef in sync so the Three.js effect can access the current user
  useEffect(() => { userRef.current = user }, [user])

  // Reverse-map: 3D scene ID → backend scenario_id + summary
  const SCENE_META = {
    derail_full:    { id: 'deraillement',     summary: 'Simulation de déraillement total lancée depuis la scène 3D.' },
    sandwear:       { id: 'usure_rails',      summary: 'Simulation d\'usure rails avec tempête de sable.' },
    fogbrake:       { id: 'brouillard_dense', summary: 'Simulation de brouillard dense — visibilité réduite.' },
    heatload:       { id: 'surcharge_voie',   summary: 'Simulation de surcharge voie par canicule.' },
    rainbrake:      { id: 'inondation_voie',  summary: 'Simulation d\'inondation voie avec freinage d\'urgence.' },
    derail_partial: { id: 'deraillement',     summary: 'Simulation de déraillement partiel lancée depuis la scène 3D.' },
    curve:          { id: 'courbure_critique',summary: 'Simulation de courbure critique — ralentissement imposé.' },
  }

  // Record journal entry whenever a scenario is launched (auto or manual)
  // Deduplicates: same scenario re-clicked on the same day won't create duplicate entries
  useEffect(() => {
    if (activeScenario === 'normal') return
    const meta = SCENE_META[activeScenario]
    if (!meta) return
    const u = userRef.current
    if (!u) return
    const today = new Date().toISOString().slice(0, 10)
    if (lastRecordedRef.current?.id === activeScenario && lastRecordedRef.current?.date === today) return
    lastRecordedRef.current = { id: activeScenario, date: today }
    u.getIdToken().then(token =>
      fetch(`${API_BASE}/journal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ date: today, scenario_id: meta.id, mode: 'AUTO', summary: meta.summary }),
      }).catch(() => {})
    ).catch(() => {})
  }, [activeScenario]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleVoieChange = useCallback((v) => {
    if (!trainAnimRef.current || !railsRef.current) return
    trainAnimRef.current.swapRail()
    railsRef.current.position.z = v === 'Traverse Béton Bibloc' ? 11.7 : 0
    currentVoieRef.current = v
    setVoie(v)
  }, [])

  // ── Simulated speed when GPS offline ────────────────────────────────────────
  useEffect(() => {
    let t = 0
    const id = setInterval(() => {
      t += 0.04
      setSimSpeed(Math.round(58 + Math.sin(t * 0.7) * 14 + Math.sin(t * 2.1) * 5))
    }, 150)
    return () => clearInterval(id)
  }, [])

  // ── API polling — segments, GPS, suspension ──────────────────────────────────
  useEffect(() => {
    if (!user) return
    async function loadAll() {
      try {
        const token = await user.getIdToken()
        const headers = { 'Authorization': `Bearer ${token}` }
        fetch(`${API_BASE}/segments`, { headers })
          .then(r => r.ok ? r.json() : null).then(d => d && setSegments(d.segments)).catch(() => {})
        fetch(`${API_BASE}/train/latest`, { headers })
          .then(r => r.ok ? r.json() : null)
          .then(d => d?.position ? setTrainPosition(d.position) : setTrainPosition(null)).catch(() => {})
        fetch(`${API_BASE}/suspension/active`, { headers })
          .then(r => r.ok ? r.json() : null)
          .then(d => d && setSuspension(d.active ? d.suspension : null)).catch(() => {})
      } catch {}
    }
    loadAll()
    const id = setInterval(loadAll, 30000)
    return () => clearInterval(id)
  }, [user])

  // ── Admin alerts ──────────────────────────────────────────────────────────────
  const fetchAlerts = useCallback(async () => {
    if (!isAdmin || !user) return
    try {
      const token = await user.getIdToken()
      const res = await fetch(`${API_BASE}/alerts`, { headers: { 'Authorization': `Bearer ${token}` } })
      if (res.ok) { const d = await res.json(); setAlerts(d.alerts || []) }
    } catch {}
  }, [isAdmin, user])

  useEffect(() => {
    if (!isAdmin) return
    fetchAlerts()
    const id = setInterval(fetchAlerts, 30000)
    return () => clearInterval(id)
  }, [isAdmin, fetchAlerts])

  const acknowledgeAlert = useCallback(async (alertId) => {
    if (!user) return
    try {
      const token = await user.getIdToken()
      await fetch(`${API_BASE}/alerts/${alertId}/acknowledge`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } })
      setAlerts(prev => prev.filter(a => a._id !== alertId))
    } catch {}
  }, [user])

  // ── Pending admin requests (admin only) ──────────────────────────────────────
  const fetchPendingAdmins = useCallback(async () => {
    if (!isAdmin || !user) return
    try {
      const token = await user.getIdToken()
      const res = await fetch(`${API_BASE}/auth/pending-admins`, { headers: { 'Authorization': `Bearer ${token}` } })
      if (res.ok) { const d = await res.json(); setPendingAdmins(d.pending_admins || []) }
    } catch {}
  }, [isAdmin, user])

  useEffect(() => {
    if (!isAdmin) return
    fetchPendingAdmins()
    const id = setInterval(fetchPendingAdmins, 60000)
    return () => clearInterval(id)
  }, [isAdmin, fetchPendingAdmins])

  const approveAdmin = useCallback(async (uid) => {
    if (!user) return
    try {
      const token = await user.getIdToken()
      await fetch(`${API_BASE}/auth/pending-admins/${uid}/approve`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } })
      setPendingAdmins(prev => prev.filter(u => u.uid !== uid))
    } catch {}
  }, [user])

  const rejectAdmin = useCallback(async (uid) => {
    if (!user) return
    try {
      const token = await user.getIdToken()
      await fetch(`${API_BASE}/auth/pending-admins/${uid}/reject`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } })
      setPendingAdmins(prev => prev.filter(u => u.uid !== uid))
    } catch {}
  }, [user])

  const fetchSuspension = useCallback(async () => {
    if (!user) return
    try {
      const token = await user.getIdToken()
      const res = await fetch(`${API_BASE}/suspension/active`, { headers: { 'Authorization': `Bearer ${token}` } })
      if (res.ok) { const d = await res.json(); setSuspension(d.active ? d.suspension : null) }
    } catch {}
  }, [user])

  // Derived values
  const isGpsLive    = trainPosition && (Date.now() - new Date(trainPosition.timestamp).getTime() < 60_000)
  const displaySpeed = isGpsLive ? Math.round(trainPosition.speed_kmh) : simSpeed
  const speedSource  = isGpsLive ? 'GPS LIVE' : 'SIMULATION'
  const speedColor   = isGpsLive ? '#fbbf24' : '#70c1ff'
  const criticalSeg  = segments.reduce((a, b) => (b.health ?? 50) < (a.health ?? 50) ? b : a)

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
    stats.dom.style.display = 'none'
    mount.appendChild(stats.dom)

    // ── GUI (dev tool — hidden in all modes) ────────────────────────────────
    const gui = new GUI()
    gui.hide()

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
      trainAnimRef.current = trainAnim
      railsRef.current     = rails

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
      scenarioManagerRef.current = scenarioManager

      // ── Auto-launch scenario coming from Journal / IA page ────────────────
      const pendingScenario = sessionStorage.getItem('autoScenario')
      if (pendingScenario) {
        sessionStorage.removeItem('autoScenario')
        setTimeout(() => {
          scenarioManager.setScenario(pendingScenario)
          setActiveScenario(pendingScenario)
        }, 800)
      }

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
        .name('Voie').onChange(v => {
          trainAnim.swapRail()
          rails.position.z = v === 'Traverse Béton Bibloc' ? 11.7 : 0
          currentVoieRef.current = v
        })
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
        const onClick = () => navigate(`/inspect/${typeof key === 'function' ? key() : key}`)
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

      // ── Rails hotspot — navigates to voie_bibloc when bibloc is active ─────
      const railsDot = makeDot(() =>
        currentVoieRef.current === 'Traverse Béton Bibloc' ? 'voie_bibloc' : 'rails'
      )
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
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', fontFamily: 'monospace', color: '#70c1ff' }}>
      <SuspensionBanner suspension={suspension} />
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

      {/* ── Top-left: logo ── */}
      <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 50, pointerEvents: 'none', fontFamily: 'monospace' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
          <img src="/Logo_-_SNCFT.png" alt="SNCFT" style={{ height: 24, width: 'auto', filter: isDark ? 'brightness(0) invert(1)' : 'brightness(0)', opacity: isDark ? 0.75 : 0.8 }} />
          <div style={{ width: 1, height: 18, background: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)', flexShrink: 0 }} />
          <div style={{ fontSize: '0.7rem', letterSpacing: '0.22em', fontWeight: 700, color: isDark ? '#e8f4ff' : '#0f172a', textShadow: isDark ? '0 0 14px rgba(112,193,255,0.45)' : 'none' }}>
            JUMEAU NUMÉRIQUE
          </div>
        </div>
        <div style={{ fontSize: '0.44rem', letterSpacing: '0.32em', color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)', marginBottom: '2px' }}>SNCFT — ZONE SUD-OUEST</div>
        <div style={{ fontSize: '0.6rem', letterSpacing: '0.12em', color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.45)' }}>{clockTime}</div>
      </div>

      {/* ── Back button — shown only when arriving from Journal/IA via scenario ── */}
      {scenarioOrigin && (
        <button
          onClick={() => { setScenarioOrigin(null); navigate(scenarioOrigin) }}
          style={{
            position: 'absolute', top: 68, left: 16, zIndex: 50,
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'rgba(4,9,26,0.72)', backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(112,193,255,0.22)', borderRadius: 20,
            padding: '6px 14px',
            color: 'rgba(112,193,255,0.8)',
            fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.12em',
            cursor: 'pointer', transition: 'all 0.2s',
            animation: 'fadeDown 0.4s cubic-bezier(0.16,1,0.3,1) both',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(112,193,255,0.55)'; e.currentTarget.style.color = '#70c1ff' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(112,193,255,0.22)'; e.currentTarget.style.color = 'rgba(112,193,255,0.8)' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          {scenarioOrigin === '/journal' ? 'Retour au Journal' : 'Retour à l\'IA'}
        </button>
      )}

      {/* ── Notification bell — top right ── */}
      {(() => {
        const hasAdminNotif  = isAdmin && (alerts.length > 0 || pendingAdmins.length > 0)
        const hasUserNotif   = !isAdmin && !!suspension
        const hasAny         = hasAdminNotif || hasUserNotif
        const badgeCount     = isAdmin ? alerts.length + pendingAdmins.length : (suspension ? 1 : 0)
        return (
          <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 100 }}>
            {/* Bell button */}
            <button
              onClick={() => setNotifOpen(o => !o)}
              style={{
                width: 40, height: 40, borderRadius: 12,
                background: notifOpen ? glassActive : glassCard,
                backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                border: `1px solid ${notifOpen ? glassActiveBd : glassBorder}`,
                color: notifOpen ? glassActiveCol : glassText,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', transition: 'all 0.2s',
                animation: 'fadeDown 0.4s ease both',
              }}
              onMouseEnter={e => { if (!notifOpen) { e.currentTarget.style.borderColor = glassActiveBd; e.currentTarget.style.color = isDark ? '#fff' : '#1e293b' } }}
              onMouseLeave={e => { if (!notifOpen) { e.currentTarget.style.borderColor = glassBorder; e.currentTarget.style.color = glassText } }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {/* Badge */}
              {hasAny && (
                <div style={{
                  position: 'absolute', top: -5, right: -5,
                  minWidth: 16, height: 16, borderRadius: 8,
                  background: '#f87171', border: '2px solid rgba(3,8,22,0.9)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.42rem', fontWeight: 700, color: '#fff',
                  animation: 'hud-alert 2.5s ease infinite',
                  padding: '0 3px',
                }}>
                  {badgeCount}
                </div>
              )}
            </button>

            {/* Dropdown panel */}
            {notifOpen && (
              <div style={{
                position: 'absolute', top: 48, right: 0,
                width: 300,
                background: panelBg,
                backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
                border: `1px solid ${panelBorder}`,
                borderRadius: 16,
                boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.6)' : '0 16px 48px rgba(0,0,0,0.15)',
                overflow: 'hidden',
                animation: 'notifDrop 0.22s cubic-bezier(0.16,1,0.3,1) both',
                fontFamily: 'monospace',
              }}>
                {/* Header */}
                <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${panelDivider}`, display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 7, background: isDark ? 'rgba(112,193,255,0.1)' : '#eef2ff', border: isDark ? '1px solid rgba(112,193,255,0.22)' : '1px solid #c7d2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: glassActiveCol }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  </div>
                  <span style={{ fontSize: '0.6rem', letterSpacing: '0.22em', color: panelText, fontWeight: 600 }}>NOTIFICATIONS</span>
                  {hasAny && <span style={{ marginLeft: 'auto', fontSize: '0.44rem', color: '#f87171', letterSpacing: '0.1em' }}>{badgeCount} ACTIVE{badgeCount > 1 ? 'S' : ''}</span>}
                </div>

                {/* Content */}
                <div style={{ maxHeight: 320, overflowY: 'auto', padding: '10px 12px 14px' }}>

                  {/* ── ADMIN: pending admin requests ── */}
                  {isAdmin && pendingAdmins.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: '0.4rem', letterSpacing: '0.22em', color: 'rgba(167,139,250,0.6)', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                        DEMANDES D'ACCÈS ADMIN
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {pendingAdmins.map(u => (
                          <div key={u.uid} style={{ padding: '9px 11px', background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.2)', borderLeft: '3px solid rgba(167,139,250,0.5)', borderRadius: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 22, height: 22, borderRadius: 7, background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', color: '#a78bfa', fontWeight: 700 }}>
                                  {(u.email || '?')[0].toUpperCase()}
                                </div>
                                <span style={{ fontSize: '0.5rem', color: '#c4b5fd', fontWeight: 600, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email || u.uid}</span>
                              </div>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button onClick={() => approveAdmin(u.uid)} style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 6, color: '#4ade80', cursor: 'pointer', fontSize: '0.38rem', letterSpacing: '0.1em', padding: '2px 7px' }}>✓ OUI</button>
                                <button onClick={() => rejectAdmin(u.uid)} style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 6, color: '#f87171', cursor: 'pointer', fontSize: '0.38rem', letterSpacing: '0.1em', padding: '2px 7px' }}>✕ NON</button>
                              </div>
                            </div>
                            <div style={{ fontSize: '0.42rem', color: 'rgba(255,255,255,0.3)' }}>Demande d'accès administrateur</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── ADMIN: curvature alerts ── */}
                  {isAdmin && (
                    alerts.length === 0 && pendingAdmins.length === 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '20px 0', color: panelMuted, fontSize: '0.52rem' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        Aucune notification
                      </div>
                    ) : alerts.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                        {alerts.map(a => (
                          <div key={a._id} style={{ padding: '9px 11px', background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)', borderLeft: '3px solid rgba(248,113,113,0.5)', borderRadius: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f87171', boxShadow: '0 0 5px #f87171', animation: 'hud-dot 2s ease infinite' }} />
                                <span style={{ fontSize: '0.54rem', color: '#f87171', fontWeight: 700 }}>{a.segment_id}</span>
                              </div>
                              <button onClick={() => acknowledgeAlert(a._id)} style={{ background: 'rgba(112,193,255,0.08)', border: '1px solid rgba(112,193,255,0.18)', borderRadius: 6, color: 'rgba(112,193,255,0.6)', cursor: 'pointer', fontSize: '0.4rem', letterSpacing: '0.1em', padding: '2px 8px' }}>ACQ</button>
                            </div>
                            <div style={{ fontSize: '0.48rem', color: 'rgba(255,255,255,0.38)', lineHeight: 1.55 }}>{a.message?.slice(0, 90)}</div>
                          </div>
                        ))}
                      </div>
                    ) : null
                  )}

                  {/* ── USER: suspension notice ── */}
                  {!isAdmin && (
                    suspension ? (
                      <div style={{ padding: '10px 12px', background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.2)', borderLeft: '3px solid rgba(251,191,36,0.6)', borderRadius: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 6px #fbbf24', animation: 'hud-dot 2s ease infinite' }} />
                          <span style={{ fontSize: '0.52rem', color: '#fbbf24', fontWeight: 700, letterSpacing: '0.08em' }}>SUSPENSION DE SERVICE</span>
                        </div>
                        <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.5)', marginBottom: 4, letterSpacing: '0.06em' }}>Segment : {suspension.segment_id}</div>
                        <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>{suspension.message}</div>
                        {suspension.end_date && (
                          <div style={{ marginTop: 7, fontSize: '0.44rem', color: 'rgba(255,255,255,0.3)' }}>
                            Fin prévue : {new Date(suspension.end_date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '20px 0', color: panelMuted, fontSize: '0.52rem' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        Aucune suspension active
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Close on outside click */}
            {notifOpen && <div onClick={() => setNotifOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: -1 }} />}
          </div>
        )
      })()}

      {/* ── VOIE SELECTOR — top-center ── */}
      <div style={{
        position: 'absolute', bottom: '150px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 50, display: 'flex', gap: '6px',
        animation: 'fadeIn 0.5s ease 0.2s both',
      }}>
        {['Voie Normale', 'Traverse Béton Bibloc'].map(v => {
          const active = voie === v
          return (
            <button
              key={v}
              onClick={() => handleVoieChange(v)}
              style={{
                padding: '8px 20px',
                borderRadius: '10px',
                fontFamily: 'monospace',
                fontSize: '0.6rem',
                letterSpacing: '0.16em',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: active
                  ? (isDark ? 'rgba(112,193,255,0.22)' : 'rgba(99,102,241,0.14)')
                  : (isDark ? 'rgba(4,9,22,0.82)' : 'rgba(255,255,255,0.92)'),
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: active
                  ? `1px solid ${isDark ? 'rgba(112,193,255,0.65)' : 'rgba(99,102,241,0.55)'}`
                  : `1px solid ${isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)'}`,
                color: active
                  ? (isDark ? '#70c1ff' : '#6366f1')
                  : (isDark ? 'rgba(255,255,255,0.5)' : '#64748b'),
                boxShadow: active
                  ? (isDark ? '0 0 18px rgba(112,193,255,0.25), 0 2px 8px rgba(0,0,0,0.4)' : '0 0 14px rgba(99,102,241,0.2), 0 2px 8px rgba(0,0,0,0.08)')
                  : (isDark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.08)'),
                fontWeight: active ? 700 : 400,
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = isDark ? 'rgba(112,193,255,0.35)' : 'rgba(99,102,241,0.3)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)' }}
            >
              {v === 'Voie Normale' ? '⊟  VOIE NORMALE' : '⊞  BÉTON BIBLOC'}
            </button>
          )
        })}
      </div>

      {/* ── BIG HUD BUTTON ── */}
      <div style={{ position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)', zIndex: 50, animation: 'fadeIn 0.5s ease 0.3s both' }}>
      <div
        onClick={() => setPanelOpen(true)}
        style={{
          cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none',
          background: glassCard, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          border: `1px solid ${isGpsLive ? 'rgba(251,191,36,0.3)' : glassBorder}`,
          borderRadius: '24px', padding: '14px 28px',
          display: 'flex', alignItems: 'center', gap: '22px',
          boxShadow: sidebarShadow,
          transition: 'background 0.2s, transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = isDark ? '0 14px 40px rgba(0,0,0,0.6)' : '0 14px 40px rgba(0,0,0,0.18)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = sidebarShadow }}
      >
        {/* Speed */}
        <div style={{ textAlign: 'center', minWidth: '72px' }}>
          <div style={{ fontSize: '1.9rem', letterSpacing: '0.04em', color: speedColor, lineHeight: 1 }}>{displaySpeed}</div>
          <div style={{ fontSize: '0.44rem', letterSpacing: '0.3em', color: isDark ? 'rgba(255,255,255,0.35)' : '#64748b', marginTop: '2px' }}>KM/H</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '5px', padding: '2px 8px', borderRadius: '20px', fontSize: '0.4rem', letterSpacing: '0.18em', color: speedColor, background: isGpsLive ? 'rgba(251,191,36,0.1)' : 'rgba(112,193,255,0.08)' }}>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: speedColor, display: 'inline-block', animation: 'hud-dot 2s ease infinite' }} />
            {speedSource}
          </div>
        </div>

        <div style={{ width: '1px', height: '44px', background: isDark ? 'rgba(112,193,255,0.12)' : 'rgba(0,0,0,0.1)', flexShrink: 0 }} />

        {/* Weather */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.72rem', color: isDark ? '#e8f4ff' : '#0f172a' }}>{weatherInfo ? weatherInfo.condition : '—'}</div>
          <div style={{ fontSize: '0.52rem', color: isDark ? 'rgba(255,255,255,0.45)' : '#64748b', marginTop: '3px' }}>
            {weatherInfo ? `${Math.round(weatherInfo.temperature)}°C · vent ${Math.round(weatherInfo.wind_speed * 3.6)} km/h` : 'météo…'}
          </div>
          {weatherInfo?.impact_level && weatherInfo.impact_level !== 'LOW' && (
            <div style={{ marginTop: '5px', padding: '2px 8px', borderRadius: '20px', fontSize: '0.4rem', letterSpacing: '0.18em', background: 'rgba(248,113,113,0.12)', color: '#f87171', display: 'inline-block' }}>
              ⚠ {weatherInfo.impact_level}
            </div>
          )}
        </div>

        <div style={{ width: '1px', height: '44px', background: isDark ? 'rgba(112,193,255,0.12)' : 'rgba(0,0,0,0.1)', flexShrink: 0 }} />

        {/* Rails */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.72rem', color: isDark ? '#e8f4ff' : '#0f172a' }}>
            {segments[0]?.health != null ? `${Math.round(segments.reduce((s, g) => s + (g.health ?? 50), 0) / segments.length)}%` : '—'}
          </div>
          <div style={{ fontSize: '0.44rem', letterSpacing: '0.2em', color: isDark ? 'rgba(255,255,255,0.35)' : '#64748b', marginTop: '3px' }}>RAILS</div>
        </div>

        {isAdmin && alerts.length > 0 && <>
          <div style={{ width: '1px', height: '44px', background: isDark ? 'rgba(112,193,255,0.12)' : 'rgba(0,0,0,0.1)', flexShrink: 0 }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '26px', height: '26px', borderRadius: '50%', margin: '0 auto', background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#f87171', animation: 'hud-alert 2.5s ease infinite' }}>
              {alerts.length}
            </div>
            <div style={{ fontSize: '0.4rem', letterSpacing: '0.18em', opacity: 0.4, marginTop: '4px' }}>ALERTES</div>
          </div>
        </>}

        <div style={{ width: '1px', height: '44px', background: isDark ? 'rgba(112,193,255,0.12)' : 'rgba(0,0,0,0.1)', flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: isDark ? 'rgba(255,255,255,0.38)' : '#64748b', fontSize: '0.42rem', letterSpacing: '0.22em' }}>
          <svg width="14" height="9" viewBox="0 0 14 9" fill="none"><path d="M1 8L7 2L13 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          OUVRIR
        </div>
      </div>
      </div>

      {/* ── EXPANDED DRAWER ── */}
      {panelOpen && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>

          {/* Backdrop */}
          <div onClick={() => setPanelOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,2,10,0.6)', backdropFilter: 'blur(6px)' }} />

          {/* Panel */}
          <div style={{
            position: 'relative', zIndex: 1, height: '80vh',
            marginLeft: '80px',
            background: drawerBg,
            backgroundImage: 'radial-gradient(rgba(128,128,128,0.1) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            backdropFilter: 'blur(48px)', WebkitBackdropFilter: 'blur(48px)',
            borderTop: `2px solid ${isGpsLive ? 'rgba(251,191,36,0.5)' : drawerBorder}`,
            borderRadius: '28px 28px 0 0',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: isDark ? '0 -24px 60px rgba(0,0,0,0.5)' : '0 -12px 40px rgba(0,0,0,0.1)',
            animation: 'drawerSlideUp 0.38s cubic-bezier(0.16,1,0.3,1) both',
          }}>

            {/* Top glow — dark mode only */}
            {isDark && <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '180px', pointerEvents: 'none',
              background: `radial-gradient(ellipse at 50% 0%, ${isGpsLive ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.05)'} 0%, transparent 70%)`,
            }} />}

            {/* Handle */}
            <div style={{ padding: '12px 0 4px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: dDivider }} />
            </div>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 22px 14px', flexShrink: 0, borderBottom: `1px solid ${dDivider}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: isGpsLive ? 'rgba(251,191,36,0.12)' : (isDark ? 'rgba(112,193,255,0.1)' : '#eef2ff'), border: `1px solid ${isGpsLive ? 'rgba(251,191,36,0.28)' : (isDark ? 'rgba(112,193,255,0.22)' : '#c7d2fe')}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isGpsLive ? '#fbbf24' : glassActiveCol, flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: '0.44rem', letterSpacing: '0.42em', color: dMuted, marginBottom: '3px' }}>SNCFT · ZONE SUD-OUEST</div>
                  <div style={{ fontSize: '0.88rem', letterSpacing: '0.14em', color: dText, fontWeight: 700 }}>TABLEAU DE BORD</div>
                </div>
              </div>
              <button onClick={() => setPanelOpen(false)}
                style={{ width: 32, height: 32, borderRadius: 9, background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', border: `1px solid ${panelDivider}`, color: panelMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', transition: 'all 0.18s' }}
                onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0'; e.currentTarget.style.color = isDark ? '#fff' : '#1e293b' }}
                onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'; e.currentTarget.style.color = panelMuted }}
              >✕</button>
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px 28px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

              {/* ── SCÉNARIOS ── */}
              {(() => {
                const SCENARIOS_HUD = [
                  { id: 'normal',        label: 'Normal',      icon: '✓',  color: '#4ade80' },
                  { id: 'heatload',      label: 'Canicule',    icon: '🌡️', color: '#f97316' },
                  { id: 'rainbrake',     label: 'Pluie',       icon: '🌧️', color: '#ef4444' },
                  { id: 'sandwear',      label: 'Sable',       icon: '🌪️', color: '#dc2626' },
                  { id: 'fogbrake',      label: 'Brouillard',  icon: '🌫️', color: '#94a3b8' },
                  { id: 'curve',         label: 'Courbure',    icon: '📐', color: '#a855f7' },
                  { id: 'derail_partial',label: 'Dérail. P',   icon: '⚠️', color: '#fb923c' },
                  { id: 'derail_full',   label: 'Dérail. T',   icon: '💥', color: '#ff2020' },
                ]
                return (
                  <div style={{ background: drawerCardBg, borderRadius: 14, border: `1px solid ${drawerCardBd}`, padding: '12px 14px', boxShadow: drawerCardShadow }}>
                    <div style={{ fontSize: '0.43rem', letterSpacing: '0.3em', color: dMuted, marginBottom: 10 }}>SCÉNARIOS DE SIMULATION</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                      {SCENARIOS_HUD.map(({ id, label, icon, color }) => {
                        const isActive = activeScenario === id
                        return (
                          <button
                            key={id}
                            onClick={() => {
                              scenarioManagerRef.current?.setScenario(id)
                              setActiveScenario(id)
                            }}
                            style={{
                              padding: '8px 4px',
                              background: isActive ? `${color}18` : dSubtle,
                              border: `1px solid ${isActive ? color + '55' : dDivider}`,
                              borderRadius: 9,
                              cursor: 'pointer',
                              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                              transition: 'all 0.15s',
                              boxShadow: isActive ? `0 0 12px ${color}22` : 'none',
                            }}
                            onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = `${color}10`; e.currentTarget.style.borderColor = `${color}33` }}}
                            onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = dSubtle; e.currentTarget.style.borderColor = dDivider }}}
                          >
                            <span style={{ fontSize: '1rem', lineHeight: 1 }}>{icon}</span>
                            <span style={{ fontSize: '0.4rem', color: isActive ? color : dFaint, fontFamily: 'monospace', letterSpacing: '0.04em', textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              {/* ── ROW 1: Vitesse · Météo · Rails ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>

                {/* SPEED */}
                <div style={{ background: drawerCardBg, borderRadius: '14px', border: `1px solid ${isGpsLive ? 'rgba(251,191,36,0.18)' : drawerCardBd}`, padding: '14px', position: 'relative', overflow: 'hidden', animation: 'fadeUp 0.4s ease 0.05s both', boxShadow: drawerCardShadow }}>
                  <div style={{ position: 'absolute', top: 0, left: '-100%', width: '100%', height: '1px', background: `linear-gradient(90deg, transparent, ${speedColor}, transparent)`, animation: 'flowLine 2.6s linear infinite' }} />
                  {/* Badge header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: `${speedColor}18`, border: `1px solid ${speedColor}2e`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: speedColor, flexShrink: 0 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><polyline points="12 6 12 12 16 14"/></svg>
                    </div>
                    <span style={{ fontSize: '0.43rem', letterSpacing: '0.3em', color: dMuted, flex: 1 }}>VITESSE</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '2px 7px', borderRadius: 20, background: isGpsLive ? 'rgba(251,191,36,0.1)' : 'rgba(112,193,255,0.08)', border: `1px solid ${isGpsLive ? 'rgba(251,191,36,0.2)' : 'rgba(112,193,255,0.15)'}`, fontSize: '0.38rem', letterSpacing: '0.12em', color: speedColor }}>
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: speedColor, display: 'inline-block', animation: 'hud-dot 2s ease infinite' }} />
                      {speedSource}
                    </div>
                  </div>
                  {/* Big number */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px' }}>
                    <div style={{ fontSize: '3.2rem', fontWeight: 800, color: speedColor, lineHeight: 1, letterSpacing: '-0.04em', textShadow: `0 0 36px ${speedColor}44` }}>{displaySpeed}</div>
                    <div style={{ fontSize: '0.44rem', letterSpacing: '0.28em', color: dFaint, paddingBottom: '7px' }}>KM/H</div>
                  </div>
                  {/* Sparkline */}
                  {(() => {
                    const base = parseFloat(displaySpeed) || 0
                    const wave = [0.38, 0.52, 0.48, 0.64, 0.7, 0.58, 0.76, 0.82, 0.74, 1.0]
                    const pts  = wave.map(f => base * f)
                    const maxV = Math.max(...pts, 1)
                    const W = 100, H = 22
                    const coords = pts.map((v, i) => `${(i / (pts.length - 1)) * W},${H - (v / maxV) * H * 0.88}`)
                    const path   = `M ${coords.join(' L ')}`
                    const endY   = H - (pts[pts.length - 1] / maxV) * H * 0.88
                    return (
                      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 22, marginTop: 6, opacity: 0.62 }} preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="spkG" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={speedColor} stopOpacity="0.32"/>
                            <stop offset="100%" stopColor={speedColor} stopOpacity="0"/>
                          </linearGradient>
                        </defs>
                        <path d={`${path} L ${W},${H} L 0,${H} Z`} fill="url(#spkG)" />
                        <path d={path} fill="none" stroke={speedColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx={W} cy={endY} r="2" fill={speedColor} />
                      </svg>
                    )
                  })()}
                  {isGpsLive && <div style={{ marginTop: '5px', fontSize: '0.42rem', color: dFaint }}>{trainPosition.satellites} sat · {trainPosition.altitude_m?.toFixed(0)} m</div>}
                </div>

                {/* WEATHER */}
                <div style={{ background: drawerCardBg, borderRadius: '14px', border: `1px solid ${drawerCardBd}`, padding: '14px', position: 'relative', overflow: 'hidden', animation: 'fadeUp 0.4s ease 0.12s both', boxShadow: drawerCardShadow }}>
                  <div style={{ position: 'absolute', top: 0, left: '-100%', width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(99,202,255,0.5), transparent)', animation: 'flowLine 3.1s linear infinite 0.9s' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(99,202,255,0.12)', border: '1px solid rgba(99,202,255,0.24)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#63caff', flexShrink: 0 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/></svg>
                    </div>
                    <span style={{ fontSize: '0.43rem', letterSpacing: '0.3em', color: dMuted }}>MÉTÉO — GAFSA</span>
                  </div>
                  {weatherInfo ? (() => {
                    const lvl = weatherInfo.impact_level || 'LOW'
                    const col = lvl === 'LOW' ? '#4ade80' : lvl === 'MEDIUM' ? '#facc15' : '#f87171'
                    return <>
                      <div style={{ fontSize: '1rem', color: dText, fontWeight: 600, lineHeight: 1.2, marginBottom: '2px' }}>{weatherInfo.condition}</div>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', marginBottom: '10px' }}>
                        <div style={{ fontSize: '2.6rem', color: isDark ? '#70c1ff' : '#6366f1', fontWeight: 800, lineHeight: 1, textShadow: isDark ? '0 0 24px rgba(112,193,255,0.38)' : '0 0 24px rgba(99,102,241,0.25)' }}>{Math.round(weatherInfo.temperature)}°</div>
                        <span style={{ fontSize: '0.46rem', color: dFaint, paddingBottom: '7px' }}>C</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {[
                          { l: 'Vent', v: `${Math.round(weatherInfo.wind_speed * 3.6)} km/h` },
                          ...(weatherInfo.visibility_km != null ? [{ l: 'Visibilité', v: `${weatherInfo.visibility_km} km` }] : []),
                        ].map(({ l, v }) => (
                          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: dSubtle, borderRadius: 6 }}>
                            <span style={{ fontSize: '0.43rem', color: dMuted, letterSpacing: '0.08em' }}>{l}</span>
                            <span style={{ fontSize: '0.52rem', color: wVal, fontWeight: 500 }}>{v}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 9px', background: `${col}14`, borderRadius: 20, fontSize: '0.4rem', letterSpacing: '0.14em', color: col, border: `1px solid ${col}28` }}>IMPACT {lvl}</div>
                      {weatherInfo.warnings?.length > 0 && <div style={{ marginTop: '7px', fontSize: '0.47rem', color: '#facc15', lineHeight: 1.5 }}>⚠ {weatherInfo.warnings[0]}</div>}
                    </>
                  })() : <div style={{ color: dFaint, fontSize: '0.58rem', marginTop: '14px' }}>Chargement…</div>}
                </div>

                {/* RAILS HEALTH — arc gauge */}
                {(() => {
                  const avg      = segments[0]?.health != null ? Math.round(segments.reduce((s, g) => s + (g.health ?? 50), 0) / segments.length) : null
                  const col      = avg == null ? '#70c1ff' : avg > 60 ? '#4ade80' : avg > 40 ? '#facc15' : '#f87171'
                  const pct      = avg ?? 50
                  const r = 34, cx = 50, cy = 46
                  const arcLen   = Math.PI * r
                  const dashOff  = arcLen * (1 - pct / 100)
                  return (
                    <div style={{ background: drawerCardBg, borderRadius: '14px', border: `1px solid ${drawerCardBd}`, padding: '14px', position: 'relative', overflow: 'hidden', animation: 'fadeUp 0.4s ease 0.19s both', boxShadow: drawerCardShadow }}>
                      <div style={{ position: 'absolute', top: 0, left: '-100%', width: '100%', height: '1px', background: `linear-gradient(90deg, transparent, ${col}55, transparent)`, animation: 'flowLine 2.9s linear infinite 1.5s' }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: `${col}15`, border: `1px solid ${col}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: col, flexShrink: 0 }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                        </div>
                        <span style={{ fontSize: '0.43rem', letterSpacing: '0.3em', color: dMuted, flex: 1 }}>ÉTAT RAILS</span>
                        <span style={{ fontSize: '0.38rem', color: dFaint, letterSpacing: '0.1em' }}>INDICE GLOBAL</span>
                      </div>
                      {/* Arc gauge */}
                      <div style={{ display: 'flex', justifyContent: 'center', margin: '0 0 -4px' }}>
                        <svg viewBox="0 0 100 52" width="108" height="56">
                          <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`} fill="none" stroke={arcTrack} strokeWidth="7" strokeLinecap="round" />
                          <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`} fill="none" stroke={col} strokeWidth="7" strokeLinecap="round"
                            strokeDasharray={arcLen} strokeDashoffset={dashOff}
                            style={{ filter: `drop-shadow(0 0 5px ${col}99)`, transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)' }}
                          />
                          <text x={cx} y={cy - 9} textAnchor="middle" fontSize="15" fontWeight="800" fill={col} fontFamily="monospace">{avg != null ? `${avg}%` : '—'}</text>
                        </svg>
                      </div>
                      {/* Critical segment */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 8px', background: dSubtle, borderRadius: 7 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: criticalSeg.color, boxShadow: `0 0 5px ${criticalSeg.color}`, animation: 'hud-dot 2s ease infinite', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.47rem', color: criticalSeg.color, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{criticalSeg.id}</span>
                        <span style={{ fontSize: '0.47rem', color: dFaint, flexShrink: 0 }}>{criticalSeg.health}%</span>
                      </div>
                      <div style={{ fontSize: '0.41rem', color: dFaint, marginTop: '4px', textAlign: 'center' }}>{criticalSeg.degres_par_km ?? '—'}°/km courbure</div>
                    </div>
                  )
                })()}
              </div>

              {/* ── ROW 2: GPS · Alertes · User+Actions ── */}
              <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? 'repeat(3,1fr)' : '1fr 1fr', gap: '10px' }}>

                {/* GPS */}
                <div style={{ background: drawerCardBg, borderRadius: '14px', border: `1px solid ${isGpsLive ? 'rgba(74,222,128,0.18)' : 'rgba(248,113,113,0.16)'}`, padding: '14px', position: 'relative', overflow: 'hidden', boxShadow: drawerCardShadow }}>
                  <div style={{ position: 'absolute', top: 0, left: '-100%', width: '100%', height: '1px', background: `linear-gradient(90deg, transparent, ${isGpsLive ? 'rgba(74,222,128,0.5)' : 'rgba(248,113,113,0.45)'}, transparent)`, animation: 'flowLine 3.4s linear infinite 0.4s' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: isGpsLive ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.1)', border: `1px solid ${isGpsLive ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.22)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isGpsLive ? '#4ade80' : '#f87171', flexShrink: 0 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="11" r="3"/><path d="M17.657 16.657L13.414 20.9a2 2 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z"/></svg>
                    </div>
                    <span style={{ fontSize: '0.43rem', letterSpacing: '0.3em', color: dMuted, flex: 1 }}>LOCALISATION GPS</span>
                    {isGpsLive && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '2px 7px', borderRadius: 20, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', fontSize: '0.38rem', color: '#4ade80' }}>
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'hud-dot 1.4s ease infinite' }} />
                        EN LIGNE
                      </div>
                    )}
                  </div>
                  {isGpsLive ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {[
                        { l: 'LAT', v: trainPosition.lat?.toFixed(5) },
                        { l: 'LNG', v: trainPosition.lng?.toFixed(5) },
                        { l: 'ALT', v: `${trainPosition.altitude_m?.toFixed(0)} m` },
                        { l: 'SAT', v: `${trainPosition.satellites} sats` },
                      ].map(({ l, v }) => (
                        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 9px', background: dSubtle, borderRadius: 7 }}>
                          <span style={{ fontSize: '0.43rem', letterSpacing: '0.18em', color: isDark ? 'rgba(112,193,255,0.42)' : '#6366f1' }}>{l}</span>
                          <span style={{ fontSize: '0.58rem', color: dText, fontWeight: 500 }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 0', gap: '10px' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="11" r="3"/><path d="M17.657 16.657L13.414 20.9a2 2 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                      </div>
                      <div style={{ fontSize: '0.52rem', color: '#f87171', letterSpacing: '0.07em', textAlign: 'center', lineHeight: 1.7 }}>
                        ESP32 HORS LIGNE<br /><span style={{ color: dFaint, fontSize: '0.46rem' }}>Mode simulation actif</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ALERTES (admin only) */}
                {isAdmin && (
                  <div style={{ background: drawerCardBg, borderRadius: '14px', border: '1px solid rgba(248,113,113,0.16)', padding: '14px', position: 'relative', overflow: 'hidden', boxShadow: drawerCardShadow }}>
                    <div style={{ position: 'absolute', top: 0, left: '-100%', width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(248,113,113,0.5), transparent)', animation: 'flowLine 2.2s linear infinite 1.2s' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.24)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171', flexShrink: 0 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      </div>
                      <span style={{ fontSize: '0.43rem', letterSpacing: '0.3em', color: dMuted, flex: 1 }}>ALERTES COURBURES</span>
                      {alerts.length > 0 && (
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.48rem', color: '#f87171', animation: 'hud-alert 2.5s ease infinite' }}>{alerts.length}</div>
                      )}
                    </div>
                    {suspension && (
                      <div style={{ marginBottom: '8px', padding: '7px 10px', background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: 8, fontSize: '0.45rem', color: '#f87171', lineHeight: 1.6 }}>
                        ⏸ SUSPENSION · {suspension.message?.slice(0, 50)}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                      {alerts.length === 0 ? (
                        <div style={{ fontSize: '0.5rem', color: dFaint, textAlign: 'center', padding: '14px 0' }}>Aucune alerte active</div>
                      ) : alerts.slice(0, 5).map(a => (
                        <div key={a._id} style={{ padding: '7px 9px', background: 'rgba(248,113,113,0.04)', border: '1px solid rgba(248,113,113,0.1)', borderLeft: '3px solid rgba(248,113,113,0.45)', borderRadius: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                            <span style={{ fontSize: '0.5rem', color: '#f87171', fontWeight: 600 }}>{a.segment_id}</span>
                            <button onClick={() => acknowledgeAlert(a._id)} style={{ background: 'rgba(112,193,255,0.07)', border: '1px solid rgba(112,193,255,0.14)', borderRadius: 6, color: 'rgba(112,193,255,0.55)', cursor: 'pointer', fontSize: '0.4rem', letterSpacing: '0.1em', padding: '2px 7px' }}>ACQ</button>
                          </div>
                          <div style={{ fontSize: '0.47rem', color: dMuted, lineHeight: 1.5 }}>{a.message?.slice(0, 70)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* USER + ACTIONS */}
                <div style={{ background: drawerCardBg, borderRadius: '14px', border: `1px solid ${isDark ? 'rgba(112,193,255,0.1)' : 'rgba(99,102,241,0.12)'}`, padding: '14px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '11px', boxShadow: drawerCardShadow }}>
                  <div style={{ position: 'absolute', top: 0, left: '-100%', width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(112,193,255,0.45), transparent)', animation: 'flowLine 3s linear infinite 2.1s' }} />
                  {/* Profile */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: 'linear-gradient(135deg, rgba(112,193,255,0.14), rgba(112,193,255,0.04))', border: '1px solid rgba(112,193,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem', fontWeight: 700, color: '#70c1ff' }}>
                      {(user?.displayName || user?.email || '?')[0].toUpperCase()}
                    </div>
                    <div style={{ overflow: 'hidden', minWidth: 0 }}>
                      <div style={{ fontSize: '0.66rem', fontWeight: 600, color: dText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.displayName || user?.email}</div>
                      <div style={{ fontSize: '0.42rem', letterSpacing: '0.18em', color: isDark ? 'rgba(112,193,255,0.38)' : '#6366f1', marginTop: '2px' }}>{isAdmin ? '◈ ADMINISTRATEUR' : '◇ UTILISATEUR'}</div>
                    </div>
                  </div>
                  <div style={{ height: '1px', background: dDivider, flexShrink: 0 }} />
                  {/* Action grid — each button has its own accent color */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
                    {[
                      { label: 'Inspection', sub: 'Rails',      to: '/inspect/rails', color: '#70c1ff', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg> },
                      { label: 'Analyse IA',  sub: 'Risques',   to: '/ia',            color: '#a78bfa', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> },
                      { label: 'Journal',     sub: 'Historique', to: '/journal',       color: '#4ade80', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
                      { label: 'À propos',    sub: 'Projet',     to: '/apropos',       color: '#facc15', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
                    ].map(({ label, sub, to, color, icon }) => (
                      <button key={label} onClick={() => { navigate(to); setPanelOpen(false) }}
                        style={{ padding: '10px 7px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: dBtnBg, border: `1px solid ${dBtnBd}`, borderRadius: '10px', cursor: 'pointer', transition: 'all 0.18s', fontFamily: 'monospace' }}
                        onMouseEnter={e => { e.currentTarget.style.background = `${color}12`; e.currentTarget.style.borderColor = `${color}30` }}
                        onMouseLeave={e => { e.currentTarget.style.background = dBtnBg; e.currentTarget.style.borderColor = dBtnBd }}
                      >
                        <div style={{ color }}>{icon}</div>
                        <div style={{ fontSize: '0.56rem', letterSpacing: '0.03em', color: dMuted }}>{label}</div>
                        <div style={{ fontSize: '0.4rem', color: dFaint }}>{sub}</div>
                      </button>
                    ))}
                  </div>
                  {isAdmin && (
                    <div style={{ borderTop: `1px solid ${dDivider}`, paddingTop: '10px' }}>
                      <SuspensionPanel user={user} suspension={suspension} onSuspensionChange={fetchSuspension} />
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes hud-dot   { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes hud-alert { 0%,100%{box-shadow:0 0 0 0 rgba(248,113,113,0.25)} 50%{box-shadow:0 0 0 8px rgba(248,113,113,0)} }
        @keyframes drawerSlideUp { from { transform:translateY(40px); opacity:0; } to { transform:translateY(0); opacity:1; } }
        @keyframes flowLine  { 0% { left:-100%; } 100% { left:200%; } }
        @keyframes notifDrop { from { opacity:0; transform:translateY(-8px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        ::-webkit-scrollbar       { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(112,193,255,0.12); border-radius: 2px; }
      `}</style>
    </div>
  )
}
