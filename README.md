# MOJO Scan FLASH

Diagnostic commercial web responsive — transforme un visiteur en lead qualifié en moins de 10 minutes.

## Stack
- **Next.js 14** + TypeScript
- **Supabase** (PostgreSQL + Auth)
- **Vercel** (déploiement)
- **Resend** (emails)
- **HubSpot** (CRM)

## Démarrage rapide

### 1. Prérequis
- Node.js 18+
- Compte Supabase (gratuit)
- Compte Vercel (gratuit)

### 2. Installation locale
```bash
npm install
cp .env.local.example .env.local
# Remplir les variables dans .env.local
npm run dev
```

### 3. Base de données Supabase
1. Créer un projet sur [supabase.com](https://supabase.com)
2. Aller dans SQL Editor
3. Coller et exécuter `supabase/migrations/001_init.sql`

### 4. Déploiement Vercel
```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel deploy

# Ajouter les variables d'environnement dans le dashboard Vercel
# Project > Settings > Environment Variables
```

### 5. Sous-domaine
Dans le DNS de Hostinger, ajouter :
```
CNAME  scan  cname.vercel-dns.com
```
Puis dans Vercel > Project > Settings > Domains : ajouter `scan.mojoacademie.com`

## Architecture

```
src/
├── app/
│   ├── scan/               # Page principale du scan
│   ├── report/[token]/     # Rapport public par token
│   ├── admin/              # Back-office protégé
│   └── api/
│       ├── scan/submit/    # Soumission du diagnostic
│       ├── company/search/ # Recherche entreprise (API gouv)
│       └── report/[token]/ # API rapport
├── components/scan/        # Composants du parcours
├── lib/
│   ├── scoring/            # Moteur de score déterministe
│   ├── funding/            # Détection financement
│   ├── hubspot/            # Sync CRM
│   └── email/              # Envoi emails
└── types/                  # Types TypeScript
```

## Variables d'environnement

| Variable | Requis | Description |
|---|---|---|
| `SUPABASE_URL` | ✅ | URL de votre projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Clé service role (backend uniquement) |
| `NEXT_PUBLIC_URL` | ✅ | URL publique du scan |
| `HUBSPOT_ACCESS_TOKEN` | ⚠️ | Optionnel — sync désactivée sans lui |
| `RESEND_API_KEY` | ⚠️ | Optionnel — email non envoyé sans lui |
| `ADMIN_PASSWORD` | ✅ | Mot de passe back-office |

## Modes disponibles

- `/scan` — Mode site public (auto-diagnostic)
- `/scan?mode=terrain` — Mode terrain (conseiller + prospect)
- `/scan?mode=call` — Mode call (conseiller au téléphone)

## Back-office

`/admin` — protégé par mot de passe (`ADMIN_PASSWORD`)
- Liste des diagnostics avec filtre Lead Score
- Export CSV
- Statut sync HubSpot
