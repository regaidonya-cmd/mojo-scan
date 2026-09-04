import { NextRequest, NextResponse } from 'next/server'

const EMPLOYEE_BAND_MAP: Record<string, string> = {
  'NN':'TE','00':'TE','01':'BE','02':'BE','03':'PE',
  '11':'PE','12':'PE','21':'ME','22':'ME','31':'ME',
  '41':'GE','42':'GE','51':'GE','52':'GE','53':'GE',
}

function normalize(q: string): string {
  return q
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // supprimer les accents
    .replace(/[''`]/g, ' ')          // apostrophes -> espace
    .replace(/[-_]/g, ' ')           // tirets -> espace
    .replace(/\s+/g, ' ')            // espaces multiples
    .trim()
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  const qNorm = normalize(q)

  try {
    const url = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(qNorm)}&per_page=8&is_siege=true`

    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'MOJO-Scan/1.0' },
      next: { revalidate: 60 },
    })

    if (!res.ok) {
      console.error('Company API error:', res.status)
      return NextResponse.json({ results: [] })
    }

    const json = await res.json()

    const results = (json.results ?? []).map((e: any) => {
      const siege = e.siege ?? {}
      return {
        siren:        e.siren,
        siret:        siege.siret,
        name:         e.nom_raison_sociale ?? e.nom_complet ?? '',
        trade_name:   e.nom_commercial ?? undefined,
        naf:          e.activite_principale ?? siege.activite_principale,
        naf_label:    e.libelle_activite_principale ?? '',
        address:      [siege.numero_voie, siege.type_voie, siege.libelle_voie].filter(Boolean).join(' '),
        postal_code:  siege.code_postal,
        city:         siege.libelle_commune,
        employee_band: EMPLOYEE_BAND_MAP[e.tranche_effectif_salarie ?? 'NN'] ?? 'BE',
      }
    })

    return NextResponse.json({ results })

  } catch (err) {
    console.error('Company search error:', err)
    return NextResponse.json({ results: [], fallback: true })
  }
}
