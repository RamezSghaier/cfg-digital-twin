import { useRef, useEffect, useState } from 'react'
import { useTheme } from '../contexts/ThemeContext'

const FEATURES = [
  { icon: '🧊', title: 'Simulation 3D',       desc: 'Scène WebGL interactive — train animé, caméra follow/libre, inspection des rails UIC 54 kg en temps réel', color: '#6366f1' },
  { icon: '🤖', title: 'Agents IA',            desc: 'Agent chat (analyse langage naturel) + agent journal (prédit le scénario à risque à partir des conditions réelles du jour)', color: '#06b6d4' },
  { icon: '🌤️', title: 'Météo intégrée',       desc: 'OpenWeatherMap en direct + Open-Meteo historique — effets visuels adaptatifs (pluie, brouillard, tempête de sable…) dans la scène 3D', color: '#f59e0b' },
  { icon: '⚠️', title: 'Scénarios de risque',  desc: '7 scénarios simulés : déraillement, usure rails, brouillard dense, surcharge voie, inondation, défaillance frein, courbure critique', color: '#ef4444' },
  { icon: '📅', title: 'Journal & Calendrier', desc: 'Historique des sessions de simulation, prédictions IA par date et rejeu direct des scénarios depuis le calendrier', color: '#10b981' },
  { icon: '🔐', title: 'Accès par rôle',        desc: 'Admin : alertes, CRUD segments, approbation utilisateurs — Opérateur : simulation 3D, agent IA, journal', color: '#8b5cf6' },
]

const TECH = [
  { cat: '3D',     tech: 'Three.js',           color: '#f97316', desc: 'Rendu WebGL, post-processing bloom, sky procédural, EffectComposer' },
  { cat: 'Front',  tech: 'React + Vite',        color: '#06b6d4', desc: 'SPA, React Router, lazy loading, gestion d\'état réactif' },
  { cat: 'Back',   tech: 'FastAPI',             color: '#10b981', desc: 'API REST Python, agents IA asynchrones, Railway cloud' },
  { cat: 'BDD',    tech: 'MongoDB Atlas',       color: '#4ade80', desc: '215 segments de courbure, journaux, prédictions, alertes' },
  { cat: 'Auth',   tech: 'Firebase Auth',       color: '#fbbf24', desc: 'Google OAuth + email/password, rôles admin / opérateur' },
  { cat: 'Météo',  tech: 'OWM + Open-Meteo',   color: '#38bdf8', desc: 'OpenWeatherMap (temps réel) + Open-Meteo archive (données historiques)' },
  { cat: 'AI',     tech: 'Groq / LLaMA 3.3',   color: '#a78bfa', desc: 'llama-3.3-70b-versatile — chat opérateur et prédiction journal' },
  { cat: 'Deploy', tech: 'Vercel + Railway',    color: '#f43f5e', desc: 'Frontend CDN mondial sur Vercel, backend FastAPI sur Railway' },
]

const TEAM = [
  { role: 'Développeur',    name: 'Ramez Sghaier',        detail: 'Génie Informatique — ENIS Sfax', color: '#6366f1', init: 'RS' },
  { role: 'Encadrant',      name: 'Encadrant académique', detail: 'École Nationale d\'Ingénieurs de Sfax', color: '#06b6d4', init: 'EA' },
  { role: 'Co-encadrant',   name: 'Responsable CFG',      detail: 'Chemin de Fer de Gafsa',              color: '#10b981', init: 'RC' },
]

const STATS = [
  { val: '7',    label: 'Scénarios',   color: '#6366f1' },
  { val: '215',  label: 'Segments CFG',color: '#06b6d4' },
  { val: '3',    label: 'Agents IA',   color: '#10b981' },
  { val: '2',    label: 'Rôles',       color: '#f59e0b' },
]

/* ── Scroll-reveal hook ─────────────────────────────────────── */
function useReveal(threshold = 0.12) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

