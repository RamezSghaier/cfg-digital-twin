import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import CanvasWrapper from '../components/layout/CanvasWrapper'
import AccueilScene from '../components/three/AccueilScene'
import { useAuth } from '../contexts/AuthContext'
import { SuspensionBanner, SuspensionPanel } from '../components/ui/SuspensionPanel'

const API_BASE = 'http://localhost:8000/api'

/* ─── Segment fallback (displayed while loading) ─────────────── */
const SEGMENTS_LOADING = [
  { id: '...', name: '—', health: 50, degres_par_km: 0, color: 'rgba(112,193,255,0.2)', status: '—' },
  { id: '...', name: '—', health: 50, degres_par_km: 0, color: 'rgba(112,193,255,0.2)', status: '—' },
  { id: '...', name: '—', health: 50, degres_par_km: 0, color: 'rgba(112,193,255,0.2)', status: '—' },
  { id: '...', name: '—', health: 50, degres_par_km: 0, color: 'rgba(112,193,255,0.2)', status: '—' },
  { id: '...', name: '—', health: 50, degres_par_km: 0, color: 'rgba(112,193,255,0.2)', status: '—' },
]

/* ─── SVG wave chart ─────────────────────────────────────────── */
function smoothPathD(pts) {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], c = pts[i]
    const cpx = (p.x + c.x) / 2
    d += ` C ${cpx.toFixed(2)} ${p.y.toFixed(2)} ${cpx.toFixed(2)} ${c.y.toFixed(2)} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`
  }
  return d
}

function WaveChart({ t, segments }) {
  const W = 100, H = 80, N = 32

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height: '100%' }}
    >
      {/* Horizontal grid lines */}
      {[25, 50, 75].map(pct => (
        <line
          key={pct}
          x1="0" y1={H * (1 - pct / 100)}
          x2={W}  y2={H * (1 - pct / 100)}
          stroke="rgba(112,193,255,0.07)" strokeWidth="0.4"
        />
      ))}

      {/* One wave per segment */}
      {segments.map((seg, si) => {
        const amp = (100 - seg.health) * 0.14
        const pts = Array.from({ length: N }, (_, i) => {
          const xn = i / (N - 1)
          const raw =
            seg.health
            + amp * Math.sin(xn * Math.PI * 3.5 + t + si * 1.4)
            + amp * 0.4 * Math.sin(xn * Math.PI * 7 + t * 1.6 + si * 0.9)
          const clamped = Math.max(5, Math.min(100, raw))
          return {
            x: xn * W,
            y: H - (clamped / 100) * H * 0.84 - H * 0.06,
          }
        })
        const d = smoothPathD(pts)
        return (
          <g key={seg.id}>
            {/* Area fill */}
            <path d={`${d} L ${W} ${H} L 0 ${H} Z`} fill={seg.color} opacity="0.04" />
            {/* Line */}
            <path d={d} fill="none" stroke={seg.color} strokeWidth="0.65" opacity="0.8" />
            {/* Live dot at end */}
            <circle cx={W} cy={pts[N - 1].y} r="1.1" fill={seg.color} />
          </g>
        )
      })}
    </svg>
  )
}

/* ─── Progress bar ───────────────────────────────────────────── */
function Bar({ value, max = 100, color }) {
  return (
    <div style={{ height: '3px', background: 'rgba(112,193,255,0.07)', borderRadius: '2px', overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: `${(value / max) * 100}%`,
        background: color,
        borderRadius: '2px',
        boxShadow: `0 0 5px ${color}55`,
      }} />
    </div>
  )
}

/* ─── Glass card ─────────────────────────────────────────────── */
function GCard({ children, style }) {
  return (
    <div style={{
      background: 'rgba(4, 9, 22, 0.78)',
      border: '1px solid rgba(112,193,255,0.09)',
      borderRadius: '12px',
      ...style,
    }}>
      {children}
    </div>
  )
}

function Label({ children }) {
  return (
    <div style={{ fontSize: '0.55rem', letterSpacing: '0.32em', opacity: 0.32, marginBottom: '10px', color: '#70c1ff' }}>
      {children}
    </div>
  )
}

