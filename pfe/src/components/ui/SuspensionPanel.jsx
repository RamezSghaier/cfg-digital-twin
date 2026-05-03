/**
 * SuspensionPanel — admin control panel to create/cancel service suspensions.
 * SuspensionBanner — user-facing notification banner when service is suspended.
 *
 * Usage:
 *   <SuspensionPanel user={user} onSuspensionChange={fetchSuspension} />
 *   <SuspensionBanner suspension={suspension} />
 */
import { useState } from 'react'

const API_BASE = 'http://localhost:8000/api'

const glass = {
  background: 'rgba(4, 9, 22, 0.92)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(112,193,255,0.12)',
  borderRadius: '12px',
  fontFamily: 'monospace',
  color: '#70c1ff',
}

/* ── Banner shown to ALL users when a suspension is active ─────────────────── */
export function SuspensionBanner({ suspension }) {
  if (!suspension) return null

  const end = new Date(suspension.end_date).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div style={{
      position: 'fixed', top: 0, left: '88px', right: 0, zIndex: 300,
      padding: '10px 20px',
      background: 'rgba(251,191,36,0.12)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(251,191,36,0.3)',
      display: 'flex', alignItems: 'center', gap: '12px',
      fontFamily: 'monospace', color: '#fbbf24',
    }}>
      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#fbbf24', flexShrink: 0, animation: 'dot 1.5s ease infinite' }} />
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: '0.62rem', letterSpacing: '0.2em', opacity: 0.7 }}>
          SUSPENSION DE SERVICE —{' '}
        </span>
        <span style={{ fontSize: '0.7rem' }}>{suspension.message}</span>
      </div>
      <div style={{ fontSize: '0.58rem', opacity: 0.5, flexShrink: 0 }}>
        Jusqu'au {end}
      </div>
    </div>
  )
}

