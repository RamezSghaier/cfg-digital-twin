import { NavLink } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebase/config'

/* ─── Icons ────────────────────────────────────────────────── */
const IconHome = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
)
const IconIA = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <line x1="9" y1="10" x2="9" y2="10" strokeWidth="2.5" />
    <line x1="15" y1="10" x2="15" y2="10" strokeWidth="2.5" />
  </svg>
)
const IconJournal = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="3"  y1="9"  x2="21" y2="9"  />
    <line x1="8"  y1="2"  x2="8"  y2="6"  />
    <line x1="16" y1="2"  x2="16" y2="6"  />
    <line x1="7"  y1="14" x2="17" y2="14" />
    <line x1="7"  y1="18" x2="13" y2="18" />
  </svg>
)
const IconInfo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8"  x2="12" y2="8.5"  strokeWidth="2.5" />
    <line x1="12" y1="12" x2="12" y2="17"   />
  </svg>
)
const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)
const IconLogout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

/* ─── Nav items ─────────────────────────────────────────────── */
const NAV_ITEMS = [
  { to: '/',        icon: <IconHome />,    label: 'Accueil',  end: true  },
  { to: '/ia',      icon: <IconIA />,      label: 'IA',       end: false },
  { to: '/journal', icon: <IconJournal />, label: 'Journal',  end: false },
  { to: '/apropos', icon: <IconInfo />,    label: 'À propos', end: false },
]

/* ─── Icon button ───────────────────────────────────────────── */
function NavBtn({ to, icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      title={label}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: isActive ? '#2ba1fb' : 'transparent',
        color: isActive ? '#fff' : 'rgba(113, 157, 168, 0.8)',
        textDecoration: 'none',
        transition: 'all 0.18s ease',
        flexShrink: 0,
        boxShadow: isActive ? '0 0 14px rgba(39, 245, 234, 0.8)' : 'none',
      })}
      onMouseEnter={e => {
        if (!e.currentTarget.style.background.includes('rgb(255, 107')) {
          e.currentTarget.style.color = 'rgba(255,255,255,0.8)'
        }
      }}
      onMouseLeave={e => {
        if (!e.currentTarget.style.background.includes('rgb(255, 107')) {
          e.currentTarget.style.color = 'rgba(255,255,255,0.4)'
        }
      }}
    >
      {icon}
    </NavLink>
  )
}

export default function Sidebar() {
  async function handleLogout() {
    await signOut(auth)
  }

  return (
    <nav
      style={{
        position: 'fixed',
        left: 24,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '12px 8px',
        background: 'rgba(30, 30, 30, 0.82)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: 999,
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
      }}
    >
      {/* Navigation icons */}
      {NAV_ITEMS.map(item => (
        <NavBtn key={item.to} {...item} />
      ))}

      {/* Divider */}
      <div style={{ width: 24, height: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />

      {/* Settings */}
      <button
        title="Paramètres"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 40, height: 40, borderRadius: '50%',
          background: 'transparent', border: 'none',
          color: 'rgba(255,255,255,0.4)',
          cursor: 'pointer', transition: 'color 0.18s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
      >
        <IconSettings />
      </button>

      {/* Logout */}
      <button
        onClick={handleLogout}
        title="Déconnexion"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 40, height: 40, borderRadius: '50%',
          background: 'transparent', border: 'none',
          color: 'rgba(255,255,255,0.4)',
          cursor: 'pointer', transition: 'color 0.18s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = '#F87171'
          e.currentTarget.style.background = 'rgba(248,113,113,0.1)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = 'rgba(255,255,255,0.4)'
          e.currentTarget.style.background = 'transparent'
        }}
      >
        <IconLogout />
      </button>
    </nav>
  )
}
