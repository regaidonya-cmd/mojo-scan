import { estAdminActif, estSdrActif } from './auth-session'
import type { Profil } from './auth-session'

const results: { name: string; pass: boolean }[] = []
function t(name: string, pass: boolean) { results.push({ name, pass }); console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name) }

function profil(overrides: Partial<Profil>): Profil {
  return { userId: 'u1', nom: 'Test', role: 'SDR', actif: true, ...overrides }
}

async function main() {
  // 1. Fonctions pures estAdminActif / estSdrActif
  t('1. ADMIN actif -> estAdminActif=true', estAdminActif(profil({ role: 'ADMIN', actif: true })))
  t('1b. ADMIN inactif -> estAdminActif=false', !estAdminActif(profil({ role: 'ADMIN', actif: false })))
  t('1c. SDR (même actif) -> estAdminActif=false', !estAdminActif(profil({ role: 'SDR', actif: true })))
  t('1d. null -> estAdminActif=false', !estAdminActif(null))

  t('2. SDR actif -> estSdrActif=true', estSdrActif(profil({ role: 'SDR', actif: true })))
  t('2b. SDR inactif -> estSdrActif=false', !estSdrActif(profil({ role: 'SDR', actif: false })))
  t('2c. ADMIN (même actif) -> estSdrActif=false', !estSdrActif(profil({ role: 'ADMIN', actif: true })))
  t('2d. null -> estSdrActif=false', !estSdrActif(null))

  // 3. Vérification structurelle : SUPABASE_SERVICE_ROLE_KEY jamais UTILISÉE dans le client navigateur
  // (la mention dans un commentaire documentant son absence est autorisée)
  {
    const fs = require('fs')
    const browser = fs.readFileSync(__dirname + '/../supabase/browser.ts', 'utf-8')
    t('3. browser.ts n\'utilise jamais process.env.SUPABASE_SERVICE_ROLE_KEY', !browser.includes('process.env.SUPABASE_SERVICE_ROLE_KEY'))
    t('3b. browser.ts utilise uniquement NEXT_PUBLIC_* (clé publique)', browser.includes('NEXT_PUBLIC_SUPABASE_URL') && browser.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY'))
  }

  function scanDir(dir: string): string[] {
    const fs = require('fs')
    const path = require('path')
    let fichiers: string[] = []
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      const p = path.join(dir, entry.name)
      if (entry.isDirectory()) fichiers = fichiers.concat(scanDir(p))
      else if (/\.(ts|tsx)$/.test(entry.name)) fichiers.push(p)
    }
    return fichiers
  }

  // 4. Vérification structurelle : aucune variable NEXT_PUBLIC_* ne contient "SERVICE" ou "SECRET" dans tout le projet
  {
    const fs = require('fs')
    const path = require('path')
    const racine = path.join(__dirname, '..', '..', '..')
    const tousFichiers = scanDir(path.join(racine, 'src'))
    let aucuneFuite = true
    for (const f of tousFichiers) {
      const contenu = fs.readFileSync(f, 'utf-8')
      if (/NEXT_PUBLIC_[A-Z_]*(SERVICE|SECRET)[A-Z_]*/.test(contenu)) { aucuneFuite = false; console.log('  fuite potentielle:', f) }
    }
    t('4. Aucune variable NEXT_PUBLIC_* ne porte un nom SERVICE/SECRET dans tout src/', aucuneFuite)
  }

  // 5. admin_auth / ADMIN_PASSWORD / /api/admin/login jamais supprimés (filet de sécurité conservé)
  {
    const fs = require('fs')
    const path = require('path')
    const racine = path.join(__dirname, '..', '..', '..')
    const loginRoute = fs.readFileSync(path.join(racine, 'src/app/api/admin/login/route.ts'), 'utf-8')
    t('5. /api/admin/login toujours présente et intacte (ADMIN_PASSWORD)', loginRoute.includes('ADMIN_PASSWORD') && loginRoute.includes('admin_auth'))
    const helper = fs.readFileSync(__dirname + '/auth-session.ts', 'utf-8')
    t('5b. Le helper centralisé vérifie TOUJOURS admin_auth en premier (filet de sécurité)', helper.includes('adminAuthCookieValide'))
  }

  // 6. Les anciennes routes/pages protégées utilisent bien le helper centralisé, plus de duplication
  {
    const fs = require('fs')
    const path = require('path')
    const racine = path.join(__dirname, '..', '..', '..')
    const fichiersProteges = [
      'src/app/admin/page.tsx', 'src/app/admin/prospects/page.tsx',
      'src/app/admin/prospects/[companyId]/page.tsx', 'src/app/admin/campagnes/[lotId]/page.tsx',
      'src/app/admin/campagnes/nouveau/page.tsx', 'src/app/admin/ma-journee/page.tsx',
      'src/app/api/admin/campagnes/route.ts', 'src/app/api/admin/prospects/[companyId]/activite/route.ts',
    ]
    let tousCentralises = true
    let aucuneDuplication = true
    for (const f of fichiersProteges) {
      const contenu = fs.readFileSync(path.join(racine, f), 'utf-8')
      if (!contenu.includes('estAutoriseAdmin')) { tousCentralises = false; console.log('  pas centralise:', f) }
      if (/function getToken/.test(contenu)) { aucuneDuplication = false; console.log('  duplication residuelle:', f) }
    }
    t('6. Toutes les routes/pages échantillonnées utilisent le helper centralisé', tousCentralises)
    t('6b. Aucune duplication résiduelle de getToken()', aucuneDuplication)
  }

  // 7. /sdr/attente exige un profil SDR actif (pas juste "connecté")
  {
    const fs = require('fs')
    const path = require('path')
    const racine = path.join(__dirname, '..', '..', '..')
    const page = fs.readFileSync(path.join(racine, 'src/app/sdr/attente/page.tsx'), 'utf-8')
    t('7. /sdr/attente vérifie estSdrActif côté serveur', page.includes('estSdrActif'))
    t('7b. /sdr/attente redirige un ADMIN vers /admin (jamais piégé sur la page SDR)', page.includes("redirect('/admin')"))
  }

  console.log('')
  const passed = results.filter((r) => r.pass).length
  console.log(`${passed}/${results.length} tests passes`)
  if (passed !== results.length) process.exit(1)
}

main()