/* ── Reveal wrapper ─────────────────────────────────────────── */
function Reveal({ children, delay = 0, direction = 'up', style = {} }) {
  const { ref, visible } = useReveal()
  const translate = direction === 'up' ? 'translateY(32px)'
                  : direction === 'down' ? 'translateY(-24px)'
                  : direction === 'left' ? 'translateX(32px)'
                  : 'scale(0.94)'
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'none' : translate,
      transition: `opacity 0.65s ease ${delay}s, transform 0.65s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
      ...style,
    }}>
      {children}
    </div>
  )
}

/* ── Section title ──────────────────────────────────────────── */
function SectionTitle({ children, isDark, faint }) {
  return (
    <Reveal>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: isDark ? '#e8f4ff' : '#0f172a', margin: 0, letterSpacing: isDark ? '0.08em' : '0', whiteSpace: 'nowrap' }}>
          {children}
        </h2>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${faint}, transparent)` }} />
      </div>
    </Reveal>
  )
}

export default function APropos() {
  const { isDark } = useTheme()

  const bg      = isDark ? '#02060f' : '#f8fafc'
  const card    = isDark ? 'rgba(5,12,28,0.8)'  : '#ffffff'
  const border  = isDark ? 'rgba(112,193,255,0.1)' : '#e2e8f0'
  const shadow  = isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.07)'
  const text    = isDark ? '#e8f4ff' : '#0f172a'
  const muted   = isDark ? 'rgba(200,220,255,0.55)' : '#475569'
  const faint   = isDark ? 'rgba(112,193,255,0.3)'  : '#94a3b8'
  const divider = isDark ? 'rgba(112,193,255,0.07)' : '#e2e8f0'
  const font    = isDark ? 'monospace' : 'system-ui, -apple-system, sans-serif'
  const heroBg  = isDark
    ? 'radial-gradient(ellipse at 30% 0%, rgba(99,102,241,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(6,182,212,0.1) 0%, transparent 50%), #02060f'
    : 'linear-gradient(135deg, #f0f4ff 0%, #f8fafc 50%, #f0fdf4 100%)'

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: font, color: text, overflowY: 'auto', transition: 'background 0.3s' }}>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div style={{ background: heroBg, borderBottom: `1px solid ${divider}`, position: 'relative', overflow: 'hidden' }}>
        {isDark && <div style={{ position: 'absolute', top: -60, right: 80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(rgba(99,102,241,0.12),transparent 70%)', pointerEvents: 'none' }} />}

        <div style={{ maxWidth: 960, margin: '0 auto', padding: '52px 40px 44px 40px', marginLeft: 'max(80px, calc(50% - 480px + 80px))' }}>

          <Reveal direction="down">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: '0.6rem', letterSpacing: '0.4em', color: faint, fontFamily: 'monospace' }}>PROJET DE FIN D'ÉTUDES — 2025/2026</span>
              <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.6rem', fontWeight: 600, background: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff', color: isDark ? '#a5b4fc' : '#6366f1', border: isDark ? '1px solid rgba(99,102,241,0.3)' : '1px solid #c7d2fe' }}>PFE</span>
            </div>

            <h1 style={{
              fontSize: 'clamp(2rem, 5vw, 3.2rem)',
              fontWeight: 800,
              letterSpacing: isDark ? '0.1em' : '-0.02em',
              margin: '0 0 12px',
              background: isDark
                ? 'linear-gradient(135deg, #e8f4ff 0%, #70c1ff 50%, #a5b4fc 100%)'
                : 'linear-gradient(135deg, #1e293b 0%, #6366f1 60%, #06b6d4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              CFG Digital Twin
            </h1>

            <p style={{ fontSize: '0.95rem', color: muted, maxWidth: 560, lineHeight: 1.8, margin: '0 0 28px' }}>
              Jumeau Numérique Ferroviaire — Plateforme intelligente de surveillance
              et de prédiction des risques pour Chemin de Fer de Gafsa
            </p>
          </Reveal>

          {/* Stats row */}
          <Reveal delay={0.1}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {STATS.map(({ val, label, color }) => (
                <div key={label} style={{
                  padding: '8px 18px', borderRadius: 12,
                  background: isDark ? `${color}14` : `${color}10`,
                  border: `1px solid ${color}30`,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color }}>{val}</span>
                  <span style={{ fontSize: '0.7rem', color: muted }}>{label}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>

      {/* ── Main content — centered ─────────────────────────── */}
      <div style={{
        maxWidth: 960,
        margin: '0 auto',
        marginLeft: 'max(80px, calc(50% - 480px + 80px))',
        padding: '48px 40px 72px',
        display: 'flex', flexDirection: 'column', gap: 56,
      }}>

        {/* Contexte */}
        <section>
          <SectionTitle isDark={isDark} faint={faint}>Contexte du projet</SectionTitle>
          <Reveal delay={0.05}>
            <div style={{ background: card, borderRadius: 20, border: `1px solid ${border}`, boxShadow: shadow, padding: '28px 32px', backdropFilter: isDark ? 'blur(20px)' : 'none', position: 'relative', overflow: 'hidden' }}>
              {isDark && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #6366f1, #06b6d4, transparent)' }} />}
              <p style={{ fontSize: '0.9rem', lineHeight: 2, color: muted, margin: 0 }}>
                La machine de mesure physique de Chemin de Fer de Gafsa, dont la réparation représente
                plusieurs millions de dinars, est hors service. Ce jumeau numérique constitue une alternative
                intelligente et économique : il simule l'infrastructure ferroviaire en temps réel dans un
                environnement 3D interactif, intègre des données météorologiques en direct, et s'appuie
                sur un agent IA pour détecter et anticiper les situations dangereuses avant qu'elles
                ne se produisent sur le terrain.
              </p>
            </div>
          </Reveal>
        </section>

        {/* Features grid */}
        <section>
          <SectionTitle isDark={isDark} faint={faint}>Fonctionnalités clés</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {FEATURES.map(({ icon, title, desc, color }, i) => (
              <Reveal key={title} delay={i * 0.07} direction="scale">
                <div className="lift" style={{
                  background: card, borderRadius: 16, border: `1px solid ${border}`,
                  boxShadow: shadow, padding: '20px 22px',
                  backdropFilter: isDark ? 'blur(16px)' : 'none',
                  borderTop: `3px solid ${color}`, height: '100%',
                }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginBottom: 14 }}>
                    {icon}
                  </div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: text, marginBottom: 7 }}>{title}</div>
                  <div style={{ fontSize: '0.76rem', color: muted, lineHeight: 1.7 }}>{desc}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Tech stack */}
        <section>
          <SectionTitle isDark={isDark} faint={faint}>Stack technique</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {TECH.map(({ cat, tech, color, desc }, i) => (
              <Reveal key={tech} delay={i * 0.06} direction="left">
                <div className="lift" style={{
                  background: card, borderRadius: 14, border: `1px solid ${border}`,
                  boxShadow: shadow, padding: '14px 16px',
                  backdropFilter: isDark ? 'blur(16px)' : 'none',
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.56rem', color: faint, letterSpacing: '0.2em', marginBottom: 2, fontFamily: 'monospace' }}>{cat}</div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color, marginBottom: 4 }}>{tech}</div>
                    <div style={{ fontSize: '0.7rem', color: muted, lineHeight: 1.5 }}>{desc}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Team */}
        <section>
          <SectionTitle isDark={isDark} faint={faint}>Équipe</SectionTitle>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {TEAM.map(({ role, name, detail, color, init }, i) => (
              <Reveal key={role} delay={i * 0.1} style={{ flex: 1, minWidth: 200 }}>
                <div className="lift" style={{
                  background: card, borderRadius: 20, border: `1px solid ${border}`,
                  boxShadow: shadow, padding: '28px 24px',
                  backdropFilter: isDark ? 'blur(16px)' : 'none',
                  borderTop: `3px solid ${color}`, textAlign: 'center',
                }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px', background: `${color}18`, border: `2px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800, color, fontFamily: 'monospace' }}>
                    {init}
                  </div>
                  <div style={{ fontSize: '0.56rem', letterSpacing: '0.25em', color: faint, marginBottom: 7, fontFamily: 'monospace' }}>{role.toUpperCase()}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: text, marginBottom: 6 }}>{name}</div>
                  <div style={{ fontSize: '0.74rem', color: muted, lineHeight: 1.6 }}>{detail}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Footer note */}
        <Reveal>
          <p style={{ fontSize: '0.65rem', color: faint, letterSpacing: '0.12em', fontFamily: 'monospace', textAlign: 'center' }}>
            Preuve de concept — conçue pour la prise de décision et la surveillance d'infrastructure
            sans connectivité capteur physique ni certification industrielle.
          </p>
        </Reveal>

      </div>
    </div>
  )
}
