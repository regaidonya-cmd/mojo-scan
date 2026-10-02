import { redirect } from 'next/navigation'
import { exigerAccesSales, filtreAffectation } from '@/lib/sales/acces-sdr'
import { fetchMaJourneeData } from '@/lib/priority/fetch-real'
import { SdrNav } from '@/components/sales/SdrNav'
import { SdrProspectsTable } from '@/components/sales/SdrProspectsTable'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// PR3 — "Mes prospects". Identité = session Supabase Auth + profil
// (jamais le cookie admin_auth). Le filtre assigned_to est appliqué DANS
// la requête base : un SDR ne reçoit jamais un prospect hors portefeuille.
export default async function MesProspectsPage() {
  const acces = await exigerAccesSales()
  if (acces.statut !== 'AUTORISE') redirect('/connexion')

  const all = await fetchMaJourneeData({ assignedTo: filtreAffectation(acces) })

  // Aucun portefeuille affecté -> page d'attente (fallback).
  if (acces.perimetre === 'PORTEFEUILLE' && all.length === 0) redirect('/sdr/attente')

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8' }}>
      <SdrNav nom={acces.profil.nom} />
      <SdrProspectsTable all={all} />
    </div>
  )
}
