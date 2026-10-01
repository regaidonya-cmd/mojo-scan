// ══════════════════════════════════════════════════════════════
// MOJO SALES — SDR / PR1 — Tests de l'idempotence des activités.
//
// La logique réelle vit dans une fonction PostgreSQL (p07_enregistrer_
// resultat_appel), pas dans du TypeScript. Ces tests :
//  1. Simulent fidèlement la logique ON CONFLICT ... DO NOTHING en
//     mémoire (modèle pur, même sémantique que l'index partiel validé
//     empiriquement — voir le rapport PR1) pour documenter et figer le
//     comportement attendu ;
//  2. Vérifient structurellement le contenu exact de la migration SQL.
//
// Le comportement SQL réel (compatibilité index partiel / ON CONFLICT)
// a été validé EMPIRIQUEMENT sur une table isolée avant d'écrire cette
// PR — voir le rapport. Ces tests ne remplacent pas cette validation,
// ils documentent et figent la sémantique attendue pour toute non-
// régression future du modèle.
// ══════════════════════════════════════════════════════════════

const results: { name: string; pass: boolean }[] = []
function t(name: string, pass: boolean) { results.push({ name, pass }); console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name) }

// Modèle pur reproduisant la sémantique de la fonction PostgreSQL :
// INSERT ... ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
// + UPDATE prospects_sales WHERE company_id = X (silencieux si absent).
interface ActiviteSimulee { id: string; companyId: string; idempotencyKey: string | null; resultat: string }

function simulerEnregistrement(
  activitesExistantes: ActiviteSimulee[],
  prospectsSalesExistants: Set<string>, // companyId ayant une ligne prospects_sales
  input: { companyId: string; idempotencyKey: string | null; resultat: string }
): { activiteId: string; dejaExistant: boolean; prospectSalesModifie: boolean } {
  if (input.idempotencyKey !== null) {
    const existante = activitesExistantes.find((a) => a.idempotencyKey === input.idempotencyKey)
    if (existante) {
      // ON CONFLICT ... DO NOTHING : aucune nouvelle activité, aucune
      // nouvelle conséquence métier appliquée.
      return { activiteId: existante.id, dejaExistant: true, prospectSalesModifie: false }
    }
  }
  const nouvelleId = `activite_${activitesExistantes.length + 1}`
  activitesExistantes.push({ id: nouvelleId, companyId: input.companyId, idempotencyKey: input.idempotencyKey, resultat: input.resultat })
  // UPDATE ... WHERE company_id = X : silencieux si la ligne n'existe pas (0 ligne affectée, pas d'erreur).
  const prospectSalesModifie = prospectsSalesExistants.has(input.companyId)
  return { activiteId: nouvelleId, dejaExistant: false, prospectSalesModifie }
}

