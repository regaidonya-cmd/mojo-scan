'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { DS } from '@/lib/ds/tokens'
import type { ProspectViewModel } from '@/lib/priority/fetch-real'
import { applyFilters, sortProspects, QUICK_VIEWS, EMPTY_FILTERS, ProspectsFilters, SortKey } from '@/lib/priority/prospects-filters'

const PAGE_SIZE = 25

const NBA_LABEL: Record<string, string> = {
  CALL: 'Appeler', EMAIL: 'Email', QUALIFY: 'Qualifier', ENRICH: 'Enrichir',
  FOLLOW_UP: 'Relancer', PREPARE_RDV: 'Préparer RDV', PREPARE_MEETING: 'Préparer RDV',
  SEND_PROPOSAL: 'Proposer', CALLBACK: 'Rappeler',
  WAIT: 'Attendre', NURTURE: 'Relancer ultérieurement', NO_ACTION: '—', NO_ACTION_TEMPORAIRE: '—', STOP: '—',
}
const PIPELINE_LABEL: Record<string, string> = {
  A_CONTACTER: 'À contacter', EN_DISCUSSION: 'En discussion', RDV: 'RDV',
  PROPOSITION: 'Proposition', GAGNE: 'Gagné', PERDU: 'Perdu',
}
const NOT_READY_RAISON: Record<string, string> = {
  QUALIFY: 'Interlocuteur à qualifier',
  ENRICH: 'Connaissance insuffisante',
  NO_ACTION_TEMPORAIRE: 'Aucun canal exploitable',
}

