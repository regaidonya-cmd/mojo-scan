import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MOJO Scan — Diagnostic Digital',
  description: 'Diagnostiquez votre maturité digitale en moins de 10 minutes',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
