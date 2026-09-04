'use client'

import { useState, useCallback, useRef } from 'react'
import type { DiagnosticState, ApiCompanySearchResult } from '@/types'
import { StepWrapper } from '../StepWrapper'

interface Props {
  state: DiagnosticState
  next: (patch?: Partial<DiagnosticState>) => void
  back: () => void
  update: (patch: Partial<DiagnosticState>) => void
}

const btn = (primary: boolean) => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  padding: primary ? '13px 24px' : '11px 20px',
  borderRadius: 'var(--r-md)',
  border: primary ? 'none' : '1.5px solid #E5E7EB',
  background: primary ? 'linear-gradient(135deg, #9B2FCC, #E040AB)' : '#fff',
  color: primary ? '#fff' : 'var(--muted)',
  fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  transition: 'all 0.2s',
  boxShadow: primary ? '0 6px 20px rgba(224,64,171,0.35)' : 'none',
})

export function StepCompany({ state, next, update }: Props) {
  const [query, setQuery]     = useState(state.company?.name ?? '')
  const [results, setResults] = useState<ApiCompanySearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [manual, setManual]   = useState(false)
  const [manualName, setManualName] = useState('')
  const debounceRef = useRef<any>()

  const search = useCallback((q: string) => {
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/company/search?q=${encodeURIComponent(q)}`)
        const json = await res.json()
        setResults(json.results ?? [])
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 350)
  }, [])

  const select = (company: ApiCompanySearchResult) => {
    update({ company })
    next({ company })
  }

  const skipCompany = () => {
    const name = manualName.trim() || query.trim()
    next(name ? { company: { name } } : {})
  }

  const inputStyle = {
    width: '100%', padding: '13px 16px', borderRadius: 'var(--r-md)',
    border: '1.5px solid #E5E7EB', background: '#fff',
    fontSize: 15, fontFamily: 'inherit', color: 'var(--text)',
    outline: 'none', transition: 'border-color 0.2s',
  }

  return (
    <StepWrapper
      title="Commençons par votre entreprise"
      subtitle="Recherchez votre entreprise — nous récupérons automatiquement vos informations."
    >
      <div style={{ marginTop: 24, position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={e => search(e.target.value)}
          placeholder="Nom de l'entreprise ou enseigne..."
          style={inputStyle}
          autoFocus
        />
        {loading && (
          <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>
            <div style={{
              width: 16, height: 16, border: '2px solid #E5E7EB',
              borderTopColor: '#E040AB', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }} />
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Résultats */}
      {results.length > 0 && (
        <div style={{
          marginTop: 6, background: '#fff', borderRadius: 'var(--r-md)',
          border: '1.5px solid #E5E7EB', overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
        }}>
          {results.map((r, i) => (
            <button
              key={r.siren ?? `${r.name}-${i}`}
              onClick={() => select(r)}
              style={{
                width: '100%', textAlign: 'left', padding: '12px 16px',
                background: 'none', border: 'none', borderBottom: i < results.length - 1 ? '1px solid #F3F4F6' : 'none',
                cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--off)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--night)' }}>
                {r.trade_name ?? r.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                {[r.city, r.naf_label].filter(Boolean).join(' · ')}
                {r.siren && <span style={{ color: '#9CA3AF', marginLeft: 8 }}>SIREN {r.siren}</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pas trouvé */}
      {query.length > 2 && results.length === 0 && !loading && !manual && (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 8 }}>
            Entreprise introuvable dans la base officielle ?
          </p>
          <button
            onClick={() => setManual(true)}
            style={{ fontSize: 13, color: '#7B3FCC', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}
          >
            Saisir le nom manuellement
          </button>
        </div>
      )}

      {manual && (
        <div style={{ marginTop: 12 }}>
          <input
            type="text"
            value={manualName}
            onChange={e => setManualName(e.target.value)}
            placeholder="Nom de votre entreprise"
            style={inputStyle}
            autoFocus
          />
        </div>
      )}

      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => next({})} style={{ fontSize: 13, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          Passer cette étape →
        </button>
        {(manual && manualName.trim()) && (
          <button onClick={skipCompany} style={btn(true)}>
            Continuer →
          </button>
        )}
      </div>
    </StepWrapper>
  )
}
