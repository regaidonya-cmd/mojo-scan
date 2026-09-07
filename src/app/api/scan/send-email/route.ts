import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendDiagnosticEmail } from '@/lib/email/diagnostic'
import { z } from 'zod'

const Schema = z.object({
  diagnosticId:  z.string().uuid(),
  email:         z.string().email(),
  firstname:     z.string(),
  company:       z.string().optional(),
  priorities:    z.array(z.any()).optional(),
  recommendations: z.array(z.any()).optional(),
  parcoursMatch: z.any().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = Schema.parse(body)

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Idempotence — ne pas renvoyer si déjà envoyé pour ce diagnostic
    const idempotencyKey = `diagnostic-${data.diagnosticId}-${data.email}`
    const { data: existing } = await supabase
      .from('email_queue')
      .select('id, status')
      .eq('idempotency_key', idempotencyKey)
      .single()

    if (existing?.status === 'sent') {
      console.log(`[Email] Déjà envoyé pour ${data.diagnosticId}`)
      return NextResponse.json({ success: true, already_sent: true })
    }

    // Insérer dans la queue
    const { data: queueEntry } = await supabase
      .from('email_queue')
      .upsert({
        diagnostic_id: data.diagnosticId,
        email_type: 'diagnostic',
        to_email: data.email,
        idempotency_key: idempotencyKey,
        attempts: 1,
        last_attempt: new Date().toISOString(),
      }, { onConflict: 'idempotency_key' })
      .select('id').single()

    // Préparer les données email
    const priority = data.priorities?.[0]
    const rec1 = data.recommendations?.[0]
    const rec2 = data.recommendations?.[1]
    const rec3 = data.recommendations?.[2]

    const emailData = {
      to_email: data.email,
      to_name:  data.firstname,
      company:  data.company,
      priority_label:  priority?.label ?? 'Développement de votre activité digitale',
      priority_detail: priority?.detail ?? '',
      formation_1_titre:   rec1?.titre ?? '',
      formation_1_duree:   rec1?.duree_h ?? 7,
      formation_1_tarif:   rec1?.tarif_ht ?? 990,
      formation_1_promesse: rec1?.objectif ?? '',
      formation_2_titre: rec2?.titre,
      formation_3_titre: rec3?.titre,
      parcours_nom:    data.parcoursMatch?.confiance === 'MATCH_FORT' ? data.parcoursMatch?.nom : undefined,
      parcours_promesse: data.parcoursMatch?.confiance === 'MATCH_FORT' ? data.parcoursMatch?.promesse : undefined,
      report_url: `${process.env.NEXT_PUBLIC_URL}/report/${data.diagnosticId}`,
      calendly_url: process.env.CALENDLY_URL ?? 'https://calendly.com/mojoacademie',
    }

    const result = await sendDiagnosticEmail(emailData)

    // Mettre à jour la queue
    if (queueEntry?.id) {
      await supabase.from('email_queue').update({
        status: result.success ? 'sent' : 'failed',
        sent_at: result.success ? new Date().toISOString() : null,
        error_message: result.error,
      }).eq('id', queueEntry.id)
    }

    // Mettre à jour statut contact
    if (result.success) {
      await supabase.from('diagnostics')
        .update({ status: 'report_sent' })
        .eq('id', data.diagnosticId)
    }

    // Event analytics
    await supabase.from('funnel_events').insert({
      diagnostic_id: data.diagnosticId,
      event_type: 'report_emailed',
      properties: { success: result.success, email: data.email },
    })

    return NextResponse.json({ success: result.success, error: result.error })

  } catch (err) {
    console.error('[send-email]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
