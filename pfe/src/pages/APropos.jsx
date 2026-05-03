/* ─── Glass card ─────────────────────────────────────────────── */
function GlassCard({ children, style }) {
  return (
    <div style={{
      background: 'rgba(5, 12, 25, 0.65)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(112, 193, 255, 0.12)',
      borderRadius: '16px',
      ...style,
    }}>
      {children}
    </div>
  )
}

/* ─── Section label ──────────────────────────────────────────── */
function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: '0.58rem',
      letterSpacing: '0.4em',
      opacity: 0.35,
      marginBottom: '14px',
      fontFamily: 'monospace',
      color: '#70c1ff',
    }}>
      {children}
    </div>
  )
}

/* ─── Tech stack data ────────────────────────────────────────── */
const TECH_STACK = [
  { category: 'Simulation 3D',  tech: 'Three.js',          role: 'Rendu temps réel, contrôles caméra, effets visuels' },
  { category: 'Interface',      tech: 'React + Vite',       role: 'SPA, routing, gestion d\'état des composants' },
  { category: 'Backend',        tech: 'Python + FastAPI',   role: 'API REST, agent IA, traitement des données' },
  { category: 'Base de données',tech: 'MongoDB',            role: 'Stockage courbures, sessions, journaux' },
  { category: 'Authentification',tech: 'Firebase Auth',     role: 'Connexion sécurisée, rôles admin / utilisateur' },
  { category: 'Météo',          tech: 'API externe',        role: 'Conditions en temps réel, effets visuels adaptatifs' },
  { category: 'Déploiement',    tech: 'Docker',             role: 'Conteneurisation backend + services' },
]

/* ─── Team data ──────────────────────────────────────────────── */
const TEAM = [
  { role: 'DÉVELOPPEUR',    name: 'Étudiant PFE',         detail: 'Génie Informatique — ENIS Sfax' },
  { role: 'ENCADRANT',      name: 'Encadrant académique', detail: 'École Nationale d\'Ingénieurs de Sfax' },
  { role: 'CO-ENCADRANT',   name: 'Responsable CFG',      detail: 'Chemin de Fer de Gafsa' },
]

