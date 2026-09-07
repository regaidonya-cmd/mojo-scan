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

const GRAD = 'linear-gradient(135deg, #9B2FCC, #E040AB)'

export function StepCapture({ state, next, update }: Props) {
  const [firstname, setFirstname]           = useState(state.contact?.firstname ?? '')
  const [email, setEmail]                   = useState(state.contact?.email ?? '')
  const [phone, setPhone]                   = useState(state.contact?.phone ?? '')
  const [consentDiag, setConsentDiag]       = useState(state.consentDiag)
  const [consentMarketing, setConsentMarketing] = useState(state.consentMarketing)
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState('')
  const [touched, setTouched]               = useState({ firstname: false, email: false })

  const emailValid    = email.includes('@') && email.includes('.')
  const firstnameValid = firstname.trim().length > 0
  const isValid       = firstnameValid && emailValid && consentDiag

  const inputStyle = (hasError: boolean) => ({
    width: '100%', padding: '12px 14px',
    borderRadius: 10, border: `1.5px solid ${hasError ? '#EF4444' : '#E5E7EB'}`,
    background: hasError ? '#FFF5F5' : '#fff',
    fontSize: 15, fontFamily: 'inherit', color: '#111827',
    outline: 'none', boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s',
  })

  const submit = async () => {
    setTouched({ firstname: true, email: true })
    if (!isValid) return
    setLoading(true)
    setError('')

    try {
      const payload = {
        mode:    state.mode,
        company: state.company,
        answers: Object.entries(state.answers).map(([question_code, value]) => ({
          question_code, value, score: 0,
        })),
        contact: { firstname: firstname.trim(), email: email.trim(), phone: phone.trim() || undefined },
        consentDiag,
        consentMarketing,
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
        consentDiag, consentMarketing,
        id: data.diagnosticId, reportToken: data.reportToken,
        businessScore: data.businessScore, leadScore: data.leadScore,
        priorities: data.priorities, recommendations: data.recommendations, funding: data.funding,
      })
    } catch (e: any) {
      setError(e.message ?? 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <StepWrapper title="Où envoyons-nous votre diagnostic ?" subtitle="Votre rapport complet avec recommandations et simulation de financement.">
      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Prénom */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 4 }}>
            Prénom *
          </label>
          <input type="text" value={firstname}
            onChange={e => setFirstname(e.target.value)}
            onBlur={() => setTouched(t => ({ ...t, firstname: true }))}
            placeholder="Votre prénom"
            style={inputStyle(touched.firstname && !firstnameValid)}
            autoFocus
          />
          {touched.firstname && !firstnameValid && (
            <p style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>⚠️ Veuillez entrer votre prénom</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 4 }}>
            Email professionnel *
          </label>
          <input type="email" value={email}
            onChange={e => setEmail(e.target.value)}
            onBlur={() => setTouched(t => ({ ...t, email: true }))}
            placeholder="votre@email.fr"
            style={inputStyle(touched.email && !emailValid)}
          />
          {touched.email && !emailValid && (
            <p style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>⚠️ Email invalide — ex: votre@email.fr</p>
          )}
        </div>

        {/* Téléphone */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 4 }}>
            Téléphone (facultatif)
          </label>
          <input type="tel" value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="06 XX XX XX XX"
            style={inputStyle(false)}
          />
        </div>

        {/* Consentements */}
        <div style={{ paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={consentDiag} onChange={e => setConsentDiag(e.target.checked)}
              style={{ marginTop: 2, accentColor: '#E040AB', width: 16, height: 16, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.5 }}>
              J'accepte que mes données soient utilisées pour recevoir ce diagnostic et être recontacté(e) par MOJO ACADÉMIE. *{' '}
              <a href="/politique-confidentialite" target="_blank" style={{ color: '#7B3FCC', textDecoration: 'underline' }}>Politique de confidentialité</a>
            </span>
          </label>
          {!consentDiag && touched.firstname && (
            <p style={{ fontSize: 11, color: '#EF4444', marginLeft: 26 }}>⚠️ Consentement requis pour recevoir le rapport</p>
          )}

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={consentMarketing} onChange={e => setConsentMarketing(e.target.checked)}
              style={{ marginTop: 2, accentColor: '#E040AB', width: 16, height: 16, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.5 }}>
              J'accepte de recevoir des conseils et actualités de MOJO ACADÉMIE (optionnel, désabonnement en 1 clic).
            </span>
          </label>
        </div>

        {/* Résumé erreurs si bouton cliqué sans remplir */}
        {!isValid && touched.firstname && (
          <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#92400E' }}>
            ✏️ Vérifiez les champs en rouge avant de continuer.
          </div>
        )}

        {/* Erreur serveur */}
        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#B91C1C' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Bouton */}
        <button
          onClick={submit}
          disabled={loading}
          style={{
            width: '100%', padding: '14px', borderRadius: 12, border: 'none',
            background: isValid && !loading ? GRAD : '#E5E7EB',
            color: isValid && !loading ? '#fff' : '#9CA3AF',
            fontSize: 15, fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
            fontFamily: 'inherit', marginTop: 4,
            boxShadow: isValid && !loading ? '0 6px 20px rgba(224,64,171,0.35)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s',
          }}
        >
          {loading ? (
            <>
              <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Génération en cours…
            </>
          ) : 'Recevoir mon rapport complet →'}
        </button>

        <p style={{ fontSize: 11, textAlign: 'center', color: '#9CA3AF' }}>
          🔒 Données protégées — Aucun engagement — Désabonnement en 1 clic
        </p>
      </div>
    </StepWrapper>
  )
}
