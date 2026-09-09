'use client'

import { useState } from 'react'
import type { DiagnosticState } from '@/types'
import { PROGRAMMES } from '@/lib/scoring/catalog'
import { DonyaBlock } from '../DonyaBlock'

interface Props {
  state: DiagnosticState
  next: (patch?: Partial<DiagnosticState>) => void
  back: () => void
  update: (patch: Partial<DiagnosticState>) => void
}

const NIGHT   = '#1A186E'
const VIOLET  = '#6B35B8'
const FUCHSIA = '#C8399A'
const MUTED   = '#6B6680'
const OFF     = '#F7F6FC'
const LAV     = '#EDE9FB'
const GRAD    = 'linear-gradient(135deg, #6B35B8, #C8399A)'

// ── P0 : Cohérence priorité ↔ justification ↔ PROG #1 ─────────
// La justification est dérivée des MODULES qui ont le plus contribué au score,
// pas du libellé de l'objectif P3. C'est ce qui garantit la cohérence.
function buildWhyFormation(rec: any, answers: Record<string, string>): string {
  if (!rec) return ''
  const id  = rec.id_programme ?? ''
  const c1  = answers['C1'] ?? ''
  const c4  = answers['C4'] ?? ''
  const i2  = answers['I2'] ?? ''
  const i3  = answers['I3'] ?? ''
  const a2  = answers['A2'] ?? ''
  const a3  = answers['A3'] ?? ''
  const a4  = answers['A4'] ?? ''

  const MAP: Record<string, string> = {
    'PROG-001': `Votre diagnostic montre que vous n'apparaissez pas suffisamment dans les recherches locales. Un travail structuré sur le référencement local peut changer rapidement votre visibilité auprès des prospects qui cherchent votre activité sur Google.`,
    'PROG-002': answers['P3']?.includes('organisation')
      ? `Même si votre priorité est d'améliorer votre organisation, votre diagnostic révèle une urgence plus immédiate : votre présence sur Google est insuffisante et représente un manque à gagner direct. Commencer par optimiser votre fiche Google Business Profile vous apportera des résultats visibles en quelques semaines, avant de travailler votre organisation interne.`
      : a2 === 'no'
      ? `Vous n'avez pas encore de fiche Google Business Profile — c'est votre priorité absolue. C'est le premier endroit où vos prospects vous cherchent.`
      : `Votre fiche Google existe mais n'est pas optimisée. ${a3 === 'none' || a3 === 'lt20' ? 'Vous avez très peu d\'avis clients, ce qui limite votre crédibilité locale.' : 'Il reste des leviers importants à activer pour maximiser votre visibilité.'}`,
    'PROG-003': a4 === 'rarely'
      ? `Votre présence sur les réseaux sociaux est quasi inexistante. Or vos prospects potentiels y sont actifs. Cette formation vous donnera une méthode concrète pour exister sur ces canaux de façon régulière.`
      : `Votre présence sur les réseaux est irrégulière, ce qui limite son impact. Cette formation vous donnera un système pour publier régulièrement sans y passer des heures.`,
    'PROG-004': `Votre diagnostic révèle que vous n'avez pas encore de stratégie d'acquisition structurée. Cette formation vous donnera un plan concret pour générer des prospects qualifiés de façon systématique.`,
    'PROG-006': i3 === 'never'
      ? `Vous n'avez pas encore utilisé l'IA dans votre activité. En 2025, c'est un désavantage compétitif croissant. Cette formation vous donnera les bases pour gagner du temps dès la première semaine.`
      : `Vous utilisez l'IA de façon ponctuelle. Cette formation vous apprend à en faire un vrai gain de productivité quotidien grâce à des prompts métier adaptés à votre activité.`,
    'PROG-007': `Votre diagnostic montre un potentiel IA non exploité dans votre activité. Cette formation vous aide à identifier précisément quels processus automatiser en priorité pour un impact immédiat.`,
    'PROG-008': i2 === 'more10h' || i2 === '5to10h'
      ? `Vous perdez ${i2 === 'more10h' ? 'plus de 10h' : '5 à 10h'} par semaine sur des tâches répétitives. C'est un coût caché majeur. Cette formation vous apprend à automatiser ces tâches sans compétence technique.`
      : `L'automatisation peut libérer plusieurs heures par semaine dans votre activité. Cette formation vous apprend à créer vos premiers workflows no-code rapidement.`,
    'PROG-010': `Créer des contenus régulièrement prend du temps que vous n'avez pas. Cette formation vous apprend à utiliser l'IA pour produire des posts, descriptions et visuels professionnels en quelques minutes.`,
    'PROG-011': c1 === 'memory'
      ? `Vous gérez vos prospects de tête ou sur papier. C'est la première cause de perte d'opportunités en TPE. Cette formation vous permet de structurer un suivi commercial qui ne dépend plus de votre mémoire.`
      : `Votre suivi actuel atteint ses limites. Cette formation vous permet de structurer un pipeline commercial clair avec des relances automatiques.`,
    'PROG-012': `WhatsApp est déjà utilisé par vos clients pour vous contacter. Cette formation vous apprend à en faire un outil professionnel pour gérer les prises de RDV, les relances et la relation client.`,
    'PROG-013': c4 === 'no'
      ? `Votre diagnostic indique que vous ne faites aucune action de fidélisation. Pourtant, faire revenir un client existant coûte 5 fois moins cher qu'en acquérir un nouveau. Cette formation vous donne la méthode.`
      : `Vos actions de fidélisation sont ponctuelles. Cette formation vous permet de les systématiser pour augmenter la fréquence de retour de vos clients.`,
    'PROG-015': `Votre diagnostic montre que les relances ne sont pas systématisées. C'est une perte directe de chiffre d'affaires. Cette formation vous donne des scénarios prêts à déployer qui relancent automatiquement.`,
  }

  return MAP[id] ?? `Votre diagnostic a révélé un besoin fort sur cet axe. Cette formation répond directement à l'opportunité identifiée et vous permettra d'obtenir des résultats concrets dans les 30 à 90 jours.`
}

