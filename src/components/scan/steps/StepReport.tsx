'use client'

import { useState } from 'react'
import type { DiagnosticState } from '@/types'

interface Props {
  state: DiagnosticState
  next: (patch?: Partial<DiagnosticState>) => void
  back: () => void
  update: (patch: Partial<DiagnosticState>) => void
}

const NIGHT = '#1A186E'
const VIOLET = '#7B3FCC'
const FUCHSIA = '#E040AB'
const MUTED = '#4B5563'
const GRAD = 'linear-gradient(135deg, #9B2FCC, #E040AB)'

function buildSynthese(state: DiagnosticState): string {
  const obj = (state.answers['P3'] ?? '').split(',')[0]
  const priorities = state.priorities ?? []
  const p1 = priorities[0]?.label ?? ''
  const p2 = priorities[1]?.label ?? ''
  const bs = state.businessScore
  let pointFort = 'votre présence locale'
  let pointFaible = 'votre organisation digitale'
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
    pointFort = dims[0].label
    pointFaible = dims[dims.length - 1].label
  }
  const OBJ_MAP: Record<string, string> = {
    clients: 'attirer davantage de nouveaux clients',
    google: 'améliorer votre visibilité sur Google',
    reseaux: 'développer votre présence sur les réseaux sociaux',
    fidelisation: 'fidéliser et faire revenir davantage vos clients',
    site: 'créer ou améliorer votre site web',
    temps: 'gagner du temps au quotidien',
    automatisation: 'automatiser vos tâches répétitives',
    ia: "intégrer l'IA dans votre activité",
    organisation: 'mieux organiser votre activité',
    competences: 'développer vos compétences digitales',
  }
  return [
    `Votre diagnostic révèle une activité avec de réels atouts — notamment ${pointFort}.`,
    `La principale opportunité de progression concerne ${pointFaible}, qui représente un levier de croissance sous-exploité.`,
    `Votre priorité — ${OBJ_MAP[obj] ?? 'développer votre activité digitale'} — est cohérente avec les résultats de ce diagnostic.`,
    p1 && p2 ? `Deux axes méritent votre attention prioritaire : ${p1} et ${p2.toLowerCase()}.` : '',
  ].filter(Boolean).join(' ')
}

function buildPourquoi(rec: any, answers: Record<string, string>): string {
  if (!rec) return ''
  const id = rec.id_programme ?? rec.item?.code ?? ''
  const c1 = answers['C1'] ?? '', c4 = answers['C4'] ?? ''
  const i3 = answers['I3'] ?? '', i2 = answers['I2'] ?? ''
  const a2 = answers['A2'] ?? '', a4 = answers['A4'] ?? ''
  const MAP: Record<string, () => string> = {
    'PROG-013': () => (c4 === 'no' ? "Votre diagnostic indique que vous ne menez pas encore d'actions de fidélisation structurées." : "Vos actions de fidélisation restent ponctuelles.") + " Cette formation vous donnera une méthode concrète pour mettre en place un système de réactivation qui génère de la récurrence sans effort supplémentaire.",
    'PROG-011': () => (c1 === 'memory' ? "Vous gérez actuellement vos prospects de tête, ce qui entraîne inévitablement des pertes d'opportunités." : "Un tableur atteint rapidement ses limites pour un suivi commercial efficace.") + " Cette formation vous permettra de structurer un pipeline commercial clair.",
    'PROG-015': () => "Votre diagnostic montre que les relances ne sont pas encore systématisées. Cette formation vous donnera des scénarios de relance prêts à déployer qui travaillent pour vous 24h/24.",
    'PROG-001': () => "Le référencement local est un levier que vous n'exploitez pas encore pleinement. Cette formation vous donnera un plan d'action SEO concret pour apparaître en tête des résultats Google dans votre zone géographique.",
    'PROG-002': () => (a2 === 'no' ? "Vous n'avez pas encore de fiche Google Business Profile — c'est votre priorité absolue." : "Votre fiche Google peut encore être optimisée.") + " Cette formation vous apprend à maximiser votre visibilité sur Google et Maps.",
    'PROG-006': () => (i3 === 'never' ? "Vous n'avez pas encore utilisé l'IA dans votre activité." : "Vous utilisez l'IA de façon occasionnelle.") + " Cette formation vous apprend à utiliser ChatGPT de façon concrète : rédaction, devis, emails — des gains visibles dès la première semaine.",
    'PROG-007': () => "Votre diagnostic montre un potentiel IA non encore exploité. Cette formation vous aidera à identifier et déployer les cas d'usage IA les plus pertinents pour votre métier.",
    'PROG-008': () => (i2 === 'more10h' ? "Vous perdez plus de 10h par semaine sur des tâches répétitives." : "L'automatisation peut vous libérer plusieurs heures par semaine.") + " Cette formation vous apprend à créer vos premiers workflows no-code sans compétence technique.",
    'PROG-012': () => "WhatsApp est déjà l'outil de communication préféré de vos clients. Cette formation vous apprend à l'utiliser professionnellement pour les prises de rendez-vous et la relation client directe.",
    'PROG-003': () => (a4 === 'rarely' ? "Votre présence sur les réseaux sociaux est quasi inexistante." : "Votre présence sur les réseaux est irrégulière.") + " Cette formation vous donnera une méthode de création de contenus et un calendrier éditorial.",
    'PROG-010': () => "Créer des contenus prend du temps. Cette formation vous apprend à utiliser l'IA pour produire des posts et visuels professionnels en quelques minutes.",
  }
  const fn = MAP[id]
  if (fn) return fn()
  return `Votre diagnostic a révélé un besoin fort sur cet axe. Cette formation répond directement à l'opportunité identifiée et vous permettra d'obtenir des résultats concrets dans les 30 à 90 jours.`
}

