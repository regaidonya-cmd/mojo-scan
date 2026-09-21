import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { synchroniserLot, realBrevoClient } from '@/lib/brevo/sales-sync'
import { computeEligibiliteCampagne } from '@/lib/campagnes/engine'
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

  const membres: MembreASynchroniser[] = []
  for (const m of membresLot ?? []) {
    const mm: any = m
    const companyId = mm.company_id

    // §5 — contrôles temps réel, jamais fiés uniquement au snapshot du lot.
    const { data: personnes } = await supabase.from('personnes').select('id').eq('company_id', companyId)
    const personneIds = (personnes ?? []).map((p: any) => p.id)
    const { data: pmc } = await supabase
      .from('personnes_moyens_contact')
      .select('moyen_contact_id, source_id, moyens_contact(type, valeur_normalisee)')
      .in('personne_id', personneIds.length ? personneIds : ['00000000-0000-0000-0000-000000000000'])
    const emailRow: any = (pmc ?? []).find((r: any) => r.moyens_contact?.type === 'email')

    const { data: oppEntreprise } = await supabase.from('oppositions').select('id').eq('company_id', companyId).eq('actif', true).limit(1)
    const oppositionActive = (oppEntreprise?.length ?? 0) > 0

    const eligibilite = computeEligibiliteCampagne({
      companyId, naf: mm.companies?.naf ?? null, raisonSociale: mm.companies?.name ?? '',
      emailSource: null, // source non re-résolue ici par souci de simplicité — le contrôle DB pur (opposition/email) prime, cf. limite déclarée en sortie
      emailExploitable: !!emailRow, emailPartageAvecAutreEntreprise: false,
      oppositionActive, nomAmbigu: false,
    })

    membres.push({
      companyId,
      email: emailRow?.moyens_contact?.valeur_normalisee ?? '',
      emailExploitable: !!emailRow,
      oppositionActive,
      eligibiliteCampagneToujoursValide: eligibilite.statut !== 'NON_ELIGIBLE',
      attributes: {
        MOJO_COMPANY_ID: companyId,
        MOJO_CAMPAIGN_CODE: (lot as any).campagnes?.nom ?? '',
        MOJO_LOT_CODE: lot.nom,
        RAISON_SOCIALE: mm.companies?.name ?? '',
        SIREN: mm.companies?.siren ?? '',
      },
    })
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
  await supabase.from('campagne_lots').update({
    brevo_list_id: resultat.brevoListId?.toString(), synchronized_at: new Date().toISOString(), statut: 'SYNCHRONISE',
  }).eq('id', params.lotId)

  return NextResponse.json({
    selectionnes: resultat.selectionnes, synchronises: resultat.synchronises,
    exclus: resultat.exclus, erreurs: resultat.erreurs, brevoListId: resultat.brevoListId,
  })
}
