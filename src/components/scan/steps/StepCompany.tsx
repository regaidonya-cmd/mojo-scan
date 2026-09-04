'use client'

import { useState, useCallback, useRef } from 'react'
import type { DiagnosticState, ApiCompanySearchResult } from '@/types'
import { StepWrapper } from '../StepWrapper'
import { SearchIcon, BuildingIcon, ChevronRightIcon } from 'lucide-react'

interface Props {
  state: DiagnosticState
  next: (patch?: Partial<DiagnosticState>) => void
  back: () => void
  update: (patch: Partial<DiagnosticState>) => void
}

export function StepCompany({ state, next, update }: Props) {
  const [query, setQuery]     = useState(state.company?.name ?? '')
  const [results, setResults] = useState<ApiCompanySearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [manual, setManual]   = useState(false)
  const [manualName, setManualName] = useState('')
  const debounceRef = useRef<NodeJS.Timeout>()

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
    if (name) {
      update({ company: { name } })
    }
    next({ company: name ? { name } : undefined })
  }

  return (
    <StepWrapper
      title="Parlons de votre entreprise"
      subtitle="Recherchez votre entreprise pour personnaliser votre diagnostic."
      step={1}
    >
      {/* Search input */}
      <div className="relative mt-6">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          type="text"
          value={query}
          onChange={e => search(e.target.value)}
          placeholder="Nom de l'entreprise, enseigne..."
          className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#E85D26]/30 focus:border-[#E85D26] text-base"
          autoFocus
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-neutral-300 border-t-[#E85D26] rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <ul className="mt-2 bg-white rounded-xl border border-neutral-200 overflow-hidden divide-y divide-neutral-100 shadow-sm">
          {results.map(r => (
            <li key={r.siren ?? r.name}>
              <button
                onClick={() => select(r)}
                className="w-full text-left px-4 py-3 hover:bg-neutral-50 transition-colors flex items-start gap-3 group"
              >
                <BuildingIcon className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-neutral-900 text-sm truncate">
                    {r.trade_name ?? r.name}
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    {[r.city, r.naf_label].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <ChevronRightIcon className="w-4 h-4 text-neutral-300 group-hover:text-neutral-500 flex-shrink-0 mt-0.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Introuvable */}
      {!manual && query.length > 2 && results.length === 0 && !loading && (
        <div className="mt-4 text-center">
          <p className="text-sm text-neutral-500 mb-3">Entreprise introuvable ?</p>
          <button
            onClick={() => setManual(true)}
            className="text-sm text-[#E85D26] underline underline-offset-2"
          >
            Saisir manuellement
          </button>
        </div>
      )}

      {manual && (
        <div className="mt-4">
          <input
            type="text"
            value={manualName}
            onChange={e => setManualName(e.target.value)}
            placeholder="Nom de votre entreprise"
            className="w-full px-4 py-3.5 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#E85D26]/30 focus:border-[#E85D26] text-base"
            autoFocus
          />
        </div>
      )}

      {/* Skip */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => next({})}
          className="text-sm text-neutral-400 hover:text-neutral-600"
        >
          Passer cette étape
        </button>
        {(manual || manualName) && (
          <button
            onClick={skipCompany}
            className="bg-[#E85D26] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#d04f1e] transition-colors"
          >
            Continuer →
          </button>
        )}
      </div>
    </StepWrapper>
  )
}
