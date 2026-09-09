'use client'
import { useState } from 'react'
import type { DiagnosticState } from '@/types'
import { PROGRAMMES } from '@/lib/scoring/catalog'
import { DonyaBlock } from '../DonyaBlock'
import {
  NIGHT, NAVY, VIOLET, FUCHSIA, MUTED, SUBTLE, BORDER, BORDER2, LAV, LAV2, OFF, GRAD, GRAD_SOFT,
  R_MD, R_LG, R_XL, FONT_DISPLAY, FONT_BODY,
  ERROR_TEXT, ERROR_BG
} from '@/lib/design/tokens'

interface Props {
  state: DiagnosticState
  next: (patch?: Partial<DiagnosticState>) => void
  back: () => void
  update: (patch: Partial<DiagnosticState>) => void
}

// ── Synthèse personnalisée ─────────────────────────────────────
function buildSynthese(state: DiagnosticState, rec1: any): string {
  const obj        = (state.answers['P3'] ?? '').split(',')[0]
  const priorities = state.priorities ?? []
  const p1label    = priorities[0]?.label ?? ''
  const bs         = state.businessScore

  let pointFort  = 'votre présence locale'
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
    pointFort  = dims[0].label
    pointFaible = dims[dims.length - 1].label
  }

  const OBJ_MAP: Record<string, string> = {
    clients: 'attirer davantage de nouveaux clients',
    google: 'améliorer votre visibilité sur Google',
    reseaux: 'développer votre présence sur les réseaux sociaux',
    fidelisation: 'fidéliser vos clients existants',
    site: 'créer ou améliorer votre site web',
    temps: 'gagner du temps au quotidien',
    automatisation: 'automatiser vos tâches répétitives',
    ia: "intégrer l'IA dans votre activité",
    organisation: 'mieux organiser votre activité',
    competences: 'monter en compétences digitales',
  }

  const naf      = state.company?.naf_label
  const prog1    = rec1?.titre ?? ''
  const objLabel = OBJ_MAP[obj] ?? 'développer votre activité digitale'

  return `${naf ? `En tant que ${naf.toLowerCase()}, v` : 'V'}otre activité dispose déjà d'un vrai potentiel — notamment sur ${pointFort}. La principale opportunité concerne ${pointFaible}. Votre objectif de ${objLabel} rend particulièrement pertinent le travail sur « ${p1label} ». La formation recommandée en priorité — ${prog1} — répond directement à cet enjeu.`
}