function buildPlanAction(state: DiagnosticState, recs: any[]): {maintenant: string; ensuite: string; a90j: string} {
  const rec1 = recs[0]
  const id1 = rec1?.id_programme ?? rec1?.item?.code ?? ''
  const MAINTENANT: Record<string, string> = {
    'PROG-002': "Revendiquez ou créez votre fiche Google Business Profile et ajoutez 5 photos de qualité.",
    'PROG-013': "Identifiez vos 20 meilleurs clients et préparez un premier message de réactivation.",
    'PROG-011': "Listez vos 10 derniers prospects et notez leur statut dans un tableau simple.",
    'PROG-015': "Rédigez votre premier email de relance pour les prospects sans réponse depuis 7 jours.",
    'PROG-006': "Créez un compte ChatGPT et testez-le sur la rédaction d'un email professionnel.",
    'PROG-008': "Identifiez la tâche que vous répétez le plus souvent cette semaine.",
    'PROG-001': "Faites un audit de votre positionnement Google en tapant votre activité + ville.",
    'PROG-003': "Publiez un post sur votre page professionnelle et observez les réactions.",
    'PROG-012': "Configurez votre profil WhatsApp Business avec vos horaires et une réponse automatique.",
    'PROG-007': "Listez 3 tâches quotidiennes que vous pourriez déléguer à une IA.",
    'PROG-010': "Demandez à ChatGPT de rédiger votre prochain post réseaux sociaux.",
  }
  const ENSUITE: Record<string, string> = {
    'PROG-002': "Mettez en place un système de collecte d'avis clients après chaque prestation.",
    'PROG-013': "Structurez un programme de fidélisation : anniversaire, offre de retour, parrainage.",
    'PROG-011': "Adoptez un CRM simple pour centraliser votre suivi commercial.",
    'PROG-015': "Créez une séquence de 3 relances automatiques avec des délais définis.",
    'PROG-006': "Créez votre bibliothèque de prompts métier pour vos 5 tâches les plus fréquentes.",
    'PROG-008': "Automatisez votre première tâche répétitive avec Make ou Zapier.",
    'PROG-001': "Optimisez vos 3 pages principales pour les mots-clés locaux de votre activité.",
    'PROG-003': "Mettez en place un calendrier éditorial pour les 4 prochaines semaines.",
    'PROG-012': "Créez vos messages types pour les cas les plus fréquents (RDV, devis, suivi).",
    'PROG-007': "Intégrez l'IA dans au moins 2 processus de votre activité quotidienne.",
    'PROG-010': "Créez un kit de contenus IA pour 1 mois de publications réseaux sociaux.",
  }
  const A90J: Record<string, string> = {
    'PROG-002': "Atteindre 30+ avis Google avec une note supérieure à 4.5 et doubler les appels entrants.",
    'PROG-013': "Augmenter de 15 à 20% la fréquence de visite de vos clients existants.",
    'PROG-011': "100% de vos prospects suivis, taux de conversion en hausse de 20%.",
    'PROG-015': "Récupérer 10 à 15% de prospects perdus grâce aux relances automatisées.",
    'PROG-006': "Économiser 5h+ par semaine grâce à l'IA intégrée dans vos tâches quotidiennes.",
    'PROG-008': "Supprimer au moins 5h de tâches manuelles par semaine grâce aux automatisations.",
    'PROG-001': "Apparaître dans le top 3 des résultats Google pour vos mots-clés locaux prioritaires.",
    'PROG-003': "Doubler votre audience organique et générer vos premiers contacts via les réseaux.",
    'PROG-012': "Gérer 100% de la relation client directe via WhatsApp Business professionnellement.",
    'PROG-007': "Avoir intégré l'IA dans 5 processus de votre activité avec des gains mesurables.",
    'PROG-010': "Produire du contenu professionnel 3× plus vite et maintenir une présence régulière.",
  }
  return {
    maintenant: MAINTENANT[id1] ?? "Identifiez l'action ayant le plus fort impact immédiat sur votre activité.",
    ensuite:    ENSUITE[id1]    ?? "Structurez un premier processus digital pour automatiser un aspect de votre activité.",
    a90j:       A90J[id1]       ?? "Mesurer les premiers résultats et ajuster votre stratégie digitale.",
  }
}

