import { redirect } from 'next/navigation'
import { recupererProfilCourant, estSdrActif, estAdminActif } from '@/lib/sales/auth-session'
import { compterPortefeuille } from '@/lib/sales/acces-sdr'

export const dynamic = 'force-dynamic'

export default async function SdrAttentePage() {
  const profil = await recupererProfilCourant()

  if (!profil) redirect('/connexion')
  if (estAdminActif(profil)) redirect('/admin') // un admin n'atterrit jamais sur la page d'attente
  if (!estSdrActif(profil)) redirect('/connexion?error=inactif')
  // PR3 — un SDR qui a un portefeuille va directement sur "Mes prospects" ;
  // cette page reste le fallback quand aucun prospect n'est affecté.
  if ((await compterPortefeuille(profil!.userId)) > 0) redirect('/sdr/prospects')

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A186E', margin: '0 0 12px' }}>MOJO Sales — Espace SDR</h1>
        <p style={{ fontSize: 15, color: '#6B6680', lineHeight: 1.5 }}>
          Votre espace commercial est prêt. Vos prospects vous seront affectés prochainement.
        </p>
        <form method="POST" action="/api/auth/logout" style={{ marginTop: 24 }}>
          <button type="submit" style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid #EDEAF5', background: '#fff', fontSize: 14, cursor: 'pointer' }}>
            Se déconnecter
          </button>
        </form>
      </div>
    </div>
  )
}
