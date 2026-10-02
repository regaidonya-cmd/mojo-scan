import { notFound, redirect } from 'next/navigation'
import { autoriserAccesProspect } from '@/lib/sales/acces-sdr'
import { fetchSingleProspect, fetchHistorique } from '@/lib/priority/fetch-real'
import { SdrNav } from '@/components/sales/SdrNav'
import { FicheProspectView } from '@/components/sales/FicheProspectView'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// PR3 — Fiche prospect SDR. Contrôle d'affectation serveur AVANT toute
// lecture : un prospect hors portefeuille (URL forgée) -> 404, son
// existence n'est jamais révélée.
export default async function FicheProspectSdrPage({ params }: { params: { companyId: string } }) {
  const acces = await autoriserAccesProspect(params.companyId)
  if (acces.statut === 'NON_AUTORISE') redirect('/connexion')
  if (acces.statut === 'INTROUVABLE') notFound()

  const vm = await fetchSingleProspect(params.companyId)
  if (!vm) notFound()
  const historique = await fetchHistorique(params.companyId)

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8' }}>
      <SdrNav nom={acces.profil.nom} />
      <FicheProspectView
        vm={vm}
        historique={historique}
        retourHref="/sdr/prospects"
        endpointActivite={`/api/sdr/prospects/${params.companyId}/activite`}
        modeSdr
      />
    </div>
  )
}
