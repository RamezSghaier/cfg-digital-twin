import { NavLink } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebase/config'
import { useTheme } from '../../contexts/ThemeContext'

/* ─── Icons ────────────────────────────────────────────── */
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
const IconSun = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
)
const IconMoon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
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

/* ─── Nav button ────────────────────────────────────────────── */
function NavBtn({ to, icon, label, end }) {
  const { isDark } = useTheme()
  const activeColor   = isDark ? '#2ba1fb'  : '#6366f1'
  const inactiveColor = isDark ? 'rgba(113,157,168,0.8)' : '#94a3b8'
  const hoverColor    = isDark ? 'rgba(255,255,255,0.8)'  : '#374151'
  const activeShadow  = isDark
    ? '0 0 14px rgba(39,245,234,0.8)'
    : '0 0 14px rgba(99,102,241,0.3)'

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
        background: isActive ? activeColor : 'transparent',
        color: isActive ? '#fff' : inactiveColor,
        textDecoration: 'none',
        transition: 'all 0.18s ease',
        flexShrink: 0,
        boxShadow: isActive ? activeShadow : 'none',
      })}
      onMouseEnter={e => {
        if (!e.currentTarget.getAttribute('aria-current')) e.currentTarget.style.color = hoverColor
      }}
      onMouseLeave={e => {
        if (!e.currentTarget.getAttribute('aria-current')) e.currentTarget.style.color = inactiveColor
      }}
    >
      {icon}
    </NavLink>
  )
}

/* ─── Sidebar ───────────────────────────────────────────────── */
export default function Sidebar() {
  const { isDark, toggleTheme } = useTheme()

  const iconColor      = isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8'
  const iconHoverColor = isDark ? 'rgba(255,255,255,0.85)' : '#374151'

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
        background: isDark ? 'rgba(30,30,30,0.82)' : 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: 999,
        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
        boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.45)' : '0 8px 32px rgba(0,0,0,0.12)',
        transition: 'background 0.25s, border-color 0.25s, box-shadow 0.25s',
      }}
    >
      {NAV_ITEMS.map(item => (
        <NavBtn key={item.to} {...item} />
      ))}

      <div style={{ width: 24, height: 1, background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', margin: '4px 0' }} />

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 40, height: 40, borderRadius: '50%',
          background: 'transparent', border: 'none',
          color: isDark ? 'rgba(255,193,7,0.6)' : 'rgba(99,102,241,0.6)',
          cursor: 'pointer', transition: 'color 0.18s, background 0.18s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = isDark ? '#fbbf24' : '#6366f1'
          e.currentTarget.style.background = isDark ? 'rgba(251,191,36,0.1)' : 'rgba(99,102,241,0.1)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = isDark ? 'rgba(255,193,7,0.6)' : 'rgba(99,102,241,0.6)'
          e.currentTarget.style.background = 'transparent'
        }}
      >
        {isDark ? <IconSun /> : <IconMoon />}
      </button>

      {/* Logout */}
      <button
        onClick={handleLogout}
        title="Déconnexion"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 40, height: 40, borderRadius: '50%',
          background: 'transparent', border: 'none',
          color: iconColor,
          cursor: 'pointer', transition: 'color 0.18s, background 0.18s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = '#F87171'
          e.currentTarget.style.background = 'rgba(248,113,113,0.1)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = iconColor
          e.currentTarget.style.background = 'transparent'
        }}
      >
        <IconLogout />
      </button>
    </nav>
  )
}
