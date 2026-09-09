import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { computeBusinessScore, computeLeadScore, computePriorities, detectBranch } from '@/lib/scoring/engine'
import { computeRecommendations } from '@/lib/scoring/modules'
import { computeFunding } from '@/lib/funding/engine'
import { ENGINE_VERSION } from '@/lib/scoring/version'
import { syncContactBrevo } from '@/lib/brevo/sync'
import { sendLeadAlert } from '@/lib/email/hot-lead'
import { z } from 'zod'

const SubmitSchema = z.object({
  mode:    z.enum(['site','terrain','call']),
  company: z.object({
    siren: z.string().optional(), siret: z.string().optional(),
    name: z.string(), naf: z.string().optional(), naf_label: z.string().optional(),
    city: z.string().optional(), postal_code: z.string().optional(), employee_band: z.string().optional() as any,
  }).optional(),
  answers: z.array(z.object({ question_code: z.string(), value: z.string(), score: z.number() })),
  contact: z.object({
    firstname: z.string(), lastname: z.string().optional(),
    email: z.string().email(), phone: z.string().optional(),
  }).optional(),
  consentDiag:      z.boolean(),
  consentMarketing: z.boolean(),
  consentDate:      z.string().optional(),
  consentSource:    z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = SubmitSchema.parse(body)

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const answersMap = Object.fromEntries(data.answers.map(a => [a.question_code, a.value]))

    // ── Scoring ────────────────────────────────────────────────
    const { top, parcoursMatch, moduleScores, topWithPrerequisite } = computeRecommendations(
      answersMap, data.company?.naf, 3
    )

    const branch        = detectBranch(answersMap)
    const businessScore = computeBusinessScore(answersMap)
    const leadScore     = computeLeadScore(answersMap, businessScore)
    const priorities    = computePriorities(businessScore, branch, answersMap)
    const funding       = computeFunding(data.company, answersMap)

    const recommendations = topWithPrerequisite.map((ps, i) => ({
      rank: i + 1,
      id_programme: ps.programme.id,
      titre:   ps.programme.titre,
      duree_h: ps.programme.duree_h,
      tarif_ht:ps.programme.tarif_ht,
      pilier:  ps.programme.pilier,
      objectif:ps.programme.objectif,
      resultat:ps.programme.resultat,
      score:   ps.score_total,
      score_besoins: ps.score_besoins,
      prerequis: ps.prerequis.status,
      log: ps.log,
    }))

    const parcoursData = parcoursMatch.confiance !== 'AUCUN_PARCOURS_METIER' ? {
      id: parcoursMatch.parcours!.id, metier: parcoursMatch.parcours!.metier,
      nom: parcoursMatch.parcours!.nom, duree_h: parcoursMatch.parcours!.duree_h,
      tarif_ht: parcoursMatch.parcours!.tarif_ht, promesse: parcoursMatch.parcours!.promesse,
      confiance: parcoursMatch.confiance,
      raison: parcoursMatch.confiance === 'MATCH_FORT'
        ? `Votre activité correspond au parcours métier "${parcoursMatch.parcours!.metier}".`
        : `Votre activité pourrait correspondre au parcours "${parcoursMatch.parcours!.metier}" — à confirmer lors d'un échange.`,
    } : null

    // ── Upsert entreprise ──────────────────────────────────────
    let companyId: string | undefined
    if (data.company?.name) {
      try {
        if (data.company.siren) {
          const { data: co } = await supabase.from('companies')
            .upsert({ siren: data.company.siren, siret: data.company.siret, name: data.company.name,
              naf: data.company.naf, naf_label: data.company.naf_label, city: data.company.city,
              postal_code: data.company.postal_code, employee_band: data.company.employee_band },
              { onConflict: 'siren' })
            .select('id').single()
          if (co) companyId = co.id
        } else {
          const { data: co } = await supabase.from('companies')
            .insert({ name: data.company.name, city: data.company.city,
              postal_code: data.company.postal_code, employee_band: data.company.employee_band })
            .select('id').single()
          if (co) companyId = co.id
        }
      } catch (e) { console.error('[Company]', e) }
    }

    // ── Upsert contact — déduplication par email ───────────────
    let contactId: string | undefined
    const consentDate = data.consentDate ?? new Date().toISOString()

    if (data.contact?.email) {
      try {
        // Enrichissement des données contact avec les résultats du diagnostic
        const contactPayload = {
          company_id: companyId,
          firstname:  data.contact.firstname,
          lastname:   data.contact.lastname,
          email:      data.contact.email,
          phone:      data.contact.phone,
          role:       answersMap['P1'],
          status:     'DIAGNOSTIC_COMPLETED',
          last_activity_at: new Date().toISOString(),
          last_diagnostic_at: new Date().toISOString(),
          segment_metier:       parcoursMatch.parcours?.metier ?? null,
          parcours_id:          parcoursData?.id ?? null,
          parcours_match_type:  parcoursMatch.confiance,
          recommended_program_1: recommendations[0]?.id_programme ?? null,
          recommended_program_2: recommendations[1]?.id_programme ?? null,
          recommended_program_3: recommendations[2]?.id_programme ?? null,
          source_lead:          `mojo-scan-${data.mode}`,
          marketing_consent:    data.consentMarketing,
          marketing_consent_date: data.consentMarketing ? consentDate : null,
          marketing_consent_source: data.consentMarketing ? (data.consentSource ?? 'mojo-scan') : null,
        }

        // upsert par email — un même prospect peut faire plusieurs diagnostics
        const { data: ct } = await supabase.from('contacts')
          .upsert(contactPayload, { onConflict: 'email' })
          .select('id, diagnostic_count').single()

        if (ct) {
          contactId = ct.id
          // Incrémenter le compteur de diagnostics
          await supabase.from('contacts')
            .update({ diagnostic_count: (ct.diagnostic_count ?? 0) + 1 })
            .eq('id', ct.id)
        }
      } catch (e) { console.error('[Contact]', e) }
    }

    // ── Snapshot interne ───────────────────────────────────────
    const internalSnapshot = {
      engine_version: ENGINE_VERSION,
      answers: answersMap,
      module_scores: moduleScores.slice(0, 15).map(m => ({ id: m.id_module, score: m.score })),
      programme_scores: top.map(ps => ({
        id: ps.programme.id, score_total: ps.score_total,
        score_besoins: ps.score_besoins, bonus: ps.score_bonus_parcours,
      })),
      parcours_id:  parcoursMatch.parcours?.id ?? null,
      match_type:   parcoursMatch.confiance,
      data_source:  'FALLBACK', // sera mis à jour depuis db-loader si Supabase utilisé
    }

    // ── Créer le diagnostic ────────────────────────────────────
    const { data: diag, error: diagError } = await supabase.from('diagnostics')
      .insert({
        company_id: companyId, contact_id: contactId, mode: data.mode, status: 'completed',
        business_score: businessScore.global, score_acquisition: businessScore.acquisition,
        score_visibilite: businessScore.visibilite, score_conversion: businessScore.conversion,
        score_fidelisation: businessScore.fidelisation, score_organisation: businessScore.organisation,
        score_ia: businessScore.ia, lead_score: leadScore.total,
        objective_main: answersMap['P3'], branch, priorities,
        financement_label: funding[0]?.funder ?? null, financement_details: funding,
        catalog_version:    ENGINE_VERSION.catalog,
        scoring_version:    ENGINE_VERSION.scoring,
        diagnostic_version: ENGINE_VERSION.diagnostic,
        internal_snapshot:  internalSnapshot,
        completed_at: new Date().toISOString(),
      })
      .select('id, report_token')
      .single()

    if (diagError || !diag) {
      console.error('[Diagnostic]', diagError?.message)
      return NextResponse.json({ error: `Database error: ${diagError?.message}` }, { status: 500 })
    }

    // ── Réponses + Recommandations + Consentements ─────────────
    await supabase.from('answers').insert(
      data.answers.map(a => ({ diagnostic_id: diag.id, question_code: a.question_code, value: a.value, score: a.score }))
    )

    if (recommendations.length > 0) {
      await supabase.from('recommendations').insert(
        recommendations.map(r => ({ diagnostic_id: diag.id, catalog_code: r.id_programme, rank: r.rank, reason: r.log }))
      )
    }

    if (contactId) {
      await supabase.from('consents').insert([
        { contact_id: contactId, diagnostic_id: diag.id, type: 'diagnostic_send',
          granted: data.consentDiag, version: '1.0', granted_at: consentDate, source: data.consentSource ?? 'mojo-scan' },
        { contact_id: contactId, diagnostic_id: diag.id, type: 'marketing',
          granted: data.consentMarketing, version: '1.0', granted_at: consentDate, source: data.consentSource ?? 'mojo-scan' },
      ])
    }

    // ── Report URL ─────────────────────────────────────────────
    const reportUrl = `${process.env.NEXT_PUBLIC_URL}/report/${diag.report_token}`
    await supabase.from('diagnostics').update({ report_url: reportUrl }).eq('id', diag.id)

    // ── Event analytics ────────────────────────────────────────
    await supabase.from('funnel_events').insert({
      diagnostic_id: diag.id, contact_id: contactId,
      event_type: 'diagnostic_completed',
      properties: { mode: data.mode, branch, lead_score: leadScore.total },
    })

    // ── Alerte scan — envoyée sur tous les diagnostics ─────────
    if (data.contact?.email) {
      sendLeadAlert({
        firstname:     data.contact.firstname,
        lastname:      data.contact.lastname,
        email:         data.contact.email,
        phone:         data.contact.phone,
        company:       data.company?.name,
        naf_label:     data.company?.naf_label,
        city:          data.company?.city,
        lead_score:    leadScore.total,
        objective:     priorities[0]?.label ?? answersMap['P3'] ?? '',
        formation_1:   recommendations[0]?.titre ?? '',
        opco:          recommendations[0] ? (computeFunding(data.company, answersMap)[0]?.opco?.opco_name) : undefined,
        financeur:     recommendations[0] ? (computeFunding(data.company, answersMap)[0]?.funding_body?.funding_body) : undefined,
        diagnostic_id: diag.id,
        report_url:    reportUrl,
      }).catch(e => console.error('[Alert] Exception:', e))
    }

    // ── Brevo — uniquement si consentement marketing ───────────
    // Non bloquant : le diagnostic est déjà sauvegardé
    if (data.consentMarketing && data.contact?.email && contactId) {
      syncContactBrevo({
        email:       data.contact.email,
        firstname:   data.contact.firstname,
        lastname:    data.contact.lastname,
        phone:       data.contact.phone,
        company:     data.company?.name,
        siret:       data.company?.siret,
        ape:         data.company?.naf,
        ape_label:   data.company?.naf_label,
        segment_metier: parcoursMatch.parcours?.metier,
        parcours:    parcoursData?.id,
        formation_1: recommendations[0]?.titre,
        formation_2: recommendations[1]?.titre,
        formation_3: recommendations[2]?.titre,
        source:      `mojo-scan-${data.mode}`,
        diagnostic_date: new Date().toISOString().split('T')[0],
        statut: 'DIAGNOSTIC_COMPLETED',
      }).then(result => {
        if (result.success && contactId) {
          supabase.from('contacts')
            .update({ brevo_synced_at: new Date().toISOString(), brevo_contact_id: result.contact_id })
            .eq('id', contactId).then(() => {})
          supabase.from('funnel_events').insert({
            diagnostic_id: diag.id, contact_id: contactId,
            event_type: 'brevo_synced', properties: { success: true },
          }).then(() => {})
        } else {
          console.warn('[Brevo] Sync non bloquante échouée:', result.error)
        }
      }).catch(e => console.error('[Brevo] Exception non bloquante:', e))
    } else if (!data.consentMarketing) {
      console.log(`[Brevo] marketing_consent=false — sync ignorée pour ${data.contact?.email}`)
    }

    return NextResponse.json({
      diagnosticId:    diag.id,
      reportToken:     diag.report_token,
      reportUrl,
      businessScore,
      leadScore,
      priorities,
      recommendations,
      parcoursMatch:   parcoursData,
      funding,
      calendlyUrl:     process.env.CALENDLY_URL ?? null,
    })

  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: err.errors }, { status: 422 })
    }
    console.error('[Submit]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
