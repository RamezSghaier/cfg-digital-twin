import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const SEGMENTS = [
  { id: 'A-01', name: 'Gafsa — Méthlouine',    health: 94, curvature: 2.1, color: '#4ade80', status: 'BON'      },
  { id: 'A-02', name: 'Méthlouine — Redeyef',   health: 78, curvature: 3.4, color: '#facc15', status: 'MODÉRÉ'  },
  { id: 'B-01', name: 'Redeyef — M\'dhilla',    health: 45, curvature: 5.8, color: '#f87171', status: 'CRITIQUE'},
  { id: 'B-02', name: 'M\'dhilla — Gafsa Km2',  health: 82, curvature: 2.9, color: '#70c1ff', status: 'BON'     },
  { id: 'C-01', name: 'Gafsa Km2 — Seldja',     health: 67, curvature: 4.2, color: '#c084fc', status: 'MODÉRÉ' },
]

const ALERTS = [
  { time: '08:14', msg: 'Courbure critique détectée — Segment B-01 (5.8°/km)', level: 'CRITIQUE', color: '#f87171' },
  { time: '07:52', msg: 'Inspection complète validée — Segment A-01',          level: 'OK',       color: '#4ade80' },
  { time: '07:30', msg: 'Usure modérée détectée — Segment C-01',               level: 'MODÉRÉ',   color: '#facc15' },
  { time: '06:48', msg: 'Simulation démarrée par l\'opérateur',                level: 'INFO',     color: '#70c1ff' },
]

const WEATHER = { condition: 'Ensoleillé', temp: '28°C', wind: '12 km/h' }

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

function WaveChart({ t }) {
  const W = 100, H = 80, N = 32
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
      {[25, 50, 75].map(pct => (
        <line key={pct} x1="0" y1={H * (1 - pct / 100)} x2={W} y2={H * (1 - pct / 100)}
          stroke="rgba(112,193,255,0.07)" strokeWidth="0.4" />
      ))}
      {SEGMENTS.map((seg, si) => {
        const amp = (100 - seg.health) * 0.14
        const pts = Array.from({ length: N }, (_, i) => {
          const xn = i / (N - 1)
          const raw = seg.health
            + amp * Math.sin(xn * Math.PI * 3.5 + t + si * 1.4)
            + amp * 0.4 * Math.sin(xn * Math.PI * 7 + t * 1.6 + si * 0.9)
          return { x: xn * W, y: H - (Math.max(5, Math.min(100, raw)) / 100) * H * 0.84 - H * 0.06 }
        })
        const d = smoothPathD(pts)
        return (
          <g key={seg.id}>
            <path d={`${d} L ${W} ${H} L 0 ${H} Z`} fill={seg.color} opacity="0.04" />
            <path d={d} fill="none" stroke={seg.color} strokeWidth="0.65" opacity="0.8" />
            <circle cx={W} cy={pts[N - 1].y} r="1.1" fill={seg.color} />
          </g>
        )
      })}
    </svg>
  )
}