export default function APropos() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 60% 60%, rgba(112,193,255,0.04) 0%, transparent 55%), #000',
      padding: '32px 48px 48px 116px',
      fontFamily: 'monospace',
      color: '#70c1ff',
      overflowY: 'auto',
    }}>

      {/* ── Hero header ── */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ fontSize: '0.58rem', letterSpacing: '0.45em', opacity: 0.35, marginBottom: '10px' }}>
          PROJET DE FIN D'ÉTUDES — 2025 / 2026
        </div>
        <h1 style={{
          fontSize: 'clamp(1.4rem, 3vw, 2.2rem)',
          letterSpacing: '0.25em',
          fontWeight: 500,
          textShadow: '0 0 30px rgba(112,193,255,0.45)',
          margin: '0 0 8px 0',
        }}>
          CFG DIGITAL TWIN
        </h1>
        <div style={{ fontSize: '0.78rem', opacity: 0.45, letterSpacing: '0.12em', maxWidth: '560px', lineHeight: '1.8' }}>
          Jumeau Numérique Ferroviaire — Plateforme intelligente de surveillance
          et de prédiction des risques pour Chemin de Fer de Gafsa
        </div>

        {/* Divider */}
        <div style={{
          marginTop: '24px',
          width: '120px',
          height: '1px',
          background: 'linear-gradient(to right, #70c1ff44, transparent)',
        }} />
      </div>

      {/* ── Contexte ── */}
      <GlassCard style={{ padding: '24px 28px', marginBottom: '24px', maxWidth: '800px' }}>
        <SectionLabel>CONTEXTE DU PROJET</SectionLabel>
        <p style={{ fontSize: '0.82rem', lineHeight: '2', opacity: 0.75, margin: 0 }}>
          La machine de mesure physique de Chemin de Fer de Gafsa, dont la réparation représente
          plusieurs millions de dinars, est hors service. Ce jumeau numérique constitue une alternative
          intelligente et économique : il simule l'infrastructure ferroviaire en temps réel dans un
          environnement 3D interactif, intègre des données météorologiques en direct, et s'appuie
          sur un agent IA pour détecter et anticiper les situations dangereuses avant qu'elles
          ne se produisent sur le terrain.
        </p>
      </GlassCard>

      {/* ── Fonctionnalités ── */}
      <GlassCard style={{ padding: '24px 28px', marginBottom: '24px', maxWidth: '800px' }}>
        <SectionLabel>FONCTIONNALITÉS CLÉS</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
          {[
            ['Simulation 3D',         'Train interactif temps réel avec contrôles caméra et inspection des rails'],
            ['Agent IA',              'Réponses en langage naturel, identification et déclenchement de scénarios'],
            ['Météo intégrée',        'Données météo en direct avec effets visuels adaptatifs dans la scène 3D'],
            ['Scénarios de risque',   'Déraillement, usure rails, brouillard, inondation, panne freins'],
            ['Journal & Calendrier',  'Historique des sessions et rejeu des simulations passées'],
            ['Accès par rôle',        'Admin (alertes courbure, CRUD) / Utilisateur (simulation et IA)'],
          ].map(([title, desc]) => (
            <div key={title} style={{ padding: '14px', background: 'rgba(112,193,255,0.04)', borderRadius: '10px', border: '1px solid rgba(112,193,255,0.08)' }}>
              <div style={{ fontSize: '0.68rem', letterSpacing: '0.1em', marginBottom: '6px' }}>{title}</div>
              <div style={{ fontSize: '0.65rem', opacity: 0.45, lineHeight: '1.7' }}>{desc}</div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* ── Stack technique ── */}
      <GlassCard style={{ padding: '24px 28px', marginBottom: '24px', maxWidth: '800px' }}>
        <SectionLabel>STACK TECHNIQUE</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {TECH_STACK.map(({ category, tech, role }, i) => (
            <div key={tech} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '12px 0',
              borderBottom: i < TECH_STACK.length - 1 ? '1px solid rgba(112,193,255,0.07)' : 'none',
              fontSize: '0.75rem',
            }}>
              <div style={{ width: '130px', flexShrink: 0, opacity: 0.4, fontSize: '0.62rem', letterSpacing: '0.08em' }}>
                {category}
              </div>
              <div style={{ width: '140px', flexShrink: 0, letterSpacing: '0.06em' }}>
                {tech}
              </div>
              <div style={{ opacity: 0.4, fontSize: '0.68rem', lineHeight: '1.5' }}>
                {role}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* ── Équipe ── */}
      <div style={{ maxWidth: '800px' }}>
        <SectionLabel>ÉQUIPE</SectionLabel>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {TEAM.map(({ role, name, detail }) => (
            <GlassCard key={role} style={{ padding: '18px 22px', flex: '1', minWidth: '180px' }}>
              <div style={{ fontSize: '0.55rem', letterSpacing: '0.35em', opacity: 0.35, marginBottom: '8px' }}>
                {role}
              </div>
              <div style={{ fontSize: '0.82rem', letterSpacing: '0.06em', marginBottom: '4px' }}>
                {name}
              </div>
              <div style={{ fontSize: '0.62rem', opacity: 0.4, lineHeight: '1.6' }}>
                {detail}
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* ── Footer note ── */}
      <div style={{ marginTop: '40px', fontSize: '0.6rem', opacity: 0.2, letterSpacing: '0.15em', maxWidth: '800px' }}>
        Preuve de concept — conçue pour la prise de décision et la surveillance d'infrastructure
        sans connectivité capteur physique ni certification industrielle.
      </div>

    </div>
  )
}