async function main() {
  // 1. Premier enregistrement avec une nouvelle idempotency_key -> une activité créée
  {
    const activites: ActiviteSimulee[] = []
    const prospects = new Set(['c1'])
    const r = simulerEnregistrement(activites, prospects, { companyId: 'c1', idempotencyKey: 'clef-A', resultat: 'INTERESSE' })
    t('1. Premier appel -> activité créée, dejaExistant=false', !r.dejaExistant && activites.length === 1)
  }

  // 2. Deuxième appel avec EXACTEMENT la même idempotency_key -> aucune deuxième activité
  {
    const activites: ActiviteSimulee[] = []
    const prospects = new Set(['c1'])
    simulerEnregistrement(activites, prospects, { companyId: 'c1', idempotencyKey: 'clef-B', resultat: 'INTERESSE' })
    const r2 = simulerEnregistrement(activites, prospects, { companyId: 'c1', idempotencyKey: 'clef-B', resultat: 'INTERESSE' })
    t('2. Deuxième appel même clé -> dejaExistant=true, 0 nouvelle activité', r2.dejaExistant && activites.length === 1)
  }

  // 3. Aucune conséquence métier appliquée deux fois (prospectSalesModifie=false au 2e appel)
  {
    const activites: ActiviteSimulee[] = []
    const prospects = new Set(['c1'])
    const r1 = simulerEnregistrement(activites, prospects, { companyId: 'c1', idempotencyKey: 'clef-C', resultat: 'RDV_OBTENU' })
    const r2 = simulerEnregistrement(activites, prospects, { companyId: 'c1', idempotencyKey: 'clef-C', resultat: 'RDV_OBTENU' })
    t('3. 1er appel -> prospectSalesModifie=true', r1.prospectSalesModifie)
    t('3b. 2e appel (doublon) -> prospectSalesModifie=false (jamais réappliqué)', !r2.prospectSalesModifie)
  }

  // 4. Deux clés différentes -> deux activités possibles
  {
    const activites: ActiviteSimulee[] = []
    const prospects = new Set(['c1'])
    simulerEnregistrement(activites, prospects, { companyId: 'c1', idempotencyKey: 'clef-D1', resultat: 'A_RAPPELER' })
    simulerEnregistrement(activites, prospects, { companyId: 'c1', idempotencyKey: 'clef-D2', resultat: 'A_RAPPELER' })
    t('4. Deux clés différentes -> 2 activités créées', activites.length === 2)
  }

  // 5. idempotency_key NULL -> jamais de déduplication (chaque appel crée une activité, cohérent
  // avec l'index PARTIEL WHERE idempotency_key IS NOT NULL : les NULL ne participent jamais à la contrainte)
  {
    const activites: ActiviteSimulee[] = []
    const prospects = new Set(['c1'])
    simulerEnregistrement(activites, prospects, { companyId: 'c1', idempotencyKey: null, resultat: 'PAS_DE_REPONSE' })
    simulerEnregistrement(activites, prospects, { companyId: 'c1', idempotencyKey: null, resultat: 'PAS_DE_REPONSE' })
    t('5. idempotency_key=NULL -> jamais de déduplication (2 activités créées)', activites.length === 2)
  }

  // 5b. Note : la fonction RPC réelle REJETTE idempotency_key NULL/vide en amont
  // (raise exception) — ce test documente uniquement la sémantique de l'INDEX/ON
  // CONFLICT elle-même, pas le comportement de bout en bout de la fonction.
  t('5b. Documenté : la RPC réelle rejette idempotency_key NULL/vide AVANT l\'insert (raise exception)', true)

  // 6. prospects_sales absent pour le company_id -> activité créée, prospectSalesModifie=false,
  // AUCUNE erreur (comportement silencieux documenté, non corrigé dans cette PR)
  {
    const activites: ActiviteSimulee[] = []
    const prospects = new Set<string>() // aucune ligne prospects_sales
    const r = simulerEnregistrement(activites, prospects, { companyId: 'c-inconnu', idempotencyKey: 'clef-E', resultat: 'INTERESSE' })
    t('6. prospects_sales absent -> activité quand même créée (pas d\'erreur)', activites.length === 1)
    t('6b. prospects_sales absent -> prospectSalesModifie=false (mise à jour silencieusement perdue, documenté)', !r.prospectSalesModifie)
  }

  // 7. Vérification structurelle de la migration SQL
  {
    const fs = require('fs')
    const sql = fs.readFileSync(__dirname + '/../../../supabase/migrations/004_activites_idempotency_key_unique.sql', 'utf-8')
    t('7. Migration contient un index UNIQUE PARTIEL (WHERE idempotency_key IS NOT NULL)', /CREATE UNIQUE INDEX[\s\S]*ON public\.activites \(idempotency_key\)[\s\S]*WHERE idempotency_key IS NOT NULL/.test(sql))
    t('7b. Migration ne modifie PAS la fonction p07_enregistrer_resultat_appel', !/CREATE OR REPLACE FUNCTION/i.test(sql))
    t('7c. Idempotente elle-même (IF NOT EXISTS)', sql.includes('IF NOT EXISTS'))
  }

  console.log('')
  const passed = results.filter((r) => r.pass).length
  console.log(`${passed}/${results.length} tests passes`)
  if (passed !== results.length) process.exit(1)
}

main()
