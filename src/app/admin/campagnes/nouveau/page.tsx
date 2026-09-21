import { cookies } from 'next/headers'
import crypto from 'crypto'
import { fetchReservoirCampagne } from '@/lib/campagnes/fetch-reservoir'
import { CampagneSelectionTable } from '@/components/sales/CampagneSelectionTable'
import { SalesNav } from '@/components/sales/SalesNav'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function getToken(): string {
  const secret = process.env.ADMIN_PASSWORD ?? ''
  return crypto.createHash('sha256').update(secret).digest('hex')
}

export default async function NouvelleCampagnePage() {
  const cookieStore = cookies()
  const authCookie = cookieStore.get('admin_auth')?.value

  if (authCookie !== getToken()) {
    return (
      <div style={{ minHeight: '100vh', background: '#F7F6FC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <form method="POST" action="/api/admin/login" style={{ background: '#fff', padding: 32, borderRadius: 16, border: '1px solid #EDEAF5', width: 320 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A186E', margin: '0 0 20px', textAlign: 'center' }}>MOJO ACADÉMIE</h1>
          <p style={{ fontSize: 13, color: '#6B6680', margin: '0 0 16px', textAlign: 'center' }}>Accès administrateur</p>
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

  const all = await fetchReservoirCampagne({})

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8' }}>
      <SalesNav active="campagnes" />
      <CampagneSelectionTable all={all} />
    </div>
  )
}
