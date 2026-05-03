import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

const API_BASE = 'http://localhost:8000/api'

/* ─── Shared glass style ─────────────────────────────────────── */
const glass = {
  background: 'rgba(5, 12, 25, 0.65)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(112, 193, 255, 0.12)',
  borderRadius: '16px',
}

/* ─── Sample conversation to show capabilities ───────────────── */
const INITIAL_MESSAGES = [
  {
    role: 'assistant',
    text: 'Bonjour. Je suis l\'agent IA du Jumeau Numérique CFG. Je surveille les risques ferroviaires et analyse les données en temps réel. Comment puis-je vous aider ?',
  },
  {
    role: 'user',
    text: 'Quel est le risque de déraillement actuel ?',
  },
  {
    role: 'assistant',
    text: 'Risque de déraillement actuel : FAIBLE.\n\nAnalyse en cours :\n— Courbure moyenne : 3.4 °/km (seuil : 5.0 °/km) ✓\n— Vitesse : 84 km/h (limite : 120 km/h) ✓\n— État des rails : nominal ✓\n\nAucune alerte critique détectée. Surveillance continue active.',
  },
]

/* ─── Message bubble ─────────────────────────────────────────── */
function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: '14px',
    }}>
      {!isUser && (
        <div style={{
          width: '30px',
          height: '30px',
          borderRadius: '50%',
          background: 'rgba(112, 193, 255, 0.12)',
          border: '1px solid rgba(112, 193, 255, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.65rem',
          color: '#70c1ff',
          marginRight: '10px',
          flexShrink: 0,
          alignSelf: 'flex-end',
          marginBottom: '2px',
        }}>
          IA
        </div>
      )}
      <div style={{
        maxWidth: '68%',
        padding: '12px 16px',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isUser
          ? 'rgba(112, 193, 255, 0.14)'
          : 'rgba(5, 12, 25, 0.8)',
        border: '1px solid rgba(112, 193, 255, 0.12)',
        color: '#70c1ff',
        fontFamily: 'monospace',
        fontSize: '0.8rem',
        lineHeight: '1.7',
        whiteSpace: 'pre-wrap',
        letterSpacing: '0.03em',
      }}>
        {msg.text}
      </div>
    </div>
  )
}

/* ─── Scenario chips ─────────────────────────────────────────── */
const SCENARIOS = ['Déraillement', 'Usure rails', 'Brouillard dense', 'Inondation voie', 'Panne freins']

export default function IA() {
  const { user, role } = useAuth()
  const [messages, setMessages] = useState(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  async function send(text) {
    const trimmed = text.trim()
    if (!trimmed || typing) return

    const updatedMessages = [...messages, { role: 'user', text: trimmed }]
    setMessages(updatedMessages)
    setInput('')
    setTyping(true)

    // Build history in the format the backend expects (exclude the message just added)
    const history = updatedMessages.slice(0, -1).map(m => ({
      role: m.role,
      content: m.text,
    }))

    try {
      const token = user ? await user.getIdToken() : null
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: trimmed,
          history,
          user_role: role?.toUpperCase() || 'USER',
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Erreur ${res.status}`)
      }
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', text: data.message }])
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: `Erreur de connexion au service IA.\n${e.message}`,
      }])
    } finally {
      setTyping(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 25% 40%, rgba(112,193,255,0.04) 0%, transparent 55%), #000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 24px 24px 100px',
      fontFamily: 'monospace',
      color: '#70c1ff',
    }}>

      <div style={{ width: '100%', maxWidth: '780px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '20px', flexShrink: 0 }}>
          <div style={{ fontSize: '0.58rem', letterSpacing: '0.4em', opacity: 0.4, marginBottom: '6px' }}>
            CHEMIN DE FER DE GAFSA
          </div>
          <h1 style={{
            fontSize: 'clamp(1.1rem, 2vw, 1.5rem)',
            letterSpacing: '0.25em',
            fontWeight: 500,
            textShadow: '0 0 20px rgba(112,193,255,0.4)',
            margin: 0,
          }}>
            AGENT IA
          </h1>
          <div style={{ fontSize: '0.65rem', opacity: 0.4, letterSpacing: '0.15em', marginTop: '4px' }}>
            Analyse des risques ferroviaires — Langage naturel
          </div>
        </div>

        {/* ── Scenario chips ── */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', flexShrink: 0 }}>
          {SCENARIOS.map(s => (
            <button
              key={s}
              onClick={() => send(`Simule le scénario : ${s}`)}
              style={{
                padding: '5px 14px',
                background: 'rgba(112,193,255,0.06)',
                border: '1px solid rgba(112,193,255,0.16)',
                borderRadius: '20px',
                color: 'rgba(112,193,255,0.65)',
                fontFamily: 'monospace',
                fontSize: '0.68rem',
                letterSpacing: '0.08em',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(112,193,255,0.14)'
                e.currentTarget.style.color = '#70c1ff'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(112,193,255,0.06)'
                e.currentTarget.style.color = 'rgba(112,193,255,0.65)'
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* ── Chat area ── */}
        <div style={{
          ...glass,
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          marginBottom: '14px',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(112,193,255,0.15) transparent',
        }}>
          {messages.map((msg, i) => (
            <Message key={i} msg={msg} />
          ))}

          {typing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.5, fontSize: '0.75rem', letterSpacing: '0.1em' }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%',
                background: 'rgba(112,193,255,0.12)', border: '1px solid rgba(112,193,255,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem',
              }}>IA</div>
              <span>Analyse en cours</span>
              <span style={{ animation: 'blink 1s steps(3, end) infinite' }}>...</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* ── Input ── */}
        <div style={{ ...glass, display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', flexShrink: 0 }}>
          <textarea
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Posez une question sur les risques ferroviaires…"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#70c1ff',
              fontFamily: 'monospace',
              fontSize: '0.82rem',
              resize: 'none',
              letterSpacing: '0.04em',
              lineHeight: '1.5',
            }}
          />
          <button
            onClick={() => send(input)}
            style={{
              padding: '8px 18px',
              background: 'rgba(112,193,255,0.12)',
              border: '1px solid rgba(112,193,255,0.25)',
              borderRadius: '10px',
              color: '#70c1ff',
              fontFamily: 'monospace',
              fontSize: '0.72rem',
              letterSpacing: '0.15em',
              cursor: 'pointer',
              transition: 'all 0.2s',
              flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(112,193,255,0.22)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(112,193,255,0.12)'}
          >
            ENVOYER
          </button>
        </div>

      </div>

      <style>{`
        @keyframes blink { 0% { opacity: 0.2; } 20% { opacity: 1; } 100% { opacity: 0.2; } }
        textarea::placeholder { color: rgba(112,193,255,0.25); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(112,193,255,0.15); border-radius: 2px; }
      `}</style>
    </div>
  )
}
