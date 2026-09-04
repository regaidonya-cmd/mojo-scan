// ══════════════════════════════════════════════════════════════
// MOJO SCAN — API Route : recherche entreprise
// GET /api/company/search?q=...&city=...
// Source : api.recherche-entreprises.data.gouv.fr
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import type { ApiCompanySearchResult } from '@/types'

const EMPLOYEE_BAND_MAP: Record<string, string> = {
  'NN': 'TE', '00': 'TE',
  '01': 'BE', '02': 'BE',
  '03': 'PE', '11': 'PE', '12': 'PE',
  '21': 'ME', '22': 'ME', '31': 'ME',
  '41': 'GE', '42': 'GE', '51': 'GE', '52': 'GE', '53': 'GE',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q    = searchParams.get('q')?.trim()
  const city = searchParams.get('city')?.trim()

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  try {
    // Adaptateur : api.recherche-entreprises.data.gouv.fr
    const params = new URLSearchParams({
      q,
      per_page: '8',
      ...(city ? { departement: city } : {}),
    })

    const res = await fetch(
      `https://api.recherche-entreprises.data.gouv.fr/api/v1/search?${params}`,
      {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 60 },
      }
    )

    if (!res.ok) throw new Error(`API error ${res.status}`)

    const json = await res.json()
    const results: ApiCompanySearchResult[] = (json.results ?? []).map((e: any) => ({
      siren:        e.siren,
      siret:        e.siege?.siret,
      name:         e.nom_raison_sociale ?? e.nom_complet ?? '',
      trade_name:   e.nom_commercial ?? undefined,
      naf:          e.activite_principale,
      naf_label:    e.libelle_activite_principale,
      address:      e.siege?.adresse,
      postal_code:  e.siege?.code_postal,
      city:         e.siege?.libelle_commune,
      employee_band: EMPLOYEE_BAND_MAP[e.tranche_effectif_salarie ?? 'NN'] ?? 'BE',
    }))

    return NextResponse.json({ results })

  } catch (err) {
    console.error('Company search error:', err)
    // Fallback gracieux : retourner vide plutôt qu'une erreur
    return NextResponse.json({ results: [], fallback: true })
  }
}
