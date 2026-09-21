import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { controleAjoutMembreLot } from '@/lib/campagnes/engine'

function getToken(): string {
  const secret = process.env.ADMIN_PASSWORD ?? ''
  return crypto.createHash('sha256').update(secret).digest('hex')
}

function supabaseServer() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function POST(req: Request) {
  const cookieStore = cookies()
  if (cookieStore.get('admin_auth')?.value !== getToken()) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const { campagneNom, lotNom, companyIds } = await req.json()

  if (!campagneNom || !lotNom || !Array.isArray(companyIds) || companyIds.length === 0) {
    return NextResponse.json({ error: 'Paramètres invalides (campagneNom, lotNom, companyIds requis, sélection non vide)' }, { status: 400 })
  }

  const supabase = supabaseServer()

  // P0.8C.2B — la migration campagnes/campagne_lots/campagne_lot_membres
  // N'EST PAS EXÉCUTÉE à ce stade. Cet appel échouera avec une erreur
  // Postgres "relation does not exist" jusqu'à validation explicite et
  // exécution de la migration — comportement attendu, pas un bug.
  const { data: campagneExistante } = await supabase.from('campagnes').select('id').eq('nom', campagneNom).maybeSingle()
  let campagneId = campagneExistante?.id
  if (!campagneId) {
    const { data: nouvelle, error } = await supabase.from('campagnes').insert({ nom: campagneNom }).select('id').single()
    if (error) return NextResponse.json({ error: `Création campagne: ${error.message}` }, { status: 500 })
    campagneId = nouvelle.id
  }

  const { data: lot, error: erreurLot } = await supabase
    .from('campagne_lots')
    .insert({ campagne_id: campagneId, nom: lotNom, nombre_selectionne: companyIds.length })
    .select('id')
    .single()
  if (erreurLot) return NextResponse.json({ error: `Création lot: ${erreurLot.message}` }, { status: 500 })

  // Contrôles réels par entreprise avant insertion (réutilise le même
  // moteur pur que les tests P0.8C.2A)
  const dejaDansLot = new Set<string>()
  let valides = 0
  let exclus = 0
  const membres: any[] = []
  for (const companyId of companyIds as string[]) {
    const { data: opp } = await supabase.from('oppositions').select('id').eq('company_id', companyId).eq('actif', true).limit(1)
    const r = controleAjoutMembreLot({ companyId, emailExploitable: true, oppositionActive: (opp?.length ?? 0) > 0 }, dejaDansLot)
    if (r.statut === 'VALIDE') { valides++; dejaDansLot.add(companyId) } else exclus++
    membres.push({ lot_id: lot.id, company_id: companyId, statut: r.statut === 'VALIDE' ? 'VALIDE' : 'EXCLU', raison_exclusion: r.raisonExclusion })
  }

  const { error: erreurMembres } = await supabase.from('campagne_lot_membres').insert(membres)
  if (erreurMembres) return NextResponse.json({ error: `Création membres: ${erreurMembres.message}` }, { status: 500 })

  await supabase.from('campagne_lots').update({ nombre_valide: valides, nombre_exclu: exclus, statut: 'CONTROLE_OK' }).eq('id', lot.id)

  return NextResponse.json({ campagneId, lotId: lot.id, nombreSelectionne: companyIds.length, nombreValide: valides, nombreExclu: exclus })
}
