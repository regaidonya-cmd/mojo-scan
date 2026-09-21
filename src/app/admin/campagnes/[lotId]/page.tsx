import { cookies } from 'next/headers'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { DS } from '@/lib/ds/tokens'
import { SynchroniserBrevoButton } from '@/components/sales/SynchroniserBrevoButton'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function getToken(): string {
  const secret = process.env.ADMIN_PASSWORD ?? ''
  return crypto.createHash('sha256').update(secret).digest('hex')
}

function supabaseServer() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export default async function LotPage({ params }: { params: { lotId: string } }) {
  const cookieStore = cookies()
  const authCookie = cookieStore.get('admin_auth')?.value
  if (authCookie !== getToken()) {
    return (
      <div style={{ minHeight: '100vh', background: '#F7F6FC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <form method="POST" action="/api/admin/login" style={{ background: '#fff', padding: 32, borderRadius: 16, border: '1px solid #EDEAF5', width: 320 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A186E', margin: '0 0 20px', textAlign: 'center' }}>MOJO ACADÉMIE</h1>
          <p style={{ fontSize: 13, color: '#6B6680', margin: '0 0 16px', textAlign: 'center' }}>Accès administrateur</p>
          <input name="password" type="password" placeholder="Mot de passe" autoFocus
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #EDEAF5', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' as const, marginBottom: 12 }} />
          <button type="submit"
            style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #6B35B8, #C8399A)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Accéder →
          </button>
        </form>
      </div>
    )
  }

  const supabase = supabaseServer()

  const { data: lot, error } = await supabase
    .from('campagne_lots')
    .select('id, nom, nombre_selectionne, nombre_valide, nombre_exclu, statut, brevo_list_id, created_at, campagnes(nom)')
    .eq('id', params.lotId)
    .single()

  if (error || !lot) {
    return (
      <div style={{ maxWidth: 700, margin: '40px auto', padding: 20, fontFamily: DS.fontBody }}>
        <p>Lot introuvable — {error?.message ?? 'inconnu'}.</p>
        <p style={{ color: DS.muted, fontSize: 13 }}>
          Si la migration P0.8C.2 n'a pas encore été exécutée, cette erreur est attendue (tables campagnes/campagne_lots absentes).
        </p>
      </div>
    )
  }

  const { data: membres } = await supabase
    .from('campagne_lot_membres')
    .select('company_id, statut, raison_exclusion, companies(name)')
    .eq('lot_id', params.lotId)

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px 60px', fontFamily: DS.fontBody }}>
      <div style={{ fontFamily: DS.fontDisplay, fontWeight: 800, fontSize: 20 }}>{(lot as any).campagnes?.nom} — {lot.nom}</div>
      <div style={{ display: 'flex', gap: 20, margin: '16px 0', fontSize: 13 }}>
        <div>Sélectionnés : <strong>{lot.nombre_selectionne}</strong></div>
        <div>Valides : <strong>{lot.nombre_valide}</strong></div>
        <div>Exclus : <strong>{lot.nombre_exclu}</strong></div>
        <div>Créé le : {new Date(lot.created_at).toLocaleDateString('fr-FR')}</div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left' as const, color: DS.muted, fontSize: 11.5, textTransform: 'uppercase' as const }}>
            <th style={{ padding: 8 }}>Entreprise</th>
            <th style={{ padding: 8 }}>Statut</th>
            <th style={{ padding: 8 }}>Raison exclusion</th>
          </tr>
        </thead>
        <tbody>
          {(membres ?? []).map((m: any) => (
            <tr key={m.company_id} style={{ borderTop: `1px solid ${DS.border}` }}>
              <td style={{ padding: 8 }}>{m.companies?.name}</td>
              <td style={{ padding: 8 }}>{m.statut}</td>
              <td style={{ padding: 8, color: DS.muted }}>{m.raison_exclusion ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 24 }}>
        <SynchroniserBrevoButton lotId={lot.id} nombreValide={lot.nombre_valide} />
      </div>

      <a href="/admin/campagnes/nouveau" style={{ display: 'inline-block', marginTop: 20, fontSize: 13, color: DS.violet }}>← Retour Prospects / sélection</a>
    </div>
  )
}
