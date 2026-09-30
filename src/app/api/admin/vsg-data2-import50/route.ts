import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { ENTREPRISES_SIRENE_VSG_50 } from '@/lib/enrichissement/donnees-sirene-vsg50'
import { ENTREPRISES_SIRENE_VSG_COMPLEMENT_18 } from '@/lib/enrichissement/donnees-sirene-vsg50-complement'
import { importerLotEntreprises, versEntrepriseAImporter } from '@/lib/enrichissement/import-companies-vsg50'
import { creerPersistanceImportSupabase } from '@/lib/enrichissement/persistance-import-supabase'
import { verifierCoherenceOuBloquer, IncoherenceImportError } from '@/lib/enrichissement/controle-coherence-import'

function getToken(): string {
  const secret = process.env.ADMIN_PASSWORD ?? ''
  return crypto.createHash('sha256').update(secret).digest('hex')
}

const SOURCE_CODE = 'SIRENE_BAT_VSG_50'
const LOT_CODE = 'VSG_BAT50'
const SIREN_BLACK_HOLE = '819064395' // déjà existant dans companies (source='sales_import') — jamais recréé, seulement rattaché

export async function POST() {
  const cookieStore = cookies()
  if (cookieStore.get('admin_auth')?.value !== getToken()) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── Source de vérité : les SIREN réellement présents dans enrichissement_resultats pour ce lot ──
  const { data: lignesReelles, error: erreurLecture } = await supabase
    .from('enrichissement_resultats').select('siren').eq('lot_code', LOT_CODE)
  if (erreurLecture) return NextResponse.json({ error: `Lecture enrichissement_resultats: ${erreurLecture.message}` }, { status: 500 })
  const sirenAttendus = Array.from(new Set((lignesReelles ?? []).map((l: any) => l.siren)))

  // ── Jeu de données disponible pour l'import (50 initiales + 18 complément), + BLACK & HOLE traité à part ──
  const sirenSource = [...ENTREPRISES_SIRENE_VSG_50.map((e) => e.siren), ...ENTREPRISES_SIRENE_VSG_COMPLEMENT_18.map((e) => e.siren), SIREN_BLACK_HOLE]

  // ── GARDE-FOU : bloque avant toute écriture si incohérence (absents ou doublons) ──
  let rapportCoherence
  try {
    rapportCoherence = verifierCoherenceOuBloquer(sirenAttendus, sirenSource)
  } catch (e) {
    if (e instanceof IncoherenceImportError) {
      return NextResponse.json({ error: e.message, rapportCoherence: e.rapport }, { status: 409 })
    }
    throw e
  }

  // ── Import des 18 nouvelles entreprises (find-or-create, les 50 déjà importées ne sont pas retouchées) ──
  const entreprisesAImporter = ENTREPRISES_SIRENE_VSG_COMPLEMENT_18.map((e) =>
    versEntrepriseAImporter(e.siren, e.siret, e.name, e.enseigne, e.naf, e.address, e.postalCode, e.city, e.effectif, e.siege, SOURCE_CODE)
  )
  const rapportImport = await importerLotEntreprises(entreprisesAImporter, creerPersistanceImportSupabase(supabase))

  // ── Rattachement — compteur RÉEL (nombre de lignes effectivement affectées, pas le nombre d'itérations) ──
  const { data: companies } = await supabase.from('companies').select('id, siren').in('siren', sirenSource)
  let nbRattaches = 0
  for (const c of companies ?? []) {
    const { data: lignesMaj, error } = await supabase
      .from('enrichissement_resultats')
      .update({ company_id: c.id })
      .eq('siren', c.siren).eq('lot_code', LOT_CODE).is('company_id', null)
      .select('id') // permet de compter réellement les lignes affectées
    if (error) continue
    nbRattaches += lignesMaj?.length ?? 0
  }

  const { count: nbNullRestant } = await supabase
    .from('enrichissement_resultats').select('id', { count: 'exact', head: true })
    .eq('lot_code', LOT_CODE).is('company_id', null)

  await supabase.from('imports').insert({
    pipeline: 'VSG_DATA_3_correction_complement', date_import: new Date().toISOString(), version_code: 'vsgdata3_v1',
    statut: 'termine',
    metriques: { crees: rapportImport.nbCrees, dejaPresents: rapportImport.nbDejaPresents, erreurs: rapportImport.nbErreurs, rattaches: nbRattaches, nullRestant: nbNullRestant },
  })

  return NextResponse.json({ rapportCoherence, rapportImport, nbRattaches, nbNullRestant })
}
