'use client'

import { useMemo, useState } from 'react'
import { DS } from '@/lib/ds/tokens'
import type { ReservoirProspect } from '@/lib/campagnes/fetch-reservoir'
import { pageItems as computePageItems } from '@/lib/campagnes/engine'

const PAGE_SIZE = 25

interface Filters {
  search: string
  segment: string // '' = tous
  departement: string // '' = tous
  eligibilite: string // '' = tous, sinon 'ELIGIBLE'|'AMBIGU'|'NON_ELIGIBLE'
  contact: string // '' = tous, 'JAMAIS'|'DEJA'
  opposition: string // '' = tous, 'NON'|'OUI'
}
const EMPTY_FILTERS: Filters = { search: '', segment: '', departement: '', eligibilite: '', contact: '', opposition: '' }

export function CampagneSelectionTable({ all }: { all: ReservoirProspect[] }) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showCreation, setShowCreation] = useState(false)
  const [campagneNom, setCampagneNom] = useState('')
  const [lotNom, setLotNom] = useState('')
  const [creationResult, setCreationResult] = useState<any>(null)
  const [creating, setCreating] = useState(false)

  const segments = useMemo(() => {
    const map = new Map<string, string>()
    for (const v of all) if (v.segment) map.set(v.segment, v.segmentLibelle ?? v.segment)
    return Array.from(map.entries()) // [code, libellé]
  }, [all])
  const departements = useMemo(() => Array.from(new Set(all.map((v) => v.departement).filter(Boolean))).sort(), [all])

  const filtered = useMemo(() => {
    return all.filter((v) => {
      if (filters.search && !v.raisonSociale.toLowerCase().includes(filters.search.toLowerCase()) && !v.siren.includes(filters.search)) return false
      if (filters.segment && v.segment !== filters.segment) return false
      if (filters.departement && v.departement !== filters.departement) return false
      if (filters.eligibilite && v.eligibiliteCampagne !== filters.eligibilite) return false
      if (filters.contact === 'JAMAIS' && !v.jamaisContacte) return false
      if (filters.contact === 'DEJA' && v.jamaisContacte) return false
      if (filters.opposition === 'NON' && v.oppositionActive) return false
      if (filters.opposition === 'OUI' && !v.oppositionActive) return false
      return true
    })
  }, [all, filters])

  const pageItems = computePageItems(filtered, page, PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  function toggleOne(companyId: string) {
    setSelected((s) => {
      const next = new Set(s)
      next.has(companyId) ? next.delete(companyId) : next.add(companyId)
      return next
    })
  }

  // "Sélectionner les visibles" = EXACTEMENT les lignes de la page courante
  // affichées à l'écran, jamais l'ensemble filtré (cf. consigne pagination).
  function selectVisiblePage() {
    setSelected((s) => {
      const next = new Set(s)
      pageItems.forEach((v) => next.add(v.companyId))
      return next
    })
  }
  function deselectVisiblePage() {
    setSelected((s) => {
      const next = new Set(s)
      pageItems.forEach((v) => next.delete(v.companyId))
      return next
    })
  }

  async function creerLot() {
    setCreating(true)
    try {
      const res = await fetch('/api/admin/campagnes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campagneNom, lotNom, companyIds: Array.from(selected) }),
      })
      const json = await res.json()
      setCreationResult(json)
    } catch (e: any) {
      setCreationResult({ error: e.message })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px 60px', fontFamily: DS.fontBody }}>
      <div style={{ fontFamily: DS.fontDisplay, fontWeight: 800, fontSize: 22, color: DS.night, marginBottom: 4 }}>Nouvelle campagne — sélection</div>
      <p style={{ color: DS.muted, fontSize: 13.5, marginBottom: 18 }}>{filtered.length} entreprises correspondent aux critères actuels (sur {all.length} au total).</p>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' as const, alignItems: 'center' }}>
        <input
          placeholder="Rechercher (raison sociale, SIREN)…"
          value={filters.search}
          onChange={(e) => { setFilters((f) => ({ ...f, search: e.target.value })); setPage(0) }}
          style={{ flex: 1, minWidth: 200, padding: '9px 12px', borderRadius: DS.rMd, border: `1.5px solid ${DS.border2}`, fontSize: 13.5 }}
        />
        <select value={filters.segment} onChange={(e) => { setFilters((f) => ({ ...f, segment: e.target.value })); setPage(0) }} style={selectStyle}>
          <option value="">Tous segments</option>
          {segments.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
        </select>
        <select value={filters.departement} onChange={(e) => { setFilters((f) => ({ ...f, departement: e.target.value })); setPage(0) }} style={selectStyle}>
          <option value="">Tous départements</option>
          {departements.map((d) => <option key={d} value={d!}>{d}</option>)}
        </select>
        <select value={filters.eligibilite} onChange={(e) => { setFilters((f) => ({ ...f, eligibilite: e.target.value })); setPage(0) }} style={selectStyle}>
          <option value="">Éligibilité : toutes</option>
          <option value="ELIGIBLE">Éligible campagne</option>
          <option value="AMBIGU">Ambigu</option>
          <option value="NON_ELIGIBLE">Non éligible</option>
        </select>
        <select value={filters.contact} onChange={(e) => { setFilters((f) => ({ ...f, contact: e.target.value })); setPage(0) }} style={selectStyle}>
          <option value="">Contact : tous</option>
          <option value="JAMAIS">Jamais contacté</option>
          <option value="DEJA">Déjà contacté</option>
        </select>
        <select value={filters.opposition} onChange={(e) => { setFilters((f) => ({ ...f, opposition: e.target.value })); setPage(0) }} style={selectStyle}>
          <option value="">Opposition : toutes</option>
          <option value="NON">Sans opposition</option>
          <option value="OUI">Avec opposition</option>
        </select>
      </div>

      {/* Barre de sélection */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, padding: 10, background: DS.off, borderRadius: DS.rMd, flexWrap: 'wrap' as const }}>
        <strong style={{ fontSize: 13 }}>{selected.size} sélectionné{selected.size > 1 ? 's' : ''}</strong>
        <button onClick={selectVisiblePage} style={btnSecondary}>Sélectionner cette page ({pageItems.length})</button>
        <button onClick={deselectVisiblePage} style={btnSecondary}>Désélectionner cette page</button>
        <button onClick={() => setSelected(new Set())} style={btnSecondary}>Tout désélectionner</button>
        <button disabled={selected.size === 0} onClick={() => setShowCreation(true)} style={{ ...btnPrimary, opacity: selected.size === 0 ? 0.5 : 1 }}>
          Créer un lot de campagne
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left' as const, color: DS.muted, fontSize: 11.5, textTransform: 'uppercase' as const }}>
            <th style={th}></th>
            <th style={th}>Entreprise</th>
            <th style={th}>Commune</th>
            <th style={th}>Segment</th>
            <th style={th}>Éligibilité</th>
            <th style={th}>Contact</th>
          </tr>
        </thead>
        <tbody>
          {pageItems.map((v) => (
            <tr key={v.companyId} style={{ borderTop: `1px solid ${DS.border}` }}>
              <td style={td}><input type="checkbox" checked={selected.has(v.companyId)} onChange={() => toggleOne(v.companyId)} /></td>
              <td style={td}>{v.raisonSociale}<div style={{ color: DS.muted, fontSize: 11.5 }}>{v.siren}</div></td>
              <td style={td}>{v.ville ?? '—'}</td>
              <td style={td}>{v.segmentLibelle ?? '—'}</td>
              <td style={td}><EligibiliteTag statut={v.eligibiliteCampagne} /></td>
              <td style={td}>{v.jamaisContacte ? 'Jamais contacté' : 'Déjà contacté'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} style={btnSecondary}>← Précédent</button>
          <span style={{ fontSize: 13, color: DS.muted, alignSelf: 'center' }}>Page {page + 1}/{totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} style={btnSecondary}>Suivant →</button>
        </div>
      )}

      {showCreation && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: DS.white, borderRadius: DS.rLg, padding: 24, width: 420, maxWidth: '90vw' }}>
            <h3 style={{ marginTop: 0 }}>Créer un lot de campagne</h3>
            <label style={{ fontSize: 13, fontWeight: 700 }}>Campagne</label>
            <input value={campagneNom} onChange={(e) => setCampagneNom(e.target.value)} placeholder="DIAGNOSTIQUEURS 94 — VISIBILITE LOCALE" style={{ width: '100%', padding: 8, marginBottom: 10, borderRadius: DS.rMd, border: `1px solid ${DS.border2}` }} />
            <label style={{ fontSize: 13, fontWeight: 700 }}>Lot</label>
            <input value={lotNom} onChange={(e) => setLotNom(e.target.value)} placeholder="DIAG94_BAT01" style={{ width: '100%', padding: 8, marginBottom: 14, borderRadius: DS.rMd, border: `1px solid ${DS.border2}` }} />
            <p style={{ fontSize: 12.5, color: DS.muted }}>{selected.size} entreprise(s) sélectionnée(s)</p>
            {creationResult && (
              <>
                <pre style={{ fontSize: 11, background: DS.off, padding: 8, borderRadius: 6, maxHeight: 140, overflow: 'auto' }}>{JSON.stringify(creationResult, null, 2)}</pre>
                {creationResult.lotId && (
                  <a href={`/admin/campagnes/${creationResult.lotId}`} style={{ fontSize: 13, color: DS.violet }}>→ Voir le contrôle du lot</a>
                )}
              </>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={() => setShowCreation(false)} style={btnSecondary}>Fermer</button>
              <button disabled={!campagneNom || !lotNom || creating} onClick={creerLot} style={btnPrimary}>
                {creating ? 'Création…' : 'Confirmer la création'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EligibiliteTag({ statut }: { statut: string }) {
  const color = statut === 'ELIGIBLE' ? DS.violet : statut === 'AMBIGU' ? '#B08900' : DS.subtle
  return <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999, color, border: `1.5px solid ${color}` }}>{statut}</span>
}

const th: React.CSSProperties = { padding: '8px 10px' }
const td: React.CSSProperties = { padding: '10px 10px', verticalAlign: 'top' }
const selectStyle: React.CSSProperties = { padding: '9px 10px', borderRadius: DS.rMd, border: `1.5px solid ${DS.border2}`, fontSize: 13 }
const btnSecondary: React.CSSProperties = { padding: '7px 12px', borderRadius: DS.rMd, border: `1.5px solid ${DS.border2}`, background: DS.white, fontSize: 12.5, cursor: 'pointer' }
const btnPrimary: React.CSSProperties = { padding: '8px 16px', borderRadius: DS.rMd, border: 'none', background: DS.grad, color: DS.white, fontWeight: 700, fontSize: 13, cursor: 'pointer' }