// ── Pourquoi cette formation ────────────────────────────────────
function buildWhyFormation(rec: any, answers: Record<string, string>): string {
  if (!rec) return ''
  const id = rec.id_programme ?? rec.prog?.id ?? ''
  const c1 = answers['C1'] ?? '', c4 = answers['C4'] ?? ''
  const i2 = answers['I2'] ?? '', i3 = answers['I3'] ?? ''
  const a2 = answers['A2'] ?? '', a3 = answers['A3'] ?? '', a4 = answers['A4'] ?? ''

  const MAP: Record<string, string> = {
    'PROG-001': `Votre diagnostic montre que vous n'apparaissez pas suffisamment dans les recherches locales. Un travail structuré sur le référencement local peut rapidement améliorer votre visibilité auprès des prospects qui cherchent votre activité sur Google.`,
    'PROG-002': answers['P3']?.includes('organisation')
      ? `Même si votre priorité est d'améliorer votre organisation, votre diagnostic révèle une urgence plus immédiate : votre présence sur Google est insuffisante et représente un manque à gagner direct. Commencer par votre fiche Google Business Profile vous apportera des résultats visibles en quelques semaines.`
      : a2 === 'no'
        ? `Vous n'avez pas encore de fiche Google Business Profile — c'est votre priorité absolue. C'est le premier endroit où vos prospects vous cherchent.`
        : `Votre fiche Google existe mais n'est pas optimisée. ${a3 === 'none' || a3 === 'lt20' ? 'Vous avez très peu d\'avis clients, ce qui limite votre crédibilité locale.' : 'Il reste des leviers importants à activer pour maximiser votre visibilité.'}`,
    'PROG-003': a4 === 'rarely'
      ? `Votre présence sur les réseaux sociaux est quasi inexistante. Or vos prospects y sont actifs. Cette formation vous donnera une méthode concrète pour publier régulièrement sans y passer des heures.`
      : `Votre présence sur les réseaux est irrégulière, ce qui limite son impact. Cette formation vous donnera un système de publication régulier et efficace.`,
    'PROG-004': `Votre diagnostic révèle que vous n'avez pas encore de stratégie d'acquisition structurée. Cette formation vous donnera un plan concret pour générer des prospects qualifiés de façon systématique.`,
    'PROG-006': i3 === 'never'
      ? `Vous n'avez pas encore utilisé l'IA dans votre activité. Cette formation vous apprend à utiliser ChatGPT de façon concrète : rédaction, devis, emails — des gains visibles dès la première semaine.`
      : `Vous utilisez l'IA de façon ponctuelle. Cette formation vous apprend à en faire un gain de productivité quotidien grâce à des prompts adaptés à votre activité.`,
    'PROG-007': `Votre diagnostic montre un potentiel IA non exploité. Cette formation vous aide à identifier précisément quels processus automatiser en priorité pour un impact immédiat.`,
    'PROG-008': i2 === 'more10h' || i2 === '5to10h'
      ? `Vous perdez ${i2 === 'more10h' ? 'plus de 10h' : '5 à 10h'} par semaine sur des tâches répétitives. Cette formation vous apprend à les automatiser sans compétence technique, avec des outils comme Make ou Zapier.`
      : `L'automatisation peut libérer plusieurs heures par semaine dans votre activité. Cette formation vous apprend à créer vos premiers workflows no-code rapidement.`,
    'PROG-010': `Créer des contenus régulièrement prend du temps. Cette formation vous apprend à utiliser l'IA pour produire des posts, descriptions et visuels professionnels en quelques minutes.`,
    'PROG-011': c1 === 'memory' || c1 === 'nothing'
      ? `Vous gérez vos prospects de tête ou sans outil structuré. C'est la première cause de perte d'opportunités. Cette formation vous permet de mettre en place un suivi commercial qui ne dépend plus de votre mémoire.`
      : `Votre suivi actuel atteint ses limites. Cette formation vous permet de structurer un pipeline commercial clair avec des relances automatiques.`,
    'PROG-012': `WhatsApp est déjà utilisé par vos clients pour vous contacter. Cette formation vous apprend à en faire un outil professionnel pour gérer les prises de RDV, les relances et la relation client.`,
    'PROG-013': c4 === 'no'
      ? `Votre diagnostic indique que vous ne faites aucune action de fidélisation. Pourtant, faire revenir un client existant coûte cinq fois moins cher qu'en acquérir un nouveau. Cette formation vous donne la méthode.`
      : `Vos actions de fidélisation sont ponctuelles. Cette formation vous permet de les systématiser pour augmenter la fréquence de retour de vos clients.`,
    'PROG-015': `Votre diagnostic montre que les relances ne sont pas systématisées. C'est une perte directe de chiffre d'affaires. Cette formation vous donne des scénarios prêts à déployer.`,
  }

  return MAP[id] ?? `Votre diagnostic a révélé un besoin fort sur cet axe. Cette formation répond directement à l'opportunité identifiée et vous permettra d'obtenir des résultats concrets dans les 30 à 90 jours.`
}

