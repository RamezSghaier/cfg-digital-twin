import { useRef, useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import CanvasWrapper from '../components/layout/CanvasWrapper'
import AccueilScene from '../components/three/AccueilScene'
import RailsInspectModel from '../components/three/RailsInspectModel'
import SilkParticles from '../components/three/SilkParticles'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api'

/* ── Static data for train / bibloc (no API equivalent) ── */
const STATIC = {
  train: {
    tag: 'Locomotive',
    title: 'Locomotive CFG',
    specs: [
      { label: 'Construction',  value: 'Acier soudé' },
      { label: 'Écartement',    value: '1435 mm standard' },
      { label: 'Traction',      value: 'Diesel' },
      { label: 'Charge utile',  value: 'Phosphate — 80 t/essieu' },
    ],
    health: null,
    description:
      'Locomotive principale du réseau ferroviaire de Gafsa. Conçue pour le transport lourd de phosphate à travers le territoire tunisien, elle opère sur la voie standard 1435 mm reliant les zones minières aux ports côtiers.',
  },
  voie_bibloc: {
    tag: 'Infrastructure',
    title: 'Traverse Béton Bibloc',
    specs: [
      { label: 'Type',         value: 'Béton bibloc précontraint' },
      { label: 'Écartement',   value: '1435 mm standard' },
      { label: 'Espacement',   value: '600 mm entre traverses' },
      { label: 'Matériau',     value: 'Béton B50 + acier HP' },
    ],
    health: 85,
    description:
      'Traverses en béton bibloc précontraint offrant une stabilité géométrique accrue sur les sections à forte charge phosphatière. Le doublement des blocs béton réduit les déformations latérales et prolonge la durée de vie en milieu aride.',
  },
}

/* ── Health bar ── */
function HealthBar({ pct, label = 'SANTÉ DES RAILS' }) {
  const color = pct >= 75 ? '#4ade80' : pct >= 40 ? '#facc15' : '#f87171'
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
        <span style={{ fontSize: '0.65rem', letterSpacing: '0.18em', color: 'rgba(112,193,255,0.5)' }}>{label}</span>
        <span style={{ fontSize: '0.9rem', fontWeight: 700, color }}>{pct} %</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 3,
          background: `linear-gradient(90deg,${color},${color}cc)`,
          boxShadow: `0 0 10px ${color}88`, transition: 'width 1s ease',
        }} />
      </div>
    </div>
  )
}

/* ── Spec row ── */
function SpecRow({ label, value, alert }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '9px 14px',
      background: alert ? 'rgba(248,113,113,0.07)' : 'rgba(112,193,255,0.06)',
      border: `1px solid ${alert ? 'rgba(248,113,113,0.25)' : 'rgba(112,193,255,0.1)'}`,
      borderRadius: 8,
    }}>
      <span style={{ fontSize: '0.7rem', color: 'rgba(112,193,255,0.5)', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: '0.8rem', color: alert ? '#f87171' : '#d0e8ff', fontWeight: 600 }}>{value}</span>
    </div>
  )
}