function Bar({ value, max = 100, color }) {
  return (
    <div style={{ height: '3px', background: 'rgba(112,193,255,0.07)', borderRadius: '2px', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${(value / max) * 100}%`, background: color, borderRadius: '2px', boxShadow: `0 0 5px ${color}55` }} />
    </div>
  )
}

function GCard({ children, style }) {
  return (
    <div style={{ background: 'rgba(4, 9, 22, 0.82)', border: '1px solid rgba(112,193,255,0.09)', borderRadius: '12px', ...style }}>
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

export default function Dashboard() {
  const { user, role } = useAuth()
  const isAdmin = role === 'admin'
  const navigate = useNavigate()

  const [waveT,     setWaveT]     = useState(0)
  const [clockTime, setClockTime] = useState(new Date())

  useEffect(() => {
    let id
    const tick = () => { setWaveT(t => t + 0.014); id = requestAnimationFrame(tick) }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    const id = setInterval(() => setClockTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const criticalSeg = SEGMENTS.reduce((a, b) => b.health < a.health ? b : a)
  const timeStr = clockTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div style={{ fontFamily: 'monospace', color: '#70c1ff', display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: '0.52rem', letterSpacing: '0.38em', opacity: 0.3, marginBottom: '4px' }}>CHEMIN DE FER DE GAFSA</div>
          <div style={{ fontSize: '1.1rem', letterSpacing: '0.18em', textShadow: '0 0 16px rgba(112,193,255,0.4)' }}>TABLEAU DE BORD</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.6rem', opacity: 0.45 }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80', display: 'inline-block', animation: 'dot 2s ease infinite' }} />
          EN DIRECT · {timeStr}
        </div>
      </div>

      {/* Summary bar */}
      <GCard style={{ display: 'flex' }}>
        {[
          { label: 'VITESSE TRAIN',  value: '84 km/h',         sub: 'nominal — limite 120' },
          { label: 'SANTÉ RAILS',    value: '73%',              sub: 'index global pondéré' },
          { label: 'MÉTÉO — GAFSA',  value: WEATHER.condition,  sub: `${WEATHER.temp}  ·  Vent ${WEATHER.wind}` },
        ].map(({ label, value, sub }, i) => (
          <div key={label} style={{ flex: 1, padding: '11px 20px', borderRight: i < 2 ? '1px solid rgba(112,193,255,0.07)' : 'none' }}>
            <div style={{ fontSize: '0.52rem', letterSpacing: '0.32em', opacity: 0.3, marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '1rem', letterSpacing: '0.08em', textShadow: '0 0 10px rgba(112,193,255,0.25)' }}>{value}</div>
            <div style={{ fontSize: '0.56rem', opacity: 0.3, marginTop: '2px' }}>{sub}</div>
          </div>
        ))}
      </GCard>

      {/* Two-column body */}
      <div style={{ display: 'flex', gap: '14px' }}>

        {/* Left */}
        <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>

          <GCard style={{ height: '180px', padding: '12px 14px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, marginBottom: '8px' }}>
              <Label>SANTÉ DES SEGMENTS — TEMPS RÉEL</Label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {SEGMENTS.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.54rem', opacity: 0.6 }}>
                    <div style={{ width: '14px', height: '2px', background: s.color, borderRadius: '1px' }} />
                    <span>{s.id}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <WaveChart t={waveT} />
            </div>
          </GCard>

          <div style={{ display: 'flex', gap: '12px' }}>
            <GCard style={{ flex: 1, padding: '12px 14px' }}>
              <Label>STATUT INSPECTION</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {SEGMENTS.map(s => (
                  <div key={s.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.64rem' }}>
                      <span style={{ opacity: 0.55 }}>{s.id}</span>
                      <span style={{ color: s.color, letterSpacing: '0.06em' }}>{s.status}</span>
                    </div>
                    <Bar value={s.health} color={s.color} />
                  </div>
                ))}
              </div>
            </GCard>

            <GCard style={{ flex: 1, padding: '12px 14px' }}>
              <Label>SANTÉ COURBURE</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {SEGMENTS.map(s => {
                  const pct = Math.max(0, 100 - (s.curvature / 6) * 100)
                  const col = pct > 68 ? '#4ade80' : pct > 38 ? '#facc15' : '#f87171'
                  return (
                    <div key={s.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.64rem' }}>
                        <span style={{ opacity: 0.55 }}>{s.id}</span>
                        <span style={{ color: col, fontSize: '0.6rem' }}>{s.curvature}°/km</span>
                      </div>
                      <Bar value={pct} color={col} />
                    </div>
                  )
                })}
              </div>
            </GCard>
          </div>
        </div>

        {/* Right */}
        <div style={{ width: '210px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>

          <GCard style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0, background: 'rgba(112,193,255,0.1)', border: '1px solid rgba(112,193,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem' }}>
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

          <GCard style={{ padding: '12px 14px' }}>
            <Label>ACTIONS RAPIDES</Label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
              {[
                { label: 'Simulation', sub: 'Lancer',   to: '/'        },
                { label: 'Inspection', sub: 'Rails',    to: '/'        },
                { label: 'Risques',    sub: 'Analyser', to: '/ia'      },
                { label: 'Journal',    sub: 'Ouvrir',   to: '/journal' },
              ].map(({ label, sub, to }) => (
                <button key={label} onClick={() => navigate(to)} style={{ padding: '9px 6px', background: 'rgba(112,193,255,0.05)', border: '1px solid rgba(112,193,255,0.1)', borderRadius: '9px', color: '#70c1ff', fontFamily: 'monospace', cursor: 'pointer', textAlign: 'center' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(112,193,255,0.13)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(112,193,255,0.05)'}
                >
                  <div style={{ fontSize: '0.64rem', letterSpacing: '0.04em' }}>{label}</div>
                  <div style={{ fontSize: '0.52rem', opacity: 0.36, marginTop: '2px' }}>{sub}</div>
                </button>
              ))}
            </div>
          </GCard>

          <GCard style={{ padding: '12px 14px' }}>
            <Label>SEGMENT LE PLUS CRITIQUE</Label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: criticalSeg.color, animation: 'dot 2s ease infinite', flexShrink: 0 }} />
              <span style={{ fontSize: '0.65rem', color: criticalSeg.color, letterSpacing: '0.08em' }}>{criticalSeg.id}</span>
            </div>
            <div style={{ fontSize: '0.68rem', opacity: 0.7, marginBottom: '8px', lineHeight: '1.4' }}>{criticalSeg.name}</div>
            <Bar value={criticalSeg.health} color={criticalSeg.color} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '7px', fontSize: '0.6rem', opacity: 0.45 }}>
              <span>Santé</span><span style={{ color: criticalSeg.color }}>{criticalSeg.health}%</span>
            </div>
          </GCard>

          <GCard style={{ padding: '12px 14px' }}>
            <Label>DERNIÈRES ALERTES</Label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {ALERTS.map((a, i) => (
                <div key={i} style={{ padding: '7px 9px', background: 'rgba(112,193,255,0.02)', border: '1px solid rgba(112,193,255,0.06)', borderLeft: `2px solid ${a.color}`, borderRadius: '7px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontSize: '0.52rem', opacity: 0.3 }}>{a.time}</span>
                    <span style={{ fontSize: '0.5rem', color: a.color, letterSpacing: '0.12em' }}>{a.level}</span>
                  </div>
                  <div style={{ fontSize: '0.61rem', opacity: 0.58, lineHeight: '1.45' }}>{a.msg}</div>
                </div>
              ))}
            </div>
          </GCard>

        </div>
      </div>

      <style>{`
        @keyframes dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
      `}</style>
    </div>
  )
}