/* ─── Admin alert bell + slide-in panel ─────────────────────── */
function AlertBell({ alerts, onAcknowledge }) {
  const [open, setOpen] = useState(false)
  const count = alerts.length

  return (
    <>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Alertes courbure"
        style={{
          position: 'fixed', top: '20px', right: '24px', zIndex: 200,
          width: '38px', height: '38px', borderRadius: '50%',
          background: count > 0 ? 'rgba(248,113,113,0.12)' : 'rgba(112,193,255,0.07)',
          border: `1px solid ${count > 0 ? 'rgba(248,113,113,0.4)' : 'rgba(112,193,255,0.2)'}`,
          color: count > 0 ? '#f87171' : '#70c1ff',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: count > 0 ? 'alertPulse 2.5s ease-in-out infinite' : 'none',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {count > 0 && (
          <div style={{
            position: 'absolute', top: '-4px', right: '-4px',
            width: '18px', height: '18px', borderRadius: '50%',
            background: '#f87171',
            color: '#000',
            fontSize: '0.6rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'monospace',
          }}>
            {count > 9 ? '9+' : count}
          </div>
        )}
      </button>

      {/* Slide-in panel */}
      {open && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: '320px', zIndex: 190,
          background: 'rgba(4, 9, 22, 0.96)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          borderLeft: '1px solid rgba(248,113,113,0.2)',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'monospace', color: '#70c1ff',
        }}>
          {/* Header */}
          <div style={{
            padding: '20px 18px 14px',
            borderBottom: '1px solid rgba(112,193,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: '0.52rem', letterSpacing: '0.35em', opacity: 0.35, marginBottom: '4px' }}>
                ADMINISTRATION
              </div>
              <div style={{ fontSize: '0.85rem', letterSpacing: '0.15em' }}>
                ALERTES COURBURE
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'none', border: 'none',
                color: 'rgba(112,193,255,0.4)', cursor: 'pointer',
                fontSize: '1.2rem', lineHeight: 1,
              }}
            >×</button>
          </div>

          {/* Alert list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {count === 0 ? (
              <div style={{ textAlign: 'center', opacity: 0.3, fontSize: '0.7rem', marginTop: '40px', letterSpacing: '0.1em' }}>
                Aucune alerte active
              </div>
            ) : alerts.map(alert => (
              <div
                key={alert._id}
                style={{
                  marginBottom: '10px', padding: '12px 14px',
                  background: 'rgba(248,113,113,0.06)',
                  border: '1px solid rgba(248,113,113,0.2)',
                  borderLeft: '3px solid #f87171',
                  borderRadius: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#f87171', letterSpacing: '0.08em' }}>
                    {alert.segment_id}
                  </span>
                  <span style={{ fontSize: '0.52rem', opacity: 0.35 }}>
                    {new Date(alert.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{ fontSize: '0.63rem', opacity: 0.7, lineHeight: '1.5', marginBottom: '8px' }}>
                  {alert.message}
                </div>
                <div style={{ display: 'flex', gap: '8px', fontSize: '0.58rem', opacity: 0.5, marginBottom: '10px' }}>
                  <span>{alert.curvature}°/km</span>
                  {alert.tonnage && <span>· {alert.tonnage}T</span>}
                </div>
                <button
                  onClick={() => onAcknowledge(alert._id)}
                  style={{
                    width: '100%', padding: '6px',
                    background: 'rgba(112,193,255,0.06)',
                    border: '1px solid rgba(112,193,255,0.15)',
                    borderRadius: '7px',
                    color: 'rgba(112,193,255,0.65)',
                    fontFamily: 'monospace', fontSize: '0.58rem',
                    letterSpacing: '0.15em', cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(112,193,255,0.14)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(112,193,255,0.06)'}
                >
                  ACQUITTER
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

/* ─── Main component ─────────────────────────────────────────── */
export default function Accueil() {
  const { user, role } = useAuth()
  const isAdmin = role === 'admin'
  const navigate = useNavigate()
  const canvasRef = useRef()

  const [isFullscreen, setIsFullscreen] = useState(false)

  // ── Real data from backend APIs ────────────────────────────
  const [segments, setSegments]   = useState(SEGMENTS_LOADING)
  const [weather, setWeather]     = useState(null)
  const [trainSpeed, setTrainSpeed] = useState(null)

  useEffect(() => {
    if (!user) return
    async function loadAll() {
      try {
        const token = await user.getIdToken()
        const headers = { 'Authorization': `Bearer ${token}` }

        // Segments with real rail risk scores
        fetch(`${API_BASE}/segments`, { headers })
          .then(r => r.ok ? r.json() : null)
          .then(d => d && setSegments(d.segments))
          .catch(() => {})

        // Live weather from OpenWeatherMap (cached 30 min)
        fetch(`${API_BASE}/weather/scene`)
          .then(r => r.ok ? r.json() : null)
          .then(d => d && setWeather(d))
          .catch(() => {})

        // Latest GPS fix from ESP32
        fetch(`${API_BASE}/train/latest`, { headers })
          .then(r => r.ok ? r.json() : null)
          .then(d => d?.position && setTrainSpeed(d.position.speed_kmh))
          .catch(() => {})
      } catch {}
    }
    loadAll()
    const id = setInterval(loadAll, 30000)
    return () => clearInterval(id)
  }, [user])

  // ── Admin alerts state ─────────────────────────────────────
  const [alerts, setAlerts] = useState([])

  // ── Active suspension state (all users) ────────────────────
  const [suspension, setSuspension] = useState(null)

  const fetchSuspension = useCallback(async () => {
    if (!user) return
    try {
      const token = await user.getIdToken()
      const res = await fetch(`${API_BASE}/suspension/active`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setSuspension(data.active ? data.suspension : null)
      }
    } catch {}
  }, [user])

  useEffect(() => {
    fetchSuspension()
    const id = setInterval(fetchSuspension, 30000)
    return () => clearInterval(id)
  }, [fetchSuspension])

  const fetchAlerts = useCallback(async () => {
    if (!isAdmin || !user) return
    try {
      const token = await user.getIdToken()
      const res = await fetch(`${API_BASE}/alerts`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setAlerts(data.alerts || [])
      }
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
      await fetch(`${API_BASE}/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      setAlerts(prev => prev.filter(a => a._id !== alertId))
    } catch {}
  }, [user])

  useEffect(() => {
    const onChange = () =>
      setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange)
    }
  }, [])

  const toggleFullscreen = () => {
    const el = canvasRef.current
    if (!el) return
    const fs = document.fullscreenElement || document.webkitFullscreenElement
    if (!fs) {
      if (el.requestFullscreen)            el.requestFullscreen()
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
    } else {
      if (document.exitFullscreen)             document.exitFullscreen()
      else if (document.webkitExitFullscreen)  document.webkitExitFullscreen()
    }
  }

  const [scrollY,   setScrollY]   = useState(0)
  const [waveT,     setWaveT]     = useState(0)
  const [clockTime, setClockTime] = useState(new Date())

  // Scroll tracking
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Wave animation loop
  useEffect(() => {
    let id
    const tick = () => { setWaveT(t => t + 0.014); id = requestAnimationFrame(tick) }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [])

  // Clock
  useEffect(() => {
    const id = setInterval(() => setClockTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Phase 1: panel slides up (scroll 60 → 420px)
  const progress = useMemo(() =>
    Math.min(Math.max((scrollY - 60) / 360, 0), 1),
  [scrollY])

  // Phase 2: panel grows to full height (scroll 420 → 900px)
  const expandProgress = useMemo(() =>
    Math.min(Math.max((scrollY - 420) / 480, 0), 1),
  [scrollY])

  const dashTranslateY = (1 - progress) * 100
  const bgDarken       = progress * 0.28

  // Height: 72vh → calc(100vh - 40px)
  const panelBottom  = 20 - expandProgress * 20          // 20px → 0px
  const panelHeight  = 72 + expandProgress * (95 - 72)   // 72vh → 95vh
  const panelRadius  = 20 - expandProgress * 20          // 20px → 0px

  const criticalSeg = segments.reduce((a, b) => (b.health ?? 50) < (a.health ?? 50) ? b : a)

  const timeStr = clockTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div style={{ height: '380vh', fontFamily: 'monospace', color: '#70c1ff' }}>

      {/* ── Suspension banner (all users) ── */}
      <SuspensionBanner suspension={suspension} />

      {/* ── Fixed 3D canvas ── */}
      <div ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <CanvasWrapper noScrollGuard>
          <AccueilScene />
        </CanvasWrapper>

      </div>

      {/* ── Darkening veil — only behind the panel, via side strips ── */}
      {/* Left strip */}
      <div style={{
        position: 'fixed', top: 0, bottom: 0, left: 0, width: '88px', zIndex: 1,
        background: `rgba(0, 4, 14, ${bgDarken * 0.4})`,
        pointerEvents: 'none',
      }} />
      {/* Right strip */}
      <div style={{
        position: 'fixed', top: 0, bottom: 0, right: 0, width: '32px', zIndex: 1,
        background: `rgba(0, 4, 14, ${bgDarken * 0.4})`,
        pointerEvents: 'none',
      }} />

      {/* ── Top-left: title + live clock ── */}
      <div style={{ position: 'fixed', top: '24px', left: '100px', zIndex: 10, pointerEvents: 'none' }}>
        <div style={{ fontSize: '0.54rem', letterSpacing: '0.42em', opacity: 0.32, marginBottom: '3px' }}>
          CHEMIN DE FER DE GAFSA
        </div>
        <div style={{
          fontSize: 'clamp(0.9rem, 1.5vw, 1.2rem)',
          letterSpacing: '0.22em',
          textShadow: '0 0 16px rgba(112,193,255,0.45)',
        }}>
          JUMEAU NUMÉRIQUE
        </div>
        <div style={{ fontSize: '0.65rem', opacity: 0.35, letterSpacing: '0.1em', marginTop: '4px' }}>
          {timeStr}
        </div>
      </div>

      {/* ── Live indicator ── */}
      <div style={{
        position: 'fixed', top: '30px', right: isAdmin ? '72px' : '24px',
        zIndex: 10, pointerEvents: 'none',
        display: 'flex', alignItems: 'center', gap: '7px',
        fontSize: '0.56rem', letterSpacing: '0.28em', opacity: 0.45,
      }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80', display: 'inline-block', animation: 'dot 2s ease infinite' }} />
        EN DIRECT
      </div>

      {/* ── Fullscreen toggle — top-level sibling, never clipped ── */}
      <button
        onClick={toggleFullscreen}
        title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
        style={{
          position: 'fixed', bottom: '32px', right: '32px',
          zIndex: 9999,
          height: '32px',
          padding: '0 16px',
          background: 'rgba(4, 9, 22, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(112,193,255,0.30)',
          borderRadius: '20px',
          color: '#70c1ff',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '8px',
          fontFamily: 'monospace',
          fontSize: '0.6rem',
          letterSpacing: '0.2em',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(112,193,255,0.12)'; e.currentTarget.style.borderColor = 'rgba(112,193,255,0.55)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(4, 9, 22, 0.85)';   e.currentTarget.style.borderColor = 'rgba(112,193,255,0.30)' }}
      >
        {isFullscreen
          ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg> RÉDUIRE</>
          : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg> PLEIN ÉCRAN</>
        }
      </button>

      {/* ── Admin alert bell ── */}
      {isAdmin && <AlertBell alerts={alerts} onAcknowledge={acknowledgeAlert} />}

      {/* ── Scroll hint (fades out as dashboard appears) ── */}
      <div style={{
        position: 'fixed', bottom: '36px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 10, pointerEvents: 'none',
        opacity: Math.max(0, 1 - progress * 4),
        textAlign: 'center', fontSize: '0.6rem', letterSpacing: '0.28em', color: 'rgba(112,193,255,0.38)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
      }}>
        <span>DÉFILER</span>
        <span style={{ fontSize: '1rem' }}>↓</span>
      </div>

      {/* ══════════════════════════════════════════════════════
          DASHBOARD PANEL — centered floating card
      ══════════════════════════════════════════════════════ */}
      <div style={{
        position: 'fixed',
        bottom: `${panelBottom}px`,
        left: `${90 - expandProgress * 90}px`,
        right: `${20 - expandProgress * 20}px`,
        zIndex: 10,
        height: `${panelHeight}vh`,
        transform: `translateY(calc(${dashTranslateY.toFixed(2)}% + ${(1 - progress) * 20}px))`,
        opacity: Math.max(0, (progress - 0.05) / 0.3),
        display: 'flex', flexDirection: 'column',
        pointerEvents: progress > 0.08 ? 'auto' : 'none',
        borderRadius: `${panelRadius}px`,
        overflow: 'hidden',
        boxShadow: `0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(112,193,255,0.1)`,
      }}>

        {/* Top gradient fade — blends 3D into panel */}
        <div style={{
          height: '48px', flexShrink: 0,
          background: 'linear-gradient(to bottom, transparent, rgba(4, 9, 22, 0.82))',
          borderRadius: '20px 20px 0 0',
        }} />

        {/* Glass panel body */}
        <div style={{
          flex: 1, overflow: 'hidden',
          background: 'rgba(4, 9, 22, 0.88)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          borderTop: '1px solid rgba(112,193,255,0.1)',
          display: 'flex', flexDirection: 'column',
        }}>

          {/* ── Summary bar ─────────────────────────────────────── */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid rgba(112,193,255,0.07)',
            flexShrink: 0,
          }}>
            {[
              {
                label: 'VITESSE TRAIN',
                value: trainSpeed != null ? `${trainSpeed.toFixed(0)} km/h` : '— km/h',
                sub: trainSpeed != null ? `GPS live — limite 120` : 'En attente du GPS ESP32',
              },
              {
                label: 'SANTÉ RAILS',
                value: segments[0]?.health != null
                  ? `${Math.round(segments.reduce((s, g) => s + (g.health ?? 50), 0) / segments.length)}%`
                  : '—%',
                sub: 'index global pondéré — données MongoDB',
              },
              {
                label: 'MÉTÉO — GAFSA',
                value: weather ? weather.condition : '—',
                sub: weather
                  ? `${weather.temperature?.toFixed(0) ?? '—'}°C  ·  Vent ${(weather.wind_speed * 3.6).toFixed(0)} km/h`
                  : 'OpenWeatherMap — chargement…',
              },
            ].map(({ label, value, sub }, i) => (
              <div key={label} style={{
                flex: 1, padding: '11px 20px',
                borderRight: i < 2 ? '1px solid rgba(112,193,255,0.07)' : 'none',
              }}>
                <div style={{ fontSize: '0.52rem', letterSpacing: '0.32em', opacity: 0.3, marginBottom: '4px' }}>{label}</div>
                <div style={{ fontSize: '1rem', letterSpacing: '0.08em', textShadow: '0 0 10px rgba(112,193,255,0.25)' }}>{value}</div>
                <div style={{ fontSize: '0.56rem', opacity: 0.3, marginTop: '2px' }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* ── Two-column body ──────────────────────────────────── */}
          <div style={{
            display: 'flex', gap: '18px', flex: 1,
            overflow: 'hidden', padding: '14px 18px',
          }}>

            {/* ════ LEFT COLUMN ════ */}
            <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden', minWidth: 0 }}>

              {/* Wave chart */}
              <GCard style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, marginBottom: '8px' }}>
                  <Label>SANTÉ DES SEGMENTS — TEMPS RÉEL</Label>
                  <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
                    {segments.map(s => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.54rem', opacity: 0.6 }}>
                        <div style={{ width: '14px', height: '2px', background: s.color, borderRadius: '1px' }} />
                        <span>{s.id}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <WaveChart t={waveT} segments={segments} />
                </div>
              </GCard>

              {/* Inspection + Curvature cards */}
              <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>

                {/* Inspection status */}
                <GCard style={{ flex: 1, padding: '12px 14px' }}>
                  <Label>STATUT INSPECTION</Label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                    {segments.map(s => (
                      <div key={s.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.64rem' }}>
                          <span style={{ opacity: 0.55 }}>{s.id}</span>
                          <span style={{ color: s.color, letterSpacing: '0.06em' }}>{s.status}</span>
                        </div>
                        <Bar value={s.health ?? 50} color={s.color} />
                      </div>
                    ))}
                  </div>
                </GCard>

                {/* Curvature health */}
                <GCard style={{ flex: 1, padding: '12px 14px' }}>
                  <Label>SANTÉ COURBURE</Label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                    {segments.map(s => {
                      const curv = s.degres_par_km ?? 0
                      const pct = Math.max(0, 100 - (curv / 6) * 100)
                      const col = pct > 68 ? '#4ade80' : pct > 38 ? '#facc15' : '#f87171'
                      return (
                        <div key={s.id}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.64rem' }}>
                            <span style={{ opacity: 0.55 }}>{s.id}</span>
                            <span style={{ color: col, fontSize: '0.6rem' }}>{curv}°/km</span>
                          </div>
                          <Bar value={pct} color={col} />
                        </div>
                      )
                    })}
                  </div>
                </GCard>
              </div>
            </div>

            {/* ════ RIGHT COLUMN ════ */}
            <div style={{
              width: '210px', flexShrink: 0,
              display: 'flex', flexDirection: 'column', gap: '10px',
              overflowY: 'auto',
            }}>

              {/* User profile */}
              <GCard style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(112,193,255,0.1)',
                    border: '1px solid rgba(112,193,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.78rem',
                  }}>
                    {(user?.displayName || user?.email || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user?.displayName || user?.email}
                    </div>
                    <div style={{ fontSize: '0.54rem', opacity: 0.35, letterSpacing: '0.22em', marginTop: '2px' }}>
                      {isAdmin ? '◈ ADMINISTRATEUR' : '◇ UTILISATEUR'}
                    </div>
                  </div>
                </div>
              </GCard>

              {/* Suspension control (admin) */}
              {isAdmin && (
                <SuspensionPanel
                  user={user}
                  suspension={suspension}
                  onSuspensionChange={fetchSuspension}
                />
              )}

              {/* Quick actions */}
              <GCard style={{ padding: '12px 14px' }}>
                <Label>ACTIONS RAPIDES</Label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
                  {[
                    { label: 'Simulation', sub: 'Lancer',  to: '/'        },
                    { label: 'Inspection', sub: 'Rails',   to: '/'        },
                    { label: 'Risques',    sub: 'Analyser', to: '/ia'     },
                    { label: 'Journal',    sub: 'Ouvrir',   to: '/journal' },
                  ].map(({ label, sub, to }) => (
                    <button
                      key={label}
                      onClick={() => navigate(to)}
                      style={{
                        padding: '9px 6px',
                        background: 'rgba(112,193,255,0.05)',
                        border: '1px solid rgba(112,193,255,0.1)',
                        borderRadius: '9px',
                        color: '#70c1ff',
                        fontFamily: 'monospace',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(112,193,255,0.13)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(112,193,255,0.05)'}
                    >
                      <div style={{ fontSize: '0.64rem', letterSpacing: '0.04em' }}>{label}</div>
                      <div style={{ fontSize: '0.52rem', opacity: 0.36, marginTop: '2px' }}>{sub}</div>
                    </button>
                  ))}
                </div>
              </GCard>

              {/* Critical segment */}
              <GCard style={{ padding: '12px 14px' }}>
                <Label>SEGMENT LE PLUS CRITIQUE</Label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: criticalSeg.color, animation: 'dot 2s ease infinite', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.65rem', color: criticalSeg.color, letterSpacing: '0.08em' }}>{criticalSeg.id}</span>
                </div>
                <div style={{ fontSize: '0.68rem', opacity: 0.7, marginBottom: '8px', lineHeight: '1.4' }}>
                  {criticalSeg.name}
                </div>
                <Bar value={criticalSeg.health} color={criticalSeg.color} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '7px', fontSize: '0.6rem', opacity: 0.45 }}>
                  <span>Santé</span>
                  <span style={{ color: criticalSeg.color }}>{criticalSeg.health}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.6rem', opacity: 0.45 }}>
                  <span>Courbure</span>
                  <span style={{ color: criticalSeg.color }}>{criticalSeg.degres_par_km ?? '—'}°/km</span>
                </div>
              </GCard>

              {/* Latest alerts */}
              <GCard style={{ padding: '12px 14px', flex: 1 }}>
                <Label>DERNIÈRES ALERTES</Label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {!isAdmin ? (
                    <div style={{ fontSize: '0.6rem', opacity: 0.3, textAlign: 'center', paddingTop: '8px', lineHeight: '1.6' }}>
                      Alertes réservées aux administrateurs
                    </div>
                  ) : alerts.length === 0 ? (
                    <div style={{ fontSize: '0.6rem', opacity: 0.3, textAlign: 'center', paddingTop: '8px' }}>
                      Aucune alerte active
                    </div>
                  ) : alerts.slice(0, 4).map(a => (
                    <div
                      key={a._id}
                      style={{
                        padding: '7px 9px',
                        background: 'rgba(248,113,113,0.03)',
                        border: '1px solid rgba(112,193,255,0.06)',
                        borderLeft: '2px solid #f87171',
                        borderRadius: '7px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ fontSize: '0.52rem', opacity: 0.3 }}>
                          {new Date(a.timestamp || a.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span style={{ fontSize: '0.5rem', color: '#f87171', letterSpacing: '0.12em' }}>
                          {a.risk_level || 'ALERTE'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.61rem', opacity: 0.58, lineHeight: '1.45' }}>
                        {a.segment_id} — {a.message?.slice(0, 80) || ''}
                      </div>
                    </div>
                  ))}
                </div>
              </GCard>

            </div>
          </div>
        </div>
      </div>

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes dot {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.25; }
        }
        @keyframes alertPulse {
          0%, 100% { box-shadow: 0 0 0 0   rgba(248,113,113,0.25); }
          50%       { box-shadow: 0 0 0 8px rgba(248,113,113,0);    }
        }
        ::-webkit-scrollbar        { width: 3px; }
        ::-webkit-scrollbar-track  { background: transparent; }
        ::-webkit-scrollbar-thumb  { background: rgba(112,193,255,0.12); border-radius: 2px; }
      `}</style>
    </div>
  )
}