export function ProspectsTable({ all }: { all: ProspectViewModel[] }) {
  const [filters, setFilters] = useState<ProspectsFilters>(EMPTY_FILTERS)
  const [sortKey, setSortKey] = useState<SortKey>('DEFAULT')
  const [quickView, setQuickView] = useState<string>('TOUS')
  const [page, setPage] = useState(0)

  const base = useMemo(() => QUICK_VIEWS.find((q) => q.id === quickView)!.apply(all), [all, quickView])
  const filtered = useMemo(() => applyFilters(base, filters), [base, filters])
  const sorted = useMemo(() => sortProspects(filtered, sortKey), [filtered, sortKey])
  const pageItems = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px 60px', fontFamily: DS.fontBody }}>
      <div style={{ fontFamily: DS.fontDisplay, fontWeight: 800, fontSize: 22, color: DS.night, marginBottom: 4 }}>Prospects</div>
      <p style={{ color: DS.muted, fontSize: 13.5, marginBottom: 18 }}>{all.filter((v) => v.engine.priorite !== 'STOP').length} prospects dans votre base.</p>

      {/* Vues rapides */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' as const }}>
        {QUICK_VIEWS.map((q) => (
          <button
            key={q.id}
            onClick={() => {
              setQuickView(q.id)
              setPage(0)
            }}
            style={{
              padding: '7px 14px',
              borderRadius: 999,
              border: `1.5px solid ${quickView === q.id ? 'transparent' : DS.border2}`,
              background: quickView === q.id ? DS.grad : DS.white,
              color: quickView === q.id ? DS.white : DS.text,
              fontWeight: 700,
              fontSize: 12.5,
              cursor: 'pointer',
            }}
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* Recherche + filtres */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' as const, alignItems: 'center' }}>
        <input
          placeholder="Rechercher (entreprise, ville, SIREN, interlocuteur)…"
          value={filters.search}
          onChange={(e) => {
            setFilters((f) => ({ ...f, search: e.target.value }))
            setPage(0)
          }}
          style={{ flex: 1, minWidth: 220, padding: '9px 12px', borderRadius: DS.rMd, border: `1.5px solid ${DS.border2}`, fontSize: 13.5, fontFamily: DS.fontBody }}
        />
        <MultiSelect label="Potentiel" options={['FORT', 'MOYEN', 'FAIBLE']} selected={filters.potentiel} onChange={(s) => { setFilters((f) => ({ ...f, potentiel: s })); setPage(0) }} />
        <MultiSelect label="Température" options={['CHAUD', 'TIEDE', 'FROID']} selected={filters.temperature} onChange={(s) => { setFilters((f) => ({ ...f, temperature: s })); setPage(0) }} />
        <MultiSelect label="Priorité" options={['P0', 'P1', 'P2', 'P3', 'P4']} selected={filters.priorite} onChange={(s) => { setFilters((f) => ({ ...f, priorite: s })); setPage(0) }} />
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          style={{ padding: '9px 10px', borderRadius: DS.rMd, border: `1.5px solid ${DS.border2}`, fontSize: 13, fontFamily: DS.fontBody }}
        >
          <option value="DEFAULT">Tri par défaut</option>
          <option value="ENTREPRISE">Entreprise</option>
          <option value="POTENTIEL">Potentiel</option>
          <option value="TEMPERATURE">Température</option>
          <option value="VILLE">Ville</option>
        </select>
      </div>

      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center' as const, padding: 40, color: DS.muted, background: DS.off, borderRadius: DS.rLg }}>
          Aucun prospect ne correspond à ces critères.
        </div>
      ) : (
        <>
          {/* Desktop : table compacte. Mobile : cartes (media query via classes) */}
          <div className="prospects-table-desktop">
            <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left' as const, color: DS.muted, fontSize: 11.5, textTransform: 'uppercase' as const }}>
                  <th style={th}>Entreprise</th>
                  <th style={th}>Potentiel</th>
                  <th style={th}>Température</th>
                  <th style={th}>Statut</th>
                  <th style={th}>Priorité</th>
                  <th style={th}>NBA</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((v) => (
                  <tr key={v.companyId} style={{ borderTop: `1px solid ${DS.border}` }}>
                    <td style={td}>
                      <Link href={`/admin/prospects/${v.companyId}`} style={{ fontWeight: 700, color: DS.text, textDecoration: 'none' }}>
                        {v.companyName}
                      </Link>
                      <div style={{ color: DS.muted, fontSize: 12 }}>
                        {v.ville ?? '—'}
                        {v.distanceKm != null && ` · ${v.distanceKm.toFixed(0)} km`}
                      </div>
                    </td>
                    <td style={td}>{v.engine.potentiel}</td>
                    <td style={td}>{v.engine.temperature}</td>
                    <td style={td}>
                      {v.business.ready ? (
                        <Tag label="READY" color={DS.violet} filled />
                      ) : (
                        <Tag label={NOT_READY_RAISON[v.business.displayNba.type] ?? 'À préparer'} color={DS.subtle} />
                      )}
                    </td>
                    <td style={td}>{v.engine.priorite}</td>
                    <td style={td}>
                      {NBA_LABEL[v.business.displayNba.type] ?? v.business.displayNba.type}
                      {v.business.displayNba.dueAt && (
                        <div style={{ fontSize: 11, color: DS.muted }}>{new Date(v.business.displayNba.dueAt).toLocaleDateString('fr-FR')}</div>
                      )}
                    </td>
                    <td style={td}>
                      <Link href={`/admin/prospects/${v.companyId}`} style={actionLinkStyle(v.business.ready)}>
                        Voir la fiche →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="prospects-cards-mobile">
            {pageItems.map((v) => (
              <div key={v.companyId} style={{ border: `1px solid ${DS.border}`, borderRadius: DS.rMd, padding: 14, marginBottom: 10 }}>
                <Link href={`/admin/prospects/${v.companyId}`} style={{ fontWeight: 700, color: DS.text, fontSize: 14.5, textDecoration: 'none' }}>
                  {v.companyName}
                </Link>
                <div style={{ color: DS.muted, fontSize: 12.5, margin: '4px 0 8px' }}>
                  {v.ville ?? '—'} · {v.engine.potentiel} · {v.engine.temperature}
                </div>
                <div style={{ marginBottom: 8 }}>
                  {v.business.ready ? <Tag label="READY" color={DS.violet} filled /> : <Tag label={NOT_READY_RAISON[v.business.displayNba.type] ?? 'À préparer'} color={DS.subtle} />}
                </div>
                <Link href={`/admin/prospects/${v.companyId}`} style={actionLinkStyle(v.business.ready)}>
                  Voir la fiche →
                </Link>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
              <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} style={pagerBtn}>← Précédent</button>
              <span style={{ fontSize: 13, color: DS.muted, alignSelf: 'center' }}>Page {page + 1}/{totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} style={pagerBtn}>Suivant →</button>
            </div>
          )}
        </>
      )}

      <style>{`
        .prospects-cards-mobile { display: none; }
        @media (max-width: 720px) {
          .prospects-table-desktop { display: none; }
          .prospects-cards-mobile { display: block; }
        }
      `}</style>
    </div>
  )
}

function MultiSelect({ label, options, selected, onChange }: { label: string; options: string[]; selected: Set<string>; onChange: (s: Set<string>) => void }) {
  return (
    <details style={{ position: 'relative' as const }}>
      <summary style={{ listStyle: 'none' as const, cursor: 'pointer', padding: '9px 12px', borderRadius: DS.rMd, border: `1.5px solid ${DS.border2}`, fontSize: 13, color: selected.size ? DS.violet : DS.text, fontWeight: selected.size ? 700 : 500 }}>
        {label} {selected.size ? `(${selected.size})` : ''}
      </summary>
      <div style={{ position: 'absolute' as const, top: '110%', left: 0, background: DS.white, border: `1px solid ${DS.border}`, borderRadius: DS.rMd, padding: 8, zIndex: 10, minWidth: 140 }}>
        {options.map((o) => (
          <label key={o} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={selected.has(o)}
              onChange={(e) => {
                const next = new Set(selected)
                e.target.checked ? next.add(o) : next.delete(o)
                onChange(next)
              }}
            />
            {o}
          </label>
        ))}
      </div>
    </details>
  )
}

function Tag({ label, color, filled }: { label: string; color: string; filled?: boolean }) {
  return (
    <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999, color: filled ? DS.white : color, background: filled ? color : 'transparent', border: filled ? 'none' : `1.5px solid ${color}` }}>
      {label}
    </span>
  )
}

const th: React.CSSProperties = { padding: '8px 10px' }
const td: React.CSSProperties = { padding: '10px 10px', verticalAlign: 'top' }
function actionLinkStyle(ready: boolean): React.CSSProperties {
  return {
    display: 'inline-block',
    padding: '7px 14px',
    borderRadius: DS.rMd,
    border: 'none',
    background: ready ? DS.grad : DS.lav,
    color: ready ? DS.white : DS.violet,
    fontWeight: 700,
    fontSize: 12.5,
    textDecoration: 'none',
  }
}
const pagerBtn: React.CSSProperties = { padding: '8px 14px', borderRadius: DS.rMd, border: `1.5px solid ${DS.border2}`, background: DS.white, fontSize: 13, cursor: 'pointer' }
