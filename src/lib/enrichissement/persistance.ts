// ══════════════════════════════════════════════════════════════
// ENRICH.VSG.6 — Persistance générique d'enrichissement, PAR ÉTAPE.
// Table enrichissement_resultats — créée et vérifiée en base (GRANT
// service_role confirmés). Ce module n'appelle Supabase QUE si
// supabasePersistanceClient() est utilisé (jamais dans les tests, qui
// injectent un mock en mémoire).
//
// ENRICH.VSG.6B — distinction retryable/non-retryable SANS migration :
// le schéma actuel (colonne `erreur` texte libre) suffit. Convention :
// un message préfixé "[NON_RETRYABLE]" signale une erreur 4xx Google
// (400/401/403/404) qui échouerait à l'identique lors d'une reprise —
// jamais retentée automatiquement. Toute autre erreur (5xx, réseau) reste
// retryable par défaut lors d'une prochaine reprise. Choix explicite :
// ajouter une colonne booléenne dédiée aurait nécessité une nouvelle
// migration pour un gain marginal — le préfixe textuel est suffisant,
// lisible en base, et n'exige aucune modification de schéma.
// ══════════════════════════════════════════════════════════════

export type StatutEnrichissement = 'A_TRAITER' | 'MATCH_FORT' | 'MATCH_PROBABLE' | 'AMBIGU' | 'NON_TROUVE' | 'ERREUR'

export interface LigneEnrichissement {
  siren: string
  companyId: string | null
  lotCode: string
  source: string
  textSearchTermine: boolean
  placeDetailsTermine: boolean
  statut: StatutEnrichissement
  verdictMatching: 'MATCH_FORT' | 'MATCH_PROBABLE' | 'AMBIGU' | 'NON_TROUVE' | null
  scoreMatching: number | null
  placeId: string | null
  telephone: string | null
  siteWeb: string | null
  email: string | null
  candidatsExamines: unknown | null
  erreur: string | null
}

export const PREFIXE_ERREUR_NON_RETRYABLE = '[NON_RETRYABLE]'

export function marquerErreurNonRetryable(message: string): string {
  return `${PREFIXE_ERREUR_NON_RETRYABLE} ${message}`
}

function estErreurNonRetryable(ligne: LigneEnrichissement): boolean {
  return !!ligne.erreur && ligne.erreur.startsWith(PREFIXE_ERREUR_NON_RETRYABLE)
}

/** Statuts TERMINAUX — jamais retentés lors d'une reprise. */
const STATUTS_TERMINAUX: StatutEnrichissement[] = ['MATCH_FORT', 'MATCH_PROBABLE', 'AMBIGU', 'NON_TROUVE']

export function estTermine(ligne: LigneEnrichissement | undefined): boolean {
  return !!ligne && STATUTS_TERMINAUX.includes(ligne.statut)
}

export type ActionReprise = 'TEXT_SEARCH' | 'PLACE_DETAILS_UNIQUEMENT' | 'AUCUNE'

/** Détermine l'action de reprise nécessaire pour une entreprise, à partir
 * de la ligne existante (absente si jamais tentée). Ne devine jamais un
 * état non observé — une ligne absente => reprise complète (Text Search).
 * ENRICH.VSG.6B : une erreur NON_RETRYABLE (4xx Google) devient terminale
 * — jamais retentée, quelle que soit l'étape où elle s'est produite. */
export function determinerActionReprise(ligne: LigneEnrichissement | undefined): ActionReprise {
  if (!ligne) return 'TEXT_SEARCH'
  if (estTermine(ligne)) return 'AUCUNE'
  if (estErreurNonRetryable(ligne)) return 'AUCUNE' // 4xx Google — jamais retenté, quelle que soit l'étape atteinte
  if (!ligne.textSearchTermine) return 'TEXT_SEARCH'
  if (ligne.textSearchTermine && ligne.placeId && !ligne.placeDetailsTermine) return 'PLACE_DETAILS_UNIQUEMENT'
  return 'AUCUNE' // cas résiduel prudent : jamais de boucle, on ne refait rien si l'état est ambigu
}

export interface PersistanceClient {
  lireLot(lotCode: string, source: string): Promise<Map<string, LigneEnrichissement>>
  sauvegarderEtape(ligne: LigneEnrichissement): Promise<void>
}

/** Implémentation réelle — appelle Supabase. Jamais utilisée par les
 * tests (mock injecté à la place). */
export function supabasePersistanceClient(): PersistanceClient {
  return {
    async lireLot(lotCode, source) {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { data, error } = await supabase
        .from('enrichissement_resultats')
        .select('*')
        .eq('lot_code', lotCode).eq('source', source)
      if (error) throw new Error(`Lecture enrichissement_resultats: ${error.message}`)
      const map = new Map<string, LigneEnrichissement>()
      for (const row of data ?? []) {
        map.set(row.siren, {
          siren: row.siren, companyId: row.company_id, lotCode: row.lot_code, source: row.source,
          textSearchTermine: row.text_search_termine, placeDetailsTermine: row.place_details_termine,
          statut: row.statut, verdictMatching: row.verdict_matching, scoreMatching: row.score_matching, placeId: row.place_id,
          telephone: row.telephone, siteWeb: row.site_web, email: row.email,
          candidatsExamines: row.candidats_examines, erreur: row.erreur,
        })
      }
      return map
    },
    async sauvegarderEtape(ligne) {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { error } = await supabase.from('enrichissement_resultats').upsert({
        siren: ligne.siren, company_id: ligne.companyId, lot_code: ligne.lotCode, source: ligne.source,
        text_search_termine: ligne.textSearchTermine, place_details_termine: ligne.placeDetailsTermine,
        statut: ligne.statut, verdict_matching: ligne.verdictMatching, score_matching: ligne.scoreMatching, place_id: ligne.placeId,
        telephone: ligne.telephone, site_web: ligne.siteWeb, email: ligne.email,
        candidats_examines: ligne.candidatsExamines, erreur: ligne.erreur,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'siren,lot_code,source' })
      if (error) throw new Error(`Sauvegarde enrichissement_resultats: ${error.message}`)
    },
  }
}
