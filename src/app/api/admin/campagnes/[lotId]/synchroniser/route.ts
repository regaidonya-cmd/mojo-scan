import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { synchroniserLot, realBrevoClient } from '@/lib/brevo/sales-sync'
import { fetchReservoirCampagne } from '@/lib/campagnes/fetch-reservoir'
import { determinerMembresSynchronisables } from '@/lib/campagnes/engine'
import type { MembreASynchroniser } from '@/lib/brevo/sales-types'

function getToken(): string {
  const secret = process.env.ADMIN_PASSWORD ?? ''
  return crypto.createHash('sha256').update(secret).digest('hex')
}

function supabaseServer() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function POST(req: Request, { params }: { params: { lotId: string } }) {
  const cookieStore = cookies()
  if (cookieStore.get('admin_auth')?.value !== getToken()) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const supabase = supabaseServer()

  // ── A. Charger le lot et les membres ──
  const { data: lot, error: erreurLot } = await supabase
    .from('campagne_lots')
    .select('id, nom, brevo_list_id, campagnes(id, nom)')
    .eq('id', params.lotId)
    .single()
  if (erreurLot || !lot) return NextResponse.json({ error: 'Lot introuvable' }, { status: 404 })

  const { data: membresLot } = await supabase
    .from('campagne_lot_membres')
    .select('company_id, statut, companies(name, siren, naf)')
    .eq('lot_id', params.lotId)
    .eq('statut', 'VALIDE')

  const companyIds = new Set((membresLot ?? []).map((m: any) => m.company_id))

  // ── B. Recalculer l'éligibilité RÉELLE de tous les membres — réutilise
  // la même logique et la même portée (NATIONALE, validée en Production)
  // que le réservoir Campagnes lui-même. FIX.3 : plus jamais de valeurs
  // hardcodées (emailSource/emailPartage) pour ce calcul. ──
  const reservoir = await fetchReservoirCampagne({})
  const parCompanyId = new Map(reservoir.prospects.map((p) => [p.companyId, p]))

  const membresAvecEligibiliteReelle = (membresLot ?? []).map((m: any) => {
    const p = parCompanyId.get(m.company_id)
    return {
      companyId: m.company_id as string,
      raisonSociale: m.companies?.name ?? '',
      siren: m.companies?.siren ?? '',
      emailExploitable: p?.emailDisponible ?? false,
      oppositionActive: p?.oppositionActive ?? false,
      eligibiliteCampagne: p?.eligibiliteCampagne ?? 'NON_ELIGIBLE',
    }
  })

  // ── C. Déterminer les membres synchronisables ──
  const { synchronisables, nonSynchronisables } = determinerMembresSynchronisables(membresAvecEligibiliteReelle)

  // ── D. 0 membre synchronisable => AUCUN appel Brevo, retour explicite ──
  if (synchronisables.length === 0) {
    for (const m of nonSynchronisables) {
      await supabase.from('campagne_lot_membres').update({
        statut: 'EXCLU',
        raison_exclusion: `Éligibilité recalculée au moment du sync : ${m.eligibiliteCampagne}`,
      }).eq('lot_id', params.lotId).eq('company_id', m.companyId)
    }
    // §7 — pas de faux statut : le lot n'est PAS marqué SYNCHRONISE
    // puisqu'aucun appel Brevo n'a eu lieu. brevo_list_id/synchronized_at
    // restent inchangés (rien ne s'est produit côté Brevo).
    await supabase.from('campagne_lots').update({ statut: 'ERREUR' }).eq('id', params.lotId)

    return NextResponse.json({
      selectionnes: membresAvecEligibiliteReelle.length,
      synchronises: 0,
      exclus: membresAvecEligibiliteReelle.length,
      erreurs: 0,
      brevoListId: null,
      message: 'Aucun membre éligible au moment du sync — aucun appel Brevo effectué',
    })
  }

  // ── E. >= 1 membre synchronisable : construire les payloads et
  // poursuivre vers la logique Brevo (getOrCreateList inclus) ──
  const membres: MembreASynchroniser[] = []
  for (const m of synchronisables) {
    const { data: personnes } = await supabase.from('personnes').select('id').eq('company_id', m.companyId)
    const personneIds = (personnes ?? []).map((p: any) => p.id)
    const { data: pmc } = await supabase
      .from('personnes_moyens_contact')
      .select('moyens_contact(type, valeur_normalisee)')
      .in('personne_id', personneIds.length ? personneIds : ['00000000-0000-0000-0000-000000000000'])
    const emailRow: any = (pmc ?? []).find((r: any) => r.moyens_contact?.type === 'email')

    membres.push({
      companyId: m.companyId,
      email: emailRow?.moyens_contact?.valeur_normalisee ?? '',
      emailExploitable: m.emailExploitable,
      oppositionActive: m.oppositionActive,
      eligibiliteCampagneToujoursValide: true, // déjà garanti ELIGIBLE à l'étape C
      attributes: {
        MOJO_COMPANY_ID: m.companyId,
        MOJO_CAMPAIGN_CODE: (lot as any).campagnes?.nom ?? '',
        MOJO_LOT_CODE: lot.nom,
        RAISON_SOCIALE: m.raisonSociale,
        SIREN: m.siren,
      },
    })
  }

  // Marquer les non-synchronisables comme EXCLU dès maintenant (avant
  // l'appel Brevo, qui ne les concerne de toute façon pas).
  for (const m of nonSynchronisables) {
    await supabase.from('campagne_lot_membres').update({
      statut: 'EXCLU',
      raison_exclusion: `Éligibilité recalculée au moment du sync : ${m.eligibiliteCampagne}`,
    }).eq('lot_id', params.lotId).eq('company_id', m.companyId)
  }

  const nomListe = `MOJO — ${(lot as any).campagnes?.nom ?? ''} — ${lot.nom}`

  // ⚠️ Appel Brevo RÉEL ici (realBrevoClient()) — non exécuté dans cette
  // session faute de BREVO_API_KEY disponible, cf. limites déclarées.
  const resultat = await synchroniserLot(nomListe, membres, realBrevoClient(), lot.brevo_list_id ? Number(lot.brevo_list_id) : undefined)

  for (const detail of resultat.details) {
    await supabase.from('campagne_lot_membres').update({
      statut: detail.statut, raison_exclusion: detail.raison, brevo_contact_id: detail.brevoContactId ?? null,
      synchronized_at: detail.statut === 'SYNCHRONISE' ? new Date().toISOString() : null,
    }).eq('lot_id', params.lotId).eq('company_id', detail.companyId)
  }

  // §7 — le lot n'est marqué SYNCHRONISE que si au moins un membre a
  // réellement été synchronisé avec succès ; sinon ERREUR, jamais un
  // faux statut de succès.
  await supabase.from('campagne_lots').update({
    brevo_list_id: resultat.brevoListId?.toString(),
    synchronized_at: new Date().toISOString(),
    statut: resultat.synchronises > 0 ? 'SYNCHRONISE' : 'ERREUR',
  }).eq('id', params.lotId)

  return NextResponse.json({
    selectionnes: membresAvecEligibiliteReelle.length,
    synchronises: resultat.synchronises,
    exclus: resultat.exclus + nonSynchronisables.length,
    erreurs: resultat.erreurs,
    brevoListId: resultat.brevoListId,
  })
}
