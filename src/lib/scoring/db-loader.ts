import { createClient } from '@supabase/supabase-js'
import { MAPPING_QUESTIONS_MODULES as MQM_FALLBACK } from './mapping_questions_modules'
import { MAPPING_PARCOURS_PROGRAMMES as MPP_FALLBACK } from './mapping_parcours_programmes'
import { ENGINE_VERSION } from './version'
import type { QuestionModuleMapping } from './mapping_questions_modules'
import type { ParcoursProgramme } from './mapping_parcours_programmes'

let mqmCache: QuestionModuleMapping[] | null = null
let mppCache: ParcoursProgramme[] | null = null
let dataSource: 'SUPABASE' | 'FALLBACK' = 'FALLBACK'

export function getDataSource() { return dataSource }

export async function getMappingQuestionsModules(): Promise<QuestionModuleMapping[]> {
  if (mqmCache) return mqmCache
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data, error } = await supabase
      .from('mapping_questions_modules').select('*').eq('actif', true)

    if (error || !data || data.length === 0) {
      console.warn(`[DATA_SOURCE=FALLBACK] MQM depuis fichier TS (engine v${ENGINE_VERSION.scoring})`)
      dataSource = 'FALLBACK'
      mqmCache = MQM_FALLBACK.filter(m => m.actif)
    } else {
      console.log(`[DATA_SOURCE=SUPABASE] MQM chargé: ${data.length} associations`)
      dataSource = 'SUPABASE'
      mqmCache = data as QuestionModuleMapping[]
    }
  } catch (e) {
    console.warn(`[DATA_SOURCE=FALLBACK] Erreur DB MQM:`, e)
    dataSource = 'FALLBACK'
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
      .from('mapping_parcours_programmes').select('*').eq('actif', true)

    if (error || !data || data.length === 0) {
      console.warn(`[DATA_SOURCE=FALLBACK] MPP depuis fichier TS`)
      mppCache = MPP_FALLBACK.filter(m => m.actif)
    } else {
      console.log(`[DATA_SOURCE=SUPABASE] MPP chargé: ${data.length} associations`)
      mppCache = data as ParcoursProgramme[]
    }
  } catch (e) {
    console.warn(`[DATA_SOURCE=FALLBACK] Erreur DB MPP:`, e)
    mppCache = MPP_FALLBACK.filter(m => m.actif)
  }
  return mppCache
}

export function invalidateCache() {
  mqmCache = null
  mppCache = null
  console.log('[CACHE] Invalidé')
}
