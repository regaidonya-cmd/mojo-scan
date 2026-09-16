'use client'

import { useState } from 'react'
import { DS } from '@/lib/ds/tokens'
import { RESULTAT_LABEL, type ResultatAppel, type OppositionScope } from '@/lib/priority/activite-consequence'

const RESULTATS: ResultatAppel[] = [
  'PAS_DE_REPONSE', 'A_RAPPELER', 'ECHANGE_OBTENU', 'INTERESSE', 'RDV_OBTENU',
  'PAS_INTERESSE_REACTIVABLE', 'OPPORTUNITE_CLOTUREE', 'DEMANDE_NE_PLUS_CONTACTER',
  'MAUVAIS_INTERLOCUTEUR', 'COORDONNEES_INCORRECTES',
]

function genUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function ResultatAppelForm({
  companyId, personneId, moyenContactId,
}: {
  companyId: string; personneId: string | null; moyenContactId: string | null
}) {
  const [open, setOpen] = useState(false)
  // Générée à l'OUVERTURE du formulaire, stable pendant toute la session de
  // saisie — un double-clic/retry réseau réutilise la même clé (idempotence).
  const [idempotencyKey] = useState(() => genUuid())
  const [resultat, setResultat] = useState<ResultatAppel | null>(null)
  const [dateRappel, setDateRappel] = useState('')
  const [dateRdv, setDateRdv] = useState('')
  const [oppositionScope, setOppositionScope] = useState<OppositionScope | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={secondaryBtn}>
        Enregistrer le résultat de l'appel
      </button>
    )
  }

  const needsDateRappel = resultat === 'A_RAPPELER'
  const needsDateRdv = resultat === 'RDV_OBTENU'
  const needsOppositionScope = resultat === 'DEMANDE_NE_PLUS_CONTACTER'
  const canSubmit =
    resultat !== null &&
    (!needsDateRappel || dateRappel) &&
    (!needsRdv(needsDateRdv, dateRdv)) &&
    (!needsOppositionScope || oppositionScope !== null) &&
    !submitting

  function needsRdv(needs: boolean, val: string) {
    return needs && !val
  }

  async function submit() {
    setSubmitting(true)
    setResult(null)
    try {
      const res = await fetch(`/api/admin/prospects/${companyId}/activite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resultat,
          idempotencyKey,
          personneId: personneId ?? undefined,
          moyenContactId: moyenContactId ?? undefined,
          dateRappelSaisie: needsDateRappel ? new Date(dateRappel).toISOString() : undefined,
          dateRdvSaisie: needsDateRdv ? new Date(dateRdv).toISOString() : undefined,
          oppositionScope: needsOppositionScope ? oppositionScope : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResult({ ok: false, message: data.error ?? 'Erreur inconnue' })
      } else {
        setResult({ ok: true, message: 'Résultat enregistré.' })
      }
    } catch (e: any) {
      setResult({ ok: false, message: e.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ border: `1px solid ${DS.border}`, borderRadius: DS.rMd, padding: 16, marginTop: 8 }}>
      <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 10, color: DS.text }}>Résultat de l'appel</div>
      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 12 }}>
        {RESULTATS.map((r) => (
          <button
            key={r}
            onClick={() => setResultat(r)}
            style={{
              padding: '6px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
              border: `1.5px solid ${resultat === r ? 'transparent' : DS.border2}`,
              background: resultat === r ? DS.grad : DS.white,
              color: resultat === r ? DS.white : DS.text,
            }}
          >
            {RESULTAT_LABEL[r]}
          </button>
        ))}
      </div>

      {needsDateRappel && (
        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Date/heure du rappel</label>
          <input type="datetime-local" value={dateRappel} onChange={(e) => setDateRappel(e.target.value)} style={inputStyle} />
        </div>
      )}
      {needsDateRdv && (
        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Date/heure du RDV</label>
          <input type="datetime-local" value={dateRdv} onChange={(e) => setDateRdv(e.target.value)} style={inputStyle} />
        </div>
      )}
      {needsOppositionScope && (
        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Portée exacte de la demande</label>
          <label style={{ display: 'block', fontSize: 13, margin: '4px 0', opacity: personneId ? 1 : 0.4 }}>
            <input type="radio" disabled={!personneId} checked={oppositionScope === 'PERSONNE'} onChange={() => setOppositionScope('PERSONNE')} />{' '}
            Ne plus contacter cette personne{!personneId && ' (interlocuteur non identifié)'}
          </label>
          <label style={{ display: 'block', fontSize: 13, margin: '4px 0', opacity: moyenContactId ? 1 : 0.4 }}>
            <input type="radio" disabled={!moyenContactId} checked={oppositionScope === 'MOYEN'} onChange={() => setOppositionScope('MOYEN')} />{' '}
            Ne plus utiliser ce numéro/email{!moyenContactId && ' (moyen non identifié)'}
          </label>
          <label style={{ display: 'block', fontSize: 13, margin: '4px 0' }}>
            <input type="radio" checked={oppositionScope === 'ENTREPRISE'} onChange={() => setOppositionScope('ENTREPRISE')} />{' '}
            Ne plus contacter cette entreprise
          </label>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={submit} disabled={!canSubmit} style={{ ...secondaryBtn, opacity: canSubmit ? 1 : 0.5, background: DS.grad, color: DS.white }}>
          {submitting ? 'Enregistrement…' : 'Valider'}
        </button>
        <button onClick={() => setOpen(false)} style={secondaryBtn}>Annuler</button>
      </div>

      {result && (
        <p style={{ fontSize: 12.5, marginTop: 10, color: result.ok ? DS.violet : '#B3261E' }}>{result.message}</p>
      )}
    </div>
  )
}

const secondaryBtn: React.CSSProperties = {
  padding: '9px 16px', borderRadius: DS.rMd, border: `1.5px solid ${DS.border2}`,
  background: DS.white, color: DS.violet, fontWeight: 700, fontSize: 13, cursor: 'pointer',
}
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12.5, color: DS.muted, marginBottom: 4 }
const inputStyle: React.CSSProperties = { padding: '8px 10px', borderRadius: DS.rMd, border: `1.5px solid ${DS.border2}`, fontSize: 13 }
