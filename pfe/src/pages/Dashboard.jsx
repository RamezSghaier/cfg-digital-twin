import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'
import { useTheme } from '../contexts/ThemeContext'

const Accueil  = lazy(() => import('./HomePage'))
const IA       = lazy(() => import('./IA'))
const Journal  = lazy(() => import('./Journal'))
const APropos  = lazy(() => import('./APropos'))
const Inspect  = lazy(() => import('./InspectPage'))

function PageLoader() {
  const { isDark } = useTheme()
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'monospace',
      color: isDark ? 'rgba(112,193,255,0.3)' : '#94a3b8',
      background: isDark ? 'transparent' : '#f1f5f9',
      fontSize: '0.7rem',
      letterSpacing: '0.3em',
    }}>
      CHARGEMENT…
    </div>
  )
}

export default function Dashboard() {
  return (
    <>
      <Sidebar />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/"        element={<Accueil />} />
          <Route path="/ia"      element={<IA />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/apropos"          element={<APropos />} />
          <Route path="/inspect/:object" element={<Inspect />} />
          <Route path="*"                element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  )
}
