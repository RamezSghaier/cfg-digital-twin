import { BrowserRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import RoleSetupScreen from './pages/RoleSetupScreen'
import PendingApprovalScreen from './pages/PendingApprovalScreen'

function AppRouter() {
  const { user, role, needsRoleSetup, roleLoading } = useAuth()

  // Still loading auth state or resolving role from backend
  if (user === undefined || roleLoading) return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#04091a',
      color: 'rgba(112,193,255,0.4)',
      fontFamily: 'monospace', fontSize: '0.7rem', letterSpacing: '0.3em',
    }}>
      CHARGEMENT…
    </div>
  )

  // Not logged in
  if (!user) return <Landing />

  // Logged in but needs to pick a role (new user with no MongoDB profile)
  if (needsRoleSetup) return <RoleSetupScreen />

  // Logged in, role chosen, waiting for admin approval
  if (role === 'pending_admin') return <PendingApprovalScreen />

  // Normal access
  return <Dashboard />
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
