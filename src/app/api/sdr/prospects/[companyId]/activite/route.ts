import { NextRequest, NextResponse } from 'next/server'
import { recupererProfilCourant } from '@/lib/sales/auth-session'
import { clientServiceRole, lireAffectationProspect } from '@/lib/sales/acces-sdr'
import { traiterActiviteSdr, type DepsActiviteSdr } from '@/lib/sales/activite-sdr'

// ══════════════════════════════════════════════════════════════
// PR3 — POST /api/sdr/prospects/[companyId]/activite
// Adaptateur fin : toute la logique (ordre des contrôles, validation,
// RPC, besoin) est dans traiterActiviteSdr (testée). Identité = session
// Supabase Auth + profil ; le cookie admin_auth n'ouvre JAMAIS cette route.
// ══════════════════════════════════════════════════════════════

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { companyId: string } }) {
  let body: any
  try {
    body = await req.json()
  } catch {
    body = null
  }

  const supabase = clientServiceRole()

  const deps: DepsActiviteSdr = {
    profilCourant: () => recupererProfilCourant(),
    lireAffectation: (companyId) => lireAffectationProspect(companyId, supabase),
    async personneAppartient(personneId, companyId) {
      const { data, error } = await supabase
        .from('personnes').select('id').eq('id', personneId).eq('company_id', companyId).maybeSingle()
      return !error && !!data
    },
    async moyenAppartient(moyenContactId, companyId) {
      const { data, error } = await supabase
        .from('personnes_moyens_contact')
        .select('company_id, personnes(company_id), etablissements(company_id)')
        .eq('moyen_contact_id', moyenContactId)
      if (error || !data) return false
      return data.some((r: any) =>
        r.company_id === companyId ||
        r.personnes?.company_id === companyId ||
        r.etablissements?.company_id === companyId
      )
    },
    async appelerRpc(p) {
      const { data, error } = await supabase.rpc('p07_enregistrer_resultat_appel', p)
      return { data, error: error ? { message: error.message } : null }
    },
    async enregistrerBesoin(companyId, besoin, restreindreA) {
      let q = supabase.from('prospects_sales').update({ besoin_identifie: besoin }).eq('company_id', companyId)
      if (restreindreA) q = q.eq('assigned_to', restreindreA)
      const { error } = await q
      return { error: error ? { message: error.message } : null }
    },
    now: () => new Date().toISOString(),
  }

  const { status, body: reponse } = await traiterActiviteSdr(deps, params.companyId, body)
  return NextResponse.json(reponse, { status })
}
