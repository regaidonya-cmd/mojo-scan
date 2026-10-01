export {}

const results: { name: string; pass: boolean }[] = []
function t(name: string, pass: boolean) { results.push({ name, pass }); console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name) }

async function main() {
  const fs = require('fs')
  const path = require('path')
  const racine = path.join(__dirname, '..', '..', '..')
  const login = fs.readFileSync(path.join(racine, 'src/app/api/auth/login/route.ts'), 'utf-8')

  // 1. login/route.ts utilise data.user issu de signInWithPassword()
  t('1. Utilise data.user issu de signInWithPassword()', /const \{ data,[^}]*\} = await supabase\.auth\.signInWithPassword/.test(login) && login.includes('data.user'))

  // 2. N'appelle plus recupererProfilCourant() après le sign-in (cause du bug) —
  // on vérifie le CODE réel (import ou invocation), pas la mention documentaire
  // dans le commentaire d'en-tête qui explique le bug corrigé.
  const ligneImport = login.split('\n').find((l: string) => l.includes('import') && l.includes('auth-session'))
  const aUnVraiAppel = /[^/]\brecupererProfilCourant\s*\(/.test(login.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''))
  t('2. N\'appelle plus recupererProfilCourant() (vérifié hors commentaires)', !aUnVraiAppel && !(ligneImport ?? '').includes('recupererProfilCourant'))

  // 3. Le profil est recherché à partir du user.id authentifié (pas une valeur du navigateur)
  t('3. Recherche profiles avec data.user.id (jamais une valeur du formulaire/navigateur)', /\.eq\('user_id',\s*data\.user\.id\)/.test(login))

  // 3b. Réutilise le MÊME client (pas une nouvelle instance créée pour relire la session)
  const nbCreations = (login.match(/creerClientSupabaseServeur\(\)/g) ?? []).length
  t('3b. Une seule instance de client créée dans tout le fichier (plus de second client)', nbCreations === 1)

  // 4. ADMIN actif -> /admin
  t('4. Redirige vers /admin pour un profil ADMIN actif', /estAdminActif\(profil\)[\s\S]*?\/admin/.test(login))

  // 5. SDR actif -> /sdr/attente
  t('5. Redirige vers /sdr/attente pour un profil SDR actif', /estSdrActif\(profil\)[\s\S]*?\/sdr\/attente/.test(login))

  // 6. Profil absent/inactif -> refus (error=inactif) + déconnexion
  t('6. Profil absent/inactif -> error=inactif', login.includes('error=inactif'))
  t('6b. Déconnexion explicite avant le refus (signOut)', login.includes('signOut()'))

  // 6c. Jamais service_role utilisée dans le login (RLS respectée avec la session utilisateur)
  t('6c. Aucun usage de service_role dans login/route.ts (RLS respectée)', !login.includes('SERVICE_ROLE'))

  // 6d. Jamais un rôle accepté depuis le formulaire/navigateur
  t('6d. Le rôle n\'est jamais lu depuis formData (toujours depuis profiles)', !/formData\.get\(['"]role['"]\)/.test(login))

  // 7. L'ancien admin_auth reste intact ailleurs (fichier /api/admin/login non touché par ce fix)
  {
    const adminLogin = fs.readFileSync(path.join(racine, 'src/app/api/admin/login/route.ts'), 'utf-8')
    t('7. /api/admin/login (admin_auth) intact, non modifié par ce correctif', adminLogin.includes('ADMIN_PASSWORD') && adminLogin.includes('admin_auth'))
  }

  // 8. Aucune nouvelle migration créée par ce fix, profiles/RLS non touchées
  {
    const migrations = fs.readdirSync(path.join(racine, 'supabase/migrations'))
    t('8. Toujours exactement les migrations 001-005, aucune nouvelle créée', migrations.length === 5 && migrations.includes('005_profiles.sql'))
  }

  console.log('')
  const passed = results.filter((r) => r.pass).length
  console.log(`${passed}/${results.length} tests passes`)
  if (passed !== results.length) process.exit(1)
}

main()
