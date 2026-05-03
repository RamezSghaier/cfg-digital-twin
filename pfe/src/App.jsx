import { BrowserRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'

function AppRouter() {
  const { user } = useAuth()

  if (user === undefined) return (
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
  if (user) return <Dashboard />
  return <Landing />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  )
}
