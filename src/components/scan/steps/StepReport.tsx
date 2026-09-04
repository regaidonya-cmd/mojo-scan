'use client'

import type { DiagnosticState } from '@/types'

interface Props {
  state: DiagnosticState
  next: (patch?: Partial<DiagnosticState>) => void
  back: () => void
  update: (patch: Partial<DiagnosticState>) => void
}

const SCORE_BAR = (score: number, max: number) => {
  const pct = Math.round(score / max * 100)
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'
  return { pct, color }
}

const LEAD_LABELS = {
  cold:      { label: 'En veille',    color: 'bg-neutral-100 text-neutral-600'  },
  qualified: { label: 'Qualifié',     color: 'bg-blue-100   text-blue-700'      },
  hot:       { label: 'Chaud',        color: 'bg-amber-100  text-amber-700'     },
  priority:  { label: 'Prioritaire',  color: 'bg-red-100    text-red-700'       },
}

export function StepReport({ state }: Props) {
  const { businessScore, leadScore, priorities, recommendations, funding, contact } = state

  if (!businessScore || !priorities) {
    return <div className="pt-20 text-center text-neutral-400">Chargement du rapport…</div>
  }

  const leadLevel = leadScore?.level ?? 'qualified'
  const { label: leadLabel, color: leadColor } = LEAD_LABELS[leadLevel]

  return (
    <div className="pt-6 pb-12 space-y-6">

      {/* Header */}
      <div className="bg-neutral-900 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-neutral-400 text-sm">Diagnostic MOJO Scan</p>
            <h1 className="text-2xl font-semibold mt-1">
              {contact?.firstname ? `Bonjour ${contact.firstname}` : 'Votre rapport'}
            </h1>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${leadColor}`}>
            {leadLabel}
          </span>
        </div>
        <div className="mt-4 flex items-end gap-2">
          <span className="text-5xl font-semibold tabular-nums">{businessScore.global}</span>
          <span className="text-neutral-500 text-lg mb-1">/100</span>
        </div>
        <p className="text-neutral-400 text-sm mt-1">Score digital global</p>
      </div>

      {/* Scores par dimension */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <h2 className="text-sm font-semibold text-neutral-800 mb-4">Analyse détaillée</h2>
        <div className="space-y-3">
          {([
            ['Acquisition',   businessScore.acquisition,   20],
            ['Visibilité',    businessScore.visibilite,    20],
            ['Conversion',    businessScore.conversion,    15],
            ['Fidélisation',  businessScore.fidelisation,  15],
            ['Organisation',  businessScore.organisation,  15],
            ['IA & Outils',   businessScore.ia,            15],
          ] as [string, number, number][]).map(([label, score, max]) => {
            const { pct, color } = SCORE_BAR(score, max)
            return (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-neutral-600 font-medium">{label}</span>
                  <span className="text-neutral-400 tabular-nums">{score}/{max}</span>
                </div>
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 3 Priorités */}
      <div>
        <h2 className="text-sm font-semibold text-neutral-800 mb-3">Vos 3 priorités d'action</h2>
        <div className="space-y-3">
          {priorities.map((p, i) => (
            <div key={i} className="bg-white rounded-2xl border border-neutral-200 p-4 flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[#E85D26]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[#E85D26] text-xs font-bold">{p.rank}</span>
              </div>
              <div>
                <p className="font-medium text-neutral-800 text-sm">{p.label}</p>
                <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{p.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommandations */}
      {recommendations && recommendations.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-neutral-800 mb-3">
            {recommendations.length === 1 ? 'Formation recommandée' : 'Formations recommandées'}
          </h2>
          {recommendations.map((r, i) => (
            <div key={i} className={`bg-white rounded-2xl border p-4 mb-3 ${i === 0 ? 'border-[#E85D26]' : 'border-neutral-200'}`}>
              {i === 0 && (
                <span className="text-xs font-medium text-[#E85D26] bg-[#E85D26]/10 px-2 py-0.5 rounded-full">
                  Recommandation principale
                </span>
              )}
              <h3 className={`font-semibold text-neutral-900 text-sm ${i === 0 ? 'mt-2' : ''}`}>
                {r.item.title}
              </h3>
              <p className="text-xs text-neutral-500 mt-1">{r.reason}</p>
              <div className="flex items-center gap-3 mt-3 text-xs text-neutral-500">
                <span>⏱ {r.item.duration_h}h</span>
                <span>·</span>
                <span className="font-medium text-neutral-700">{r.item.price_ht} € HT</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Financement */}
      {funding && funding.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-neutral-800 mb-3">Financements potentiels</h2>
          <div className="space-y-2">
            {funding.map((f, i) => (
              <div key={i} className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <p className="font-medium text-emerald-800 text-sm">{f.funder}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                    ${f.confidence === 'high' ? 'bg-emerald-200 text-emerald-800' :
                      f.confidence === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-neutral-100 text-neutral-600'}`}>
                    {f.confidence === 'high' ? 'Éligible' : f.confidence === 'medium' ? 'À confirmer' : 'À vérifier'}
                  </span>
                </div>
                <p className="text-xs text-emerald-700 mt-1">{f.coverage_label}</p>
                {f.note && <p className="text-xs text-emerald-600 mt-1 italic">{f.note}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTAs */}
      <div className="space-y-3 pt-2">
        <a
          href="https://calendar.app.google/mojo-academie"
          target="_blank"
          rel="noopener"
          className="block w-full bg-[#E85D26] text-white text-center py-4 rounded-xl font-medium hover:bg-[#d04f1e] transition-colors"
        >
          Vérifier mon financement gratuitement →
        </a>
        <a
          href="tel:+33XXXXXXXXX"
          className="block w-full bg-white border border-neutral-200 text-neutral-800 text-center py-3.5 rounded-xl font-medium hover:bg-neutral-50 transition-colors"
        >
          📞 Appeler un conseiller MOJO
        </a>
      </div>

      <p className="text-xs text-center text-neutral-400 px-4">
        Ce diagnostic est indicatif. Les financements sont donnés à titre d'estimation — leur confirmation relève d'une vérification auprès des organismes concernés. MOJO ACADÉMIE ne garantit aucune prise en charge.
      </p>
    </div>
  )
}
