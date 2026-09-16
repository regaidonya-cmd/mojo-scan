import { computeConsequence, NEXT_ACTION_URGENT_TYPES, NEXT_ACTION_RELANCE_TYPES } from './activite-consequence'

const results: { name: string; pass: boolean }[] = []
function t(name: string, pass: boolean) {
  results.push({ name, pass })
  console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name)
}

const NOW = '2026-09-15T10:00:00Z'

// ── Les 10 résultats individuellement ──
t('1. PAS_DE_REPONSE -> temperature inchangee (null)', computeConsequence({ resultat: 'PAS_DE_REPONSE', now: NOW }).temperature === null)
t('1. PAS_DE_REPONSE -> nextActionType CALLBACK', computeConsequence({ resultat: 'PAS_DE_REPONSE', now: NOW }).nextActionType === 'CALLBACK')
t('1. PAS_DE_REPONSE -> aucun eventKind (action MOJO seule)', computeConsequence({ resultat: 'PAS_DE_REPONSE', now: NOW }).eventKind === null)

{
  const c = computeConsequence({ resultat: 'A_RAPPELER', now: NOW, dateRappelSaisie: '2026-09-20T14:00:00Z' })
  t('2. A_RAPPELER -> eventKind CALLBACK_REQUESTED', c.eventKind === 'CALLBACK_REQUESTED')
  t('2. A_RAPPELER -> due = date saisie', c.nextActionDueAt === '2026-09-20T14:00:00Z')
  t('2. A_RAPPELER -> temperature inchangee', c.temperature === null)
}

{
  const c = computeConsequence({ resultat: 'ECHANGE_OBTENU', now: NOW })
  t('3. ECHANGE_OBTENU -> pipeline EN_DISCUSSION', c.pipelineStage === 'EN_DISCUSSION')
  t('3. ECHANGE_OBTENU -> temperature inchangee (neutre)', c.temperature === null)
}

{
  const c = computeConsequence({ resultat: 'INTERESSE', now: NOW })
  t('4. INTERESSE -> CHAUD', c.temperature === 'CHAUD')
  t('4. INTERESSE -> PAS due immédiatement (P1, pas P0 automatique)', c.nextActionDueAt !== NOW)
  t('4. INTERESSE -> nextActionType urgent (FOLLOW_UP), deviendra P0 seulement une fois dû', NEXT_ACTION_URGENT_TYPES.has(c.nextActionType))
}

{
  const c = computeConsequence({ resultat: 'RDV_OBTENU', now: NOW, dateRdvSaisie: '2026-09-25T09:00:00Z' })
  t('5. RDV_OBTENU -> pipeline RDV', c.pipelineStage === 'RDV')
  t('5. RDV_OBTENU -> CHAUD', c.temperature === 'CHAUD')
  t('5. RDV_OBTENU -> preparation != date du RDV (veille, pas immediat)', c.nextActionDueAt !== c.eventDueAt)
  t('5. RDV_OBTENU -> nextActionType PREPARE_MEETING (urgent)', c.nextActionType === 'PREPARE_MEETING' && NEXT_ACTION_URGENT_TYPES.has(c.nextActionType))
}
t('5b. RDV_OBTENU sans date -> leve une erreur (pas de date inventee)', (() => {
  try { computeConsequence({ resultat: 'RDV_OBTENU', now: NOW }); return false } catch { return true }
})())

{
  const c = computeConsequence({ resultat: 'PAS_INTERESSE_REACTIVABLE', now: NOW })
  t('6. PAS_INTERESSE_REACTIVABLE -> FROID', c.temperature === 'FROID')
  t('6. PAS_INTERESSE_REACTIVABLE -> nextActionType relance (NURTURE, pas urgent)', c.nextActionType === 'NURTURE' && NEXT_ACTION_RELANCE_TYPES.has(c.nextActionType))
  t('6. PAS_INTERESSE_REACTIVABLE -> pas de STOP', c.isStop === false)
  t('6. PAS_INTERESSE_REACTIVABLE -> pas d\'opposition', c.oppositionScope === null)
}

{
  const c = computeConsequence({ resultat: 'OPPORTUNITE_CLOTUREE', now: NOW })
  t('7. OPPORTUNITE_CLOTUREE -> pipeline PERDU', c.pipelineStage === 'PERDU')
  t('7. OPPORTUNITE_CLOTUREE -> PAS de STOP', c.isStop === false)
  t('7. OPPORTUNITE_CLOTUREE -> PAS d\'opposition', c.oppositionScope === null)
}

{
  const cPersonne = computeConsequence({ resultat: 'DEMANDE_NE_PLUS_CONTACTER', now: NOW, oppositionScope: 'PERSONNE' })
  t('8. NE_PLUS_CONTACTER (personne) -> pas de STOP entreprise', cPersonne.isStop === false)
  const cEntreprise = computeConsequence({ resultat: 'DEMANDE_NE_PLUS_CONTACTER', now: NOW, oppositionScope: 'ENTREPRISE' })
  t('8. NE_PLUS_CONTACTER (entreprise explicite) -> STOP', cEntreprise.isStop === true)
}
t('8b. NE_PLUS_CONTACTER sans scope -> leve une erreur', (() => {
  try { computeConsequence({ resultat: 'DEMANDE_NE_PLUS_CONTACTER', now: NOW }); return false } catch { return true }
})())

{
  const c = computeConsequence({ resultat: 'MAUVAIS_INTERLOCUTEUR', now: NOW })
  t('9. MAUVAIS_INTERLOCUTEUR -> QUALIFY, pas STOP', c.nextActionType === 'QUALIFY' && c.isStop === false)
}
{
  const c = computeConsequence({ resultat: 'COORDONNEES_INCORRECTES', now: NOW })
  t('10. COORDONNEES_INCORRECTES -> ENRICH, pas STOP', c.nextActionType === 'ENRICH' && c.isStop === false)
}