// ── Plan d'action ───────────────────────────────────────────────
function buildPlan(rec1: any): { now: string; d30: string; d90: string } {
  const id = rec1?.id_programme ?? rec1?.prog?.id ?? ''
  const PLANS: Record<string, { now: string; d30: string; d90: string }> = {
    'PROG-001': { now: "Tapez votre activité + ville sur Google et notez où vous apparaissez.", d30: "Optimisez vos pages clés pour les mots-clés locaux et créez du contenu géolocalisé.", d90: "Apparaître dans le top 3 des résultats Google pour vos mots-clés prioritaires." },
    'PROG-002': { now: "Revendiquez ou créez votre fiche Google Business Profile.", d30: "Collectez vos 10 premiers avis et optimisez chaque section de votre fiche.", d90: "Atteindre 30 avis ou plus avec une note élevée et augmenter les contacts entrants." },
    'PROG-003': { now: "Publiez un premier post sur votre page professionnelle.", d30: "Mettez en place un calendrier éditorial pour les 4 prochaines semaines.", d90: "Développer votre audience et générer vos premiers contacts via les réseaux." },
    'PROG-006': { now: "Créez un compte ChatGPT et testez-le sur la rédaction d'un email.", d30: "Créez votre bibliothèque de prompts métier personnalisés.", d90: "Économiser plusieurs heures par semaine grâce à l'IA intégrée dans vos tâches clés." },
    'PROG-008': { now: "Listez la tâche répétitive qui vous prend le plus de temps.", d30: "Automatisez cette tâche avec Make ou Zapier.", d90: "Supprimer plusieurs heures de tâches manuelles hebdomadaires." },
    'PROG-011': { now: "Listez vos 10 derniers prospects et notez leur statut.", d30: "Adoptez un CRM simple pour centraliser votre suivi commercial.", d90: "100% des prospects suivis — taux de conversion en hausse." },
    'PROG-013': { now: "Identifiez vos meilleurs clients et préparez un message de réactivation.", d30: "Structurez un programme de fidélisation : suivi, offre de retour, parrainage.", d90: "Augmenter la fréquence de visite de vos clients existants." },
    'PROG-015': { now: "Rédigez votre premier email de relance pour les prospects sans réponse.", d30: "Créez une séquence de relances automatiques avec des délais définis.", d90: "Récupérer des prospects perdus grâce aux relances automatisées." },
  }
  return PLANS[id] ?? {
    now:  "Identifiez l'action ayant le plus fort impact immédiat sur votre activité.",
    d30:  "Structurez un premier processus digital pour automatiser un aspect clé.",
    d90:  "Mesurer les premiers résultats et ajuster votre stratégie digitale.",
  }
}

// ── Bloc financement v2 — sans % ───────────────────────────────
function FundingBlock({ funding }: { funding: any[] }) {
  const f0 = funding?.[0]
  const opco = f0?.opco
  const fb   = f0?.funding_body
  const text = f0?.prospect_text

  return (
    <div style={{ background: 'var(--lav)', border: '1px solid var(--lav2)', borderRadius: 'var(--r-lg)', padding: '18px', marginBottom: 16 }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--violet)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '0 0 12px', fontFamily: 'var(--font-body)' }}>
        Financement potentiel
      </p>

      {opco && opco.opco_status !== 'unknown' && (
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 2px', fontFamily: 'var(--font-body)' }}>OPCO de rattachement (orientation)</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--night)', margin: 0, fontFamily: 'var(--font-display)' }}>{opco.opco_name}</p>
          <p style={{ fontSize: 11, color: 'var(--subtle)', margin: '2px 0 0', fontFamily: 'var(--font-body)', fontStyle: 'italic' }}>
            {opco.opco_confidence === 'medium' ? 'Probable — à confirmer' : 'Indicatif — à confirmer'}
          </p>
        </div>
      )}

      {fb && fb.funding_status !== 'unknown' && (
        <div style={{ marginBottom: 12, paddingTop: 10, borderTop: '1px solid var(--lav2)' }}>
          <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 2px', fontFamily: 'var(--font-body)' }}>Dispositif de financement potentiel</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--night)', margin: '0 0 4px', fontFamily: 'var(--font-display)' }}>{fb.funding_body}</p>
          <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, margin: 0, fontFamily: 'var(--font-body)' }}>{fb.funding_reason}</p>
        </div>
      )}

      <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, margin: 0, fontFamily: 'var(--font-body)', borderTop: '1px solid var(--lav2)', paddingTop: 10 }}>
        {text ?? 'Une prise en charge partielle ou totale peut être possible selon votre statut, votre entreprise et les critères du financeur.'}
      </p>
    </div>
  )
}