export function StepReport({ state }: Props) {
  // Hooks React — au niveau du composant uniquement
  const [emailSent, setEmailSent]       = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)

  const recs: any[]     = (state as any).recommendations ?? []
  const parcoursData: any = (state as any).parcoursMatch ?? null
  const priorities        = state.priorities ?? []
  const funding           = state.funding ?? []
  const synthese          = buildSynthese(state)
  const plan              = buildPlanAction(state, recs)
  const hasCompany        = !!state.company?.name
  const date              = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const rec1 = recs[0], rec2 = recs[1], rec3 = recs[2]
  const parcoursMatch = parcoursData?.confiance

  // Calendly paramétré avec nom + email
  const calendlyBase = process.env.NEXT_PUBLIC_CALENDLY_URL ?? ''
  const calendlyUrl = calendlyBase ? `${calendlyBase}?name=${encodeURIComponent((state.contact?.firstname ?? '') + ' ' + (state.contact?.lastname ?? ''))}&email=${encodeURIComponent(state.contact?.email ?? '')}&utm_source=mojo_lead_engine` : ''

  const handleSendEmail = async () => {
    if (emailSent || emailLoading || !state.contact?.email) return
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
        }),
      })
      if (res.ok) setEmailSent(true)
    } catch (e) { console.error(e) }
    finally { setEmailLoading(false) }
  }

  return (
    <div style={{ paddingTop: 24, paddingBottom: 48 }}>

      {/* A. EN-TÊTE */}
      <div style={{ background: NIGHT, borderRadius: 20, padding: '24px 20px', marginBottom: 20, position: 'relative' as const, overflow: 'hidden' }}>
        <div style={{ position: 'absolute' as const, top: 0, right: 0, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(224,64,171,0.3) 0%, transparent 70%)', transform: 'translate(40%, -40%)' }} />
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' as const, margin: '0 0 8px' }}>Diagnostic digital & IA — MOJO Académie</p>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(1.3rem, 3.5vw, 1.7rem)', fontWeight: 800, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.03em' }}>
          {hasCompany ? state.company!.name : 'Votre rapport personnalisé'}
        </h1>
        {state.company?.naf_label && (
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '0 0 12px' }}>{state.company.naf_label}{state.company.city ? ` · ${state.company.city}` : ''}</p>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: 'rgba(224,64,171,0.2)', color: '#E040AB', fontWeight: 600 }}>{date}</span>
          {(state as any).leadScore?.level && (
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
              {(state as any).leadScore.level === 'priority' ? '🔥 Projet prioritaire' : (state as any).leadScore.level === 'hot' ? '⚡ Projet chaud' : '✓ Projet qualifié'}
            </span>
          )}
        </div>
      </div>

      {/* B. SYNTHÈSE */}
      <div style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 16, padding: '20px', marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: VIOLET, letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '0 0 10px' }}>Synthèse de votre diagnostic</p>
        <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.7, margin: 0 }}>{synthese}</p>
      </div>

      {/* C. 3 PRIORITÉS */}
      <div style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 16, padding: '20px', marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: VIOLET, letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '0 0 14px' }}>Vos 3 priorités</p>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
          {priorities.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: i === 0 ? GRAD : 'rgba(123,63,204,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: i === 0 ? 14 : 13, fontWeight: 700, color: i === 0 ? '#fff' : VIOLET }}>
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

      {/* D. FORMATION #1 */}
      {rec1 && (
        <div style={{ background: '#fff', border: '2px solid #E040AB', borderRadius: 20, padding: '20px', marginBottom: 16, position: 'relative' as const, overflow: 'hidden' }}>
          <div style={{ position: 'absolute' as const, top: 16, right: 16, background: GRAD, color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 999, letterSpacing: '0.05em' }}>RECOMMANDATION #1</div>
          <p style={{ fontSize: 11, fontWeight: 700, color: FUCHSIA, letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '0 0 8px', paddingRight: 120 }}>{rec1.pilier ?? '—'}</p>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(1.1rem, 3vw, 1.3rem)', fontWeight: 800, color: NIGHT, margin: '0 0 8px', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{rec1.titre ?? rec1.item?.title}</h2>
          {rec1.objectif && <p style={{ fontSize: 13, color: MUTED, margin: '0 0 14px', fontStyle: 'italic' }}>{rec1.objectif}</p>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const, marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: 'rgba(123,63,204,0.08)', color: VIOLET }}>⏱ {rec1.duree_h ?? rec1.item?.duration_h}h</span>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: 'rgba(224,64,171,0.08)', color: FUCHSIA }}>💶 {(rec1.tarif_ht ?? rec1.item?.price_ht ?? 0).toLocaleString('fr-FR')} € HT</span>
            {rec1.resultat && <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 999, background: '#F0FFF4', color: '#16A34A' }}>✓ {rec1.resultat}</span>}
          </div>
          <div style={{ background: 'linear-gradient(135deg, rgba(123,63,204,0.04), rgba(224,64,171,0.04))', border: '1px solid rgba(123,63,204,0.12)', borderRadius: 12, padding: '14px 16px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: VIOLET, letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '0 0 8px' }}>Pourquoi cette formation ?</p>
            <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, margin: 0 }}>{buildPourquoi(rec1, state.answers)}</p>
          </div>
        </div>
      )}

      {/* E. FORMATIONS #2 ET #3 */}
      {(rec2 || rec3) && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '0 0 10px' }}>Autres formations recommandées</p>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
            {[rec2, rec3].filter(Boolean).map((rec, i) => (
              <div key={i} style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14, padding: '16px' }}>
                <p style={{ fontSize: 11, color: FUCHSIA, fontWeight: 700, margin: '0 0 4px' }}>#{i + 2} — {rec.pilier ?? ''}</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: NIGHT, margin: '0 0 4px' }}>{rec.titre ?? rec.item?.title}</p>
                <p style={{ fontSize: 12, color: MUTED, margin: '0 0 8px', lineHeight: 1.4 }}>{buildPourquoi(rec, state.answers).split('.')[0] + '.'}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 11, color: VIOLET, fontWeight: 600 }}>⏱ {rec.duree_h ?? rec.item?.duration_h}h</span>
                  <span style={{ fontSize: 11, color: FUCHSIA, fontWeight: 600 }}>{(rec.tarif_ht ?? rec.item?.price_ht ?? 0).toLocaleString('fr-FR')} € HT</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* F. PARCOURS MÉTIER */}
      {parcoursMatch === 'MATCH_FORT' && parcoursData && (
        <div style={{ background: `linear-gradient(135deg, ${NIGHT}, #2D2A8F)`, borderRadius: 20, padding: '20px', marginBottom: 16, color: '#fff' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(224,64,171,0.9)', letterSpacing: '0.1em', textTransform: 'uppercase' as const, margin: '0 0 8px' }}>Parcours métier recommandé</p>
          <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '1.2rem', fontWeight: 800, margin: '0 0 6px' }}>{parcoursData.nom}</h3>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '0 0 14px', fontStyle: 'italic' }}>{parcoursData.promesse}</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const, marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.1)', color: '#fff' }}>35h de formation</span>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: 'rgba(224,64,171,0.3)', color: '#fff' }}>3 200 € HT</span>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5, margin: 0 }}>
            Ce parcours a été conçu spécifiquement pour les {(parcoursData.metier ?? '').toLowerCase()}. Il couvre l'ensemble des compétences digitales prioritaires pour votre secteur avec un livrable concret à l'issue.
          </p>
        </div>
      )}

      {parcoursMatch === 'MATCH_A_CONFIRMER' && parcoursData && (
        <div style={{ background: '#fff', border: '1.5px solid #FCD34D', borderRadius: 16, padding: '16px 18px', marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#92400E', margin: '0 0 6px' }}>💡 Un parcours métier pourrait correspondre à votre activité</p>
          <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, margin: '0 0 4px' }}>
            Le parcours <strong>{parcoursData.metier}</strong> semble potentiellement adapté à votre profil. Un échange avec un conseiller MOJO permettra de confirmer si ce parcours constitue la meilleure option pour vous.
          </p>
          <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{parcoursData.raison}</p>
        </div>
      )}

      {/* G. FINANCEMENT */}
      <div style={{ background: '#F0FFF4', border: '1.5px solid #BBF7D0', borderRadius: 16, padding: '18px', marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#16A34A', letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '0 0 8px' }}>Financement de votre formation</p>
        <p style={{ fontSize: 13, color: '#166534', lineHeight: 1.6, margin: '0 0 12px' }}>
          Selon votre situation, cette formation peut éventuellement faire l'objet d'une prise en charge par votre OPCO ou votre fonds de formation, sous réserve des critères en vigueur.
        </p>
        {funding.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            {funding.slice(0, 2).map((f: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: '#16A34A' }}>→</span>
                <span style={{ fontSize: 13, color: '#166534', fontWeight: 600 }}>{f.funder}</span>
                <span style={{ fontSize: 12, color: '#4B7A4B' }}>{f.coverage_label}</span>
              </div>
            ))}
          </div>
        )}
        <a href={calendlyUrl || '#'} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', fontSize: 13, fontWeight: 700, color: '#16A34A', background: 'none', border: '1.5px solid #16A34A', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none' }}>
          Vérifier mes possibilités de financement →
        </a>
      </div>

      {/* H. PLAN D'ACTION */}
      <div style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 16, padding: '20px', marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: VIOLET, letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '0 0 16px' }}>Votre plan d'action</p>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 0 }}>
          {[
            { when: 'Maintenant', color: FUCHSIA, bg: 'rgba(224,64,171,0.06)', action: plan.maintenant },
            { when: '30 jours',   color: VIOLET,  bg: 'rgba(123,63,204,0.06)', action: plan.ensuite },
            { when: 'À 90 jours', color: '#16A34A', bg: 'rgba(22,163,74,0.06)', action: plan.a90j },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 0, paddingBottom: i < 2 ? 14 : 0, borderBottom: i < 2 ? '1px dashed #E5E7EB' : 'none', marginBottom: i < 2 ? 14 : 0 }}>
              <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, color: item.color, padding: '3px 8px', borderRadius: 999, background: item.bg, letterSpacing: '0.05em', whiteSpace: 'nowrap' as const, flexShrink: 0, height: 'fit-content' }}>
                {item.when.toUpperCase()}
              </span>
              <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, margin: 0, paddingLeft: 12 }}>{item.action}</p>
            </div>
          ))}
        </div>
      </div>

      {/* I. CTA FINAL */}
      <div style={{ background: NIGHT, borderRadius: 20, padding: '24px 20px', textAlign: 'center' as const }}>
        <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: '0 0 8px', lineHeight: 1.3 }}>
          Transformer ce diagnostic en plan d'action concret ?
        </p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '0 0 20px', lineHeight: 1.5 }}>
          Un conseiller MOJO Académie peut vous aider à prioriser, financer et planifier votre parcours.
        </p>
        <a href={calendlyUrl || '#'} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', padding: '14px', borderRadius: 12, background: GRAD, color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none', textAlign: 'center' as const, marginBottom: 10, boxShadow: '0 6px 20px rgba(224,64,171,0.4)', boxSizing: 'border-box' as const }}>
          📅 Échanger avec MOJO Académie
        </a>
        <button
          onClick={handleSendEmail}
          disabled={emailSent || emailLoading}
          style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.2)', background: 'transparent', color: emailSent ? '#4ADE80' : 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 600, cursor: emailSent ? 'default' : 'pointer', fontFamily: 'inherit', boxSizing: 'border-box' as const }}
        >
          {emailSent ? '✓ Diagnostic envoyé par email !' : emailLoading ? 'Envoi en cours…' : '📧 Recevoir mon diagnostic par email'}
        </button>
      </div>
    </div>
  )
}
// cache bust Mon Sep  7 22:05:32 UTC 2026
