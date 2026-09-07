// ══════════════════════════════════════════════════════════════
// MOJO LEAD ENGINE — Chargeur DB
// Charge les mappings depuis Supabase (source de vérité)
// Fallback automatique sur les fichiers .ts si DB indisponible
// ══════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js'
import { MAPPING_QUESTIONS_MODULES as MQM_FALLBACK } from './mapping_questions_modules'
import { MAPPING_PARCOURS_PROGRAMMES as MPP_FALLBACK } from './mapping_parcours_programmes'
import type { QuestionModuleMapping } from './mapping_questions_modules'
import type { ParcoursProgramme } from './mapping_parcours_programmes'

// Cache en mémoire (TTL = durée de vie du process Next.js)
let mqmCache: QuestionModuleMapping[] | null = null
let mppCache: ParcoursProgramme[] | null = null

export async function getMappingQuestionsModules(): Promise<QuestionModuleMapping[]> {
  if (mqmCache) return mqmCache

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data, error } = await supabase
      .from('mapping_questions_modules')
      .select('*')
      .eq('actif', true)

    if (error || !data || data.length === 0) {
      console.warn('[MQM] DB indisponible ou vide, fallback sur fichier TS')
      mqmCache = MQM_FALLBACK.filter(m => m.actif)
    } else {
      console.log(`[MQM] Chargé depuis Supabase: ${data.length} associations`)
      mqmCache = data as QuestionModuleMapping[]
    }
  } catch (e) {
    console.warn('[MQM] Erreur DB, fallback sur fichier TS:', e)
    mqmCache = MQM_FALLBACK.filter(m => m.actif)
  }

  return mqmCache
}

export async function getMappingParcoursProgammes(): Promise<ParcoursProgramme[]> {
  if (mppCache) return mppCache

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data, error } = await supabase
      .from('mapping_parcours_programmes')
      .select('*')
      .eq('actif', true)

    if (error || !data || data.length === 0) {
      console.warn('[MPP] DB indisponible ou vide, fallback sur fichier TS')
      mppCache = MPP_FALLBACK.filter(m => m.actif)
    } else {
      console.log(`[MPP] Chargé depuis Supabase: ${data.length} associations`)
      mppCache = data as ParcoursProgramme[]
    }
  } catch (e) {
    console.warn('[MPP] Erreur DB, fallback sur fichier TS:', e)
    mppCache = MPP_FALLBACK.filter(m => m.actif)
  }

  return mppCache
}

// Invalider le cache (utile si on modifie la DB en cours de session)
export function invalidateCache() {
  mqmCache = null
  mppCache = null
}