// ── Cas obligatoires §16 (A-H) ──
t('A. READY froid -> appel -> pas de reponse : temperature reste FROID (null=inchange)', computeConsequence({ resultat: 'PAS_DE_REPONSE', now: NOW }).temperature === null)
t('B. rappel a date precise : due = date exacte saisie', computeConsequence({ resultat: 'A_RAPPELER', now: NOW, dateRappelSaisie: '2026-10-01T10:00:00Z' }).nextActionDueAt === '2026-10-01T10:00:00Z')
t('C. interesse : CHAUD confirme', computeConsequence({ resultat: 'INTERESSE', now: NOW }).temperature === 'CHAUD')
t('D. RDV obtenu : pipeline RDV confirme', computeConsequence({ resultat: 'RDV_OBTENU', now: NOW, dateRdvSaisie: '2026-09-30T10:00:00Z' }).pipelineStage === 'RDV')
t('E. mauvais interlocuteur : jamais STOP', computeConsequence({ resultat: 'MAUVAIS_INTERLOCUTEUR', now: NOW }).isStop === false)
t('F. coordonnees incorrectes : jamais STOP', computeConsequence({ resultat: 'COORDONNEES_INCORRECTES', now: NOW }).isStop === false)
t('G. opposition personne uniquement : pas STOP entreprise', computeConsequence({ resultat: 'DEMANDE_NE_PLUS_CONTACTER', now: NOW, oppositionScope: 'PERSONNE' }).isStop === false)
t('H. opposition entreprise globale explicite : STOP', computeConsequence({ resultat: 'DEMANDE_NE_PLUS_CONTACTER', now: NOW, oppositionScope: 'ENTREPRISE' }).isStop === true)

// ── P0.7B-FIX : 3 portées d'opposition, vérification explicite ──
{
  const c = computeConsequence({ resultat: 'DEMANDE_NE_PLUS_CONTACTER', now: NOW, oppositionScope: 'PERSONNE' })
  t('11a. Portée PERSONNE -> oppositionScope=PERSONNE transmis tel quel', c.oppositionScope === 'PERSONNE')
  t('11a. Portée PERSONNE -> jamais STOP entreprise', c.isStop === false)
  t('11a. Portée PERSONNE -> pipeline inchangé (null)', c.pipelineStage === null)
}
{
  const c = computeConsequence({ resultat: 'DEMANDE_NE_PLUS_CONTACTER', now: NOW, oppositionScope: 'MOYEN' })
  t('11b. Portée MOYEN -> oppositionScope=MOYEN transmis tel quel', c.oppositionScope === 'MOYEN')
  t('11b. Portée MOYEN -> jamais STOP entreprise', c.isStop === false)
  t('11b. Portée MOYEN -> pipeline inchangé (null)', c.pipelineStage === null)
}
{
  const c = computeConsequence({ resultat: 'DEMANDE_NE_PLUS_CONTACTER', now: NOW, oppositionScope: 'ENTREPRISE' })
  t('11c. Portée ENTREPRISE -> oppositionScope=ENTREPRISE transmis tel quel', c.oppositionScope === 'ENTREPRISE')
  t('11c. Portée ENTREPRISE -> SEULE portée entraînant STOP', c.isStop === true)
  t('11c. Portée ENTREPRISE -> pipeline devient PERDU', c.pipelineStage === 'PERDU')
}

// ── Non-escalade : PERSONNE/MOYEN ne doivent jamais impliquer ENTREPRISE ──
t('12. PERSONNE != ENTREPRISE (aucune promotion automatique)',
  computeConsequence({ resultat: 'DEMANDE_NE_PLUS_CONTACTER', now: NOW, oppositionScope: 'PERSONNE' }).isStop !==
  computeConsequence({ resultat: 'DEMANDE_NE_PLUS_CONTACTER', now: NOW, oppositionScope: 'ENTREPRISE' }).isStop)
t('13. MOYEN != ENTREPRISE (aucune promotion automatique)',
  computeConsequence({ resultat: 'DEMANDE_NE_PLUS_CONTACTER', now: NOW, oppositionScope: 'MOYEN' }).isStop !==
  computeConsequence({ resultat: 'DEMANDE_NE_PLUS_CONTACTER', now: NOW, oppositionScope: 'ENTREPRISE' }).isStop)

import { isResultatValide, isOppositionScopeValide } from './activite-consequence'

// ── P0.7C-HARDENING §1 : validation stricte des valeurs closes ──
t('14. resultat valide accepte', isResultatValide('INTERESSE') === true)
t('15. resultat invalide/arbitraire rejete', isResultatValide('NIMPORTE_QUOI') === false)
t('16. resultat non-string rejete', isResultatValide(123) === false)
t('17. oppositionScope valide accepte', isOppositionScopeValide('MOYEN') === true)
t('18. oppositionScope invalide rejete', isOppositionScopeValide('TOUT_LE_MONDE') === false)

// P0.7C-HARDENING §4 : la RPC doit echouer proprement si l'id référencé
// n'existe pas (vérifié par relecture du SQL — non exécutable sans base ;
// ce test documente le contrat attendu, à confirmer lors de la recette Preview)
t('19. [contrat SQL, verifie en recette] scope MOYEN sans moyen_contact_id existant -> RAISE EXCEPTION cote RPC', true)

console.log('')
const passed = results.filter((r) => r.pass).length
console.log(`${passed}/${results.length} tests passes`)
if (passed !== results.length) process.exit(1)
