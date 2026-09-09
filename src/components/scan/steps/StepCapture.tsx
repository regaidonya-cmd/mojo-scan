'use client'

import { useState } from 'react'
import type { DiagnosticState } from '@/types'
import { StepWrapper } from '../StepWrapper'
import { DonyaBlock } from '../DonyaBlock'

interface Props {
  state: DiagnosticState
  next: (patch?: Partial<DiagnosticState>) => void
  back: () => void
  update: (patch: Partial<DiagnosticState>) => void
}

export function StepCapture({ state, next, update }: Props) {
  const [firstname, setFirstname]           = useState(state.contact?.firstname ?? '')
  const [lastname, setLastname]             = useState(state.contact?.lastname ?? '')
  const [email, setEmail]                   = useState(state.contact?.email ?? '')
  const [phone, setPhone]                   = useState(state.contact?.phone ?? '')
  const [consentDiag, setConsentDiag]       = useState(state.consentDiag)
  const [consentMarketing, setConsentMarketing] = useState(state.consentMarketing)
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState('')
  const [touched, setTouched]               = useState({ firstname: false, email: false })

  const emailValid     = email.includes('@') && email.includes('.')
  const firstnameValid = firstname.trim().length > 0
  const isValid        = firstnameValid && emailValid && consentDiag

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '11px 14px',
    borderRadius: 'var(--r-md)',
    border: `1.5px solid ${hasError ? '#991B1B' : 'var(--border2)'}`,
    background: hasError ? '#FEF2F2' : 'var(--white)',
    fontSize: 14,
    fontFamily: 'var(--font-body)',
    color: 'var(--text)',
    outline: 'none',
    boxSizing: 'border-box',
  })

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--muted)',
    display: 'block',
    marginBottom: 5,
    fontFamily: 'var(--font-body)',
  }

  const submit = async () => {
    setTouched({ firstname: true, email: true })
    if (!isValid) return
    setLoading(true)
    setError('')
    try {
      const payload = {
        mode:    state.mode,
        company: state.company,
        answers: Object.entries(state.answers).map(([question_code, value]) => ({ question_code, value, score: 0 })),
        contact: { firstname: firstname.trim(), lastname: lastname.trim() || undefined, email: email.trim(), phone: phone.trim() || undefined },
        consentDiag,
        consentMarketing,
        consentDate: new Date().toISOString(),
        consentSource: 'mojo-scan-web',
      }
      const res  = await fetch('/api/scan/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur')
      next({
        contact: { firstname, lastname, email, phone },
        consentDiag, consentMarketing,
        id: data.diagnosticId, reportToken: data.reportToken,
        businessScore: data.businessScore, leadScore: data.leadScore,
        priorities: data.priorities, recommendations: data.recommendations,
        funding: data.funding, parcoursMatch: data.parcoursMatch, calendlyUrl: data.calendlyUrl,
      })
    } catch (e: any) {
      setError(e.message ?? 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  const hasCompany = !!state.company?.name
  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL ?? 'https://calendly.com/regai-donya/diagnostic-digital-offert-10-min-passez-a-l-action'

  return (
    <StepWrapper
      title="Où envoyons-nous votre diagnostic ?"
      subtitle="Recevez immédiatement votre rapport personnalisé avec vos recommandations prioritaires."
    >
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {hasCompany && (
          <div style={{ background: 'var(--lav)', border: '1px solid var(--lav2)', borderRadius: 'var(--r-md)', padding: '10px 14px', fontSize: 13, color: 'var(--violet)', fontFamily: 'var(--font-body)' }}>
            {state.company!.name}{state.company!.city ? ` · ${state.company!.city}` : ''}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={labelStyle}>Prénom *</label>
            <input type="text" value={firstname} onChange={e => setFirstname(e.target.value)}
              onBlur={() => setTouched(t => ({ ...t, firstname: true }))}
              placeholder="Prénom" style={inputStyle(touched.firstname && !firstnameValid)} autoFocus />
            {touched.firstname && !firstnameValid && (
              <p style={{ fontSize: 11, color: '#991B1B', margin: '4px 0 0', fontFamily: 'var(--font-body)' }}>Requis</p>
            )}
          </div>
          <div>
            <label style={labelStyle}>Nom</label>
            <input type="text" value={lastname} onChange={e => setLastname(e.target.value)}
              placeholder="Nom" style={inputStyle(false)} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Email professionnel *</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            onBlur={() => setTouched(t => ({ ...t, email: true }))}
            placeholder="votre@email.fr" style={inputStyle(touched.email && !emailValid)} />
          {touched.email && !emailValid && (
            <p style={{ fontSize: 11, color: '#991B1B', margin: '4px 0 0', fontFamily: 'var(--font-body)' }}>Adresse email invalide</p>
          )}
        </div>

        <div>
          <label style={labelStyle}>Téléphone <span style={{ fontWeight: 400, color: 'var(--subtle)' }}>(pour être recontacté plus facilement)</span></label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="Votre numéro de téléphone" style={inputStyle(false)} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={consentDiag} onChange={e => setConsentDiag(e.target.checked)}
              style={{ marginTop: 3, accentColor: 'var(--violet)', width: 15, height: 15, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, fontFamily: 'var(--font-body)' }}>
              J'accepte que mes données soient utilisées pour recevoir ce diagnostic et être recontacté(e) par MOJO ACADÉMIE. *{' '}
              <a href="/politique-confidentialite" target="_blank" style={{ color: 'var(--violet)' }}>Politique de confidentialité</a>
            </span>
          </label>

          <div style={{ background: 'var(--off)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '10px 12px' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={consentMarketing} onChange={e => setConsentMarketing(e.target.checked)}
                style={{ marginTop: 3, accentColor: 'var(--violet)', width: 15, height: 15, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, fontFamily: 'var(--font-body)' }}>
                <strong>Optionnel</strong> — J'accepte de recevoir des conseils et actualités de MOJO ACADÉMIE (désabonnement en 1 clic).
              </span>
            </label>
          </div>
        </div>

        {!isValid && touched.firstname && (
          <div style={{ background: 'var(--lav)', border: '1px solid var(--lav2)', borderRadius: 'var(--r-md)', padding: '10px 14px', fontSize: 12, color: 'var(--violet)', fontFamily: 'var(--font-body)' }}>
            Vérifiez les champs requis avant de continuer.
          </div>
        )}

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--r-md)', padding: '12px 14px', fontSize: 13, color: '#991B1B', fontFamily: 'var(--font-body)' }}>
            {error}
          </div>
        )}

        <DonyaBlock calendlyUrl={calendlyUrl} variant="capture" />

        <button onClick={submit} disabled={loading}
          style={{
            width: '100%', padding: '14px',
            borderRadius: 'var(--r-md)', border: 'none',
            background: isValid && !loading ? 'var(--grad)' : 'var(--border)',
            color: isValid && !loading ? 'var(--white)' : 'var(--subtle)',
            fontSize: 14, fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
            fontFamily: 'var(--font-body)',
            boxShadow: isValid && !loading ? '0 6px 20px rgba(200,57,154,0.3)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          {loading ? 'Génération en cours…' : 'Recevoir mon rapport complet'}
        </button>

        <p style={{ fontSize: 11, textAlign: 'center', color: 'var(--subtle)', margin: 0, fontFamily: 'var(--font-body)' }}>
          Données protégées RGPD · Sans engagement
        </p>
      </div>
    </StepWrapper>
  )
}
