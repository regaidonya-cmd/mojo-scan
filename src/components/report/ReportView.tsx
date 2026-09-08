'use client'

import { PROGRAMMES } from '@/lib/scoring/catalog'

const NIGHT   = '#1A186E'
const VIOLET  = '#6B35B8'
const FUCHSIA = '#C8399A'
const MUTED   = '#6B6680'
const OFF     = '#F7F6FC'
const GRAD    = 'linear-gradient(135deg, #6B35B8, #C8399A)'
const CALENDLY = process.env.NEXT_PUBLIC_CALENDLY_URL ?? 'https://calendly.com/regai-donya/diagnostic-digital-offert-10-min-passez-a-l-action'

export function ReportView({ diag }: { diag: any }) {
  const company  = Array.isArray(diag.companies) ? diag.companies[0] : diag.companies
  const contact  = Array.isArray(diag.contacts)  ? diag.contacts[0]  : diag.contacts
  const recs     = (diag.recommendations ?? []).sort((a: any, b: any) => a.rank - b.rank)
  const snapshot = diag.internal_snapshot ?? {}
  const priorities = diag.priorities ?? []
  const funding  = diag.financement_details ?? []
  const date     = new Date(diag.completed_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  // Enrichir les recommandations depuis le catalogue
  const recsEnriched = recs.map((r: any) => {
    const prog = PROGRAMMES.find(p => p.id === r.catalog_code)
    return { ...r, prog }
  })

  const calendlyUrl = `${CALENDLY}?name=${encodeURIComponent((contact?.firstname ?? '') + ' ' + (contact?.lastname ?? ''))}&email=${encodeURIComponent(contact?.email ?? '')}&utm_source=mojo_lead_engine_report`

  return (
    <div style={{ minHeight: '100vh', background: OFF, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <header style={{ background: NIGHT, padding: '0 16px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/logo-white.png" alt="MOJO ACADÉMIE" style={{ height: 28 }} />
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999, background: 'rgba(200,57,154,0.2)', border: '1px solid rgba(200,57,154,0.3)', color: '#C8399A', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
              Rapport
            </span>
          </div>
        </div>
        {/* Barre gradient */}
        <div style={{ height: 2, background: GRAD }} />
      </header>

      <main style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 64px' }}>

        {/* En-tête rapport */}
        <div style={{ background: NIGHT, borderRadius: 20, padding: '24px 20px', marginBottom: 20, position: 'relative' as const, overflow: 'hidden' }}>
          <div style={{ position: 'absolute' as const, top: 0, right: 0, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(200,57,154,0.3) 0%, transparent 70%)', transform: 'translate(35%, -35%)' }} />
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase' as const, margin: '0 0 6px' }}>Diagnostic digital & IA — MOJO ACADÉMIE</p>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(1.2rem, 3.5vw, 1.6rem)', fontWeight: 800, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.03em' }}>
            {company?.name ?? contact?.firstname ?? 'Votre rapport'}
          </h1>
          {company?.naf_label && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '0 0 12px' }}>{company.naf_label}{company.city ? ` · ${company.city}` : ''}</p>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: 'rgba(200,57,154,0.2)', color: '#C8399A', fontWeight: 600 }}>{date}</span>
          </div>
        </div>

        {/* 3 Priorités */}
        {priorities.length > 0 && (
          <div style={{ background: '#fff', border: '1.5px solid #EDEAF5', borderRadius: 16, padding: '20px', marginBottom: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: VIOLET, letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '0 0 14px' }}>Vos 3 priorités</p>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
              {priorities.map((p: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: i === 0 ? GRAD : 'rgba(107,53,184,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: i === 0 ? 14 : 13, fontWeight: 700, color: i === 0 ? '#fff' : VIOLET }}>
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

        {/* Formations recommandées */}
        {recsEnriched.map((r: any, i: number) => (
          <div key={i} style={{ background: '#fff', border: i === 0 ? `2px solid ${FUCHSIA}` : '1.5px solid #EDEAF5', borderRadius: i === 0 ? 20 : 14, padding: '18px', marginBottom: 12, position: 'relative' as const }}>
            {i === 0 && <div style={{ position: 'absolute' as const, top: 14, right: 14, background: GRAD, color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>RECOMMANDATION #1</div>}
            <p style={{ fontSize: 10, fontWeight: 700, color: FUCHSIA, textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: `0 0 6px`, paddingRight: i === 0 ? 110 : 0 }}>
              {r.prog?.pilier ?? `Formation #${i + 1}`}
            </p>
            <p style={{ fontSize: i === 0 ? 16 : 14, fontWeight: 700, color: NIGHT, margin: '0 0 6px', lineHeight: 1.3, fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              {r.prog?.titre ?? r.catalog_code}
            </p>
            {r.prog?.objectif && <p style={{ fontSize: 12, color: MUTED, fontStyle: 'italic', margin: '0 0 10px', lineHeight: 1.4 }}>{r.prog.objectif}</p>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: 'rgba(107,53,184,0.08)', color: VIOLET }}>⏱ {r.prog?.duree_h}h</span>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: 'rgba(200,57,154,0.08)', color: FUCHSIA }}>💶 {(r.prog?.tarif_ht ?? 0).toLocaleString('fr-FR')} € HT</span>
              {r.prog?.resultat && <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: '#F0FFF4', color: '#16A34A' }}>✓ {r.prog.resultat}</span>}
            </div>
          </div>
        ))}

        {/* Financement */}
        <div style={{ background: '#F0FFF4', border: '1.5px solid #BBF7D0', borderRadius: 16, padding: '18px', marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#16A34A', letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '0 0 8px' }}>Financement</p>
          <p style={{ fontSize: 13, color: '#166534', lineHeight: 1.6, margin: '0 0 10px' }}>
            Selon votre situation, cette formation peut éventuellement faire l'objet d'une prise en charge par votre OPCO ou votre fonds de formation, sous réserve des critères en vigueur.
          </p>
          {funding.slice(0, 2).map((f: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: '#16A34A' }}>→</span>
              <span style={{ fontSize: 13, color: '#166534', fontWeight: 600 }}>{f.funder}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ background: NIGHT, borderRadius: 20, padding: '24px 20px', textAlign: 'center' as const }}>
          <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: '0 0 8px', lineHeight: 1.3 }}>
            Transformer ce diagnostic en plan d'action ?
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '0 0 20px' }}>
            Un conseiller MOJO ACADÉMIE vous accompagne dans la mise en œuvre.
          </p>
          <a href={calendlyUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: '14px', borderRadius: 12, background: GRAD, color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none', textAlign: 'center' as const, marginBottom: 10, boxShadow: '0 6px 20px rgba(200,57,154,0.4)' }}>
            📅 Échanger avec MOJO ACADÉMIE
          </a>
        </div>

      </main>
    </div>
  )
}
