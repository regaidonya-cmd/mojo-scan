import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { ReportView } from '@/components/report/ReportView'

export default async function ReportPage({ params }: { params: { token: string } }) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: diag } = await supabase
    .from('diagnostics')
    .select(`
      id, report_token, completed_at, branch, priorities,
      business_score, score_acquisition, score_visibilite, score_conversion,
      score_fidelisation, score_organisation, score_ia,
      financement_details, internal_snapshot,
      companies ( name, naf_label, city, naf ),
      contacts ( firstname, lastname, email ),
      recommendations ( rank, catalog_code, reason )
    `)
    .eq('report_token', params.token)
    .single()

  if (!diag) notFound()

  return <ReportView diag={diag} />
}
