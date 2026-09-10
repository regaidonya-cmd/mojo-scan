import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { AdminView } from '@/components/admin/AdminView'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function getToken(): string {
  const secret = process.env.ADMIN_PASSWORD ?? ''
  return crypto.createHash('sha256').update(secret).digest('hex')
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const cookieStore = cookies()
  const authCookie = cookieStore.get('admin_auth')?.value

  if (authCookie !== getToken()) {
    return (
      <div style={{ minHeight: '100vh', background: '#F7F6FC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <form method="POST" action="/api/admin/login" style={{ background: '#fff', padding: 32, borderRadius: 16, border: '1px solid #EDEAF5', width: 320 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A186E', margin: '0 0 20px', textAlign: 'center' }}>MOJO ACADÉMIE</h1>
          <p style={{ fontSize: 13, color: '#6B6680', margin: '0 0 16px', textAlign: 'center' }}>Accès administrateur</p>
          {searchParams.error && (
            <p style={{ fontSize: 12, color: '#DC2626', margin: '0 0 12px', textAlign: 'center' }}>Mot de passe incorrect</p>
          )}
          <input name="password" type="password" placeholder="Mot de passe" autoFocus
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #EDEAF5', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' as const, marginBottom: 12 }} />
          <button type="submit"
            style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #6B35B8, #C8399A)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Accéder →
          </button>
        </form>
      </div>
    )
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: diagnostics } = await supabase
    .from('diagnostics')
    .select(`
      id, report_token, completed_at, mode, status, lead_score,
      business_score, branch, objective_main,
      catalog_version, scoring_version,
      companies ( name, city, naf_label ),
      contacts ( firstname, lastname, email, phone, status, marketing_consent, diagnostic_count ),
      recommendations ( rank, catalog_code )
    `)
    .order('completed_at', { ascending: false })
    .limit(100)

  return <AdminView diagnostics={diagnostics ?? []} password="" />
}
