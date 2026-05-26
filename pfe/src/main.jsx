import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// When Vite can't load a lazy chunk (stale deployment, new hash),
// do a hard reload to pick up the latest index.html and chunk references.
window.addEventListener('vite:preloadError', () => { window.location.reload() })

createRoot(document.getElementById('root')).render(
  <App />
)