import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get('key') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const yesterday  = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const twoDaysAgo = new Date(Date.now() - 48 * 3600 * 1000).toISOString()

  const { data: diags } = await supabase
    .from('diagnostics')
    .select('id, report_token, report_url')
    .gte('completed_at', twoDaysAgo)
    .lte('completed_at', yesterday)
    .eq('status', 'completed')

  if (!diags?.length) return NextResponse.json({ followups: 0 })

  const { data: clicked } = await supabase
    .from('funnel_events')
    .select('diagnostic_id')
    .eq('event_type', 'calendly_clicked')
    .in('diagnostic_id', diags.map(d => d.id))

  const clickedIds = new Set((clicked ?? []).map((e: any) => e.diagnostic_id))
  const toRelance  = diags.filter(d => !clickedIds.has(d.id))

  console.log(`[Relance J+1] ${toRelance.length}/${diags.length} diagnostics sans RDV`)
  return NextResponse.json({ checked: diags.length, followups: toRelance.length })
}
