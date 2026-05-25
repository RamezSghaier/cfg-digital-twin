import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api'

const RISK_META = {
  LOW:      { color: '#16a34a', bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.25)',  label: 'FAIBLE'   },
  MEDIUM:   { color: '#ca8a04', bg: 'rgba(250,204,21,0.1)',  border: 'rgba(250,204,21,0.25)',  label: 'MODÉRÉ'   },
  HIGH:     { color: '#ea580c', bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.25)',  label: 'ÉLEVÉ'    },
  CRITICAL: { color: '#dc2626', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',    label: 'CRITIQUE' },
}

const SCENARIO_3D = {
  deraillement:      'derail_full',
  usure_rails:       'sandwear',
  brouillard_dense:  'fogbrake',
  surcharge_voie:    'heatload',
  inondation_voie:   'rainbrake',
  defaillance_frein: 'rainbrake',
  courbure_critique: 'curve',
}

const CHIPS = [
  { label: 'Déraillement',     color: '#ef4444', icon: '💥' },
  { label: 'Usure rails',      color: '#f97316', icon: '⚙️' },
  { label: 'Brouillard dense', color: '#64748b', icon: '🌫️' },
  { label: 'Inondation voie',  color: '#3b82f6', icon: '🌊' },
  { label: 'Panne freins',     color: '#dc2626', icon: '🛑' },
  { label: 'Courbure critique',color: '#8b5cf6', icon: '📐' },
]

const INIT = [
  {
    role: 'assistant',
    text: 'Bonjour. Je suis l\'agent IA du Jumeau Numérique CFG.\nJe surveille les risques ferroviaires et analyse les données en temps réel.\n\nComment puis-je vous aider ?',
  },
]

function tok(isDark) {
  return isDark ? {
    page:      '#04091a',
    card:      'rgba(4,9,22,0.85)',
    cardHigh:  'rgba(8,18,40,0.9)',
    border:    'rgba(112,193,255,0.09)',
    borderHov: 'rgba(112,193,255,0.25)',
    glow:      'rgba(112,193,255,0.08)',
    text:      '#70c1ff',
    textHigh:  '#e8f4ff',
    muted:     'rgba(112,193,255,0.45)',
    faint:     'rgba(112,193,255,0.22)',
    divider:   'rgba(112,193,255,0.07)',
    msgUser:   'rgba(99,102,241,0.18)',
    msgBot:    'rgba(4,9,22,0.92)',
    msgBdUser: 'rgba(99,102,241,0.3)',
    msgBdBot:  'rgba(112,193,255,0.1)',
    sendBg:    'linear-gradient(135deg,rgba(99,102,241,0.9),rgba(112,193,255,0.7))',
    accent:    '#70c1ff',
    font:      'monospace',
    blur:      'blur(24px)',
  } : {
    page:      '#f1f5f9',
    card:      '#ffffff',
    cardHigh:  '#f8fafc',
    border:    '#e2e8f0',
    borderHov: '#a5b4fc',
    glow:      'rgba(99,102,241,0.06)',
    text:      '#1e293b',
    textHigh:  '#0f172a',
    muted:     '#64748b',
    faint:     '#94a3b8',
    divider:   '#f1f5f9',
    msgUser:   '#eef2ff',
    msgBot:    '#ffffff',
    msgBdUser: '#c7d2fe',
    msgBdBot:  '#e2e8f0',
    sendBg:    'linear-gradient(135deg,#6366f1,#06b6d4)',
    accent:    '#6366f1',
    font:      'system-ui,-apple-system,sans-serif',
    blur:      'none',
  }
}

/* ── Animated typing dots ── */
function TypingDots({ T }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '14px 16px' }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginRight: 8,
        background: T.glow, border: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.55rem', fontFamily: 'monospace', color: T.accent,
      }}>AI</div>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%',
          background: T.accent, opacity: 0.6,
          animation: `typingDot 1.2s ease-in-out ${i * 0.18}s infinite`,
        }} />
      ))}
    </div>
  )
}