export function StepReport({ state }: Props) {
  const [emailSent,    setEmailSent]    = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)

  const recs: any[]       = (state as any).recommendations ?? []
  const parcoursData: any = (state as any).parcoursMatch ?? null
  const priorities        = state.priorities ?? []
  const funding           = state.funding ?? []
  const hasCompany        = !!state.company?.name
  const date              = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  // Enrichir depuis catalogue
  const recsEnriched = recs.map(r => {
    const prog = PROGRAMMES.find(p => p.id === r.id_programme)
    return prog ? { ...r, prog, titre: prog.titre, duree_h: prog.duree_h, tarif_ht: prog.tarif_ht, pilier: prog.pilier, objectif: prog.objectif, resultat: prog.resultat } : r
  })

  const rec1 = recsEnriched[0], rec2 = recsEnriched[1], rec3 = recsEnriched[2]
  const synthese = buildSynthese(state, rec1)
  const plan     = buildPlan(rec1)
  const parcoursMatch = parcoursData?.confiance

  const calendlyBase = process.env.NEXT_PUBLIC_CALENDLY_URL ?? ''
  const calendlyUrl  = calendlyBase
    ? `${calendlyBase}?name=${encodeURIComponent((state.contact?.firstname ?? '') + ' ' + (state.contact?.lastname ?? ''))}&email=${encodeURIComponent(state.contact?.email ?? '')}&utm_source=mojo_lead_engine`
    : '#'

  const handleSendEmail = async () => {
    if (emailSent || emailLoading || !state.contact?.email || !state.id) return
    setEmailLoading(true)
    try {
      const res = await fetch('/api/scan/send-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnosticId: state.id, email: state.contact.email, firstname: state.contact.firstname,
          company: state.company?.name, priorities: state.priorities,
          recommendations: recs, parcoursMatch: parcoursData, funding,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) setEmailSent(true)
      else alert('Erreur : ' + (data.error ?? 'inconnue'))
    } catch { alert('Erreur réseau') }
    finally { setEmailLoading(false) }
  }

  return (
    <div style={{ paddingTop: 24, paddingBottom: 48 }}>

      {/* A. EN-TÊTE */}
      <div style={{ background: 'var(--night)', borderRadius: R_XL, padding: '24px 20px', marginBottom: 20, position: 'relative' as const, overflow: 'hidden' }}>
        <div style={{ position: 'absolute' as const, top: 0, right: 0, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(200,57,154,0.3) 0%, transparent 70%)', transform: 'translate(35%, -35%)' }} />
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase' as const, margin: '0 0 6px', fontFamily: FONT_BODY }}>
          Diagnostic digital & IA — MOJO ACADÉMIE
        </p>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(1.2rem, 3.5vw, 1.6rem)', fontWeight: 800, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.03em' }}>
          {hasCompany ? state.company!.name : `${state.contact?.firstname ?? 'Votre'} diagnostic`}
        </h1>
        {state.company?.naf_label && (
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '0 0 12px', fontFamily: FONT_BODY }}>
            {state.company.naf_label}{state.company.city ? ` · ${state.company.city}` : ''}
          </p>
        )}
        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: 'rgba(200,57,154,0.2)', color: '#C8399A', fontWeight: 600, fontFamily: FONT_BODY }}>{date}</span>
      </div>

      {/* B. SYNTHÈSE */}
      <div style={{ background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: R_LG, padding: '20px', marginBottom: 16 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: VIOLET, letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '0 0 10px', fontFamily: FONT_BODY }}>
          Votre diagnostic en un coup d'œil
        </p>
        <p style={{ fontSize: 14, color: '#111020', lineHeight: 1.75, margin: 0, fontFamily: FONT_BODY }}>{synthese}</p>
      </div>

      {/* C. 3 PRIORITÉS */}
      {priorities.length > 0 && (
        <div style={{ background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: R_LG, padding: '20px', marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: VIOLET, letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '0 0 14px', fontFamily: FONT_BODY }}>
            Vos 3 priorités
          </p>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
            {priorities.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: i === 0 ? GRAD : LAV, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: i === 0 ? '#fff' : VIOLET, fontFamily: FONT_BODY }}>
                  {i + 1}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--night)', margin: 0, fontFamily: FONT_BODY }}>{p.label}</p>
                  {i === 0 && p.detail && <p style={{ fontSize: 12, color: MUTED, margin: '3px 0 0', lineHeight: 1.5, fontFamily: FONT_BODY }}>{p.detail}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* D. RECOMMANDATION #1 */}
      {rec1 && (
        <div style={{ background: '#fff', border: `2px solid ${FUCHSIA}`, borderRadius: R_XL, padding: '20px', marginBottom: 16, position: 'relative' as const }}>
          <div style={{ position: 'absolute' as const, top: 0, left: 0, right: 0, height: 3, background: GRAD, borderRadius: `${R_XL} ${R_XL} 0 0` }} />
          <div style={{ position: 'absolute' as const, top: 14, right: 14, background: GRAD, color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999, fontFamily: FONT_BODY }}>
            Recommandation n°1
          </div>
          <p style={{ fontSize: 10, fontWeight: 700, color: FUCHSIA, textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '6px 0 8px', paddingRight: 110, fontFamily: FONT_BODY }}>
            {rec1.pilier ?? 'Formation recommandée'}
          </p>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(1.05rem, 3vw, 1.25rem)', fontWeight: 800, color: 'var(--night)', margin: '0 0 6px', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {rec1.titre}
          </h2>
          {rec1.objectif && (
            <p style={{ fontSize: 13, color: MUTED, fontStyle: 'italic', margin: '0 0 14px', lineHeight: 1.4, fontFamily: FONT_BODY }}>{rec1.objectif}</p>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: LAV, color: VIOLET, fontFamily: FONT_BODY }}>{rec1.duree_h}h</span>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: '#FBF0F7', color: FUCHSIA, fontFamily: FONT_BODY }}>{(rec1.tarif_ht ?? 0).toLocaleString('fr-FR')} € HT</span>
            {rec1.resultat && <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 999, background: 'var(--lav)', color: 'var(--violet)', fontFamily: FONT_BODY }}>{rec1.resultat}</span>}
          </div>
          <div style={{ background: OFF, border: `1px solid ${BORDER}`, borderRadius: R_MD, padding: '14px 16px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: VIOLET, textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 8px', fontFamily: FONT_BODY }}>
              Pourquoi cette recommandation
            </p>
            <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.65, margin: 0, fontFamily: FONT_BODY }}>
              {buildWhyFormation(rec1, state.answers)}
            </p>
          </div>
        </div>
      )}

      {/* E. RECOMMANDATIONS #2 ET #3 */}
      {(rec2 || rec3) && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '0 0 10px', fontFamily: FONT_BODY }}>
            Recommandations complémentaires
          </p>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
            {[rec2, rec3].filter(Boolean).map((rec, i) => (
              <div key={i} style={{ background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: R_MD, padding: '16px' }}>
                <p style={{ fontSize: 10, color: FUCHSIA, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', margin: '0 0 4px', fontFamily: FONT_BODY }}>
                  #{i + 2} — {rec.pilier}
                </p>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--night)', margin: '0 0 4px', fontFamily: FONT_DISPLAY }}>{rec.titre}</p>
                <p style={{ fontSize: 12, color: MUTED, margin: '0 0 10px', lineHeight: 1.45, fontFamily: FONT_BODY }}>
                  {buildWhyFormation(rec, state.answers).split('.')[0]}.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 11, color: VIOLET, fontWeight: 600, fontFamily: FONT_BODY }}>{rec.duree_h}h</span>
                  <span style={{ fontSize: 11, color: FUCHSIA, fontWeight: 600, fontFamily: FONT_BODY }}>{(rec.tarif_ht ?? 0).toLocaleString('fr-FR')} € HT</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* F. PARCOURS MÉTIER */}
      {parcoursMatch === 'MATCH_FORT' && parcoursData && (
        <div style={{ background: `linear-gradient(135deg, ${NIGHT}, ${NAVY})`, borderRadius: R_XL, padding: '20px', marginBottom: 16, color: '#fff' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(200,57,154,0.9)', letterSpacing: '0.1em', textTransform: 'uppercase' as const, margin: '0 0 8px', fontFamily: FONT_BODY }}>
            Parcours métier recommandé
          </p>
          <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.1rem', fontWeight: 800, margin: '0 0 6px' }}>{parcoursData.nom}</h3>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '0 0 12px', fontStyle: 'italic', fontFamily: FONT_BODY }}>{parcoursData.promesse}</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.1)', color: '#fff', fontFamily: FONT_BODY }}>35h</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: 'rgba(200,57,154,0.3)', color: '#fff', fontFamily: FONT_BODY }}>3 200 € HT</span>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5, margin: 0, fontFamily: FONT_BODY }}>
            Ce parcours a été conçu spécifiquement pour les {(parcoursData.metier ?? '').toLowerCase()}. Il couvre l'ensemble des compétences digitales prioritaires pour votre secteur.
          </p>
        </div>
      )}
      {parcoursMatch === 'MATCH_A_CONFIRMER' && parcoursData && (
        <div style={{ background: '#fff', border: `1.5px solid #FCD34D`, borderRadius: R_MD, padding: '14px 16px', marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#92400E', margin: '0 0 4px', fontFamily: FONT_BODY }}>
            Un parcours métier pourrait correspondre à votre profil
          </p>
          <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, margin: 0, fontFamily: FONT_BODY }}>
            Le parcours <strong>{parcoursData.metier}</strong> semble potentiellement adapté. Un échange avec un conseiller permettra de le confirmer.
          </p>
        </div>
      )}

      {/* H. PLAN D'ACTION */}
      <div style={{ background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: R_LG, padding: '20px', marginBottom: 16 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: VIOLET, letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '0 0 16px', fontFamily: FONT_BODY }}>
          Votre plan d'action
        </p>
        {[
          { when: 'Maintenant', color: FUCHSIA, bg: '#FBF0F7', action: plan.now },
          { when: '30 jours',   color: VIOLET,   bg: LAV,      action: plan.d30 },
          { when: '90 jours',   color: 'var(--violet)', bg: 'var(--lav)', action: plan.d90 },
        ].map((item, i, arr) => (
          <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: i < arr.length - 1 ? 14 : 0, borderBottom: i < arr.length - 1 ? `1px dashed ${BORDER}` : 'none', marginBottom: i < arr.length - 1 ? 14 : 0 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: item.color, padding: '3px 8px', borderRadius: 999, background: item.bg, whiteSpace: 'nowrap' as const, flexShrink: 0, height: 'fit-content', fontFamily: FONT_BODY }}>
              {item.when.toUpperCase()}
            </span>
            <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.55, margin: 0, fontFamily: FONT_BODY }}>{item.action}</p>
          </div>
        ))}
      </div>

      {/* G. FINANCEMENT v2 */}
      <FundingBlock funding={funding} />

      {/* I. CTA FINAL avec bloc Donya */}
      <div style={{ background: 'var(--night)', borderRadius: R_XL, padding: '24px 20px', marginBottom: 12 }}>
        <DonyaBlock calendlyUrl={calendlyUrl} variant="report" />
        <button onClick={handleSendEmail} disabled={emailSent || emailLoading}
          style={{ width: '100%', padding: '11px', borderRadius: R_MD, border: `1.5px solid rgba(255,255,255,0.15)`, background: 'transparent', color: emailSent ? '#86EFAC' : 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, cursor: emailSent ? 'default' : 'pointer', fontFamily: FONT_BODY, boxSizing: 'border-box' as const }}
        >
          {emailSent ? 'Rapport envoyé par email' : emailLoading ? 'Envoi…' : 'Recevoir ce rapport par email'}
        </button>
      </div>

      {/* Réassurance finale */}
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: R_LG, padding: '16px', textAlign: 'center' as const }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--night)', margin: '0 0 4px', fontFamily: FONT_DISPLAY }}>MOJO ACADÉMIE</p>
        <p style={{ fontSize: 12, color: MUTED, margin: '0 0 8px', lineHeight: 1.5, fontFamily: FONT_BODY }}>
          Organisme de formation certifié Qualiopi<br/>
          Formations digitales, IA, acquisition et organisation pour TPE/PME
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginBottom: 8 }}>
          {[...Array(5)].map((_, i) => (
            <svg key={i} width="14" height="14" viewBox="0 0 14 14" fill="#F59E0B"><path d="M7 1l1.8 3.6L13 5.3l-3 2.9.7 4.1L7 10.3l-3.7 2 .7-4.1L1 5.3l4.2-.7z"/></svg>
          ))}
        </div>
        <p style={{ fontSize: 11, color: SUBTLE, margin: 0, fontFamily: FONT_BODY }}>
          Diagnostic 100% gratuit · Données protégées RGPD · Sans engagement commercial
        </p>
      </div>

    </div>
  )
}
