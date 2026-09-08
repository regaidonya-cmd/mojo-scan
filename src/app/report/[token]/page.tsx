import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { ReportView } from '@/components/report/ReportView'

export default async function ReportPage({ params }: { params: { token: string } }) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const select = `
    id, report_token, completed_at, branch, priorities,
    business_score, score_acquisition, score_visibilite, score_conversion,
    score_fidelisation, score_organisation, score_ia,
    financement_details, internal_snapshot,
    companies ( name, naf_label, city, naf ),
    contacts ( firstname, lastname, email ),
    recommendations ( rank, catalog_code, reason )
  `

  // Chercher par report_token d'abord
  let { data: diag } = await supabase
    .from('diagnostics')
    .select(select)
    .eq('report_token', params.token)
    .single()

  // Si pas trouvé, chercher par id (UUID)
  if (!diag) {
    const { data: diagById } = await supabase
      .from('diagnostics')
      .select(select)
      .eq('id', params.token)
      .single()
    diag = diagById
  }

  if (!diag) notFound()

  return <ReportView diag={diag} />
}
