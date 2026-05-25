import { useState } from 'react'
import { auth } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'

const API_BASE = 'http://localhost:8000/api'

export default function RoleSetupScreen() {
  const { refreshRole, setNeedsRoleSetup } = useAuth()
  const [loading, setLoading] = useState(false)

  async function selectRole(chosenRole) {
    setLoading(true)
    try {
      const actualRole = chosenRole === 'admin' ? 'pending_admin' : 'user'
      const token = await auth.currentUser.getIdToken()
      await fetch(`${API_BASE}/auth/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ role: actualRole }),
      })
      sessionStorage.removeItem('pendingRoleSetup')
      await refreshRole()
      setNeedsRoleSetup(false)
    } catch {
      setLoading(false)
    }
  }

  const roles = [
    {
      key: 'user',
      icon: '◇',
      label: 'UTILISATEUR',
      desc: 'Consultation — simulation 3D, météo, inspection rails',
      color: '#70c1ff',
    },
    {
      key: 'admin',
      icon: '◈',
      label: 'ADMINISTRATEUR',
      desc: 'Accès complet — nécessite l\'approbation d\'un administrateur existant',
      color: '#a78bfa',
    },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#04091a',
      fontFamily: 'monospace',
    }}>
      <style>{`
        @keyframes scanLine {
          0%   { transform: translateY(-100%); opacity: 0.3; }
          100% { transform: translateY(600%);  opacity: 0;   }
        }
      `}</style>

      <div style={{
        position: 'relative', overflow: 'hidden',
        backdropFilter: 'blur(48px) saturate(180%) brightness(1.15)',
        WebkitBackdropFilter: 'blur(48px) saturate(180%) brightness(1.15)',
        background: 'rgba(220,235,255,0.10)',
        borderRadius: '28px', padding: '3.5rem',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2.5rem',
        maxWidth: 600,
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.07) 0%, transparent 50%)',
          animation: 'scanLine 7s ease-in-out 1s infinite',
        }} />

        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.6rem', letterSpacing: '0.45em', marginBottom: '1rem' }}>
            BIENVENUE — PREMIER ACCÈS
          </div>
          <div style={{ width: '40px', height: '1px', background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.5), transparent)', margin: '0 auto 1.2rem' }} />
          <h2 style={{ color: '#ffffff', fontSize: '1.8rem', letterSpacing: '0.25em', textShadow: '0 0 6px #fff, 0 0 20px #70c1ff, 0 0 50px #70c1ff', margin: 0 }}>
            CHOISIR UN RÔLE
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', opacity: loading ? 0.5 : 1, pointerEvents: loading ? 'none' : 'all' }}>
          {roles.map(({ key, icon, label, desc, color }) => (
            <button
              key={key}
              onClick={() => selectRole(key)}
              style={{
                width: '220px', padding: '2.2rem 1.8rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.22)',
                borderRadius: '20px', color: '#ffffff',
                fontFamily: 'monospace', cursor: 'pointer',
                textAlign: 'center', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '1rem',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = `${color}18`
                e.currentTarget.style.borderColor = `${color}99`
                e.currentTarget.style.boxShadow = `0 0 36px ${color}22`
                e.currentTarget.style.transform = 'translateY(-3px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div style={{ fontSize: '2.4rem', textShadow: `0 0 20px ${color}, 0 0 40px ${color}` }}>{icon}</div>
              <div style={{ fontSize: '0.82rem', letterSpacing: '0.28em', textShadow: `0 0 8px ${color}` }}>{label}</div>
              <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em', lineHeight: 1.7 }}>{desc}</div>
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ fontSize: '0.55rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.4)' }}>
            CONFIGURATION EN COURS…
          </div>
        )}
      </div>
    </div>
  )
}
