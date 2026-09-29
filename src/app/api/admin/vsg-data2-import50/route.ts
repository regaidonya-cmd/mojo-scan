import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { ENTREPRISES_SIRENE_VSG_50 } from '@/lib/enrichissement/donnees-sirene-vsg50'
import { importerLotEntreprises, versEntrepriseAImporter } from '@/lib/enrichissement/import-companies-vsg50'
import { creerPersistanceImportSupabase } from '@/lib/enrichissement/persistance-import-supabase'

function getToken(): string {
  const secret = process.env.ADMIN_PASSWORD ?? ''
  return crypto.createHash('sha256').update(secret).digest('hex')
}

const SOURCE_CODE = 'SIRENE_BAT_VSG_50'
const LOT_CODE = 'VSG_BAT50'

export async function POST() {
  const cookieStore = cookies()
  if (cookieStore.get('admin_auth')?.value !== getToken()) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const entreprises = ENTREPRISES_SIRENE_VSG_50.map((e) =>
    versEntrepriseAImporter(e.siren, e.siret, e.name, e.enseigne, e.naf, e.address, e.postalCode, e.city, e.effectif, e.siege, SOURCE_CODE)
  )

  const rapport = await importerLotEntreprises(entreprises, creerPersistanceImportSupabase(supabase))

  // Rattachement des 40 enrichissements existants (SIREN -> company_id),
  // déterministe et idempotent (jamais un nouvel appel Google).
  const { data: companies } = await supabase.from('companies').select('id, siren').in('siren', ENTREPRISES_SIRENE_VSG_50.map((e) => e.siren))
  let nbRattaches = 0
  for (const c of companies ?? []) {
    const { error, count } = await supabase
      .from('enrichissement_resultats')
      .update({ company_id: c.id })
      .eq('siren', c.siren).eq('lot_code', LOT_CODE).is('company_id', null)
    if (!error) nbRattaches++
  }

  // Traçabilité (table imports, réutilisée telle quelle).
  await supabase.from('imports').insert({
    pipeline: 'VSG_DATA_2_import_50', date_import: new Date().toISOString(), version_code: 'vsgdata2_v1',
    statut: 'termine', metriques: { crees: rapport.nbCrees, dejaPresents: rapport.nbDejaPresents, erreurs: rapport.nbErreurs, rattaches: nbRattaches },
  })

  return NextResponse.json({ rapport, nbRattaches })
}