/* ── Segment card (rails view) ── */
function SegmentCard({ seg, selected, onClick }) {
  const statusColor = seg.status === 'CRITIQUE' || seg.status === 'ÉLEVÉ' ? '#f87171'
    : seg.status === 'MODÉRÉ' ? '#facc15' : '#4ade80'
  const isAlert = seg.statut === 'ALERTE'

  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
        background: selected ? 'rgba(112,193,255,0.1)' : 'rgba(112,193,255,0.04)',
        border: `1px solid ${selected ? 'rgba(112,193,255,0.35)' : 'rgba(112,193,255,0.1)'}`,
        transition: 'all 0.15s',
        borderLeft: `3px solid ${statusColor}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: '#e8f4ff', fontWeight: 600 }}>{seg.segment_id}</span>
        <span style={{
          fontSize: '0.5rem', padding: '2px 8px', borderRadius: 20, letterSpacing: '0.1em',
          background: statusColor + '18', color: statusColor, fontFamily: 'monospace',
        }}>{seg.status}</span>
      </div>
      <div style={{ fontSize: '0.62rem', color: 'rgba(112,193,255,0.5)' }}>
        R={seg.rayon_m}m · {seg.developpement_m}m · {seg.health}% santé
      </div>
    </div>
  )
}

/* ── Admin create modal ── */
function CreateSegmentModal({ user, onSave, onClose }) {
  const [form, setForm] = useState({
    segment_id: '', nom_ligne: '', pk_debut: '', pk_fin: '',
    rayon_m: '', developpement_m: '', devers_mm: '', gare_proche: '', statut: 'NORMAL',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.segment_id || !form.nom_ligne || !form.rayon_m || !form.developpement_m) {
      setError('Les champs ID, Ligne, Rayon et Développement sont obligatoires.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const token = await user.getIdToken()
      const body = {
        segment_id:      form.segment_id.trim().toUpperCase(),
        nom_ligne:       form.nom_ligne.trim(),
        pk_debut:        parseFloat(form.pk_debut) || 0,
        pk_fin:          parseFloat(form.pk_fin)   || 0,
        rayon_m:         parseFloat(form.rayon_m),
        developpement_m: parseFloat(form.developpement_m),
        devers_mm:       form.devers_mm !== '' ? parseFloat(form.devers_mm) : null,
        gare_proche:     form.gare_proche.trim() || null,
        statut:          form.statut,
      }
      const res = await fetch(`${API_BASE}/segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || `Erreur ${res.status}`) }
      onSave()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const inp = {
    width: '100%', padding: '8px 10px',
    background: 'rgba(112,193,255,0.05)', border: '1px solid rgba(112,193,255,0.18)',
    borderRadius: 8, color: '#d0e8ff', fontFamily: 'monospace', fontSize: '0.75rem',
    outline: 'none', boxSizing: 'border-box',
  }
  const lbl = { fontSize: '0.52rem', letterSpacing: '0.28em', color: 'rgba(112,193,255,0.45)', marginBottom: 5, display: 'block' }
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }} style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ background: 'rgba(4,9,26,0.95)', backdropFilter: 'blur(24px)', border: '1px solid rgba(112,193,255,0.15)', borderRadius: 16, padding: 28, width: 400, fontFamily: 'monospace', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontSize: '0.48rem', letterSpacing: '0.35em', color: 'rgba(112,193,255,0.38)', marginBottom: 4 }}>ADMINISTRATION</div>
        <div style={{ fontSize: '0.9rem', color: '#e8f4ff', letterSpacing: '0.1em', marginBottom: 20 }}>NOUVEAU SEGMENT</div>
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>ID SEGMENT *</label>
              <input placeholder="ex: B-07" value={form.segment_id} onChange={e => set('segment_id', e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>STATUT</label>
              <select value={form.statut} onChange={e => set('statut', e.target.value)} style={inp}>
                <option value="NORMAL">NORMAL</option>
                <option value="ALERTE">ALERTE</option>
              </select>
            </div>
          </div>
          <div>
            <label style={lbl}>NOM DE LIGNE *</label>
            <input placeholder="ex: Redeyef — M'dhilla" value={form.nom_ligne} onChange={e => set('nom_ligne', e.target.value)} style={inp} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>PK DÉBUT (km)</label>
              <input type="number" step="0.001" placeholder="0.000" value={form.pk_debut} onChange={e => set('pk_debut', e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>PK FIN (km)</label>
              <input type="number" step="0.001" placeholder="0.000" value={form.pk_fin} onChange={e => set('pk_fin', e.target.value)} style={inp} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>RAYON COURBURE (m) *</label>
              <input type="number" step="0.1" placeholder="310" value={form.rayon_m} onChange={e => set('rayon_m', e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>DÉVELOPPEMENT (m) *</label>
              <input type="number" step="0.1" placeholder="450" value={form.developpement_m} onChange={e => set('developpement_m', e.target.value)} style={inp} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>DÉVERS (mm)</label>
              <input type="number" step="0.1" value={form.devers_mm} onChange={e => set('devers_mm', e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>GARE PROCHE</label>
              <input placeholder="ex: Redeyef" value={form.gare_proche} onChange={e => set('gare_proche', e.target.value)} style={inp} />
            </div>
          </div>
          {error && <div style={{ fontSize: '0.65rem', color: '#f87171', padding: '7px 10px', background: 'rgba(248,113,113,0.08)', borderRadius: 7 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="submit" disabled={saving} style={{ flex: 1, padding: '9px', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.35)', borderRadius: 9, color: '#4ade80', fontFamily: 'monospace', fontSize: '0.62rem', letterSpacing: '0.18em', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1 }}>
              {saving ? 'CRÉATION…' : 'CRÉER LE SEGMENT'}
            </button>
            <button type="button" onClick={onClose} style={{ padding: '9px 16px', background: 'none', border: '1px solid rgba(112,193,255,0.15)', borderRadius: 9, color: 'rgba(112,193,255,0.45)', fontFamily: 'monospace', fontSize: '0.62rem', cursor: 'pointer' }}>
              ANNULER
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Admin edit modal ── */
function EditSegmentModal({ seg, user, onSave, onClose }) {
  const [form,    setForm]    = useState({ rayon_m: seg.rayon_m ?? '', devers_mm: seg.devers_mm ?? '', statut: seg.statut || 'NORMAL' })
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const token = await user.getIdToken()
      const body  = {
        rayon_m:   form.rayon_m   !== '' ? parseFloat(form.rayon_m)   : undefined,
        devers_mm: form.devers_mm !== '' ? parseFloat(form.devers_mm) : undefined,
        statut:    form.statut,
      }
      const res = await fetch(`${API_BASE}/segments/${seg.segment_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || `Erreur ${res.status}`) }
      onSave()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const inp = {
    width: '100%', padding: '8px 10px',
    background: 'rgba(112,193,255,0.05)', border: '1px solid rgba(112,193,255,0.18)',
    borderRadius: 8, color: '#d0e8ff', fontFamily: 'monospace', fontSize: '0.75rem',
    outline: 'none', boxSizing: 'border-box',
  }
  const lbl = { fontSize: '0.52rem', letterSpacing: '0.28em', color: 'rgba(112,193,255,0.45)', marginBottom: 5, display: 'block' }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }} style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ background: 'rgba(4,9,26,0.95)', backdropFilter: 'blur(24px)', border: '1px solid rgba(112,193,255,0.15)', borderRadius: 16, padding: 28, width: 360, fontFamily: 'monospace' }}>
        <div style={{ fontSize: '0.48rem', letterSpacing: '0.35em', color: 'rgba(112,193,255,0.38)', marginBottom: 4 }}>ADMINISTRATION</div>
        <div style={{ fontSize: '0.9rem', color: '#e8f4ff', letterSpacing: '0.1em', marginBottom: 20 }}>MODIFIER — {seg.segment_id}</div>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={lbl}>RAYON DE COURBURE (m)</label>
            <input type="number" step="0.1" value={form.rayon_m} onChange={e => setForm(f => ({ ...f, rayon_m: e.target.value }))} style={inp} />
          </div>
          <div>
            <label style={lbl}>DÉVERS (mm)</label>
            <input type="number" step="0.1" value={form.devers_mm} onChange={e => setForm(f => ({ ...f, devers_mm: e.target.value }))} style={inp} />
          </div>
          <div>
            <label style={lbl}>STATUT</label>
            <select value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))} style={inp}>
              <option value="NORMAL">NORMAL</option>
              <option value="ALERTE">ALERTE</option>
            </select>
          </div>
          {error && <div style={{ fontSize: '0.65rem', color: '#f87171', padding: '7px 10px', background: 'rgba(248,113,113,0.08)', borderRadius: 7 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving} style={{ flex: 1, padding: '9px', background: 'rgba(112,193,255,0.12)', border: '1px solid rgba(112,193,255,0.35)', borderRadius: 9, color: '#70c1ff', fontFamily: 'monospace', fontSize: '0.62rem', letterSpacing: '0.18em', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1 }}>
              {saving ? 'SAUVEGARDE…' : 'ENREGISTRER'}
            </button>
            <button type="button" onClick={onClose} style={{ padding: '9px 16px', background: 'none', border: '1px solid rgba(112,193,255,0.15)', borderRadius: 9, color: 'rgba(112,193,255,0.45)', fontFamily: 'monospace', fontSize: '0.62rem', cursor: 'pointer' }}>
              ANNULER
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function InspectPage() {
  const { object } = useParams()
  const navigate   = useNavigate()
  const { user, role } = useAuth()
  const { isDark } = useTheme()
  const locoRef    = useRef(null)
  const isAdmin    = role === 'admin'

  const [segments,       setSegments]       = useState([])
  const [selected,       setSelected]       = useState(null)
  const [loading,        setLoading]        = useState(false)
  const [editTarget,     setEditTarget]     = useState(null)
  const [createOpen,     setCreateOpen]     = useState(false)
  const [deleteConfirm,  setDeleteConfirm]  = useState(false)
  const [deleteError,    setDeleteError]    = useState('')
  const [deleting,       setDeleting]       = useState(false)

  const isRails = object === 'rails'

  function fetchSegments() {
    if (!isRails || !user) return
    setLoading(true)
    user.getIdToken().then(token =>
      fetch(`${API_BASE}/segments`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d?.segments) {
            setSegments(d.segments)
            setSelected(prev => d.segments.find(s => s.segment_id === prev?.segment_id) ?? d.segments[0])
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    )
  }

  /* Fetch segments when on rails view */
  useEffect(() => { fetchSegments() }, [isRails, user]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Reset delete state when selection changes */
  useEffect(() => { setDeleteConfirm(false); setDeleteError('') }, [selected?.segment_id])

  async function handleDelete(seg) {
    setDeleting(true)
    setDeleteError('')
    try {
      const token = await user.getIdToken()
      const res = await fetch(`${API_BASE}/segments/${seg.segment_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.detail || `Erreur ${res.status}`)
      }
      setDeleteConfirm(false)
      setSelected(null)
      fetchSegments()
    } catch (err) {
      setDeleteError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const staticData = STATIC[object] ?? STATIC.train
  const seg = selected

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>

      {/* ── 3D background ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <CanvasWrapper>
          {object === 'rails' || object === 'voie_bibloc'
            ? <RailsInspectModel modelPath={object === 'voie_bibloc' ? '/models/voie_bibloc.glb' : '/models/rails_inspect.glb'} />
            : <AccueilScene />}
          <SilkParticles locomotiveRef={locoRef} />
        </CanvasWrapper>
      </div>

      {/* ── Gradient overlay ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: 'linear-gradient(260deg,rgba(4,9,26,0.88) 0%,rgba(4,9,26,0.4) 55%,transparent 100%)',
      }} />

      {/* ── Back button ── */}
      <button
        onClick={() => navigate('/')}
        style={{
          position: 'absolute', top: 28, left: 28, zIndex: 10,
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(4,9,26,0.7)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(112,193,255,0.25)', borderRadius: 24,
          padding: '8px 18px', color: 'rgba(112,193,255,0.8)',
          fontFamily: 'monospace', fontSize: '0.7rem', letterSpacing: '0.12em',
          cursor: 'pointer', transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(112,193,255,0.6)'; e.currentTarget.style.color = '#70c1ff' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(112,193,255,0.25)'; e.currentTarget.style.color = 'rgba(112,193,255,0.8)' }}
      >
        ← Retour à la scène
      </button>

      {/* ══════ RAILS VIEW — segment list + detail ══════ */}
      {isRails ? (
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: 460,
          display: 'flex', flexDirection: 'column',
          padding: '28px 28px 28px 0', zIndex: 5, boxSizing: 'border-box',
          animation: 'ip-slide 0.55s cubic-bezier(0.16,1,0.3,1) both',
          gap: 14,
        }}>
          {/* Header */}
          <div style={{ padding: '0 0 0 4px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.5rem', letterSpacing: '0.38em', color: 'rgba(112,193,255,0.4)', marginBottom: 4, fontFamily: 'monospace' }}>INFRASTRUCTURE</div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#e8f4ff', letterSpacing: '-0.01em' }}>
                Segments de Rail
              </h1>
              <div style={{ width: 36, height: 3, background: 'linear-gradient(90deg,#70c1ff,#3a7bd5)', borderRadius: 2, marginTop: 10 }} />
            </div>
            {isAdmin && (
              <button
                onClick={() => setCreateOpen(true)}
                style={{
                  marginTop: 6, display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 14px', borderRadius: 9,
                  background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)',
                  color: '#4ade80', fontFamily: 'monospace', fontSize: '0.58rem',
                  letterSpacing: '0.15em', cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(74,222,128,0.18)'; e.currentTarget.style.borderColor = 'rgba(74,222,128,0.5)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(74,222,128,0.1)';  e.currentTarget.style.borderColor = 'rgba(74,222,128,0.3)' }}
              >
                + NOUVEAU
              </button>
            )}
          </div>

          {/* Segment list */}
          <div style={{
            flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 7,
            paddingRight: 4,
            scrollbarWidth: 'thin', scrollbarColor: 'rgba(112,193,255,0.12) transparent',
          }}>
            {loading && (
              <div style={{ color: 'rgba(112,193,255,0.4)', fontSize: '0.7rem', fontFamily: 'monospace', padding: '20px 0', textAlign: 'center', letterSpacing: '0.2em' }}>
                CHARGEMENT…
              </div>
            )}
            {segments.map(s => (
              <SegmentCard key={s.segment_id} seg={s} selected={selected?.segment_id === s.segment_id} onClick={() => setSelected(s)} />
            ))}
          </div>

          {/* Selected segment detail */}
          {seg && (
            <div style={{
              background: 'rgba(4,9,26,0.85)', backdropFilter: 'blur(20px)',
              border: '1px solid rgba(112,193,255,0.12)', borderRadius: 14,
              padding: '16px 18px',
              animation: 'ip-slide 0.3s ease both',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: '0.5rem', letterSpacing: '0.3em', color: 'rgba(112,193,255,0.38)', fontFamily: 'monospace' }}>
                  DÉTAIL — {seg.segment_id}
                </div>
                {isAdmin && (
                  deleteConfirm ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {deleteError && <span style={{ fontSize: '0.45rem', color: '#f87171', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deleteError}</span>}
                      <button
                        onClick={() => handleDelete(seg)}
                        disabled={deleting}
                        style={{ padding: '4px 10px', borderRadius: 7, background: 'rgba(248,113,113,0.14)', border: '1px solid rgba(248,113,113,0.45)', color: '#f87171', fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.15em', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.5 : 1 }}
                      >
                        {deleting ? '…' : 'CONFIRMER'}
                      </button>
                      <button
                        onClick={() => { setDeleteConfirm(false); setDeleteError('') }}
                        style={{ padding: '4px 10px', borderRadius: 7, background: 'none', border: '1px solid rgba(112,193,255,0.15)', color: 'rgba(112,193,255,0.45)', fontFamily: 'monospace', fontSize: '0.5rem', cursor: 'pointer' }}
                      >
                        ANNULER
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button
                        onClick={() => setEditTarget(seg)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 7, background: 'rgba(112,193,255,0.08)', border: '1px solid rgba(112,193,255,0.2)', color: '#70c1ff', fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.15em', cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(112,193,255,0.16)'; e.currentTarget.style.borderColor = 'rgba(112,193,255,0.4)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(112,193,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(112,193,255,0.2)' }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        MODIFIER
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 7, background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.18)', color: 'rgba(248,113,113,0.7)', fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.15em', cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.14)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.4)'; e.currentTarget.style.color = '#f87171' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.07)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.18)'; e.currentTarget.style.color = 'rgba(248,113,113,0.7)' }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                        SUPPRIMER
                      </button>
                    </div>
                  )
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <SpecRow label="Ligne"             value={seg.nom_ligne || seg.ligne}         />
                <SpecRow label="PK"                value={`${seg.pk_debut} → ${seg.pk_fin}`} />
                <SpecRow label="Rayon de courbure" value={`${seg.rayon_m} m`}                alert={seg.rayon_m < 300} />
                <SpecRow label="Dévers"            value={seg.devers_mm != null ? `${seg.devers_mm} mm` : '—'} />
                <SpecRow label="Développement"     value={`${seg.developpement_m} m`}         />
                <SpecRow label="Gare proche"       value={seg.gare_proche || '—'}             />
                <SpecRow label="Niveau de risque"  value={seg.niveau_risque || seg.status}   alert={['CRITIQUE','ÉLEVÉ'].includes(seg.status)} />
                <SpecRow label="Statut"            value={seg.statut || '—'}                 alert={seg.statut === 'ALERTE'} />
                {seg.last_update && <SpecRow label="Dernière MàJ" value={new Date(seg.last_update).toLocaleDateString('fr-FR')} />}
              </div>
              <HealthBar pct={seg.health ?? 80} />
            </div>
          )}

          {/* Admin create modal */}
          {createOpen && (
            <CreateSegmentModal
              user={user}
              onSave={() => { setCreateOpen(false); fetchSegments() }}
              onClose={() => setCreateOpen(false)}
            />
          )}

          {/* Admin edit modal */}
          {editTarget && (
            <EditSegmentModal
              seg={editTarget}
              user={user}
              onSave={() => { setEditTarget(null); fetchSegments() }}
              onClose={() => setEditTarget(null)}
            />
          )}
        </div>
      ) : (
        /* ══════ TRAIN / BIBLOC VIEW — static panel ══════ */
        <div style={{
          position: 'absolute', top: 0, right: 0, height: '100%', width: 420,
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '0 52px', zIndex: 5, boxSizing: 'border-box',
          fontFamily: 'system-ui,sans-serif',
          animation: 'ip-slide 0.55s cubic-bezier(0.16,1,0.3,1) both',
        }}>
          <p style={{ margin: '0 0 8px', fontSize: '0.65rem', letterSpacing: '0.26em', color: 'rgba(112,193,255,0.55)' }}>
            {staticData.tag}
          </p>
          <h1 style={{ margin: '0 0 20px', fontSize: '2rem', fontWeight: 800, color: '#e8f4ff', lineHeight: 1.1 }}>
            {staticData.title}
          </h1>
          <div style={{ width: 44, height: 3, background: 'linear-gradient(90deg,#70c1ff,#3a7bd5)', borderRadius: 2, marginBottom: 24 }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {staticData.specs.map(({ label, value }) => (
              <SpecRow key={label} label={label} value={value} />
            ))}
          </div>

          {staticData.health != null && (
            <HealthBar
              pct={staticData.health}
              label={object === 'voie_bibloc' ? 'ÉTAT DE LA VOIE' : 'ÉTAT GÉNÉRAL'}
            />
          )}

          <p style={{ margin: '20px 0 0', fontSize: '0.86rem', lineHeight: 1.8, color: 'rgba(180,210,255,0.62)' }}>
            {staticData.description}
          </p>
        </div>
      )}

      <style>{`
        @keyframes ip-slide {
          from { opacity:0; transform:translateX(28px); }
          to   { opacity:1; transform:translateX(0);    }
        }
        ::-webkit-scrollbar       { width:3px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(112,193,255,0.12); border-radius:2px; }
      `}</style>
    </div>
  )
}
