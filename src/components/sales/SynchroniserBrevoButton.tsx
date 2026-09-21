'use client'

import { useState } from 'react'
import { DS } from '@/lib/ds/tokens'

export function SynchroniserBrevoButton({ lotId, nombreValide }: { lotId: string; nombreValide: number }) {
  const [confirming, setConfirming] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<any>(null)

  async function confirmer() {
    setSyncing(true)
    try {
      const res = await fetch(`/api/admin/campagnes/${lotId}/synchroniser`, { method: 'POST' })
      const json = await res.json()
      setResult(json)
    } catch (e: any) {
      setResult({ error: e.message })
    } finally {
      setSyncing(false)
      setConfirming(false)
    }
  }

  if (result) {
    return (
      <div style={{ padding: 14, background: DS.off, borderRadius: DS.rMd, fontSize: 13 }}>
        {result.error ? (
          <p style={{ color: 'crimson' }}>Erreur : {result.error}</p>
        ) : (
          <>
            <p>Synchronisés : <strong>{result.synchronises}</strong></p>
            <p>Exclus : <strong>{result.exclus}</strong></p>
            <p>Erreurs : <strong>{result.erreurs}</strong></p>
            <p>Liste Brevo : {result.brevoListId}</p>
          </>
        )}
      </div>
    )
  }

  if (confirming) {
    return (
      <div style={{ padding: 14, background: DS.off, borderRadius: DS.rMd, fontSize: 13 }}>
        <p>Confirmer la synchronisation de <strong>{nombreValide}</strong> membres valides vers Brevo ?</p>
        <p style={{ color: DS.muted, fontSize: 12 }}>Aucun email ne sera envoyé — seuls les contacts et la liste Brevo seront créés/mis à jour.</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button onClick={() => setConfirming(false)} style={{ padding: '7px 14px', borderRadius: DS.rMd, border: `1.5px solid ${DS.border2}`, background: DS.white }}>Annuler</button>
          <button disabled={syncing} onClick={confirmer} style={{ padding: '7px 14px', borderRadius: DS.rMd, border: 'none', background: DS.grad, color: DS.white, fontWeight: 700 }}>
            {syncing ? 'Synchronisation…' : 'Confirmer'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <button onClick={() => setConfirming(true)} style={{ padding: '10px 18px', borderRadius: DS.rMd, border: 'none', background: DS.grad, color: DS.white, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
      Synchroniser vers Brevo
    </button>
  )
}
