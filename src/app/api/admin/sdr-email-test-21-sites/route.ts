import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { executerExtractionEmailSdr } from '@/lib/enrichissement/orchestrateur-email-sdr'

function getToken(): string {
  const secret = process.env.ADMIN_PASSWORD ?? ''
  return crypto.createHash('sha256').update(secret).digest('hex')
}

// Paramètre du territoire — jamais stocké en base, propre à ce benchmark.
const COMMUNE_CIBLE = 'Villeneuve-Saint-Georges'
const ALIASES_COMMUNE = ['vsg']

function normaliserTelephone(tel: string): string {
  return tel.replace(/[\s.\-()]/g, '')
}

// ══════════════════════════════════════════════════════════════
// ÉTAPE 1 — Test de la brique email sur les sites réels déjà obtenus.
// READ-ONLY sur enrichissement_resultats, AUCUNE écriture nulle part
// (ni personnes_moyens_contact, ni prospects_sales). Jamais appelée
// pendant cette phase de développement — nécessite un GO séparé.
//
// Expose désormais qualificationV2 (EMAIL V2) EN PLUS du rapport V1
// existant — telephoneFiable est calculé EN MÉMOIRE (dédup par numéro
// normalisé, jamais stocké en base), le filtre de sélection des lignes
// reste strictement inchangé (mêmes 28 lignes qu'en V1).
// ══════════════════════════════════════════════════════════════
export async function POST() {
  const cookieStore = cookies()
  if (cookieStore.get('admin_auth')?.value !== getToken()) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: lignes, error } = await supabase
    .from('enrichissement_resultats')
    .select('company_id, siren, site_web, telephone, statut')
    .not('site_web', 'is', null)
    .not('company_id', 'is', null)

  if (error) return NextResponse.json({ error: `Lecture enrichissement_resultats: ${error.message}` }, { status: 500 })

  const brutes = lignes ?? []

  // Fiabilité calculée EN MÉMOIRE : un numéro normalisé partagé par ≥2
  // company_id n'est jamais fiable pour aucun des deux.
  const occurrencesParNumero = new Map<string, Set<string>>()
  for (const l of brutes) {
    if (!l.telephone) continue
    const norm = normaliserTelephone(l.telephone)
    if (!occurrencesParNumero.has(norm)) occurrencesParNumero.set(norm, new Set())
    occurrencesParNumero.get(norm)!.add(l.company_id)
  }

  const sites = brutes.map((l: any) => {
    const statutExploitable = l.statut === 'MATCH_FORT' || l.statut === 'MATCH_PROBABLE'
    const numeroUnique = l.telephone ? (occurrencesParNumero.get(normaliserTelephone(l.telephone))?.size ?? 0) === 1 : false
    return {
      companyId: l.company_id, siren: l.siren, siteWeb: l.site_web,
      telephone: l.telephone, telephoneFiable: !!l.telephone && statutExploitable && numeroUnique,
    }
  })

  const rapport = await executerExtractionEmailSdr(sites, undefined, COMMUNE_CIBLE, ALIASES_COMMUNE)

  return NextResponse.json(rapport)
}

