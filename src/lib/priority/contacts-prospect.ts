// ══════════════════════════════════════════════════════════════
// PR3 — Construction PURE des moyens de contact d'un prospect.
// Extraite de fetch-real.ts (comportement identique pour les contacts
// rattachés à une PERSONNE) + prise en charge des contacts rattachés
// directement à l'ENTREPRISE (personnes_moyens_contact.company_id,
// personne_id NULL) : téléphone standard non nominatif, jamais un
// interlocuteur inventé.
//
// Les oppositions sont appliquées exactement comme avant :
//  - ENTREPRISE (prospection_globale) domine tout ;
//  - PERSONNE ne concerne que les contacts de cette personne ;
//  - MOYEN / canal entreprise bloquent la valeur ou le canal.
// ══════════════════════════════════════════════════════════════

import type { ContactMethod } from './types'

type MoyenJoint = { type?: string; valeur_normalisee?: string }

export interface LigneContact {
  moyen_contact_id: string
  // Jointure PostgREST many-to-one : objet à l'exécution, typée tableau par le client.
  moyens_contact?: MoyenJoint | MoyenJoint[] | null
}

function moyen(c: LigneContact): MoyenJoint | null {
  return Array.isArray(c.moyens_contact) ? c.moyens_contact[0] ?? null : c.moyens_contact ?? null
}

export interface PersonneProspect {
  id: string
  nom: string | null
  prenom: string | null
}

export interface OppositionsResolues {
  entrepriseGlobale: Set<string> // company_id
  personneGlobale: Set<string> // personne_id
  moyen: Set<string> // moyen_contact_id
  canalEntreprise: Map<string, Set<string>> // company_id -> {'email','telephone'}
}

export function construireContactMethods(params: {
  companyId: string
  personnes: PersonneProspect[]
  contactsParPersonne: Map<string, LigneContact[]>
  contactsEntreprise: LigneContact[]
  oppositions: OppositionsResolues
}): ContactMethod[] {
  const { companyId, personnes, contactsParPersonne, contactsEntreprise, oppositions } = params
  const entrepriseOpposee = oppositions.entrepriseGlobale.has(companyId)
  const canauxBloquesEntreprise = oppositions.canalEntreprise.get(companyId) ?? new Set<string>()
  const contactMethods: ContactMethod[] = []

  for (const p of personnes) {
    const personneOpposee = oppositions.personneGlobale.has(p.id)
    for (const c of contactsParPersonne.get(p.id) ?? []) {
      const type = moyen(c)?.type
      const value = moyen(c)?.valeur_normalisee
      if ((type !== 'telephone' && type !== 'email') || !value) continue
      const moyenOppose = oppositions.moyen.has(c.moyen_contact_id)
      const canalBloque = canauxBloquesEntreprise.has(type)
      // P0.7D-FIX.11 — une opposition ENTREPRISE domine toutes les autorisations.
      const allowed = !entrepriseOpposee && !personneOpposee && !moyenOppose && !canalBloque
      const blockedScope = entrepriseOpposee ? 'ENTREPRISE' : personneOpposee ? 'PERSONNE' : (moyenOppose || canalBloque) ? 'MOYEN' : undefined
      contactMethods.push({
        contactMethodId: c.moyen_contact_id,
        type,
        value,
        personneId: p.id,
        personneNom: p.nom ?? undefined,
        personnePrenom: p.prenom ?? undefined,
        nominatif: true,
        allowed,
        blockedScope,
      })
    }
  }

  // PR3 — contacts ENTREPRISE (standard) : non nominatifs, sans personne.
  // Un moyen déjà présent via une personne n'est jamais dupliqué.
  const dejaPresents = new Set(contactMethods.map((c) => c.contactMethodId))
  for (const c of contactsEntreprise) {
    const type = moyen(c)?.type
    const value = moyen(c)?.valeur_normalisee
    if ((type !== 'telephone' && type !== 'email') || !value) continue
    if (dejaPresents.has(c.moyen_contact_id)) continue
    dejaPresents.add(c.moyen_contact_id)
    const moyenOppose = oppositions.moyen.has(c.moyen_contact_id)
    const canalBloque = canauxBloquesEntreprise.has(type)
    const allowed = !entrepriseOpposee && !moyenOppose && !canalBloque
    const blockedScope = entrepriseOpposee ? 'ENTREPRISE' : (moyenOppose || canalBloque) ? 'MOYEN' : undefined
    contactMethods.push({
      contactMethodId: c.moyen_contact_id,
      type,
      value,
      nominatif: false,
      allowed,
      blockedScope,
    })
  }

  return contactMethods
}
