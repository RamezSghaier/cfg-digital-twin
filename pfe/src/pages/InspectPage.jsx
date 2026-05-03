import { useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import CanvasWrapper from '../components/layout/CanvasWrapper'
import AccueilScene from '../components/three/AccueilScene'
import RailsInspectModel from '../components/three/RailsInspectModel'
import SilkParticles from '../components/three/SilkParticles'

const DATA = {
  train: {
    tag:         'Locomotive',
    title:       'Steam-era Locomotive',
    specs: [
      { label: 'Body',        value: 'Steel construction' },
      { label: 'Wheels',      value: 'Cast iron' },
      { label: 'Gauge',       value: '1435 mm standard' },
      { label: 'Traction',    value: 'Steam / Diesel' },
    ],
    description:
      'This locomotive represents the backbone of the Gafsa railway network. ' +
      'Built for heavy phosphate transport across the Tunisian hinterland, it ' +
      'operates on the standard 1435 mm gauge track that connects the mining ' +
      'zones to the coastal ports.',
  },
  rails: {
    tag:         'Infrastructure',
    title:       'Steel Rail Track',
    specs: [
      { label: 'Profile',     value: '60 kg/m UIC rail' },
      { label: 'Gauge',       value: '1435 mm standard' },
      { label: 'Welding',     value: 'Continuous welded' },
      { label: 'Material',    value: 'Grade 900A steel' },
      { label: 'Condition',   value: 'Good — 88 %' },
      { label: 'Wear level',  value: '12 % / limit 35 %' },
      { label: 'Last check',  value: 'March 2024' },
      { label: 'Next maint.', value: 'June 2024' },
    ],
    description:
      'Rail infrastructure engineered for sustained heavy-load phosphate ' +
      'transport. Continuous welded rails eliminate joint gaps, reducing ' +
      'vibration and wear. Current wear level is within safe operational ' +
      'limits; next scheduled maintenance in June 2024.',
  },
}

function HealthBar({ pct }) {
  const color = pct >= 75 ? '#4ade80' : pct >= 40 ? '#facc15' : '#f87171'
  return (
    <div style={{ marginTop: '24px' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '8px',
      }}>
        <span style={{ fontSize: '0.68rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(112,193,255,0.55)' }}>
          Rail health
        </span>
        <span style={{ fontSize: '0.9rem', fontWeight: 700, color }}>
          {pct} %
        </span>
      </div>
      <div style={{
        height: '6px', borderRadius: '3px',
        background: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          borderRadius: '3px',
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          boxShadow: `0 0 10px ${color}88`,
          transition: 'width 1s ease',
        }} />
      </div>
    </div>
  )
}

export default function InspectPage() {
  const { object } = useParams()
  const navigate   = useNavigate()
  const locoRef    = useRef(null)

  const data = DATA[object] ?? DATA.train

  // Panel always on the right
  const panelStyle = {
    position: 'absolute', top: 0, right: 0,
    height: '100%', width: '420px',
    display: 'flex', flexDirection: 'column', justifyContent: 'center',
    padding: '0 52px',
    zIndex: 5, boxSizing: 'border-box',
    fontFamily: 'system-ui, sans-serif',
    animation: 'ip-slide 0.55s cubic-bezier(0.16,1,0.3,1) both',
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>

      {/* ── 3D background — silk shader on both; model swaps per object ─── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <CanvasWrapper>
          {object === 'rails' ? <RailsInspectModel /> : <AccueilScene />}
          <SilkParticles locomotiveRef={locoRef} />
        </CanvasWrapper>
      </div>

      {/* ── Gradient overlay — dark on the right where the panel sits ────── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'linear-gradient(260deg, rgba(4,9,26,0.82) 0%, rgba(4,9,26,0.35) 55%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* ── Back button — top-left ─────────────────────────────────────────── */}
      <button
        onClick={() => navigate('/')}
        style={{
          position: 'absolute', top: '28px', left: '28px', zIndex: 10,
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'rgba(4,9,26,0.7)',
          border: '1px solid rgba(112,193,255,0.25)',
          borderRadius: '24px', padding: '8px 18px',
          color: 'rgba(112,193,255,0.8)',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '0.75rem', letterSpacing: '0.12em',
          cursor: 'pointer', backdropFilter: 'blur(10px)',
          transition: 'border-color 0.2s, color 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(112,193,255,0.7)'; e.currentTarget.style.color = '#70c1ff' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(112,193,255,0.25)'; e.currentTarget.style.color = 'rgba(112,193,255,0.8)' }}
      >
        ← Back to scene
      </button>

      {/* ── Info panel ─────────────────────────────────────────────────────── */}
      <div style={panelStyle}>

        <p style={{
          margin: '0 0 8px',
          fontSize: '0.65rem', letterSpacing: '0.26em', textTransform: 'uppercase',
          color: 'rgba(112,193,255,0.55)',
        }}>
          {data.tag}
        </p>

        <h1 style={{
          margin: '0 0 20px',
          fontSize: '2rem', fontWeight: 800,
          color: '#e8f4ff', lineHeight: 1.1, letterSpacing: '-0.02em',
        }}>
          {data.title}
        </h1>

        <div style={{
          width: '44px', height: '3px',
          background: 'linear-gradient(90deg,#70c1ff,#3a7bd5)',
          borderRadius: '2px', marginBottom: '24px',
        }} />

        {/* Spec rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
          {data.specs.map(({ label, value }) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '9px 14px',
              background: 'rgba(112,193,255,0.06)',
              border: '1px solid rgba(112,193,255,0.1)',
              borderRadius: '8px',
            }}>
              <span style={{ fontSize: '0.73rem', color: 'rgba(112,193,255,0.55)', letterSpacing: '0.08em' }}>
                {label}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#d0e8ff', fontWeight: 600 }}>
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Health bar — rails only */}
        {object === 'rails' && <HealthBar pct={88} />}

        <p style={{
          margin: '20px 0 0',
          fontSize: '0.86rem', lineHeight: 1.8,
          color: 'rgba(180,210,255,0.62)',
        }}>
          {data.description}
        </p>
      </div>

      <style>{`
        @keyframes ip-slide {
          from { opacity:0; transform:translateX(28px); }
          to   { opacity:1; transform:translateX(0);    }
        }
      `}</style>
    </div>
  )
}
