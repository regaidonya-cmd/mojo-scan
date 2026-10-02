export {}

const results: { name: string; pass: boolean }[] = []
function t(name: string, pass: boolean) { results.push({ name, pass }); console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name) }

async function main() {
  const fs = require('fs')
  const path = require('path')
  const racine = path.join(__dirname, '..', '..', '..')

  // 1. La migration additive 006 existe
  const cheminMigration = path.join(racine, 'supabase/migrations/006_profiles_authenticated_select_grant.sql')
  const existe = fs.existsSync(cheminMigration)
  t('1. Migration 006_profiles_authenticated_select_grant.sql existe', existe)

  if (existe) {
    const sql = fs.readFileSync(cheminMigration, 'utf-8')
    const sqlSansCommentaires = sql.replace(/--.*$/gm, '')

    // 2. Contient exactement le GRANT attendu
    t('2. Contient GRANT SELECT ON TABLE public.profiles TO authenticated', /GRANT\s+SELECT\s+ON\s+TABLE\s+public\.profiles\s+TO\s+authenticated/i.test(sql))

    // 3. N'accorde JAMAIS INSERT/UPDATE/DELETE/ALL (vérifié hors commentaires)
    t('3. Aucun GRANT INSERT', !/GRANT[^;]*\bINSERT\b/i.test(sqlSansCommentaires))
    t('3b. Aucun GRANT UPDATE', !/GRANT[^;]*\bUPDATE\b/i.test(sqlSansCommentaires))
    t('3c. Aucun GRANT DELETE', !/GRANT[^;]*\bDELETE\b/i.test(sqlSansCommentaires))
    t('3d. Aucun GRANT ALL', !/GRANT\s+ALL\b/i.test(sqlSansCommentaires))

    // 3e. Exactement un seul GRANT dans tout le fichier (minimal strict, hors commentaires)
    const nbGrants = (sqlSansCommentaires.match(/^\s*GRANT\b/gim) ?? []).length
    t('3e. Exactement un seul GRANT dans la migration (minimal strict)', nbGrants === 1)
  }

  // 4. La migration 005 (policy + RLS) reste totalement intacte — comparée au contenu de référence
  {
    const sql005 = fs.readFileSync(path.join(racine, 'supabase/migrations/005_profiles.sql'), 'utf-8')
    t('4. La policy profiles_select_own reste intacte dans 005', sql005.includes('profiles_select_own') && sql005.includes('auth.uid() = user_id'))
    t('5. RLS (ENABLE ROW LEVEL SECURITY) reste intacte dans 005', sql005.includes('ENABLE ROW LEVEL SECURITY'))
    t('5b. 006 ne modifie/ne redéfinit jamais la table profiles elle-même', !/CREATE\s+TABLE|ALTER\s+TABLE.*ADD|ALTER\s+TABLE.*DROP|DROP\s+TABLE/i.test(fs.readFileSync(path.join(racine, 'supabase/migrations/006_profiles_authenticated_select_grant.sql'), 'utf-8')))
  }

  // 6. Le code du login PR2 FIX n'est pas modifié (même contenu fonctionnel qu'après PR2 FIX)
  {
    const login = fs.readFileSync(path.join(racine, 'src/app/api/auth/login/route.ts'), 'utf-8')
    t('6. login/route.ts toujours sans recupererProfilCourant (PR2 FIX intact)', !/[^/]\brecupererProfilCourant\s*\(/.test(login.replace(/\/\/.*$/gm, '')))
    t('6b. login/route.ts utilise toujours data.user.id directement', login.includes('data.user.id'))
  }

  // 7. admin_auth legacy intact
  {
    const adminLogin = fs.readFileSync(path.join(racine, 'src/app/api/admin/login/route.ts'), 'utf-8')
    t('7. /api/admin/login (admin_auth) intact', adminLogin.includes('ADMIN_PASSWORD') && adminLogin.includes('admin_auth'))
    const helper = fs.readFileSync(path.join(racine, 'src/lib/sales/auth-session.ts'), 'utf-8')
    t('7b. Helper centralisé vérifie toujours admin_auth en premier', helper.includes('adminAuthCookieValide'))
  }

  // 8. Exactement 6 migrations au total (001-006), aucune supprimée/renommée
  {
    const migrations = fs.readdirSync(path.join(racine, 'supabase/migrations')).sort()
    t('8. Exactement 6 migrations (001 à 006)', migrations.length === 6 && migrations[5] === '006_profiles_authenticated_select_grant.sql')
  }

  console.log('')
  const passed = results.filter((r) => r.pass).length
  console.log(`${passed}/${results.length} tests passes`)
  if (passed !== results.length) process.exit(1)
}

main()
