import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api'

export default function PendingApprovalScreen() {
  const { refreshRole } = useAuth()
  const [checking, setChecking] = useState(false)
  const [downgrading, setDowngrading] = useState(false)
  const [checked, setChecked] = useState(false)

  async function handleRefresh() {
    setChecking(true)
    setChecked(false)
    await refreshRole()
    setChecked(true)
    setChecking(false)
  }

  async function handleContinueAsUser() {
    setDowngrading(true)
    try {
      const token = await auth.currentUser.getIdToken()
      await fetch(`${API_BASE}/auth/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ role: 'user' }),
      })
      await refreshRole()
    } catch {
      setDowngrading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#04091a', fontFamily: 'monospace',
    }}>
      <style>{`
        @keyframes pendingPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(167,139,250,0.3); }
          50%      { box-shadow: 0 0 0 14px rgba(167,139,250,0); }
        }
        @keyframes scanLine {
          0%   { transform: translateY(-100%); opacity: 0.3; }
          100% { transform: translateY(600%);  opacity: 0;   }
        }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>

      <div style={{
        position: 'relative', overflow: 'hidden',
        backdropFilter: 'blur(48px) saturate(180%) brightness(1.15)',
        WebkitBackdropFilter: 'blur(48px) saturate(180%) brightness(1.15)',
        background: 'rgba(220,235,255,0.10)',
        borderRadius: '28px', padding: '3.5rem',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem',
        width: 460, textAlign: 'center',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.07) 0%, transparent 50%)',
          animation: 'scanLine 7s ease-in-out 1s infinite',
        }} />

        {/* Icon */}
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: 'rgba(167,139,250,0.12)',
          border: '1px solid rgba(167,139,250,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'pendingPulse 2.5s ease infinite',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
        </div>

        {/* Title */}
        <div>
          <div style={{ fontSize: '0.55rem', letterSpacing: '0.4em', color: 'rgba(167,139,250,0.6)', marginBottom: '0.8rem' }}>
            ACCÈS ADMINISTRATEUR
          </div>
          <h2 style={{ color: '#ffffff', fontSize: '1.6rem', letterSpacing: '0.2em', textShadow: '0 0 20px rgba(167,139,250,0.5)', margin: 0 }}>
            EN ATTENTE D'APPROBATION
          </h2>
        </div>

        {/* Description */}
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', lineHeight: 1.8, letterSpacing: '0.06em', margin: 0, maxWidth: 340 }}>
          Votre demande d'accès administrateur a été transmise aux administrateurs existants.
          Vous recevrez l'accès dès qu'un administrateur approuve votre demande.
        </p>

        {/* Status */}
        {checked && (
          <div style={{
            padding: '0.6rem 1.2rem',
            background: 'rgba(251,191,36,0.08)',
            border: '1px solid rgba(251,191,36,0.25)',
            borderRadius: 20,
            fontSize: '0.56rem', letterSpacing: '0.2em', color: '#fbbf24',
          }}>
            ◷ TOUJOURS EN ATTENTE — RÉESSAYEZ PLUS TARD
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
          <button
            onClick={handleRefresh}
            disabled={checking}
            style={{
              width: '100%', padding: '1rem',
              background: 'rgba(167,139,250,0.15)',
              border: '1px solid rgba(167,139,250,0.45)',
              borderRadius: '14px', color: '#ffffff',
              fontFamily: 'monospace', fontSize: '0.82rem', letterSpacing: '0.25em',
              cursor: 'pointer', transition: 'all 0.2s', opacity: checking ? 0.5 : 1,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(167,139,250,0.28)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(167,139,250,0.15)' }}
          >
            <span style={{ display: 'inline-block', animation: checking ? 'spin 0.9s linear infinite' : 'none' }}>↻</span>
            {checking ? 'VÉRIFICATION…' : 'VÉRIFIER LE STATUT'}
          </button>

          <button
            onClick={handleContinueAsUser}
            disabled={downgrading}
            style={{
              width: '100%', padding: '1rem',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '14px', color: 'rgba(255,255,255,0.55)',
              fontFamily: 'monospace', fontSize: '0.78rem', letterSpacing: '0.2em',
              cursor: 'pointer', transition: 'all 0.2s', opacity: downgrading ? 0.5 : 1,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)' }}
          >
            {downgrading ? 'CHANGEMENT…' : 'CONTINUER COMME UTILISATEUR'}
          </button>

          <button
            onClick={() => signOut(auth)}
            style={{
              background: 'transparent', border: 'none',
              color: 'rgba(255,255,255,0.28)', fontFamily: 'monospace',
              fontSize: '0.62rem', letterSpacing: '0.2em',
              cursor: 'pointer', transition: 'color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#f87171' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.28)' }}
          >
            SE DÉCONNECTER
          </button>
        </div>
      </div>
    </div>
  )
}