// ── P1 : Synthèse vraiment personnalisée ───────────────────────
function buildSynthese(state: DiagnosticState, rec1: any): string {
  const company    = state.company?.name ?? 'votre activité'
  const naf        = state.company?.naf_label
  const obj        = (state.answers['P3'] ?? '').split(',')[0]
  const priorities = state.priorities ?? []
  const p1label    = priorities[0]?.label ?? ''
  const bs         = state.businessScore

  let pointFort  = 'votre présence locale'
  let pointFaible = 'votre organisation digitale'
  let pctFort = 0

  if (bs) {
    const dims = [
      { s: bs.acquisition,  max: 20, label: 'votre capacité à attirer des clients' },
      { s: bs.visibilite,   max: 20, label: 'votre présence en ligne' },
      { s: bs.conversion,   max: 15, label: 'votre processus de conversion' },
      { s: bs.fidelisation, max: 15, label: 'votre fidélisation client' },
      { s: bs.organisation, max: 15, label: 'votre organisation digitale' },
      { s: bs.ia,           max: 15, label: "votre usage de l'IA" },
    ].map(d => ({ ...d, pct: Math.round(d.s / d.max * 100) }))
     .sort((a, b) => b.pct - a.pct)
    pointFort   = dims[0].label
    pointFaible = dims[dims.length - 1].label
    pctFort     = dims[0].pct
  }

  const OBJ_MAP: Record<string, string> = {
    clients:       'attirer plus de clients',
    google:        'améliorer votre visibilité sur Google',
    reseaux:       'développer votre présence sur les réseaux sociaux',
    fidelisation:  'fidéliser vos clients existants',
    site:          'créer ou améliorer votre site web',
    temps:         'gagner du temps au quotidien',
    automatisation:'automatiser vos tâches répétitives',
    ia:            "intégrer l'IA dans votre activité",
    organisation:  'mieux organiser votre activité',
    competences:   'monter en compétences digitales',
  }

  const objLabel = OBJ_MAP[obj] ?? 'développer votre activité digitale'
  const prog1titre = rec1?.titre ?? ''

  return `${naf ? `En tant que ${naf.toLowerCase()}, v` : 'V'}otre activité dispose déjà d'un vrai potentiel — notamment sur ${pointFort}${pctFort > 60 ? ', qui est votre point fort' : ''}. En revanche, votre diagnostic fait ressortir un enjeu prioritaire autour de ${pointFaible}. Votre objectif de ${objLabel} rend particulièrement pertinent le travail sur « ${p1label} ». La formation que nous vous recommandons en priorité — ${prog1titre} — répond directement à cet enjeu.`
}

