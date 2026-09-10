import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

function getToken(): string {
  const secret = process.env.ADMIN_PASSWORD ?? ''
  return crypto.createHash('sha256').update(secret).digest('hex')
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const password = formData.get('password')?.toString() ?? ''

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.redirect(new URL('/admin?error=1', req.url))
  }

  const res = NextResponse.redirect(new URL('/admin', req.url))
  res.cookies.set('admin_auth', getToken(), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
