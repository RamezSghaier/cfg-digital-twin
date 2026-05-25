import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api'

const SCENARIO_META = {
  deraillement:      { color: '#ef4444', bg: '#fef2f2', label: 'Déraillement',      icon: '💥' },
  usure_rails:       { color: '#f97316', bg: '#fff7ed', label: 'Usure Rails',        icon: '⚙️' },
  brouillard_dense:  { color: '#64748b', bg: '#f8fafc', label: 'Brouillard Dense',   icon: '🌫️' },
  surcharge_voie:    { color: '#eab308', bg: '#fefce8', label: 'Surcharge Voie',     icon: '⚖️' },
  inondation_voie:   { color: '#3b82f6', bg: '#eff6ff', label: 'Inondation Voie',   icon: '🌊' },
  defaillance_frein: { color: '#ef4444', bg: '#fef2f2', label: 'Défaillance Frein', icon: '🛑' },
  courbure_critique: { color: '#8b5cf6', bg: '#f5f3ff', label: 'Courbure Critique', icon: '📐' },
}

const RISK_META = {
  LOW:      { color: '#16a34a', bg: '#f0fdf4', border: '#86efac', label: 'FAIBLE',   icon: '✓' },
  MEDIUM:   { color: '#ca8a04', bg: '#fefce8', border: '#fde047', label: 'MODÉRÉ',   icon: '⚠' },
  HIGH:     { color: '#ea580c', bg: '#fff7ed', border: '#fdba74', label: 'ÉLEVÉ',    icon: '⚠' },
  CRITICAL: { color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', label: 'CRITIQUE', icon: '⚠' },
}

const RISK_DOT = {
  LOW: '#16a34a', MEDIUM: '#eab308', HIGH: '#f97316', CRITICAL: '#ef4444',
}

const SCENARIO_3D_MAP = {
  deraillement:      'derail_full',
  usure_rails:       'sandwear',
  brouillard_dense:  'fogbrake',
  surcharge_voie:    'heatload',
  inondation_voie:   'rainbrake',
  defaillance_frein: 'rainbrake',
  courbure_critique: 'curve',
}

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAYS_FR   = ['LUN','MAR','MER','JEU','VEN','SAM','DIM']

/* ─── Theme token helper ────────────────────────────────────── */
function tok(isDark) {
  return isDark ? {
    pageBg:      '#04091a',
    card:        'rgba(4,9,22,0.82)',
    border:      'rgba(112,193,255,0.09)',
    shadow:      'none',
    text:        '#70c1ff',
    textMuted:   'rgba(112,193,255,0.45)',
    label:       'rgba(112,193,255,0.28)',
    subtle:      'rgba(112,193,255,0.04)',
    subtleBd:    'rgba(112,193,255,0.08)',
    divider:     'rgba(112,193,255,0.06)',
    hover:       'rgba(112,193,255,0.05)',
    navBtnBg:    'rgba(112,193,255,0.1)',
    navBtnBd:    'rgba(112,193,255,0.2)',
    accent:      '#2ba1fb',
    font:        'monospace',
  } : {
    pageBg:      '#f1f5f9',
    card:        '#ffffff',
    border:      '#e2e8f0',
    shadow:      '0 1px 4px rgba(0,0,0,0.07)',
    text:        '#1e293b',
    textMuted:   '#475569',
    label:       '#94a3b8',
    subtle:      '#f8fafc',
    subtleBd:    '#e2e8f0',
    divider:     '#f1f5f9',
    hover:       '#f8fafc',
    navBtnBg:    '#eef2ff',
    navBtnBd:    '#c7d2fe',
    accent:      '#6366f1',
    font:        'system-ui, -apple-system, sans-serif',
  }
}

/* ─── Calendar ─────────────────────────────────────────────── */
function Calendar({ selected, onSelect, activeDates, riskDates }) {
  const { isDark } = useTheme()
  const T = tok(isDark)
  const today = new Date()
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d })

  const year  = cursor.getFullYear()
  const month = cursor.getMonth()
  const offset = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayIso = today.toISOString().slice(0, 10)

  const navBtn = {
    background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 8,
    color: T.textMuted, cursor: 'pointer', padding: '4px 10px', fontSize: '1rem',
    transition: 'all 0.12s',
  }

  return (
    <div style={{ background: T.card, borderRadius: 16, padding: 20, boxShadow: T.shadow, border: `1px solid ${T.border}`, transition: 'background 0.25s' }}>
      {/* Month nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} style={navBtn}>‹</button>
        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: T.text, fontFamily: T.font }}>
          {MONTHS_FR[month].toUpperCase()} {year}
        </span>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} style={navBtn}>›</button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 6 }}>
        {DAYS_FR.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.55rem', color: T.label, fontWeight: 600, letterSpacing: '0.04em' }}>{d}</div>
        ))}
      </div>

      {/* Days */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {Array.from({ length: offset }, (_, i) => <div key={`b${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day     = i + 1
          const iso     = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const risk    = riskDates.get(iso)
          const hasEntry = activeDates.has(iso)
          const isSel   = selected === iso
          const isToday = iso === todayIso
          const dotColor = risk ? RISK_DOT[risk] : hasEntry ? T.accent : null

          const dayBg     = isSel ? T.accent
            : isToday ? (isDark ? 'rgba(43,161,251,0.12)' : '#eff6ff')
            : 'transparent'
          const dayBorder = isSel ? `2px solid ${T.accent}`
            : isToday ? `2px solid ${isDark ? 'rgba(43,161,251,0.4)' : '#bfdbfe'}`
            : '2px solid transparent'
          const dayColor  = isSel ? '#fff'
            : risk && iso > todayIso ? RISK_DOT[risk]
            : isToday ? (isDark ? '#2ba1fb' : '#2563eb')
            : T.text

          return (
            <button key={day} onClick={() => onSelect(iso)} style={{
              width: 34, height: 34, borderRadius: 8,
              background: dayBg,
              border: dayBorder,
              color: dayColor,
              fontWeight: isSel || isToday ? 700 : 400,
              fontSize: '0.78rem', cursor: 'pointer', position: 'relative',
              transition: 'all 0.12s', fontFamily: T.font,
            }}>
              {day}
              {dotColor && !isSel && (
                <span style={{
                  position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)',
                  width: 4, height: 4, borderRadius: '50%', background: dotColor,
                }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.divider}`, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { color: T.accent,         label: 'Entrée' },
          { color: RISK_DOT.MEDIUM,  label: 'MODÉRÉ' },
          { color: RISK_DOT.HIGH,    label: 'ÉLEVÉ' },
          { color: RISK_DOT.CRITICAL,label: 'CRITIQUE' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.65rem', color: T.textMuted }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Prediction card ───────────────────────────────────────── */
function PredictionCard({ date, prediction, loading, hasEntry, navigate }) {
  const { isDark } = useTheme()
  const T = tok(isDark)

  if (loading) return (
    <div style={{ background: T.card, borderRadius: 16, padding: 28, boxShadow: T.shadow, border: `1px solid ${T.border}` }}>
      <div style={{ fontSize: '0.65rem', color: T.label, letterSpacing: '0.15em', marginBottom: 16, fontFamily: T.font }}>ANALYSE EN COURS…</div>
      {[100, 70, 90, 55].map((w, i) => (
        <div key={i} style={{ height: 10, borderRadius: 6, background: T.subtle, width: `${w}%`, marginBottom: 10, animation: `shimmer 1.5s ease ${i * 0.15}s infinite` }} />
      ))}
    </div>
  )

  if (!prediction) return (
    <div style={{ background: T.card, borderRadius: 16, padding: 40, boxShadow: T.shadow, border: `1px solid ${T.border}`, textAlign: 'center', color: T.label }}>
      <div style={{ fontSize: '2rem', marginBottom: 12 }}>📅</div>
      <div style={{ fontSize: '0.85rem', fontWeight: 500, color: T.textMuted, fontFamily: T.font }}>Sélectionnez une date</div>
      <div style={{ fontSize: '0.72rem', marginTop: 6, color: T.label, fontFamily: T.font }}>L'agent IA analysera les conditions réelles</div>
    </div>
  )

  const meta     = SCENARIO_META[prediction.scenario_id] || { color: '#6366f1', bg: '#f5f3ff', label: prediction.scenario_id, icon: '📊' }
  const risk     = RISK_META[prediction.risk_level]      || RISK_META.MEDIUM
  const conf     = Math.round((prediction.confidence || 0) * 100)
  const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()
  const w = prediction.weather_snapshot

  // In dark mode, pastel bgs become transparent tints
  const metaCardBg  = isDark ? meta.color + '18' : meta.bg
  const metaCardBd  = isDark ? `1px solid ${meta.color}33` : `1px solid ${meta.color}22`
  const riskCardBg  = isDark ? risk.color + '14' : risk.bg
  const riskBadgeBg = isDark ? risk.color + '25' : risk.color + '18'

  return (
    <div style={{ background: T.card, borderRadius: 16, boxShadow: T.shadow, border: `1px solid ${T.border}`, overflow: 'hidden', transition: 'background 0.25s' }}>

      {/* Header row */}
      <div style={{ padding: '16px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: T.text, fontFamily: T.font }}>{dateLabel}</div>
        {hasEntry && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.68rem', color: T.accent, background: isDark ? T.accent + '18' : '#eef2ff', padding: '4px 10px', borderRadius: 20 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent, display: 'inline-block' }} />
            Entrée existante
          </div>
        )}
      </div>

      {/* 3 metric boxes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, padding: '16px 24px' }}>

        <div style={{ background: metaCardBg, border: metaCardBd, borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: '0.55rem', color: T.label, letterSpacing: '0.15em', marginBottom: 10, fontFamily: 'monospace' }}>SCÉNARIO PRÉDIT</div>
          <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>{meta.icon}</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: meta.color, fontFamily: T.font }}>{meta.label}</div>
        </div>

        <div style={{ background: riskCardBg, border: `1px solid ${risk.border}`, borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '0.55rem', color: T.label, letterSpacing: '0.15em', marginBottom: 10, fontFamily: 'monospace' }}>NIVEAU DE RISQUE</div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '6px 14px', borderRadius: 8,
            background: riskBadgeBg, border: `1px solid ${risk.color}55`,
            alignSelf: 'flex-start',
          }}>
            <span style={{ fontSize: '0.85rem' }}>{risk.icon}</span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: risk.color, letterSpacing: '0.08em', fontFamily: 'monospace' }}>{risk.label}</span>
          </div>
        </div>

        <div style={{ background: T.subtle, border: `1px solid ${T.subtleBd}`, borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: '0.55rem', color: T.label, letterSpacing: '0.15em', marginBottom: 8, fontFamily: 'monospace' }}>CONFIANCE IA</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: T.text, lineHeight: 1, marginBottom: 10, fontFamily: T.font }}>{conf}%</div>
          <div style={{ height: 6, background: T.subtleBd, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${conf}%`, background: `linear-gradient(90deg, ${meta.color}99, ${meta.color})`, borderRadius: 4, transition: 'width 0.8s ease' }} />
          </div>
        </div>
      </div>

      {/* Reasoning + Conditions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: '0 24px 16px' }}>
        <div>
          <div style={{ fontSize: '0.6rem', color: T.label, letterSpacing: '0.15em', marginBottom: 10, fontWeight: 600, fontFamily: 'monospace' }}>RAISONNEMENT DE L'IA</div>
          <p style={{ fontSize: '0.78rem', color: T.textMuted, lineHeight: 1.7, margin: 0, fontFamily: T.font }}>{prediction.reasoning}</p>
        </div>
        <div>
          <div style={{ fontSize: '0.6rem', color: T.label, letterSpacing: '0.15em', marginBottom: 10, fontWeight: 600, fontFamily: 'monospace' }}>CONDITIONS DÉTERMINANTES</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {(prediction.conditions_cles || []).map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.73rem', color: T.textMuted, fontFamily: T.font }}>
                <span style={{ color: meta.color, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>▸</span>
                <span>{c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weather + Actions + Sources */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 16, padding: '0 24px 16px', alignItems: 'start' }}>

        {w && (
          <div style={{ background: T.subtle, border: `1px solid ${T.subtleBd}`, borderRadius: 12, padding: '14px 18px', minWidth: 160 }}>
            <div style={{ fontSize: '0.55rem', color: T.label, letterSpacing: '0.15em', marginBottom: 12, fontFamily: 'monospace' }}>
              MÉTÉO PRÉVUE
              <span style={{ color: T.label, marginLeft: 6, fontSize: '0.5rem' }}>(Open-Meteo)</span>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              {[
                { icon: '🌡️', val: w.temperature_max != null ? `${w.temperature_max}°C` : w.temperature != null ? `${w.temperature}°C` : '—', label: 'Temp. max' },
                { icon: '💧', val: `${w.precipitation_mm ?? w.precipitation ?? 0} mm`, label: 'Précip.' },
                { icon: '💨', val: w.wind_max_kmh != null ? `${w.wind_max_kmh} km/h` : w.wind_speed != null ? `${(w.wind_speed * 3.6).toFixed(0)} km/h` : '—', label: 'Vent' },
              ].map(({ icon, val, label }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem', marginBottom: 3 }}>{icon}</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: T.text, fontFamily: T.font }}>{val}</div>
                  <div style={{ fontSize: '0.55rem', color: T.label, marginTop: 2, fontFamily: 'monospace' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div style={{ fontSize: '0.6rem', color: T.label, letterSpacing: '0.15em', marginBottom: 10, fontWeight: 600, fontFamily: 'monospace' }}>ACTIONS RECOMMANDÉES</div>
          <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {(prediction.actions_recommandees || []).map((a, i) => (
              <li key={i} style={{ fontSize: '0.73rem', color: T.textMuted, lineHeight: 1.5, fontFamily: T.font }}>{a}</li>
            ))}
          </ol>
        </div>

        <div style={{ minWidth: 130 }}>
          <div style={{ fontSize: '0.6rem', color: T.label, letterSpacing: '0.15em', marginBottom: 10, fontWeight: 600, fontFamily: 'monospace' }}>SOURCES DE DONNÉES</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(prediction.sources || []).map((s, i) => {
              const colors = ['#6366f1','#06b6d4','#10b981','#f59e0b']
              const c = colors[i % colors.length]
              return (
                <span key={i} style={{
                  fontSize: '0.62rem', padding: '4px 10px', borderRadius: 20,
                  background: c + '15', border: `1px solid ${c}44`, color: c,
                  display: 'inline-block', maxWidth: 160,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {s}
                </span>
              )
            })}
          </div>
        </div>
      </div>

      {/* Play button */}
      {SCENARIO_3D_MAP[prediction.scenario_id] && (
        <div style={{ padding: '0 24px 24px' }}>
          <button
            onClick={() => { sessionStorage.setItem('autoScenario', SCENARIO_3D_MAP[prediction.scenario_id]); sessionStorage.setItem('scenarioOrigin', '/journal'); navigate('/') }}
            style={{
              width: '100%', padding: 13,
              background: isDark ? '#1e293b' : '#0f172a',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.15)'}`,
              borderRadius: 12,
              color: '#fff', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.12em',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: 'background 0.2s, box-shadow 0.2s', fontFamily: 'monospace',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = isDark ? '#334155' : '#1e293b'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.background = isDark ? '#1e293b' : '#0f172a'; e.currentTarget.style.boxShadow = 'none' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            JOUER LA SIMULATION
            <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 400 }}>Lancer dans la scène 3D</span>
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── Main page ─────────────────────────────────────────────── */
export default function Journal() {
  const { user } = useAuth()
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const today = new Date().toISOString().slice(0, 10)
  const T = tok(isDark)

  const [entries,        setEntries]        = useState([])
  const [activeDates,    setActiveDates]    = useState(new Set())
  const [selectedDate,   setSelectedDate]   = useState(today)
  const [dayEntries,     setDayEntries]     = useState([])
  const [prediction,     setPrediction]     = useState(null)
  const [predLoading,    setPredLoading]    = useState(false)
  const [entriesLoading, setEntriesLoading] = useState(true)
  const [futurePreds,    setFuturePreds]    = useState([])
  const [riskDates,      setRiskDates]      = useState(new Map())
  const [analyzing,      setAnalyzing]      = useState(false)

  useEffect(() => {
    async function load() {
      setEntriesLoading(true)
      try {
        const res = await fetch(`${API_BASE}/journal`)
        if (res.ok) {
          const data = await res.json()
          setEntries(data.entries || [])
          setActiveDates(new Set((data.entries || []).map(e => e.date)))
        }
      } catch {}
      setEntriesLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!user) return
    async function loadFuture() {
      try {
        const token = await user.getIdToken()
        const res = await fetch(`${API_BASE}/journal/future-predictions`, { headers: { 'Authorization': `Bearer ${token}` } })
        if (res.ok) applyFuturePreds((await res.json()).predictions || [])
      } catch {}
    }
    loadFuture()
  }, [user])

  function applyFuturePreds(preds) {
    setFuturePreds(preds)
    setRiskDates(new Map(preds.map(p => [p.date, p.risk_level])))
  }

  const handleSelectDate = useCallback(async (iso) => {
    setSelectedDate(iso)
    setPrediction(null)
    setDayEntries(entries.filter(e => e.date === iso))
    if (!user) return
    setPredLoading(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch(`${API_BASE}/journal/${iso}/predict`, { headers: { 'Authorization': `Bearer ${token}` } })
      if (res.ok) {
        const pred = await res.json()
        setPrediction(pred)
        if (iso >= today) {
          setRiskDates(prev => new Map(prev).set(iso, pred.risk_level))
          setFuturePreds(prev => [...prev.filter(p => p.date !== iso), pred].sort((a, b) => a.date.localeCompare(b.date)))
        }
      }
    } catch {}
    setPredLoading(false)
  }, [user, entries, today])

  useEffect(() => {
    if (user && !entriesLoading) handleSelectDate(today)
  }, [user, entriesLoading]) // eslint-disable-line

  async function handleAnalyzeUpcoming() {
    if (!user || analyzing) return
    setAnalyzing(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch(`${API_BASE}/journal/analyze-upcoming?days=14`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } })
      if (res.ok) applyFuturePreds((await res.json()).predictions || [])
    } catch {}
    setAnalyzing(false)
  }

  const riskyPreds = futurePreds.filter(p => p.risk_level !== 'LOW')

  return (
    <div style={{ minHeight: '100vh', background: T.pageBg, padding: '28px 32px 40px 108px', fontFamily: T.font, transition: 'background 0.25s', animation: 'fadeIn 0.3s ease both' }}>

      {/* Header */}
      <div style={{ marginBottom: 28, animation: 'fadeDown 0.5s cubic-bezier(0.22,1,0.36,1) both' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: T.text, margin: 0, marginBottom: 4, fontFamily: T.font }}>
          {isDark ? 'JOURNAL DE SIMULATION' : 'Journal de simulation'}
        </h1>
        <p style={{ fontSize: '0.8rem', color: T.textMuted, margin: 0, fontFamily: T.font }}>
          Sélectionnez une date — l'agent IA prédit le scénario à partir des conditions réelles.
        </p>
      </div>

      {/* Main layout */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flexShrink: 0, animation: 'fadeLeft 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s both' }}>
          <Calendar selected={selectedDate} onSelect={handleSelectDate} activeDates={activeDates} riskDates={riskDates} />

          {/* Stats */}
          <div style={{ background: T.card, borderRadius: 16, padding: '16px 20px', boxShadow: T.shadow, border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: '0.6rem', color: T.label, letterSpacing: '0.15em', fontWeight: 600, marginBottom: 14, fontFamily: 'monospace' }}>STATISTIQUES</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { icon: '📋', val: entries.length,    label: 'Sessions totales' },
                { icon: '📅', val: activeDates.size,  label: 'Dates actives' },
                { icon: '⚠️', val: riskyPreds.length, label: 'Risques prédits' },
              ].map(({ icon, val, label }, i) => (
                <div key={label} style={{ textAlign: 'center', padding: '10px 8px', background: T.subtle, borderRadius: 10, border: `1px solid ${T.subtleBd}`, animation: `scaleIn 0.4s ease ${0.2 + i * 0.08}s both` }}>
                  <div style={{ fontSize: '1.1rem', marginBottom: 4 }}>{icon}</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: T.text, lineHeight: 1, fontFamily: T.font }}>{val}</div>
                  <div style={{ fontSize: '0.55rem', color: T.label, marginTop: 4, lineHeight: 1.3, fontFamily: 'monospace' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ flex: 1, minWidth: 0, animation: 'fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.15s both' }}>
          <PredictionCard
            date={selectedDate}
            prediction={prediction}
            loading={predLoading}
            hasEntry={activeDates.has(selectedDate)}
            navigate={navigate}
          />

          {/* Past entries for that day */}
          {dayEntries.length > 0 && (
            <div style={{ marginTop: 16, background: T.card, borderRadius: 16, padding: '18px 24px', boxShadow: T.shadow, border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: '0.6rem', color: T.label, letterSpacing: '0.15em', fontWeight: 600, marginBottom: 12, fontFamily: 'monospace' }}>
                SESSIONS ENREGISTRÉES — {dayEntries.length} ENTRÉE(S)
              </div>
              {dayEntries.map((e, i) => {
                const m = SCENARIO_META[e.scenario_id] || { color: '#6366f1', label: e.scenario_id, icon: '📊' }
                return (
                  <div key={i} style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 8, background: isDark ? m.color + '12' : (m.bg || '#f8fafc'), borderLeft: `4px solid ${m.color}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: m.color, fontFamily: T.font }}>{m.icon} {m.label}</span>
                      <span style={{ fontSize: '0.62rem', color: T.label, fontFamily: 'monospace' }}>{e.mode || 'AUTO'}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: T.textMuted, lineHeight: 1.5, fontFamily: T.font }}>{e.summary}</div>
                    <div style={{ fontSize: '0.6rem', color: T.label, marginTop: 4, fontFamily: 'monospace' }}>
                      {e.created_at ? new Date(e.created_at).toLocaleString('fr-FR') : e.date}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Upcoming risk table ── */}
      <div style={{ marginTop: 32, background: T.card, borderRadius: 16, boxShadow: T.shadow, border: `1px solid ${T.border}`, overflow: 'hidden', animation: 'fadeUp 0.5s ease 0.25s both' }}>
        {/* Table header */}
        <div style={{ padding: '20px 24px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: `1px solid ${T.divider}`, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: '1.1rem' }}>⚠️</span>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: T.text, fontFamily: T.font }}>
                {isDark ? 'JOURS À RISQUE' : 'Jours à risque'}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.72rem', color: T.label, fontFamily: T.font }}>
              Liste des jours à risque (MEDIUM, HIGH, CRITICAL) sur les 14 prochains jours
            </p>
          </div>
          <button
            onClick={handleAnalyzeUpcoming}
            disabled={analyzing}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px',
              background: analyzing ? T.subtle : T.card,
              border: `1px solid ${T.border}`, borderRadius: 10,
              color: analyzing ? T.label : T.textMuted,
              fontSize: '0.75rem', fontWeight: 600, cursor: analyzing ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s', whiteSpace: 'nowrap', fontFamily: T.font,
            }}
            onMouseEnter={e => { if (!analyzing) { e.currentTarget.style.background = T.subtle; e.currentTarget.style.borderColor = isDark ? 'rgba(112,193,255,0.2)' : '#cbd5e1' }}}
            onMouseLeave={e => { if (!analyzing) { e.currentTarget.style.background = T.card; e.currentTarget.style.borderColor = T.border }}}
          >
            <span style={{ display: 'inline-block', animation: analyzing ? 'spin 1s linear infinite' : 'none', fontSize: '0.9rem' }}>⟳</span>
            ANALYSER LES 14 PROCHAINS JOURS
            <span style={{ fontSize: '0.62rem', color: T.label, fontWeight: 400, fontFamily: 'monospace' }}>(~15-20 secondes)</span>
          </button>
        </div>

        {/* Column headers */}
        {riskyPreds.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 160px 200px 100px', gap: 0, padding: '10px 24px', background: T.subtle, borderBottom: `1px solid ${T.divider}` }}>
            {['DATE', 'SCÉNARIO PRÉDIT', 'NIVEAU DE RISQUE', 'CONFIANCE IA', 'ACTION'].map(h => (
              <div key={h} style={{ fontSize: '0.58rem', fontWeight: 700, color: T.label, letterSpacing: '0.1em', fontFamily: 'monospace' }}>{h}</div>
            ))}
          </div>
        )}

        {/* Rows */}
        {riskyPreds.length > 0 ? riskyPreds.map((pred, i) => {
          const meta = SCENARIO_META[pred.scenario_id] || { color: '#6366f1', bg: '#eef2ff', label: pred.scenario_id, icon: '📊' }
          const risk = RISK_META[pred.risk_level] || RISK_META.MEDIUM
          const conf = Math.round((pred.confidence || 0) * 100)
          const dot  = RISK_DOT[pred.risk_level] || '#6366f1'
          const dateLabel = new Date(pred.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

          return (
            <div
              key={pred.date}
              onClick={() => handleSelectDate(pred.date)}
              style={{
                display: 'grid', gridTemplateColumns: '180px 1fr 160px 200px 100px',
                gap: 0, padding: '14px 24px', cursor: 'pointer',
                borderBottom: i < riskyPreds.length - 1 ? `1px solid ${T.divider}` : 'none',
                transition: 'background 0.12s', alignItems: 'center',
                animation: `fadeLeft 0.4s ease ${i * 0.06}s both`,
              }}
              onMouseEnter={e => e.currentTarget.style.background = T.hover}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontSize: '0.78rem', color: T.textMuted, fontWeight: 500, fontFamily: T.font }}>{dateLabel}</span>
              </div>

              <div>
                <span style={{
                  fontSize: '0.75rem', fontWeight: 600, padding: '4px 12px',
                  borderRadius: 20,
                  background: isDark ? meta.color + '18' : meta.bg,
                  color: meta.color,
                  border: `1px solid ${meta.color}33`,
                  fontFamily: T.font,
                }}>
                  {meta.icon} {meta.label}
                </span>
              </div>

              <div>
                <span style={{
                  fontSize: '0.72rem', fontWeight: 700, padding: '4px 12px',
                  borderRadius: 8,
                  background: isDark ? risk.color + '18' : risk.bg,
                  color: risk.color,
                  border: `1px solid ${risk.border}`,
                  fontFamily: 'monospace',
                }}>
                  {risk.icon} {risk.label}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: T.textMuted, minWidth: 36, fontFamily: T.font }}>{conf}%</span>
                <div style={{ flex: 1, height: 6, background: T.subtleBd, borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${conf}%`, background: `linear-gradient(90deg, ${meta.color}88, ${meta.color})`, borderRadius: 4 }} />
                </div>
              </div>

              <div>
                {SCENARIO_3D_MAP[pred.scenario_id] && (
                  <button
                    onClick={e => { e.stopPropagation(); sessionStorage.setItem('autoScenario', SCENARIO_3D_MAP[pred.scenario_id]); sessionStorage.setItem('scenarioOrigin', '/journal'); navigate('/') }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 14px',
                      background: isDark ? '#1e293b' : '#0f172a',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.15)'}`,
                      borderRadius: 8,
                      color: '#fff', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer',
                      transition: 'background 0.15s', fontFamily: 'monospace',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = isDark ? '#334155' : '#1e293b'}
                    onMouseLeave={e => e.currentTarget.style.background = isDark ? '#1e293b' : '#0f172a'}
                  >
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    JOUER
                  </button>
                )}
              </div>
            </div>
          )
        }) : (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: T.label }}>
            <div style={{ fontSize: '2rem', marginBottom: 10 }}>🔍</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: 6, color: T.textMuted, fontFamily: T.font }}>
              {futurePreds.length === 0 ? 'Aucune prévision disponible' : 'Aucun risque élevé détecté'}
            </div>
            <div style={{ fontSize: '0.72rem', color: T.label, fontFamily: T.font }}>
              {futurePreds.length === 0 ? 'Cliquez sur « Analyser les 14 prochains jours » pour générer les prévisions' : 'Tous les jours analysés présentent un risque faible (LOW)'}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer { 0%,100%{opacity:0.4} 50%{opacity:0.9} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