/* ── Message bubble ── */
function Bubble({ msg, T, isDark, index, onLaunch }) {
  const isUser = msg.role === 'user'
  const risk = msg.risk_level ? RISK_META[msg.risk_level] || RISK_META.LOW : null

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 14,
      animation: `msgSlideIn 0.38s cubic-bezier(0.22,1,0.36,1) both`,
      animationDelay: `${Math.min(index * 0.04, 0.2)}s`,
    }}>
      {!isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          alignSelf: 'flex-end', marginRight: 8, marginBottom: 2,
          background: T.glow, border: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.55rem', fontFamily: 'monospace', color: T.accent,
          boxShadow: isDark ? `0 0 10px ${T.faint}` : 'none',
        }}>AI</div>
      )}

      <div style={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Bubble */}
        <div style={{
          padding: '11px 16px',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isUser ? T.msgUser : T.msgBot,
          border: `1px solid ${isUser ? T.msgBdUser : T.msgBdBot}`,
          color: T.text,
          fontFamily: T.font,
          fontSize: '0.83rem',
          lineHeight: 1.75,
          whiteSpace: 'pre-wrap',
          letterSpacing: isDark ? '0.03em' : 0,
          boxShadow: isDark
            ? (isUser ? '0 2px 16px rgba(99,102,241,0.12)' : 'none')
            : '0 1px 4px rgba(0,0,0,0.05)',
          backdropFilter: isDark && !isUser ? T.blur : 'none',
          WebkitBackdropFilter: isDark && !isUser ? T.blur : 'none',
        }}>
          {msg.text}
        </div>

        {/* Risk badge + Launch button — assistant only */}
        {!isUser && risk && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 20,
              background: risk.bg, border: `1px solid ${risk.border}`,
              fontSize: '0.62rem', fontFamily: 'monospace', letterSpacing: '0.12em',
              color: risk.color,
              animation: 'fadeUp 0.3s ease both',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: risk.color, animation: 'pulseDot 2s ease infinite' }} />
              RISQUE {risk.label} {msg.risk_score != null ? `· ${Math.round(msg.risk_score)}/100` : ''}
            </div>

            {msg.show_launch && msg.scenario_id && SCENARIO_3D[msg.scenario_id] && (
              <button
                onClick={() => onLaunch(SCENARIO_3D[msg.scenario_id])}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '5px 14px', borderRadius: 20,
                  background: 'linear-gradient(135deg,rgba(99,102,241,0.85),rgba(6,182,212,0.8))',
                  border: 'none', color: '#fff',
                  fontFamily: 'monospace', fontSize: '0.62rem', letterSpacing: '0.12em',
                  cursor: 'pointer',
                  boxShadow: '0 2px 12px rgba(99,102,241,0.35)',
                  transition: 'all 0.18s',
                  animation: 'chipIn 0.4s ease both',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 18px rgba(99,102,241,0.5)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(99,102,241,0.35)' }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                LANCER LA SIMULATION
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function IA() {
  const { user, role } = useAuth()
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const T = tok(isDark)

  const [messages, setMessages] = useState(INIT)
  const [input,    setInput]    = useState('')
  const [typing,   setTyping]   = useState(false)
  const [focused,  setFocused]  = useState(false)
  const bottomRef  = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  const send = useCallback(async (text) => {
    const trimmed = text.trim()
    if (!trimmed || typing) return

    const updated = [...messages, { role: 'user', text: trimmed }]
    setMessages(updated)
    setInput('')
    setTyping(true)
    textareaRef.current?.focus()

    const history = updated.slice(0, -1).map(m => ({ role: m.role, content: m.text }))

    try {
      const token   = user ? await user.getIdToken() : null
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST', headers,
        body: JSON.stringify({ message: trimmed, history, user_role: role?.toUpperCase() || 'USER' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Erreur ${res.status}`)
      }
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: data.message,
        risk_level: data.risk_level || null,
        risk_score: data.risk_score || null,
        show_launch: data.show_launch_button || false,
        scenario_id: data.scenario_id || null,
      }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', text: `Erreur de connexion au service IA.\n${e.message}` }])
    } finally {
      setTyping(false)
    }
  }, [messages, typing, user, role])

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  function launchScenario(sceneId) {
    sessionStorage.setItem('autoScenario', sceneId)
    sessionStorage.setItem('scenarioOrigin', '/ia')
    navigate('/')
  }

  return (
    <div style={{
      minHeight: '100vh',
      height: '100vh',
      background: T.page,
      paddingLeft: '80px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: T.font,
      color: T.text,
      transition: 'background 0.25s',
      overflow: 'hidden',
      position: 'relative',
    }}>

      {/* ── Ambient glow orbs (dark only) ── */}
      {isDark && <>
        <div style={{
          position: 'absolute', top: '8%', left: '20%', width: 320, height: 320,
          borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
          background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)',
          animation: 'orbFloat 8s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '15%', right: '15%', width: 240, height: 240,
          borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
          background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)',
          animation: 'orbFloat 11s ease-in-out 2s infinite reverse',
        }} />
      </>}

      {/* ── Content column — centered ── */}
      <div style={{
        width: '100%', maxWidth: 760,
        height: '100vh',
        display: 'flex', flexDirection: 'column',
        padding: '28px 24px 24px',
        boxSizing: 'border-box',
        position: 'relative', zIndex: 1,
      }}>

        {/* ── Header ── */}
        <div style={{
          flexShrink: 0, marginBottom: 20,
          animation: 'fadeDown 0.55s cubic-bezier(0.22,1,0.36,1) both',
        }}>
          {/* Badge row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff',
              border: `1px solid ${isDark ? 'rgba(99,102,241,0.3)' : '#c7d2fe'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem',
              boxShadow: isDark ? '0 0 16px rgba(99,102,241,0.2)' : 'none',
            }}>🤖</div>
            <div>
              <div style={{ fontSize: '0.5rem', letterSpacing: '0.42em', color: T.faint, fontFamily: 'monospace' }}>
                CHEMIN DE FER DE GAFSA
              </div>
              <h1 style={{
                margin: 0, lineHeight: 1.1,
                fontSize: 'clamp(1.1rem, 2.5vw, 1.6rem)',
                fontWeight: isDark ? 600 : 800,
                letterSpacing: isDark ? '0.2em' : '-0.02em',
                background: isDark
                  ? 'linear-gradient(135deg,#e8f4ff 0%,#70c1ff 55%,#a5b4fc 100%)'
                  : 'linear-gradient(135deg,#1e293b 0%,#6366f1 60%,#06b6d4 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                {isDark ? 'AGENT IA' : 'Agent IA'}
              </h1>
            </div>
            {/* Live badge */}
            <div style={{
              marginLeft: 'auto',
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 12px', borderRadius: 20,
              background: isDark ? 'rgba(74,222,128,0.08)' : '#f0fdf4',
              border: `1px solid ${isDark ? 'rgba(74,222,128,0.2)' : '#86efac'}`,
              fontSize: '0.52rem', letterSpacing: '0.2em',
              color: isDark ? '#4ade80' : '#16a34a', fontFamily: 'monospace',
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', animation: 'pulseDot 2s ease infinite' }} />
              EN LIGNE
            </div>
          </div>

          {/* Subtitle + stats */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontSize: '0.72rem', color: T.muted, letterSpacing: isDark ? '0.05em' : 0 }}>
              Système multi-agents — analyse des risques ferroviaires en langage naturel
            </p>
            <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
              {[{ v:'5',l:'Agents',c:'#6366f1'}, {v:'7',l:'Scénarios',c:'#06b6d4'}].map(({v,l,c}) => (
                <div key={l} style={{
                  padding: '3px 10px', borderRadius: 8,
                  background: isDark ? `${c}14` : `${c}10`,
                  border: `1px solid ${c}30`,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: c }}>{v}</span>
                  <span style={{ fontSize: '0.55rem', color: T.muted }}>{l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: `linear-gradient(90deg, ${T.faint}, transparent)`, marginTop: 14 }} />
        </div>

        {/* ── Scenario chips ── */}
        <div style={{
          display: 'flex', gap: 6, flexWrap: 'wrap',
          marginBottom: 14, flexShrink: 0,
        }}>
          {CHIPS.map((s, i) => (
            <button
              key={s.label}
              onClick={() => send(`Analyse le scénario : ${s.label}`)}
              style={{
                animation: `chipIn 0.4s cubic-bezier(0.22,1,0.36,1) ${0.06 + i * 0.055}s both`,
                padding: '5px 13px',
                borderRadius: '20px',
                background: isDark ? `${s.color}10` : '#f8fafc',
                border: `1px solid ${isDark ? s.color + '28' : T.border}`,
                color: isDark ? s.color : T.muted,
                fontFamily: T.font,
                fontSize: '0.68rem',
                letterSpacing: isDark ? '0.05em' : 0,
                cursor: 'pointer',
                transition: 'all 0.18s',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = isDark ? `${s.color}20` : `${s.color}10`
                e.currentTarget.style.borderColor = s.color + '55'
                e.currentTarget.style.color = s.color
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = isDark ? `0 4px 14px ${s.color}22` : `0 2px 8px ${s.color}18`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = isDark ? `${s.color}10` : '#f8fafc'
                e.currentTarget.style.borderColor = isDark ? s.color + '28' : T.border
                e.currentTarget.style.color = isDark ? s.color : T.muted
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <span style={{ fontSize: '0.75rem' }}>{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>

        {/* ── Chat area ── */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '18px 20px 10px',
          marginBottom: 12,
          borderRadius: 18,
          background: T.card,
          backdropFilter: T.blur,
          WebkitBackdropFilter: T.blur,
          border: `1px solid ${T.border}`,
          boxShadow: isDark
            ? `0 0 0 1px rgba(112,193,255,0.04), inset 0 1px 0 rgba(255,255,255,0.03)`
            : '0 2px 12px rgba(0,0,0,0.06)',
          scrollbarWidth: 'thin',
          scrollbarColor: isDark ? 'rgba(112,193,255,0.12) transparent' : '#e2e8f0 transparent',
          animation: 'fadeUp 0.5s ease 0.2s both',
        }}>
          {messages.map((msg, i) => (
            <Bubble key={i} msg={msg} T={T} isDark={isDark} index={i} onLaunch={launchScenario} />
          ))}

          {typing && <TypingDots T={T} />}
          <div ref={bottomRef} />
        </div>

        {/* ── Input bar ── */}
        <div style={{
          flexShrink: 0,
          display: 'flex', alignItems: 'flex-end', gap: 10,
          padding: '10px 12px',
          borderRadius: 16,
          background: T.card,
          backdropFilter: T.blur,
          WebkitBackdropFilter: T.blur,
          border: `1px solid ${focused ? T.borderHov : T.border}`,
          boxShadow: focused
            ? (isDark ? `0 0 0 3px rgba(112,193,255,0.07), 0 4px 20px rgba(0,0,0,0.3)` : `0 0 0 3px rgba(99,102,241,0.1), 0 4px 16px rgba(0,0,0,0.08)`)
            : (isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.05)'),
          transition: 'border-color 0.2s, box-shadow 0.2s',
          animation: 'fadeUp 0.5s ease 0.28s both',
        }}>
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Posez une question sur les risques ferroviaires…"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: T.text, fontFamily: T.font, fontSize: '0.84rem',
              resize: 'none', letterSpacing: isDark ? '0.03em' : 0,
              lineHeight: 1.55, paddingTop: 2, maxHeight: 120, overflowY: 'auto',
            }}
            onInput={e => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={typing || !input.trim()}
            style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: (typing || !input.trim()) ? (isDark ? 'rgba(112,193,255,0.07)' : '#f1f5f9') : T.sendBg,
              border: `1px solid ${(typing || !input.trim()) ? T.border : 'transparent'}`,
              color: '#fff',
              cursor: (typing || !input.trim()) ? 'not-allowed' : 'pointer',
              opacity: (typing || !input.trim()) ? 0.45 : 1,
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: (!typing && input.trim()) ? (isDark ? '0 2px 12px rgba(99,102,241,0.35)' : '0 2px 10px rgba(99,102,241,0.3)') : 'none',
            }}
            onMouseEnter={e => { if (!typing && input.trim()) e.currentTarget.style.transform = 'scale(1.08)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>

        {/* Hint */}
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: '0.5rem', color: T.faint, letterSpacing: '0.12em', animation: 'fadeUp 0.5s ease 0.35s both' }}>
          ENTRÉE pour envoyer · SHIFT+ENTRÉE pour nouvelle ligne
        </div>
      </div>

      <style>{`
        @keyframes fadeDown   { from{opacity:0;transform:translateY(-18px)} to{opacity:1;transform:none} }
        @keyframes fadeUp     { from{opacity:0;transform:translateY(14px)}  to{opacity:1;transform:none} }
        @keyframes chipIn     { from{opacity:0;transform:scale(0.85) translateY(6px)} to{opacity:1;transform:none} }
        @keyframes msgSlideIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        @keyframes typingDot  { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }
        @keyframes pulseDot   { 0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(74,222,128,0.4)} 50%{opacity:0.6;box-shadow:0 0 0 4px rgba(74,222,128,0)} }
        @keyframes orbFloat   { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-24px) scale(1.04)} }
        textarea::placeholder { color: ${isDark ? 'rgba(112,193,255,0.2)' : '#94a3b8'}; }
        textarea { scrollbar-width: thin; }
        ::-webkit-scrollbar       { width:3px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:${isDark ? 'rgba(112,193,255,0.12)' : '#e2e8f0'}; border-radius:2px; }
      `}</style>
    </div>
  )
}
