import { getStatutBadgeLabel, getRaisonAffichee, peutEnregistrerResultat } from './fiche-presentation'

const results: { name: string; pass: boolean }[] = []
function t(name: string, pass: boolean) {
  results.push({ name, pass })
  console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name)
}

// ── 1. Badge ──
t('1. STOP -> jamais "À préparer"', getStatutBadgeLabel('STOP', false).label !== 'À préparer')
t('1b. STOP -> "Prospection arrêtée"', getStatutBadgeLabel('STOP', false).label === 'Prospection arrêtée')
t('2. TERMINE -> jamais "À préparer"', getStatutBadgeLabel('TERMINE', false).label !== 'À préparer')
t('2b. TERMINE -> "Opportunité clôturée"', getStatutBadgeLabel('TERMINE', false).label === 'Opportunité clôturée')
t('3. P2 non ready -> "À préparer" (cas actif inchangé)', getStatutBadgeLabel('P2', false).label === 'À préparer')
t('4. P2 ready -> "READY" (cas actif inchangé)', getStatutBadgeLabel('P2', true).label === 'READY')

// ── 2. "Pourquoi ce prospect" ──
t('5. STOP -> texte dédié, jamais "meilleur prospect disponible"', !getRaisonAffichee('STOP', 'Meilleur prospect disponible à travailler actuellement.').includes('Meilleur prospect'))
t('5b. STOP -> texte exact attendu', getRaisonAffichee('STOP', 'x') === "Prospection arrêtée à la demande de l'entreprise.")
t('6. TERMINE -> texte dédié, jamais "meilleur prospect disponible"', !getRaisonAffichee('TERMINE', 'Meilleur prospect disponible à travailler actuellement.').includes('Meilleur prospect'))
t('7. P2 actif -> raison métier propagée telle quelle (cas actif inchangé)', getRaisonAffichee('P2', 'Meilleur prospect disponible à travailler actuellement.') === 'Meilleur prospect disponible à travailler actuellement.')

// ── 3-4. Enregistrement résultat d'appel ──
t('8. STOP -> enregistrement verrouillé', peutEnregistrerResultat('STOP') === false)
t('9. TERMINE -> enregistrement verrouillé aussi (réactivation = fonctionnalité future séparée)', peutEnregistrerResultat('TERMINE') === false)
t('10. P0/P1/P2/P3/P4 -> enregistrement toujours possible (cas actif inchangé)', ['P0', 'P1', 'P2', 'P3', 'P4'].every((p) => peutEnregistrerResultat(p) === true))

console.log('')
const passed = results.filter((r) => r.pass).length
console.log(`${passed}/${results.length} tests passes`)
if (passed !== results.length) process.exit(1)