/* ── Admin panel to create / cancel suspensions ─────────────────────────────── */
export function SuspensionPanel({ user, suspension, onSuspensionChange }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    segment_id: 'ALL',
    reason: 'TECHNIQUE',
    message: '',
    end_date: '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.message.trim() || !form.end_date) {
      setError('Veuillez remplir le message et la date de fin.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const token = await user.getIdToken()
      const res = await fetch(`${API_BASE}/suspension`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.detail || `Erreur ${res.status}`)
      }
      setForm({ segment_id: 'ALL', reason: 'TECHNIQUE', message: '', end_date: '' })
      onSuspensionChange()
      setOpen(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel() {
    if (!suspension) return
    setLoading(true)
    setError('')
    try {
      const token = await user.getIdToken()
      const res = await fetch(`${API_BASE}/suspension/${suspension._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Erreur lors de l\'annulation.')
      onSuspensionChange()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const labelStyle = { fontSize: '0.55rem', letterSpacing: '0.28em', opacity: 0.4, marginBottom: '5px' }
  const inputStyle = {
    width: '100%', padding: '7px 10px',
    background: 'rgba(112,193,255,0.05)',
    border: '1px solid rgba(112,193,255,0.15)',
    borderRadius: '8px',
    color: '#70c1ff', fontFamily: 'monospace', fontSize: '0.72rem',
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '7px 14px',
          background: suspension ? 'rgba(251,191,36,0.1)' : 'rgba(112,193,255,0.07)',
          border: `1px solid ${suspension ? 'rgba(251,191,36,0.35)' : 'rgba(112,193,255,0.2)'}`,
          borderRadius: '9px',
          color: suspension ? '#fbbf24' : '#70c1ff',
          fontFamily: 'monospace',
          fontSize: '0.6rem', letterSpacing: '0.18em',
          cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        {suspension ? '⚠ SUSPENSION ACTIVE' : 'SUSPENDRE SERVICE'}
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 400,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div style={{ ...glass, width: '100%', maxWidth: '440px', padding: '24px' }}>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.52rem', letterSpacing: '0.35em', opacity: 0.35, marginBottom: '4px' }}>
                ADMINISTRATION
              </div>
              <div style={{ fontSize: '0.9rem', letterSpacing: '0.15em' }}>
                GESTION DES SUSPENSIONS
              </div>
            </div>

            {/* Active suspension info */}
            {suspension && (
              <div style={{
                marginBottom: '18px', padding: '12px 14px',
                background: 'rgba(251,191,36,0.07)',
                border: '1px solid rgba(251,191,36,0.25)',
                borderRadius: '10px', color: '#fbbf24',
              }}>
                <div style={{ fontSize: '0.6rem', letterSpacing: '0.2em', opacity: 0.6, marginBottom: '5px' }}>
                  SUSPENSION EN COURS
                </div>
                <div style={{ fontSize: '0.72rem', marginBottom: '6px' }}>{suspension.message}</div>
                <div style={{ fontSize: '0.58rem', opacity: 0.5, marginBottom: '10px' }}>
                  Segment : {suspension.segment_id} · {suspension.reason} ·{' '}
                  Fin : {new Date(suspension.end_date).toLocaleString('fr-FR')}
                </div>
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  style={{
                    padding: '6px 14px',
                    background: 'rgba(248,113,113,0.1)',
                    border: '1px solid rgba(248,113,113,0.3)',
                    borderRadius: '7px',
                    color: '#f87171', fontFamily: 'monospace',
                    fontSize: '0.6rem', letterSpacing: '0.15em',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'ANNULATION…' : 'ANNULER LA SUSPENSION'}
                </button>
              </div>
            )}

            {/* Create form */}
            {!suspension && (
              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                <div>
                  <div style={labelStyle}>SEGMENT CONCERNÉ</div>
                  <select
                    value={form.segment_id}
                    onChange={e => set('segment_id', e.target.value)}
                    style={inputStyle}
                  >
                    <option value="ALL">Toute la ligne</option>
                    <option value="A-01">A-01 — Gafsa — Moularès</option>
                    <option value="A-02">A-02 — Moularès — Redeyef</option>
                    <option value="B-01">B-01 — Redeyef — M'dhilla</option>
                    <option value="B-02">B-02 — M'dhilla — Metlaoui</option>
                    <option value="C-01">C-01 — Metlaoui — Om Larayes</option>
                  </select>
                </div>

                <div>
                  <div style={labelStyle}>MOTIF</div>
                  <select
                    value={form.reason}
                    onChange={e => set('reason', e.target.value)}
                    style={inputStyle}
                  >
                    <option value="TECHNIQUE">Technique</option>
                    <option value="METEOROLOGIQUE">Météorologique</option>
                  </select>
                </div>

                <div>
                  <div style={labelStyle}>MESSAGE AUX OPÉRATEURS</div>
                  <textarea
                    rows={3}
                    value={form.message}
                    onChange={e => set('message', e.target.value)}
                    placeholder="Ex : Travaux de maintenance sur B-01, reprise prévue à 18h."
                    style={{ ...inputStyle, resize: 'none', lineHeight: '1.5' }}
                  />
                </div>

                <div>
                  <div style={labelStyle}>DATE DE FIN</div>
                  <input
                    type="datetime-local"
                    value={form.end_date}
                    onChange={e => set('end_date', e.target.value)}
                    style={inputStyle}
                  />
                </div>

                {error && (
                  <div style={{ fontSize: '0.65rem', color: '#f87171', padding: '8px 10px', background: 'rgba(248,113,113,0.08)', borderRadius: '7px' }}>
                    {error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      flex: 1, padding: '9px',
                      background: 'rgba(251,191,36,0.1)',
                      border: '1px solid rgba(251,191,36,0.35)',
                      borderRadius: '9px', color: '#fbbf24',
                      fontFamily: 'monospace', fontSize: '0.62rem',
                      letterSpacing: '0.18em', cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {loading ? 'ENVOI…' : 'CONFIRMER SUSPENSION'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    style={{
                      padding: '9px 16px',
                      background: 'none',
                      border: '1px solid rgba(112,193,255,0.15)',
                      borderRadius: '9px', color: 'rgba(112,193,255,0.45)',
                      fontFamily: 'monospace', fontSize: '0.62rem',
                      cursor: 'pointer',
                    }}
                  >
                    ANNULER
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
