'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { DS } from '@/lib/ds/tokens'
import type { ProspectViewModel } from '@/lib/priority/fetch-real'
import { formatDateFr } from '@/lib/priority/format-date-fr'
import { applyFilters, EMPTY_FILTERS } from '@/lib/priority/prospects-filters'

// ══════════════════════════════════════════════════════════════
// PR3 — Liste "Mes prospects" (SDR). Les données reçues sont DÉJÀ
// filtrées côté serveur par assigned_to (requête base) : ce composant
// ne fait que de la recherche/tri de confort, jamais de la sécurité.
// Réutilise applyFilters (recherche) et formatDateFr existants.
// ══════════════════════════════════════════════════════════════

const PIPELINE_LABEL: Record<string, string> = {
  A_CONTACTER: 'À contacter', EN_DISCUSSION: 'En discussion', RDV: 'RDV',
  PROPOSITION: 'Proposition', GAGNE: 'Gagné', PERDU: 'Perdu',
}
const NBA_LABEL: Record<string, string> = {
  CALL: 'Appeler', EMAIL: 'Email', QUALIFY: 'Qualifier', ENRICH: 'Enrichir',
  FOLLOW_UP: 'Relancer', PREPARE_RDV: 'Préparer RDV', PREPARE_MEETING: 'Préparer RDV',
  SEND_PROPOSAL: 'Proposer', CALLBACK: 'Rappeler', WAIT: 'Attendre',
  NURTURE: 'Relancer ultérieurement', NO_ACTION: '—', NO_ACTION_TEMPORAIRE: '—', STOP: 'Arrêté',
}

function dateTri(v: ProspectViewModel): number {
  const d = v.business.displayNba.dueAt
  return d ? new Date(d).getTime() : Number.MAX_SAFE_INTEGER
}

export function SdrProspectsTable({ all, baseHref = '/sdr/prospects' }: { all: ProspectViewModel[]; baseHref?: string }) {
  const [search, setSearch] = useState('')
  const [pipeline, setPipeline] = useState('')

  const rows = useMemo(() => {
    const filtres = { ...EMPTY_FILTERS, search, pipeline: new Set(pipeline ? [pipeline] : []) }
    return [...applyFilters(all, filtres)].sort((a, b) => dateTri(a) - dateTri(b) || a.companyName.localeCompare(b.companyName, 'fr'))
  }, [all, search, pipeline])

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px 60px', fontFamily: DS.fontBody }}>
      <div style={{ fontFamily: DS.fontDisplay, fontWeight: 800, fontSize: 22, color: DS.night, marginBottom: 4 }}>Mes prospects</div>
      <p style={{ color: DS.muted, fontSize: 13.5, marginBottom: 18 }}>{all.length} prospect(s) dans votre portefeuille.</p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' as const }}>
        <input
          placeholder="Rechercher (entreprise, commune, SIREN)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 220, padding: '9px 12px', borderRadius: DS.rMd, border: `1.5px solid ${DS.border2}`, fontSize: 13.5, fontFamily: DS.fontBody }}
        />
        <select value={pipeline} onChange={(e) => setPipeline(e.target.value)}
          style={{ padding: '9px 10px', borderRadius: DS.rMd, border: `1.5px solid ${DS.border2}`, fontSize: 13, fontFamily: DS.fontBody }}>
          <option value="">Tous les statuts</option>
          {Object.entries(PIPELINE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: 'center' as const, padding: 40, color: DS.muted, background: DS.off, borderRadius: DS.rLg }}>
          Aucun prospect ne correspond à ces critères.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' as const }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left' as const, color: DS.muted, fontSize: 11.5, textTransform: 'uppercase' as const }}>
                <th style={th}>Entreprise</th>
                <th style={th}>NAF</th>
                <th style={th}>Commune</th>
                <th style={th}>Téléphone</th>
                <th style={th}>Email</th>
                <th style={th}>Pipeline</th>
                <th style={th}>Température</th>
                <th style={th}>Prochaine action</th>
                <th style={th}>Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => {
                const email = v.emailAffichable ?? v.emailEnrichissement
                return (
                  <tr key={v.companyId} style={{ borderTop: `1px solid ${DS.border}` }}>
                    <td style={td}>
                      <Link href={`${baseHref}/${v.companyId}`} style={{ fontWeight: 700, color: DS.text, textDecoration: 'none' }}>
                        {v.companyName}
                      </Link>
                    </td>
                    <td style={td}>{v.naf ?? '—'}</td>
                    <td style={td}>{v.ville ?? '—'}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' as const }}>
                      {v.telephoneAffichable ? (
                        <a href={`tel:${v.telephoneAffichable.replace(/\s/g, '')}`} style={{ color: DS.violet, fontWeight: 700, textDecoration: 'none' }}>
                          {v.telephoneAffichable}
                        </a>
                      ) : '—'}
                    </td>
                    <td style={td}>{email ?? '—'}</td>
                    <td style={td}>{PIPELINE_LABEL[v.pipelineStage] ?? v.pipelineStage}</td>
                    <td style={td}>{v.persistedTemperature ?? '—'}</td>
                    <td style={td}>{NBA_LABEL[v.business.displayNba.type] ?? v.business.displayNba.type}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' as const }}>{v.business.displayNba.dueAt ? formatDateFr(v.business.displayNba.dueAt) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const th: React.CSSProperties = { padding: '8px 10px' }
const td: React.CSSProperties = { padding: '10px 10px', verticalAlign: 'top' }