// ── Plan d'action personnalisé ──────────────────────────────────
function buildPlan(rec1: any): { now: string; d30: string; d90: string } {
  const id = rec1?.id_programme ?? ''
  const PLANS: Record<string, { now: string; d30: string; d90: string }> = {
    'PROG-001': { now: "Tapez votre activité + ville sur Google et notez où vous apparaissez.", d30: "Optimisez vos pages clés pour les mots-clés locaux et créez du contenu géolocalisé.", d90: "Apparaître dans le top 3 des résultats Google pour vos 5 mots-clés prioritaires." },
    'PROG-002': { now: "Revendiquez ou créez votre fiche Google Business Profile aujourd'hui.", d30: "Collectez vos 10 premiers avis et optimisez chaque section de votre fiche.", d90: "Atteindre 30+ avis avec une note ≥ 4.5 et doubler les contacts entrants." },
    'PROG-003': { now: "Publiez un premier post sur votre page professionnelle et observez.", d30: "Mettez en place un calendrier éditorial pour les 4 prochaines semaines.", d90: "Doubler votre audience et générer vos premiers contacts via les réseaux." },
    'PROG-006': { now: "Créez un compte ChatGPT et testez-le sur la rédaction d'un email.", d30: "Créez votre bibliothèque de 10 prompts métier personnalisés.", d90: "Économiser 5h+ par semaine grâce à l'IA intégrée dans vos tâches clés." },
    'PROG-008': { now: "Listez la tâche répétitive qui vous prend le plus de temps cette semaine.", d30: "Automatisez cette tâche avec Make ou Zapier (en moins de 2h).", d90: "Supprimer au moins 5h de tâches manuelles hebdomadaires." },
    'PROG-011': { now: "Listez vos 10 derniers prospects et notez leur statut dans un tableau.", d30: "Adoptez un CRM simple pour centraliser votre suivi commercial.", d90: "100% des prospects suivis — taux de conversion en hausse de 20%." },
    'PROG-013': { now: "Identifiez vos 20 meilleurs clients et préparez un message de réactivation.", d30: "Structurez un programme de fidélisation : anniversaire, offre de retour, parrainage.", d90: "Augmenter de 15 à 20% la fréquence de visite de vos clients existants." },
    'PROG-015': { now: "Rédigez votre premier email de relance pour les prospects sans réponse.", d30: "Créez une séquence de 3 relances automatiques avec des délais définis.", d90: "Récupérer 10 à 15% de prospects perdus grâce aux relances automatisées." },
  }
  return PLANS[id] ?? {
    now:  "Identifiez l'action ayant le plus fort impact immédiat sur votre activité.",
    d30:  "Structurez un premier processus digital pour automatiser un aspect clé.",
    d90:  "Mesurer les premiers résultats et ajuster votre stratégie digitale.",
  }
}

