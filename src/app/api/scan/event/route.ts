import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const VALID_EVENTS = [
  'diagnostic_started','company_identified','diagnostic_completed',
  'teaser_viewed','lead_captured','report_viewed','report_emailed',
  'calendly_clicked','brevo_synced'
]

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { event_type, diagnostic_id, session_id, properties } = body

    if (!VALID_EVENTS.includes(event_type)) {
      return NextResponse.json({ error: 'Invalid event' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    await supabase.from('funnel_events').insert({
      event_type,
      diagnostic_id: diagnostic_id ?? null,
      session_id: session_id ?? null,
      properties: properties ?? {},
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
