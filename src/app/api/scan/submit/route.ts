import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { computeBusinessScore, computeLeadScore, computePriorities, detectBranch } from '@/lib/scoring/engine'
import { computeRecommendations } from '@/lib/scoring/modules'
import { computeFunding } from '@/lib/funding/engine'
import { z } from 'zod'

const SubmitSchema = z.object({
  mode:    z.enum(['site','terrain','call']),
  company: z.object({
    siren: z.string().optional(), siret: z.string().optional(),
    name: z.string(), naf: z.string().optional(), naf_label: z.string().optional(),
    city: z.string().optional(), postal_code: z.string().optional(), employee_band: z.string().optional(),
  }).optional(),
  answers: z.array(z.object({ question_code: z.string(), value: z.string(), score: z.number() })),
  contact: z.object({ firstname: z.string(), email: z.string().email(), phone: z.string().optional() }).optional(),
  consentDiag: z.boolean(),
  consentMarketing: z.boolean(),
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

    // ── Nouveau moteur de scoring ──────────────────────────────
    const { top, parcoursMatch, moduleScores, logs } = computeRecommendations(
      answersMap,
      data.company?.naf,
      data.company?.naf_label,
      3
    )

    // ── Scoring existant (Lead Score + Business Score) ─────────
    const branch         = detectBranch(answersMap)
    const businessScore  = computeBusinessScore(answersMap)
    const leadScore      = computeLeadScore(answersMap, businessScore)
    const priorities     = computePriorities(businessScore, branch, answersMap)
    const funding        = computeFunding(data.company, answersMap)

    // Sérialiser les recommandations pour le rapport
    const recommendations = top.map((ps, i) => ({
      rank: i + 1,
      id_programme: ps.programme.id,
      titre: ps.programme.titre,
      duree_h: ps.programme.duree_h,
      tarif_ht: ps.programme.tarif_ht,
      pilier: ps.programme.pilier,
      objectif: ps.programme.objectif,
      resultat: ps.programme.resultat,
      score: ps.score,
      log: ps.log,
    }))

    const parcoursData = parcoursMatch.confiance !== 'AUCUN_PARCOURS_METIER' ? {
      id: parcoursMatch.parcours.id,
      metier: parcoursMatch.parcours.metier,
      nom: parcoursMatch.parcours.nom,
      duree_h: parcoursMatch.parcours.duree_h,
      tarif_ht: parcoursMatch.parcours.tarif_ht,
      promesse: parcoursMatch.parcours.promesse,
      confiance: parcoursMatch.confiance,
      raison: parcoursMatch.raison,
    } : null

    // ── Upsert entreprise ──────────────────────────────────────
    let companyId: string | undefined
    if (data.company?.name) {
      try {
        if (data.company.siren) {
          const { data: co } = await supabase
            .from('companies')
            .upsert({ siren: data.company.siren, siret: data.company.siret, name: data.company.name,
              naf: data.company.naf, naf_label: data.company.naf_label, city: data.company.city,
              postal_code: data.company.postal_code, employee_band: data.company.employee_band },
              { onConflict: 'siren' })
            .select('id').single()
          if (co) companyId = co.id
        } else {
          const { data: co } = await supabase
            .from('companies')
            .insert({ name: data.company.name, city: data.company.city,
              postal_code: data.company.postal_code, employee_band: data.company.employee_band })
            .select('id').single()
          if (co) companyId = co.id
        }
      } catch (e) { console.error('Company error:', e) }
    }

    // ── Upsert contact ─────────────────────────────────────────
    let contactId: string | undefined
    if (data.contact?.email) {
      try {
        const { data: ct } = await supabase
          .from('contacts')
          .upsert({ company_id: companyId, firstname: data.contact.firstname,
            email: data.contact.email, phone: data.contact.phone, role: answersMap['P1'] },
            { onConflict: 'email' })
          .select('id').single()
        if (ct) contactId = ct.id
      } catch (e) { console.error('Contact error:', e) }
    }

    // ── Créer le diagnostic ────────────────────────────────────
    const { data: diag, error: diagError } = await supabase
      .from('diagnostics')
      .insert({
        company_id: companyId, contact_id: contactId, mode: data.mode, status: 'completed',
        business_score: businessScore.global, score_acquisition: businessScore.acquisition,
        score_visibilite: businessScore.visibilite, score_conversion: businessScore.conversion,
        score_fidelisation: businessScore.fidelisation, score_organisation: businessScore.organisation,
        score_ia: businessScore.ia, lead_score: leadScore.total,
        objective_main: answersMap['P3'], branch, priorities,
        financement_label: funding[0]?.funder ?? null, financement_details: funding,
        completed_at: new Date().toISOString(),
      })
      .select('id, report_token')
      .single()

    if (diagError || !diag) {
      console.error('Diagnostic insert error:', diagError?.message, diagError?.code)
      return NextResponse.json({ error: `Database error: ${diagError?.message}` }, { status: 500 })
    }

    // ── Réponses ───────────────────────────────────────────────
    await supabase.from('answers').insert(
      data.answers.map(a => ({ diagnostic_id: diag.id, question_code: a.question_code, value: a.value, score: a.score }))
    )

    // ── Recommandations ────────────────────────────────────────
    if (recommendations.length > 0) {
      await supabase.from('recommendations').insert(
        recommendations.map(r => ({
          diagnostic_id: diag.id, catalog_code: r.id_programme,
          rank: r.rank, reason: r.log,
        }))
      )
    }

    // ── Consentements ──────────────────────────────────────────
    if (contactId) {
      await supabase.from('consents').insert([
        { contact_id: contactId, diagnostic_id: diag.id, type: 'diagnostic_send', granted: data.consentDiag, version: '1.0' },
        { contact_id: contactId, diagnostic_id: diag.id, type: 'marketing', granted: data.consentMarketing, version: '1.0' },
      ])
    }

    const reportUrl = `${process.env.NEXT_PUBLIC_URL}/report/${diag.report_token}`
    await supabase.from('diagnostics').update({ report_url: reportUrl }).eq('id', diag.id)

    return NextResponse.json({
      diagnosticId: diag.id,
      reportToken: diag.report_token,
      reportUrl,
      businessScore,
      leadScore,
      priorities,
      recommendations,
      parcoursMatch: parcoursData,
      funding,
      logs,  // traçabilité pour debug
    })

  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: err.errors }, { status: 422 })
    }
    console.error('Submit error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
