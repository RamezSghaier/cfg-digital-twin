import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'

const API_BASE = 'http://localhost:8000/api'

/* ─── Styles ─────────────────────────────────────────────────── */
const glass = {
  background: 'rgba(5, 12, 25, 0.72)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(112, 193, 255, 0.12)',
  borderRadius: '16px',
}

const SCENARIO_META = {
  deraillement:     { color: '#F87171', label: 'Déraillement'      },
  usure_rails:      { color: '#FB923C', label: 'Usure Rails'        },
  brouillard_dense: { color: '#94A3B8', label: 'Brouillard Dense'   },
  surcharge_voie:   { color: '#FBBF24', label: 'Surcharge Voie'     },
  inondation_voie:  { color: '#60A5FA', label: 'Inondation Voie'    },
  defaillance_frein:{ color: '#F87171', label: 'Défaillance Frein'  },
  courbure_critique:{ color: '#C084FC', label: 'Courbure Critique'  },
}

const RISK_COLOR = {
  LOW: '#4ade80', MEDIUM: '#facc15', HIGH: '#FB923C', CRITICAL: '#f87171',
}

/* ─── Calendar ───────────────────────────────────────────────── */
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAYS_FR   = ['Lu','Ma','Me','Je','Ve','Sa','Di']

function Calendar({ selected, onSelect, activeDates }) {
  const today = new Date()
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d
  })

  const year  = cursor.getFullYear()
  const month = cursor.getMonth()
  const offset = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const todayIso = today.toISOString().slice(0, 10)

  return (
    <div style={{ ...glass, padding: '20px', minWidth: '290px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} style={navBtn}>‹</button>
        <div style={{ fontSize: '0.72rem', letterSpacing: '0.2em', opacity: 0.8 }}>
          {MONTHS_FR[month].toUpperCase()} {year}
        </div>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} style={navBtn}>›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
        {DAYS_FR.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.56rem', opacity: 0.3, letterSpacing: '0.08em' }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {Array.from({ length: offset }, (_, i) => <div key={`b${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const hasEntry = activeDates.has(iso)
          const isSel   = selected === iso
          const isToday = iso === todayIso

          return (
            <button
              key={day}
              onClick={() => onSelect(iso)}
              style={{
                width: '34px', height: '34px', borderRadius: '8px',
                background: isSel
                  ? 'rgba(112,193,255,0.22)'
                  : isToday
                  ? 'rgba(112,193,255,0.07)'
                  : 'transparent',
                border: isSel
                  ? '1px solid rgba(112,193,255,0.55)'
                  : isToday
                  ? '1px solid rgba(112,193,255,0.28)'
                  : '1px solid transparent',
                color: isSel ? '#70c1ff' : hasEntry ? '#70c1ff' : isToday ? 'rgba(112,193,255,0.55)' : 'rgba(112,193,255,0.25)',
                fontFamily: 'monospace', fontSize: '0.72rem',
                cursor: 'pointer', position: 'relative',
                transition: 'all 0.15s',
              }}
            >
              {day}
              {hasEntry && (
                <span style={{
                  position: 'absolute', bottom: '3px', left: '50%',
                  transform: 'translateX(-50%)',
                  width: '3px', height: '3px', borderRadius: '50%',
                  background: '#70c1ff',
                }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const navBtn = {
  background: 'transparent', border: 'none',
  color: 'rgba(112,193,255,0.5)', fontFamily: 'monospace',
  fontSize: '1.1rem', cursor: 'pointer',
  padding: '4px 10px', borderRadius: '6px',
}

/* ─── Journal entry row ──────────────────────────────────────── */
function EntryRow({ entry }) {
  const meta = SCENARIO_META[entry.scenario_id] || { color: '#70c1ff', label: entry.scenario_id }
  return (
    <div style={{
      padding: '12px 16px', borderRadius: '10px', marginBottom: '8px',
      background: 'rgba(112,193,255,0.04)',
      border: '1px solid rgba(112,193,255,0.08)',
      borderLeft: `3px solid ${meta.color}`,
      fontFamily: 'monospace', color: '#70c1ff',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
        <span style={{ fontSize: '0.72rem', color: meta.color, letterSpacing: '0.06em' }}>{meta.label}</span>
        <span style={{ fontSize: '0.58rem', opacity: 0.35 }}>{entry.mode || 'AUTO'}</span>
      </div>
      <div style={{ fontSize: '0.65rem', opacity: 0.6, lineHeight: '1.55' }}>{entry.summary}</div>
      <div style={{ fontSize: '0.55rem', opacity: 0.25, marginTop: '6px' }}>
        {entry.created_at ? new Date(entry.created_at).toLocaleString('fr-FR') : entry.date}
      </div>
    </div>
  )
}

/* ─── AI Prediction panel ────────────────────────────────────── */
function PredictionPanel({ date, prediction, loading }) {
  if (loading) {
    return (
      <div style={{ ...glass, padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ fontSize: '0.55rem', letterSpacing: '0.35em', opacity: 0.35 }}>ANALYSE EN COURS</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.5 }}>
          <span style={{ fontSize: '0.75rem', animation: 'pulse 1.5s ease infinite' }}>
            Collecte des données météo historiques · Analyse des segments · Prédiction IA...
          </span>
        </div>
        {[80, 60, 90, 50].map((w, i) => (
          <div key={i} style={{
            height: '8px', borderRadius: '4px',
            background: 'rgba(112,193,255,0.08)',
            width: `${w}%`,
            animation: `pulse 1.5s ease ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    )
  }

  if (!prediction) return null

  const meta = SCENARIO_META[prediction.scenario_id] || { color: '#70c1ff', label: prediction.scenario_id }
  const riskColor = RISK_COLOR[prediction.risk_level] || '#70c1ff'
  const confidencePct = Math.round((prediction.confidence || 0) * 100)

  return (
    <div style={{ ...glass, padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '0.52rem', letterSpacing: '0.35em', opacity: 0.35, marginBottom: '4px' }}>
            PRÉDICTION IA — {date}
          </div>
          <div style={{ fontSize: '1rem', letterSpacing: '0.12em', color: meta.color }}>
            {meta.label}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: '0.62rem', letterSpacing: '0.18em',
            color: riskColor,
            padding: '4px 12px',
            borderRadius: '20px',
            background: `${riskColor}18`,
            border: `1px solid ${riskColor}44`,
            marginBottom: '6px',
          }}>
            {prediction.risk_level}
          </div>
          <div style={{ fontSize: '0.58rem', opacity: 0.4 }}>
            Confiance : {confidencePct}%
          </div>
        </div>
      </div>

      {/* Confidence bar */}
      <div>
        <div style={{ height: '3px', background: 'rgba(112,193,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${confidencePct}%`,
            background: `linear-gradient(90deg, ${meta.color}88, ${meta.color})`,
            borderRadius: '2px', transition: 'width 0.8s ease',
          }} />
        </div>
      </div>

      {/* Reasoning */}
      <div style={{
        padding: '14px', borderRadius: '10px',
        background: 'rgba(112,193,255,0.03)',
        border: '1px solid rgba(112,193,255,0.08)',
        fontSize: '0.7rem', lineHeight: '1.7', opacity: 0.75,
      }}>
        {prediction.reasoning}
      </div>

      {/* Key conditions */}
      {prediction.conditions_cles?.length > 0 && (
        <div>
          <div style={{ fontSize: '0.52rem', letterSpacing: '0.28em', opacity: 0.35, marginBottom: '8px' }}>
            CONDITIONS DÉTERMINANTES
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {prediction.conditions_cles.map((c, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: '8px',
                fontSize: '0.65rem', opacity: 0.65,
              }}>
                <span style={{ color: meta.color, flexShrink: 0 }}>▸</span>
                <span>{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weather snapshot */}
      {prediction.weather_snapshot && (
        <div style={{
          display: 'flex', gap: '12px', flexWrap: 'wrap',
          padding: '10px 12px', borderRadius: '10px',
          background: 'rgba(112,193,255,0.03)',
          border: '1px solid rgba(112,193,255,0.07)',
        }}>
          <div style={{ fontSize: '0.52rem', letterSpacing: '0.28em', opacity: 0.3, width: '100%', marginBottom: '2px' }}>
            MÉTÉO — {prediction.weather_snapshot.source || 'GAFSA'}
          </div>
          {[
            { label: 'Temp. max', value: prediction.weather_snapshot.temperature_max != null ? `${prediction.weather_snapshot.temperature_max}°C` : prediction.weather_snapshot.temperature != null ? `${prediction.weather_snapshot.temperature}°C` : '—' },
            { label: 'Précip.', value: `${prediction.weather_snapshot.precipitation_mm ?? prediction.weather_snapshot.precipitation ?? 0} mm` },
            { label: 'Vent', value: prediction.weather_snapshot.wind_max_kmh != null ? `${prediction.weather_snapshot.wind_max_kmh} km/h` : prediction.weather_snapshot.wind_speed != null ? `${(prediction.weather_snapshot.wind_speed * 3.6).toFixed(0)} km/h` : '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{ flex: 1, minWidth: '70px' }}>
              <div style={{ fontSize: '0.52rem', opacity: 0.3, letterSpacing: '0.12em', marginBottom: '2px' }}>{label}</div>
              <div style={{ fontSize: '0.72rem' }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Recommended actions */}
      {prediction.actions_recommandees?.length > 0 && (
        <div>
          <div style={{ fontSize: '0.52rem', letterSpacing: '0.28em', opacity: 0.35, marginBottom: '8px' }}>
            ACTIONS RECOMMANDÉES
          </div>
          {prediction.actions_recommandees.map((a, i) => (
            <div key={i} style={{
              padding: '7px 10px', marginBottom: '5px', borderRadius: '7px',
              background: 'rgba(112,193,255,0.04)',
              border: '1px solid rgba(112,193,255,0.08)',
              fontSize: '0.65rem', opacity: 0.65,
            }}>
              {i + 1}. {a}
            </div>
          ))}
        </div>
      )}

      {/* Sources */}
      {prediction.sources?.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(112,193,255,0.07)', paddingTop: '12px' }}>
          <div style={{ fontSize: '0.5rem', letterSpacing: '0.28em', opacity: 0.25, marginBottom: '6px' }}>
            SOURCES DE DONNÉES
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {prediction.sources.map((s, i) => (
              <span key={i} style={{
                fontSize: '0.55rem', opacity: 0.4,
                padding: '3px 8px', borderRadius: '20px',
                border: '1px solid rgba(112,193,255,0.12)',
              }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Main page ──────────────────────────────────────────────── */
export default function Journal() {
  const { user } = useAuth()
  const today = new Date().toISOString().slice(0, 10)

  const [entries, setEntries]         = useState([])
  const [activeDates, setActiveDates] = useState(new Set())
  const [selectedDate, setSelectedDate] = useState(today)
  const [dayEntries, setDayEntries]   = useState([])
  const [prediction, setPrediction]   = useState(null)
  const [predLoading, setPredLoading] = useState(false)
  const [entriesLoading, setEntriesLoading] = useState(true)

  /* Fetch all journal entries (for calendar dots) */
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

  /* When a date is selected → fetch day entries + run prediction */
  const handleSelectDate = useCallback(async (iso) => {
    setSelectedDate(iso)
    setPrediction(null)

    // Filter local entries for that day
    setDayEntries(entries.filter(e => e.date === iso))

    // Call AI prediction
    if (!user) return
    setPredLoading(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch(`${API_BASE}/journal/${iso}/predict`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res.ok) setPrediction(await res.json())
    } catch {}
    setPredLoading(false)
  }, [user, entries])

  /* Auto-select today on mount */
  useEffect(() => {
    if (user && entries !== undefined) handleSelectDate(today)
  }, [user, entries.length]) // eslint-disable-line

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 70% 30%, rgba(112,193,255,0.04) 0%, transparent 55%), #000',
      display: 'flex', flexDirection: 'column',
      padding: '32px 32px 32px 100px',
      fontFamily: 'monospace', color: '#70c1ff',
    }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '0.58rem', letterSpacing: '0.4em', opacity: 0.4, marginBottom: '6px' }}>
          CHEMIN DE FER DE GAFSA
        </div>
        <h1 style={{
          fontSize: 'clamp(1.1rem, 2vw, 1.5rem)',
          letterSpacing: '0.25em', fontWeight: 500,
          textShadow: '0 0 20px rgba(112,193,255,0.4)', margin: 0,
        }}>
          JOURNAL DE SIMULATION
        </h1>
        <div style={{ fontSize: '0.65rem', opacity: 0.4, letterSpacing: '0.15em', marginTop: '4px' }}>
          Sélectionnez une date — l'agent IA prédit le scénario à partir des conditions réelles
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap', flex: 1 }}>

        {/* ── LEFT: Calendar + legend ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Calendar
            selected={selectedDate}
            onSelect={handleSelectDate}
            activeDates={activeDates}
          />

          {/* Legend */}
          <div style={{ ...glass, padding: '14px 16px' }}>
            <div style={{ fontSize: '0.52rem', letterSpacing: '0.28em', opacity: 0.3, marginBottom: '10px' }}>LÉGENDE RISQUE</div>
            {[
              { color: '#4ade80', label: 'LOW' },
              { color: '#facc15', label: 'MEDIUM' },
              { color: '#FB923C', label: 'HIGH' },
              { color: '#f87171', label: 'CRITICAL' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '0.62rem', opacity: 0.55 }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                {label}
              </div>
            ))}
          </div>

          {/* Stats */}
          <div style={{ ...glass, padding: '14px 16px' }}>
            <div style={{ fontSize: '0.52rem', letterSpacing: '0.28em', opacity: 0.3, marginBottom: '10px' }}>STATISTIQUES</div>
            {[
              { label: 'Sessions totales', value: entries.length },
              { label: 'Dates actives', value: activeDates.size },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.65rem' }}>
                <span style={{ opacity: 0.45 }}>{label}</span>
                <span>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Prediction + day entries ── */}
        <div style={{ flex: 1, minWidth: '360px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Date header */}
          {selectedDate && (
            <div style={{ fontSize: '0.6rem', letterSpacing: '0.25em', opacity: 0.35 }}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              }).toUpperCase()}
            </div>
          )}

          {/* AI Prediction */}
          <PredictionPanel
            date={selectedDate}
            prediction={prediction}
            loading={predLoading}
          />

          {/* Past journal entries for that day */}
          {dayEntries.length > 0 && (
            <div>
              <div style={{ fontSize: '0.52rem', letterSpacing: '0.3em', opacity: 0.3, marginBottom: '10px' }}>
                SESSIONS ENREGISTRÉES — {dayEntries.length} ENTRÉE(S)
              </div>
              {dayEntries.map((e, i) => <EntryRow key={i} entry={e} />)}
            </div>
          )}

          {/* Empty state */}
          {!predLoading && !prediction && !selectedDate && (
            <div style={{ ...glass, padding: '40px', textAlign: 'center', opacity: 0.3 }}>
              <div style={{ fontSize: '0.75rem', letterSpacing: '0.1em' }}>
                Sélectionnez une date dans le calendrier
              </div>
              <div style={{ fontSize: '0.62rem', marginTop: '8px' }}>
                L'agent IA analysera les conditions réelles et prédirait le meilleur scénario
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.9; }
        }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(112,193,255,0.12); border-radius: 2px; }
      `}</style>
    </div>
  )
}
