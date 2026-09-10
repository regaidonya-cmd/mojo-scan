import { NextResponse } from 'next/server'

export async function GET() {
  const url = process.env.SUPABASE_URL ?? 'NON DÉFINIE'
  const projectId = url.replace('https://', '').split('.')[0]

  return NextResponse.json({
    supabase_project_id: projectId,
    supabase_url_public: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'NON DÉFINIE',
    has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  })
}
