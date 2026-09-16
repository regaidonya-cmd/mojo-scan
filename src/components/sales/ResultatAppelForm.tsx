'use client'

import { useState, useEffect } from 'react'
import { DS } from '@/lib/ds/tokens'
import { computeConsequence, RESULTAT_LABEL, type ResultatAppel, type OppositionScope } from '@/lib/priority/activite-consequence'
import { formatDateHeureFr } from '@/lib/priority/format-date-fr'

const RESULTATS: ResultatAppel[] = [
  'PAS_DE_REPONSE', 'A_RAPPELER', 'ECHANGE_OBTENU', 'INTERESSE', 'RDV_OBTENU',
  'PAS_INTERESSE_REACTIVABLE', 'OPPORTUNITE_CLOTUREE', 'DEMANDE_NE_PLUS_CONTACTER',
  'MAUVAIS_INTERLOCUTEUR', 'COORDONNEES_INCORRECTES',
]

const RESULTATS_DATE_AUTO = new Set<ResultatAppel>(['PAS_DE_REPONSE', 'ECHANGE_OBTENU', 'INTERESSE', 'PAS_INTERESSE_REACTIVABLE'])

const PIPELINE_LABEL: Record<string, string> = {
  A_CONTACTER: 'À contacter', EN_DISCUSSION: 'En discussion', RDV: 'RDV', PROPOSITION: 'Proposition', GAGNE: 'Gagné', PERDU: 'Perdu',
}
const NBA_LABEL: Record<string, string> = {
  CALLBACK: 'Rappeler', FOLLOW_UP: 'Relancer', PREPARE_MEETING: 'Préparer le RDV',
  QUALIFY: 'Qualifier', ENRICH: 'Enrichir', NURTURE: 'Relancer ultérieurement', NO_ACTION: 'Aucune action',
}

function genUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function isoToLocalInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function localInputToIso(v: string): string | undefined {
  if (!v) return undefined
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

export function ResultatAppelForm({
  companyId, personneId, moyenContactId,
}: {
  companyId: string; personneId: string | null; moyenContactId: string | null
}) {
  const [open, setOpen] = useState(false)
  const [idempotencyKey] = useState(() => genUuid())
  const [resultat, setResultat] = useState<ResultatAppel | null>(null)
  const [dateRappel, setDateRappel] = useState('')
  const [dateRdv, setDateRdv] = useState('')
  const [dateProchaineAction, setDateProchaineAction] = useState('')
  const [oppositionScope, setOppositionScope] = useState<OppositionScope | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  const needsDateRappel = resultat === 'A_RAPPELER'
  const needsDateRdv = resultat === 'RDV_OBTENU'
  const needsDateProchaineAction = resultat !== null && RESULTATS_DATE_AUTO.has(resultat)
  const needsOppositionScope = resultat === 'DEMANDE_NE_PLUS_CONTACTER'

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (resultat && RESULTATS_DATE_AUTO.has(resultat)) {
      try {
        const c = computeConsequence({ resultat, now: new Date().toISOString() })
        if (c.nextActionDueAt) setDateProchaineAction(isoToLocalInput(c.nextActionDueAt))
      } catch {
        // pas de valeur par defaut disponible
      }
    }
  }, [resultat])

  let preview: ReturnType<typeof computeConsequence> | null = null
  let previewError: string | null = null
  if (resultat) {
    try {
      preview = computeConsequence({
        resultat,
        now: new Date().toISOString(),
        dateRappelSaisie: needsDateRappel ? localInputToIso(dateRappel) : undefined,
        dateRdvSaisie: needsDateRdv ? localInputToIso(dateRdv) : undefined,
        dateProchaineActionSaisie: needsDateProchaineAction ? localInputToIso(dateProchaineAction) : undefined,
        oppositionScope: needsOppositionScope ? oppositionScope ?? undefined : undefined,
      })
    } catch (e: any) {
      previewError = e.message
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={secondaryBtn}>
        Enregistrer le résultat de l'appel
      </button>
    )
  }

  const canSubmit =
    resultat !== null &&
    preview !== null &&
    (!needsDateRappel || dateRappel) &&
    (!needsDateRdv || dateRdv) &&
    (!needsDateProchaineAction || dateProchaineAction) &&
    (!needsOppositionScope || oppositionScope !== null) &&
    !submitting

  async function submit() {
    if (!resultat) return
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
          dateRappelSaisie: needsDateRappel ? localInputToIso(dateRappel) : undefined,
          dateRdvSaisie: needsDateRdv ? localInputToIso(dateRdv) : undefined,
          dateProchaineActionSaisie: needsDateProchaineAction ? localInputToIso(dateProchaineAction) : undefined,
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
          <label style={labelStyle}>Rappeler le</label>
          <input type="datetime-local" value={dateRappel} onChange={(e) => setDateRappel(e.target.value)} style={inputStyle} />
        </div>
      )}

      {needsDateRdv && (
        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>RDV prévu le</label>
          <input type="datetime-local" value={dateRdv} onChange={(e) => setDateRdv(e.target.value)} style={inputStyle} />
        </div>
      )}

      {needsDateProchaineAction && (
        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Prochaine action prévue le</label>
          <input type="datetime-local" value={dateProchaineAction} onChange={(e) => setDateProchaineAction(e.target.value)} style={inputStyle} />
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

      {resultat && (
        <div style={{ background: DS.off, border: `1px solid ${DS.border}`, borderRadius: DS.rMd, padding: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: DS.muted, textTransform: 'uppercase' as const, marginBottom: 6 }}>
            Aperçu avant validation
          </div>
          {previewError ? (
            <p style={{ fontSize: 13, color: DS.muted, margin: 0, fontStyle: 'italic' }}>Complétez les champs requis ci-dessus.</p>
          ) : preview ? (
            <div style={{ fontSize: 13, color: DS.text, lineHeight: 1.6 }}>
              {resultat === 'RDV_OBTENU' ? (
                <>
                  <div>RDV prévu le : <strong>{dateRdv ? formatDateHeureFr(localInputToIso(dateRdv)) : '—'}</strong></div>
                  <div>Préparer le RDV à partir du : <strong>{formatDateHeureFr(preview.nextActionDueAt)}</strong> <span style={{ color: DS.muted }}>(dérivé, non modifiable)</span></div>
                </>
              ) : resultat === 'OPPORTUNITE_CLOTUREE' ? (
                <div>Opportunité clôturée — aucune relance programmée</div>
              ) : resultat === 'MAUVAIS_INTERLOCUTEUR' ? (
                <div>Prochaine action : identifier le bon interlocuteur</div>
              ) : resultat === 'COORDONNEES_INCORRECTES' ? (
                <div>Prochaine action : rechercher/vérifier les coordonnées</div>
              ) : resultat === 'DEMANDE_NE_PLUS_CONTACTER' ? (
                <div>
                  Portée sélectionnée : <strong>{oppositionScope ? OPPOSITION_LABEL[oppositionScope] : '— à choisir ci-dessus —'}</strong>
                  {oppositionScope === 'ENTREPRISE' && <div style={{ color: '#B3261E', marginTop: 4 }}>⚠ Entraîne l'arrêt total de la prospection pour cette entreprise (STOP).</div>}
                </div>
              ) : (
                <>
                  <div>Prochaine action : <strong>{NBA_LABEL[preview.nextActionType] ?? preview.nextActionType}</strong></div>
                  {preview.nextActionDueAt && <div>Prévue le : <strong>{formatDateHeureFr(preview.nextActionDueAt)}</strong></div>}
                </>
              )}
              {preview.temperature && <div>Température : <strong>{preview.temperature}</strong></div>}
              {preview.pipelineStage && <div>Pipeline : <strong>{PIPELINE_LABEL[preview.pipelineStage] ?? preview.pipelineStage}</strong></div>}
            </div>
          ) : null}
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

const OPPOSITION_LABEL: Record<OppositionScope, string> = {
  PERSONNE: 'Cet interlocuteur uniquement',
  MOYEN: 'Ce moyen de contact uniquement',
  ENTREPRISE: "Toute l'entreprise",
}

const secondaryBtn: React.CSSProperties = {
  padding: '9px 16px', borderRadius: DS.rMd, border: `1.5px solid ${DS.border2}`,
  background: DS.white, color: DS.violet, fontWeight: 700, fontSize: 13, cursor: 'pointer',
}
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12.5, color: DS.muted, marginBottom: 4 }
const inputStyle: React.CSSProperties = { padding: '8px 10px', borderRadius: DS.rMd, border: `1.5px solid ${DS.border2}`, fontSize: 13 }