// ── Financement — P1 : lisible et commercial ───────────────────
function FundingBlock({ funding }: { funding: any[] }) {
  if (!funding || funding.length === 0) {
    return (
      <div style={{ background: '#F0FFF4', border: '1.5px solid #BBF7D0', borderRadius: 16, padding: '18px', marginBottom: 16 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#16A34A', letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '0 0 8px' }}>Financement possible</p>
        <p style={{ fontSize: 13, color: '#166534', lineHeight: 1.6, margin: '0 0 10px' }}>
          Une prise en charge partielle ou totale peut être possible selon votre statut, votre entreprise et les critères du financeur. MOJO ACADÉMIE peut vous aider à identifier le dispositif applicable à votre dossier.
        </p>
      </div>
    )
  }

  // Afficher uniquement le financement le plus probable
  const best = funding[0]

  return (
    <div style={{ background: '#F0FFF4', border: '1.5px solid #BBF7D0', borderRadius: 16, padding: '18px', marginBottom: 16 }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: '#16A34A', letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '0 0 8px' }}>Financement potentiel identifié</p>
      <p style={{ fontSize: 15, fontWeight: 700, color: '#166534', margin: '0 0 6px' }}>
        {best.funder}
      </p>
      <p style={{ fontSize: 13, color: '#166534', lineHeight: 1.6, margin: '0 0 12px' }}>
        Une prise en charge partielle ou totale peut être possible selon votre statut, votre entreprise et les critères du financeur. MOJO ACADÉMIE peut vérifier avec vous le dispositif applicable.
      </p>
    </div>
  )
}

export function StepReport({ state }: Props) {
  const [emailSent, setEmailSent]       = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)

  const recs: any[]      = (state as any).recommendations ?? []
  const parcoursData: any = (state as any).parcoursMatch ?? null
  const priorities        = state.priorities ?? []
  const funding           = state.funding ?? []
  const hasCompany        = !!state.company?.name
  const date              = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  // Enrichir depuis catalogue
  const recsEnriched = recs.map(r => {
    const prog = PROGRAMMES.find(p => p.id === r.id_programme)
    return prog ? { ...r, ...prog } : r
  })

  const rec1 = recsEnriched[0]
  const rec2 = recsEnriched[1]
  const rec3 = recsEnriched[2]

  const synthese    = buildSynthese(state, rec1)
  const plan        = buildPlan(rec1)
  const parcoursMatch = parcoursData?.confiance

  const calendlyBase = process.env.NEXT_PUBLIC_CALENDLY_URL ?? ''
  const calendlyUrl  = calendlyBase
    ? `${calendlyBase}?name=${encodeURIComponent((state.contact?.firstname ?? '') + ' ' + (state.contact?.lastname ?? ''))}&email=${encodeURIComponent(state.contact?.email ?? '')}&utm_source=mojo_lead_engine`
    : '#'

  const handleSendEmail = async () => {
    if (emailSent || emailLoading) return
    if (!state.contact?.email || !state.id) return
    setEmailLoading(true)
    try {
      const res = await fetch('/api/scan/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnosticId: state.id,
          email: state.contact.email,
          firstname: state.contact.firstname,
          company: state.company?.name,
          priorities: state.priorities,
          recommendations: recs,
          parcoursMatch: parcoursData,
          funding: state.funding,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) setEmailSent(true)
      else alert('Erreur : ' + (data.error ?? 'inconnue'))
    } catch (e: any) { alert('Erreur réseau') }
    finally { setEmailLoading(false) }
  }

  return (
    <div style={{ paddingTop: 24, paddingBottom: 48 }}>

      {/* EN-TÊTE */}
      <div style={{ background: NIGHT, borderRadius: 20, padding: '24px 20px', marginBottom: 20, position: 'relative' as const, overflow: 'hidden' }}>
        <div style={{ position: 'absolute' as const, top: 0, right: 0, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(200,57,154,0.3) 0%, transparent 70%)', transform: 'translate(35%, -35%)' }} />
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase' as const, margin: '0 0 6px' }}>Diagnostic digital & IA — MOJO ACADÉMIE</p>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(1.2rem, 3.5vw, 1.6rem)', fontWeight: 800, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.03em' }}>
          {hasCompany ? state.company!.name : `${state.contact?.firstname ?? 'Votre'} diagnostic`}
        </h1>
        {state.company?.naf_label && (
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '0 0 12px' }}>
            {state.company.naf_label}{state.company.city ? ` · ${state.company.city}` : ''}
          </p>
        )}
        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: 'rgba(200,57,154,0.2)', color: '#C8399A', fontWeight: 600 }}>{date}</span>
      </div>

      {/* B. SYNTHÈSE PERSONNALISÉE */}
      <div style={{ background: '#fff', border: '1.5px solid #EDEAF5', borderRadius: 16, padding: '20px', marginBottom: 16 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: VIOLET, letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '0 0 10px' }}>Votre diagnostic en un coup d'œil</p>
        <p style={{ fontSize: 14, color: '#111020', lineHeight: 1.75, margin: 0 }}>{synthese}</p>
      </div>

      {/* C. 3 PRIORITÉS */}
      {priorities.length > 0 && (
        <div style={{ background: '#fff', border: '1.5px solid #EDEAF5', borderRadius: 16, padding: '20px', marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: VIOLET, letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '0 0 14px' }}>Vos 3 priorités</p>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
            {priorities.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: i === 0 ? GRAD : LAV, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: i === 0 ? '#fff' : VIOLET }}>
                  {i === 0 ? (p.icon ?? '🎯') : i + 1}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: NIGHT, margin: 0 }}>{p.label}</p>
                  {i === 0 && p.detail && <p style={{ fontSize: 12, color: MUTED, margin: '3px 0 0', lineHeight: 1.5 }}>{p.detail}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* D. RECOMMANDATION PRINCIPALE */}
      {rec1 && (
        <div style={{ background: '#fff', border: `2px solid ${FUCHSIA}`, borderRadius: 20, padding: '20px', marginBottom: 16, position: 'relative' as const }}>
          <div style={{ position: 'absolute' as const, top: 0, left: 0, right: 0, height: 3, background: GRAD, borderRadius: '20px 20px 0 0' }} />
          <div style={{ position: 'absolute' as const, top: 16, right: 16, background: GRAD, color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>RECOMMANDATION #1</div>

          <p style={{ fontSize: 10, fontWeight: 700, color: FUCHSIA, textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '6px 0 8px', paddingRight: 110 }}>
            {rec1.pilier ?? 'Formation recommandée'}
          </p>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(1.05rem, 3vw, 1.25rem)', fontWeight: 800, color: NIGHT, margin: '0 0 6px', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {rec1.titre}
          </h2>
          {rec1.objectif && (
            <p style={{ fontSize: 13, color: MUTED, fontStyle: 'italic', margin: '0 0 14px', lineHeight: 1.4 }}>{rec1.objectif}</p>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: LAV, color: VIOLET }}>⏱ {rec1.duree_h}h</span>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: '#FBF0F7', color: FUCHSIA }}>💶 {(rec1.tarif_ht ?? 0).toLocaleString('fr-FR')} € HT</span>
            {rec1.resultat && <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 999, background: '#F0FFF4', color: '#16A34A' }}>✓ {rec1.resultat}</span>}
          </div>

          {/* Pourquoi — P0 cohérence garantie */}
          <div style={{ background: OFF, border: '1px solid #EDEAF5', borderRadius: 12, padding: '14px 16px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: VIOLET, textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 8px' }}>Pourquoi cette recommandation ?</p>
            <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.65, margin: 0 }}>
              {buildWhyFormation(rec1, state.answers)}
            </p>
          </div>
        </div>
      )}

      {/* E. FORMATIONS #2 ET #3 */}
      {(rec2 || rec3) && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '0 0 10px' }}>Recommandations complémentaires</p>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
            {[rec2, rec3].filter(Boolean).map((rec, i) => (
              <div key={i} style={{ background: '#fff', border: '1.5px solid #EDEAF5', borderRadius: 14, padding: '16px' }}>
                <p style={{ fontSize: 10, color: FUCHSIA, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', margin: '0 0 4px' }}>#{i + 2} — {rec.pilier}</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: NIGHT, margin: '0 0 4px' }}>{rec.titre}</p>
                <p style={{ fontSize: 12, color: MUTED, margin: '0 0 10px', lineHeight: 1.45 }}>
                  {buildWhyFormation(rec, state.answers).split('.')[0]}.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 11, color: VIOLET, fontWeight: 600 }}>⏱ {rec.duree_h}h</span>
                  <span style={{ fontSize: 11, color: FUCHSIA, fontWeight: 600 }}>{(rec.tarif_ht ?? 0).toLocaleString('fr-FR')} € HT</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* F. PARCOURS MÉTIER */}
      {parcoursMatch === 'MATCH_FORT' && parcoursData && (
        <div style={{ background: `linear-gradient(135deg, ${NIGHT}, #2D2A8F)`, borderRadius: 20, padding: '20px', marginBottom: 16, color: '#fff' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(200,57,154,0.9)', letterSpacing: '0.1em', textTransform: 'uppercase' as const, margin: '0 0 8px' }}>Parcours métier recommandé</p>
          <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '1.1rem', fontWeight: 800, margin: '0 0 6px' }}>{parcoursData.nom}</h3>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '0 0 12px', fontStyle: 'italic' }}>{parcoursData.promesse}</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.1)', color: '#fff' }}>35h</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: 'rgba(200,57,154,0.3)', color: '#fff' }}>3 200 € HT</span>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5, margin: 0 }}>
            Ce parcours a été conçu spécifiquement pour les {(parcoursData.metier ?? '').toLowerCase()}. Il couvre l'ensemble des compétences digitales prioritaires pour votre secteur.
          </p>
        </div>
      )}
      {parcoursMatch === 'MATCH_A_CONFIRMER' && parcoursData && (
        <div style={{ background: '#fff', border: '1.5px solid #FCD34D', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#92400E', margin: '0 0 4px' }}>💡 Un parcours métier pourrait correspondre à votre profil</p>
          <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, margin: 0 }}>
            Le parcours <strong>{parcoursData.metier}</strong> semble potentiellement adapté. Un échange avec un conseiller MOJO permettra de le confirmer.
          </p>
        </div>
      )}

      {/* H. PLAN D'ACTION 90 JOURS */}
      <div style={{ background: '#fff', border: '1.5px solid #EDEAF5', borderRadius: 16, padding: '20px', marginBottom: 16 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: VIOLET, letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '0 0 16px' }}>Votre plan d'action</p>
        {[
          { when: 'Maintenant', color: FUCHSIA, bg: '#FBF0F7', action: plan.now },
          { when: '30 jours',   color: VIOLET,   bg: LAV,      action: plan.d30 },
          { when: 'À 90 jours', color: '#16A34A', bg: '#F0FFF4', action: plan.d90 },
        ].map((item, i, arr) => (
          <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: i < arr.length - 1 ? 14 : 0, borderBottom: i < arr.length - 1 ? '1px dashed #EDEAF5' : 'none', marginBottom: i < arr.length - 1 ? 14 : 0 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: item.color, padding: '3px 8px', borderRadius: 999, background: item.bg, whiteSpace: 'nowrap' as const, flexShrink: 0, height: 'fit-content' }}>
              {item.when.toUpperCase()}
            </span>
            <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.55, margin: 0 }}>{item.action}</p>
          </div>
        ))}
      </div>

      {/* G. FINANCEMENT — P1 : lisible et commercial */}
      <FundingBlock funding={funding} />

      {/* I. CLOSING FORT — P1 : bénéfice, pas "MOJO" */}
      <div style={{ background: NIGHT, borderRadius: 20, padding: '24px 20px', marginBottom: 12 }}>
        {/* Bloc Donya — réassurance humaine + CTA RDV */}
        <DonyaBlock calendlyUrl={calendlyUrl} variant="report" />

        {/* CTA email secondaire */}
        <button onClick={handleSendEmail} disabled={emailSent || emailLoading}
          style={{ width: '100%', padding: '11px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.15)', background: 'transparent', color: emailSent ? '#4ADE80' : 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, cursor: emailSent ? 'default' : 'pointer', fontFamily: 'inherit', boxSizing: 'border-box' as const }}
        >
          {emailSent ? '✓ Rapport envoyé par email !' : emailLoading ? 'Envoi…' : 'Recevoir ce rapport par email'}
        </button>
      </div>

      {/* Réassurance finale — P2 */}
      <div style={{ background: '#fff', border: '1px solid #EDEAF5', borderRadius: 14, padding: '16px', textAlign: 'center' as const }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: NIGHT, margin: '0 0 4px' }}>MOJO ACADÉMIE</p>
        <p style={{ fontSize: 12, color: MUTED, margin: '0 0 10px', lineHeight: 1.5 }}>
          Organisme de formation certifié Qualiopi<br/>
          Formations digitales, IA, acquisition et organisation pour TPE/PME
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 8 }}>
          {'★★★★★'.split('').map((s, i) => <span key={i} style={{ fontSize: 16, color: '#F59E0B' }}>{s}</span>)}
        </div>
        <p style={{ fontSize: 11, color: '#A09BB8', margin: 0 }}>
          Diagnostic 100% gratuit · Données protégées RGPD · Sans engagement commercial
        </p>
      </div>

    </div>
  )
}
