'use client'

import { useState, useRef } from 'react'
import type { DiagnosticState } from '@/types'
import { StepWrapper } from '../StepWrapper'
import { TrustCompact } from '../TrustBar'
import { NIGHT, VIOLET, FUCHSIA, MUTED, SUBTLE, BORDER, BORDER2, LAV, LAV2, OFF, GRAD, R_MD, R_LG, FONT_DISPLAY, FONT_BODY, TEXT } from '@/lib/design/tokens'

interface Props {
  state: DiagnosticState
  next: (patch?: Partial<DiagnosticState>) => void
  back: () => void
  update: (patch: Partial<DiagnosticState>) => void
}

interface ApiCompany {
  siren: string
  siret?: string
  name: string
  naf?: string
  naf_label?: string
  city?: string
  postal_code?: string
  employee_band?: string
}

export function StepCompany({ state, next, update }: Props) {
  const [query, setQuery]     = useState(state.company?.name ?? '')
  const [results, setResults] = useState<ApiCompany[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<ApiCompany | null>(state.company ?? null)
  const [manual, setManual]   = useState(false)
  const debounce = useRef<any>(null)

  const search = async (q: string) => {
    setQuery(q)
    if (q.length < 2) { setResults([]); return }
    clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/company/search?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        setResults(data.results ?? [])
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 350)
  }

  const select = (company: ApiCompany) => {
    setSelected(company)
    setQuery(company.name)
    setResults([])
    update({ company })
  }

  const handleNext = () => {
    if (!selected && !manual) return
    if (manual && query.trim()) {
      update({ company: { name: query.trim() } as any })
    }
    next()
  }

  const inputStyle = {
    width: '100%', padding: '12px 14px',
    borderRadius: R_MD, border: `1.5px solid ${BORDER2}`,
    fontSize: 15, fontFamily: FONT_BODY, color: TEXT,
    background: '#fff', outline: 'none',
    boxSizing: 'border-box' as const,
  }

  return (
    <StepWrapper
      title="Votre entreprise"
      subtitle="Recherchez votre entreprise pour personnaliser votre diagnostic."
    >
      <div style={{ marginTop: 24 }}>

        {/* Champ de recherche */}
        <div style={{ position: 'relative' as const, marginBottom: 8 }}>
          <input
            type="text"
            value={query}
            onChange={e => { setSelected(null); search(e.target.value) }}
            placeholder="Nom de l'entreprise ou SIRET…"
            style={inputStyle}
            autoFocus
            autoComplete="off"
          />
          {loading && (
            <div style={{ position: 'absolute' as const, right: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, border: `2px solid ${LAV}`, borderTopColor: VIOLET, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          )}
        </div>
        <style>{`@keyframes spin{to{transform:translateY(-50%) rotate(360deg)}}`}</style>

        {/* Résultats */}
        {results.length > 0 && (
          <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: R_MD, overflow: 'hidden', marginBottom: 16, boxShadow: '0 4px 16px rgba(26,24,110,0.08)' }}>
            {results.slice(0, 5).map((r, i) => (
              <button
                key={r.siren ?? `${r.name}-${i}`}
                onClick={() => select(r)}
                style={{
                  width: '100%', padding: '12px 14px', textAlign: 'left' as const,
                  background: 'none', border: 'none',
                  borderBottom: i < Math.min(results.length, 5) - 1 ? `1px solid ${BORDER}` : 'none',
                  cursor: 'pointer', fontFamily: FONT_BODY,
                }}
              >
                <p style={{ fontSize: 14, fontWeight: 600, color: NIGHT, margin: '0 0 2px' }}>{r.name}</p>
                <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>
                  {r.city}{r.city && r.naf_label ? ' · ' : ''}{r.naf_label}
                  {r.siret && <span style={{ marginLeft: 8, color: SUBTLE }}>SIRET {r.siret}</span>}
                  {!r.siret && r.siren && <span style={{ marginLeft: 8, color: SUBTLE }}>SIREN {r.siren}</span>}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Entreprise sélectionnée */}
        {selected && (
          <div style={{ background: LAV, border: `1px solid ${LAV2}`, borderRadius: R_MD, padding: '12px 14px', marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: VIOLET, margin: '0 0 2px' }}>Entreprise sélectionnée</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: NIGHT, margin: '0 0 2px' }}>{selected.name}</p>
            {selected.naf_label && <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>{selected.naf_label}{selected.city ? ` · ${selected.city}` : ''}</p>}
          </div>
        )}

        {/* Bouton continuer */}
        <button
          onClick={handleNext}
          disabled={!selected && !manual}
          style={{
            width: '100%', padding: '14px', borderRadius: R_MD, border: 'none',
            background: (selected || manual) ? GRAD : BORDER,
            color: (selected || manual) ? '#fff' : MUTED,
            fontSize: 15, fontWeight: 600, cursor: (selected || manual) ? 'pointer' : 'not-allowed',
            fontFamily: FONT_BODY, marginBottom: 12,
            boxShadow: (selected || manual) ? '0 4px 16px rgba(200,57,154,0.28)' : 'none',
          }}
        >Continuer</button>

        {/* Lien saisie manuelle */}
        {!selected && !manual && (
          <button
            onClick={() => { setManual(true) }}
            style={{ background: 'none', border: 'none', fontSize: 13, color: MUTED, cursor: 'pointer', fontFamily: FONT_BODY, textDecoration: 'underline', padding: 0 }}
          >
            Mon entreprise n'apparaît pas — saisir manuellement
          </button>
        )}

        {/* Champ manuel */}
        {manual && !selected && (
          <div style={{ marginTop: 8 }}>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Nom de votre entreprise"
              style={{ ...inputStyle, marginBottom: 8 }}
              autoFocus
            />
            <button
              onClick={handleNext}
              disabled={!query.trim()}
              style={{
                width: '100%', padding: '14px', borderRadius: R_MD, border: 'none',
                background: query.trim() ? GRAD : BORDER,
                color: query.trim() ? '#fff' : MUTED,
                fontSize: 15, fontWeight: 600, cursor: query.trim() ? 'pointer' : 'not-allowed',
                fontFamily: FONT_BODY, boxShadow: query.trim() ? '0 4px 16px rgba(200,57,154,0.28)' : 'none',
              }}
            >Continuer avec ce nom</button>
          </div>
        )}

        <TrustCompact />
      </div>
    </StepWrapper>
  )
}
