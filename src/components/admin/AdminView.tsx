'use client'

import { useState } from 'react'

const NIGHT  = '#1A186E'
const VIOLET = '#6B35B8'
const FUCHSIA= '#C8399A'
const MUTED  = '#6B6680'
const GRAD   = 'linear-gradient(135deg, #6B35B8, #C8399A)'

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  NEW:                   { label: 'Nouveau',          color: '#6B35B8', bg: '#EDE9FB' },
  DIAGNOSTIC_COMPLETED:  { label: 'Diagnostic fait',  color: '#1A186E', bg: '#E8E8F5' },
  REPORT_SENT:           { label: 'Rapport envoyé',   color: '#16A34A', bg: '#F0FFF4' },
  APPOINTMENT_CLICKED:   { label: 'RDV cliqué',       color: '#C8399A', bg: '#FDF0F7' },
  CONTACTED:             { label: 'Contacté',         color: '#D97706', bg: '#FEF3C7' },
  QUALIFIED:             { label: 'Qualifié',         color: '#0369A1', bg: '#E0F2FE' },
  CLIENT:                { label: 'Client',            color: '#16A34A', bg: '#DCFCE7' },
  LOST:                  { label: 'Perdu',            color: '#DC2626', bg: '#FEF2F2' },
}

function exportCSV(diagnostics: any[]) {
  const headers = ['Date','Prénom','Nom','Email','Téléphone','Entreprise','Ville','Mode','Score Lead','Score Business','Branche','Objectif','Statut','Rapport']
  const rows = diagnostics.map(d => {
    const c = Array.isArray(d.contacts) ? d.contacts[0] : d.contacts
    const co = Array.isArray(d.companies) ? d.companies[0] : d.companies
    return [
      new Date(d.completed_at).toLocaleDateString('fr-FR'),
      c?.firstname ?? '', c?.lastname ?? '', c?.email ?? '', c?.phone ?? '',
      co?.name ?? '', co?.city ?? '',
      d.mode, d.lead_score ?? '', d.business_score ?? '',
      d.branch ?? '', d.objective_main ?? '',
      c?.status ?? '',
      `https://mojo-scan.vercel.app/report/${d.report_token}`,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`)
  })
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mojo-leads-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
}

export function AdminView({ diagnostics, password }: { diagnostics: any[]; password: string }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const filtered = diagnostics.filter(d => {
    const c = Array.isArray(d.contacts) ? d.contacts[0] : d.contacts
    const co = Array.isArray(d.companies) ? d.companies[0] : d.companies
    const q = search.toLowerCase()
    const matchSearch = !q || [c?.email, c?.firstname, c?.lastname, co?.name].some(v => v?.toLowerCase().includes(q))
    const matchFilter = filter === 'all' || c?.status === filter
    return matchSearch && matchFilter
  })

  const stats = {
    total: diagnostics.length,
    thisWeek: diagnostics.filter(d => new Date(d.completed_at) > new Date(Date.now() - 7*24*3600*1000)).length,
    withConsent: diagnostics.filter(d => {
      const c = Array.isArray(d.contacts) ? d.contacts[0] : d.contacts
      return c?.marketing_consent
    }).length,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F6FC', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <header style={{ background: NIGHT, padding: '0 20px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/logo-white.png" alt="MOJO ACADÉMIE" style={{ height: 28 }} />
            <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 999, background: 'rgba(200,57,154,0.2)', color: '#C8399A' }}>Admin</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => exportCSV(filtered)}
              style={{ fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', cursor: 'pointer' }}>
              ↓ Export CSV
            </button>
            <a href={`/admin?password=${password}`}
              style={{ fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 8, border: 'none', background: GRAD, color: '#fff', textDecoration: 'none' }}>
              ↺ Rafraîchir
            </a>
          </div>
        </div>
        <div style={{ height: 2, background: GRAD }} />
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total diagnostics', value: stats.total, icon: '📋' },
            { label: 'Cette semaine', value: stats.thisWeek, icon: '📅' },
            { label: 'Consent marketing', value: stats.withConsent, icon: '✉️' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', border: '1px solid #EDEAF5' }}>
              <p style={{ fontSize: 24, margin: '0 0 4px' }}>{s.icon}</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: NIGHT, margin: '0 0 4px', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{s.value}</p>
              <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' as const }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher email, nom, entreprise…"
            style={{ flex: 1, minWidth: 200, padding: '9px 14px', borderRadius: 10, border: '1.5px solid #EDEAF5', fontSize: 13, fontFamily: 'inherit', background: '#fff' }} />
          <select value={filter} onChange={e => setFilter(e.target.value)}
            style={{ padding: '9px 14px', borderRadius: 10, border: '1.5px solid #EDEAF5', fontSize: 13, fontFamily: 'inherit', background: '#fff', color: NIGHT }}>
            <option value="all">Tous les statuts</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #EDEAF5', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' as const }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F7F6FC', borderBottom: '1px solid #EDEAF5' }}>
                  {['Date','Contact','Entreprise','Mode','Score','Objectif','Statut','Rapport'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left' as const, fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase' as const, letterSpacing: '0.06em', whiteSpace: 'nowrap' as const }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center' as const, color: MUTED }}>Aucun diagnostic</td></tr>
                ) : filtered.map((d, i) => {
                  const c  = Array.isArray(d.contacts)  ? d.contacts[0]  : d.contacts
                  const co = Array.isArray(d.companies) ? d.companies[0] : d.companies
                  const st = STATUS_LABELS[c?.status ?? 'NEW'] ?? STATUS_LABELS.NEW
                  return (
                    <tr key={d.id} style={{ borderBottom: '1px solid #EDEAF5', background: i % 2 === 0 ? '#fff' : '#FAFAF8' }}>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' as const, color: MUTED, fontSize: 12 }}>
                        {new Date(d.completed_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <p style={{ fontWeight: 600, color: NIGHT, margin: '0 0 2px' }}>{c?.firstname} {c?.lastname}</p>
                        <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>{c?.email}</p>
                        {c?.marketing_consent && <span style={{ fontSize: 9, background: '#EDE9FB', color: VIOLET, padding: '1px 6px', borderRadius: 99, fontWeight: 700 }}>✉ MKTG</span>}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <p style={{ fontWeight: 500, color: NIGHT, margin: '0 0 2px' }}>{co?.name ?? '—'}</p>
                        <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>{co?.city}</p>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#EDE9FB', color: VIOLET, fontWeight: 600 }}>
                          {d.mode}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' as const }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: NIGHT, fontFamily: "'Bricolage Grotesque', sans-serif" }}>{d.lead_score ?? '—'}</span>
                        <span style={{ fontSize: 10, color: MUTED, display: 'block' }}>/100</span>
                      </td>
                      <td style={{ padding: '12px 16px', maxWidth: 140 }}>
                        <p style={{ fontSize: 12, color: MUTED, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{d.objective_main ?? '—'}</p>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 99, background: st.bg, color: st.color, fontWeight: 600, whiteSpace: 'nowrap' as const }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <a href={`/report/${d.report_token}`} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 12, color: VIOLET, textDecoration: 'none', fontWeight: 600 }}>
                          Voir →
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid #EDEAF5', fontSize: 12, color: MUTED }}>
            {filtered.length} diagnostic{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}
          </div>
        </div>
      </main>
    </div>
  )
}
