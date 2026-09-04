'use client'

import { useState } from 'react'
import type { DiagnosticState } from '@/types'
import { StepWrapper } from '../StepWrapper'

interface Props {
  state: DiagnosticState
  next: (patch?: Partial<DiagnosticState>) => void
  back: () => void
  update: (patch: Partial<DiagnosticState>) => void
}

export function StepCapture({ state, next, update }: Props) {
  const [firstname, setFirstname] = useState(state.contact?.firstname ?? '')
  const [email, setEmail]         = useState(state.contact?.email ?? '')
  const [phone, setPhone]         = useState(state.contact?.phone ?? '')
  const [consentDiag, setConsentDiag] = useState(state.consentDiag)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  const isValid = firstname.trim() && email.includes('@') && consentDiag

  const submit = async () => {
    if (!isValid) return
    setLoading(true)
    setError('')

    try {
      const payload = {
        mode:    state.mode,
        company: state.company,
        answers: Object.entries(state.answers).map(([question_code, value]) => ({
          question_code,
          value,
          score: 0, // recalculé côté serveur
        })),
        contact: { firstname: firstname.trim(), email: email.trim(), phone: phone.trim() || undefined },
        consentDiag,
        consentMarketing: state.consentMarketing,
      }

      const res  = await fetch('/api/scan/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur')

      next({
        contact: { firstname, email, phone },
        consentDiag,
        id:             data.diagnosticId,
        reportToken:    data.reportToken,
        businessScore:  data.businessScore,
        leadScore:      data.leadScore,
        priorities:     data.priorities,
        recommendations:data.recommendations,
        funding:        data.funding,
      })

    } catch (e: any) {
      setError(e.message ?? 'Une erreur est survenue. Réessayez ou appelez-nous.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <StepWrapper
      title="Où envoyons-nous votre diagnostic ?"
      subtitle="Votre rapport complet avec recommandations et simulation de financement."
    >
      <div className="mt-6 space-y-3">
        <div>
          <label className="text-xs font-medium text-neutral-600 block mb-1">Prénom *</label>
          <input
            type="text"
            value={firstname}
            onChange={e => setFirstname(e.target.value)}
            placeholder="Votre prénom"
            className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#E85D26]/30 focus:border-[#E85D26] text-base"
            autoFocus
          />
        </div>

        <div>
          <label className="text-xs font-medium text-neutral-600 block mb-1">Email professionnel *</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="votre@email.fr"
            className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#E85D26]/30 focus:border-[#E85D26] text-base"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-neutral-600 block mb-1">Téléphone (facultatif)</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="06 XX XX XX XX"
            className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#E85D26]/30 focus:border-[#E85D26] text-base"
          />
        </div>

        {/* Consentements */}
        <div className="pt-2 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consentDiag}
              onChange={e => setConsentDiag(e.target.checked)}
              className="mt-0.5 accent-[#E85D26]"
            />
            <span className="text-xs text-neutral-600 leading-relaxed">
              J'accepte que mes données soient utilisées pour recevoir ce diagnostic et être recontacté(e) par MOJO ACADÉMIE. *
              {' '}<a href="/politique-confidentialite" className="underline" target="_blank">Politique de confidentialité</a>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={state.consentMarketing}
              onChange={e => update({ consentMarketing: e.target.checked })}
              className="mt-0.5 accent-[#E85D26]"
            />
            <span className="text-xs text-neutral-600">
              J'accepte de recevoir des conseils et actualités de MOJO ACADÉMIE (optionnel, désabonnement en 1 clic).
            </span>
          </label>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={!isValid || loading}
          className="w-full bg-[#E85D26] text-white py-4 rounded-xl font-medium hover:bg-[#d04f1e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Génération en cours…
            </>
          ) : (
            'Recevoir mon rapport complet →'
          )}
        </button>

        <p className="text-xs text-center text-neutral-400">
          🔒 Données protégées — Aucun engagement — Désabonnement en 1 clic
        </p>
      </div>
    </StepWrapper>
  )
}
