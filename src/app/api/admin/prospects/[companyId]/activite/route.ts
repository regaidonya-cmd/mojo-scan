import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { computeConsequence, isResultatValide, isOppositionScopeValide, isValidFutureIsoDate, type ResultatAppel, type OppositionScope } from '@/lib/priority/activite-consequence'

function getToken(): string {
  return crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD ?? '').digest('hex')
}

export async function POST(req: NextRequest, { params }: { params: { companyId: string } }) {
  const cookieStore = cookies()
  if (cookieStore.get('admin_auth')?.value !== getToken()) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const {
    resultat, idempotencyKey, personneId, moyenContactId,
    dateRappelSaisie, dateRdvSaisie, dateProchaineActionSaisie, oppositionScope, description,
  }: {
    resultat: ResultatAppel; idempotencyKey: string; personneId?: string; moyenContactId?: string
    dateRappelSaisie?: string; dateRdvSaisie?: string; dateProchaineActionSaisie?: string
    oppositionScope?: OppositionScope; description?: string
  } = body

  const now = new Date().toISOString()

  // P0.7C-HARDENING §1 — autorité serveur : toute valeur brute du client
  // est validée contre une liste FERMÉE avant tout traitement. Le client
  // ne peut jamais faire passer une valeur arbitraire ; computeConsequence()
  // n'est appelée qu'avec des entrées déjà vérifiées.
  if (!isResultatValide(resultat)) {
    return NextResponse.json({ error: `resultat invalide : ${resultat}` }, { status: 400 })
  }
  if (oppositionScope !== undefined && !isOppositionScopeValide(oppositionScope)) {
    return NextResponse.json({ error: `oppositionScope invalide : ${oppositionScope}` }, { status: 400 })
  }

  // P0.7D-FIX.1 §2/§6 — le serveur VALIDE une date fournie par l'utilisateur,
  // il ne la RECALCULE ni ne l'écrase jamais silencieusement par la valeur
  // par défaut. Une date invalide est rejetée explicitement (400), pas
  // remplacée en silence.
  for (const [label, val] of [
    ['dateRappelSaisie', dateRappelSaisie],
    ['dateRdvSaisie', dateRdvSaisie],
    ['dateProchaineActionSaisie', dateProchaineActionSaisie],
  ] as const) {
    if (val !== undefined && !isValidFutureIsoDate(val, now)) {
      return NextResponse.json({ error: `${label} invalide ou trop dans le passé : ${val}` }, { status: 400 })
    }
  }

  if (!idempotencyKey) {
    return NextResponse.json({ error: 'idempotencyKey requise' }, { status: 400 })
  }
  if (resultat === 'DEMANDE_NE_PLUS_CONTACTER') {
    if (!oppositionScope) {
      return NextResponse.json({ error: 'oppositionScope requis pour DEMANDE_NE_PLUS_CONTACTER' }, { status: 400 })
    }
    if (oppositionScope === 'PERSONNE' && !personneId) {
      return NextResponse.json({ error: 'personneId requis pour une opposition PERSONNE' }, { status: 400 })
    }
    if (oppositionScope === 'MOYEN' && !moyenContactId) {
      return NextResponse.json({ error: 'moyenContactId requis pour une opposition MOYEN' }, { status: 400 })
    }
  }

  // P0.7D-FIX.1 §6 — MÊME fonction pure que la prévisualisation client
  // (aucune logique dupliquée) ; seule différence : `now` autoritaire
  // serveur, et la date est celle validée ci-dessus, jamais recalculée.
  let consequence
  try {
    consequence = computeConsequence({
      resultat, now, dateRappelSaisie, dateRdvSaisie, dateProchaineActionSaisie, oppositionScope,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // NOTE : la fonction RPC p07_enregistrer_resultat_appel n'existe pas
  // encore en base (migration non appliquée, cf. p07-migration-preparee.sql).
  // Cet appel échouera tant que la migration n'est pas validée et déployée
  // — comportement attendu et volontaire pour cette phase.
  const { data, error } = await supabase.rpc('p07_enregistrer_resultat_appel', {
    p_company_id: params.companyId,
    p_personne_id: personneId ?? null,
    p_moyen_contact_id: moyenContactId ?? null,
    p_opposition_scope: consequence.oppositionScope,
    p_resultat: resultat,
    p_idempotency_key: idempotencyKey,
    p_description: description ?? '',
    p_temperature: consequence.temperature,
    p_pipeline_stage: consequence.pipelineStage,
    p_next_action_type: consequence.nextActionType,
    p_next_action_due_at: consequence.nextActionDueAt,
    p_next_action_reason: consequence.nextActionReason,
    p_source_id: null,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, consequence, result: data })
}
