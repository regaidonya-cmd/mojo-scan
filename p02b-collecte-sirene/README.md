# P0.2B — Collecte SIRENE (lecture seule)

## ⚡ Le plus simple pour vous, vu que vous ne pouvez pas installer Node.js

**Vous n'avez pas besoin d'exécuter quoi que ce soit sur votre PC.**

1. Récupérez les réponses JSON réelles de `/near_point` (comme celle déjà obtenue : `total_results=3226`, `total_pages=130`) — depuis votre navigateur, ou l'environnement que vous utilisez déjà pour y accéder — et enregistrez chaque page comme un fichier `.json`
2. **Transmettez-moi directement ces fichiers dans la conversation** (autant de pages que vous en avez, même une seule pour commencer)
3. J'exécute moi-même le mode `JSON_IMPORT` de ce moteur, en local, sans aucun appel réseau — donc sans dépendre de votre PC ni du mien — et je vous rends le rapport

C'est exactement pour ça que le mode `JSON_IMPORT` a été ajouté : découpler la récupération des données (que vous faites, où vous pouvez) de leur analyse (que je peux faire moi-même, sans réseau).

**Point important** : avec une seule page sur 130, le rapport indiquera explicitement `statut: "PARTIEL"` avec un avertissement — ça ne "valide" rien, ça montre juste que le moteur fonctionne correctement sur les vraies données. Il faudra les 130 pages (ou au moins un échantillon que vous jugez suffisant) pour un vrai verdict P0.2B.

## Méthode alternative (Windows, si Node.js devient disponible un jour)

Double-cliquez sur `LANCER-RECETTE-POC.bat` — voir plus bas pour le détail.

## Lancer la vraie recette automatiquement (GitHub Actions — recommandé)

1. Ajoutez au dépôt GitHub le dossier `p02b-collecte-sirene/` (racine du dépôt) **et** le dossier `.github/workflows/p02b-recette-poc.yml`, puis committez/poussez
2. Sur GitHub : onglet **Actions** → workflow **"P0.2B - Recette POC Diagnostiqueurs (collecte SIRENE)"** → bouton **"Run workflow"**
3. Une fois le run terminé, ouvrez-le : le **résumé** (statut COMPLET/PARTIEL, SIRET/SIREN uniques, CIBLE/HORS_CIBLE/INCONNU, anomalies) s'affiche directement en haut de la page ; le **rapport JSON complet** est téléchargeable en bas de page, section "Artifacts"

Le workflow exécute `npm test` en premier — la recette réelle ne se lance que si tous les tests passent. `MAX_PAGES=200` est utilisé (la recette diagnostiqueurs annonce ~130 pages), mais le moteur s'arrête naturellement dès que `total_pages` est atteint. Aucun commit automatique du rapport dans le dépôt : il n'existe que comme artifact du run (téléchargement manuel, conservé 30 jours). Aucune écriture Supabase, aucun enrichissement ADI, aucun service payant.


## Généricité du moteur — pas un script jetable

Ce moteur est conçu pour être réutilisé par MOJO SALES au-delà du POC diagnostiqueurs, sans modification de code :
- **Un seul code NAF** (usage actuel, `ACTIVITE_CODES=71.20B`)
- **Plusieurs codes NAF** pour un parcours métier (`ACTIVITE_CODES=71.20B,74.90A,71.12B`)
- **Aucun filtre NAF** pour une future collecte multisectorielle d'une zone (`ACTIVITE_CODES=` vide)

Aucun fichier du moteur (`config.js`, `sireneClient.js`, `pipeline.js`, `collect.js`, `geo.js`, `report.js`) ne contient de logique spécifique au métier "diagnostiqueur" — `71.20B` n'apparaît que comme **valeur de configuration par défaut**, jamais dans une condition de code. Vérifié empiriquement (voir plus bas) avec 3 configurations différentes sur le même moteur : un seul NAF, plusieurs NAF, aucun NAF.

**L'ADI n'est pas et ne sera pas une dépendance de ce collecteur** : ce module ne l'importe pas, ne le connaît pas. Le rapprochement ADI est un enrichisseur sectoriel séparé (P0.2C), branché *après* ce collecteur générique, jamais fusionné dedans.


Module autonome, zéro dépendance externe (Node.js ≥ 18, `fetch` natif),
zéro service payant, zéro écriture Supabase. Ne fait qu'un appel en lecture
à l'API publique `recherche-entreprises.api.gouv.fr`.

## Portée exacte de cette sous-phase

## Deux modes de collecte, un seul pipeline

Le moteur supporte deux sources d'entrée, avec **strictement la même logique** de filtrage établissement, déduplication SIRET/SIREN, calcul de distance et qualification `fit_cible` (aucune duplication de code entre les deux) :

| Variable | Valeur | Effet |
|---|---|---|
| `MODE` | `LIVE_API` (défaut) | Appelle `/near_point` en direct, avec pagination automatique |
| `MODE` | `JSON_IMPORT` | Analyse des fichiers `.json` déjà obtenus, placés dans un dossier |
| `IMPORT_DIR` | `./import` (défaut) | Dossier contenant les fichiers `.json` en mode `JSON_IMPORT` |

**Règle de validation du `MODE`, appliquée à un seul endroit (`normaliserMode()` dans `src/collect.js`), utilisée aussi bien par `index.js` que par `collecter()`** : la casse fournie est acceptée puis normalisée explicitement en majuscules, et c'est cette valeur normalisée qui est comparée à `LIVE_API`/`JSON_IMPORT`. Ainsi `json_import` ou `Live_Api` sont acceptés (normalisés), mais toute valeur qui ne correspond à aucun des deux modes après normalisation (ex. `LIVE-API`, `FOO`) est **rejetée avec une erreur explicite** — jamais de repli silencieux sur `LIVE_API`.

**Contrôle de cohérence des pages**, avec la même fonction de comparaison (`src/pageMeta.js`) utilisée par les deux modes :
- **`JSON_IMPORT`** : validation du **lot entier** avant tout traitement — la moindre incohérence (`total_pages`, `total_results`, `per_page`, page hors plage) **refuse tout le lot**, aucune fusion partielle.
- **`LIVE_API`** : validation **incrémentale**, page après page, au fur et à mesure de la réception. Si une page reçue diverge de la référence établie par la première page, la collecte **s'interrompt proprement** — mais les pages déjà traitées avant la divergence restent comptabilisées (comportement volontairement différent de `JSON_IMPORT`, puisqu'ici les pages arrivent une à une et non toutes en même temps).

Dans les deux cas, une incohérence empêche mécaniquement le statut `COMPLET` (le nombre de pages manquantes ne peut pas être nul), et produit une anomalie explicite (`erreur_import_json` en import, `incoherence_pages_live_api` en direct).

**Format attendu des fichiers en mode `JSON_IMPORT`** : chaque fichier doit être le JSON brut, non modifié, d'une réponse de `/near_point`. Le numéro de page utilisé est celui déclaré **dans le contenu du fichier** (`"page": ...`), jamais deviné depuis le nom du fichier — vous pouvez donc les nommer comme vous voulez.

Le rapport produit indique toujours :
- `source_collecte` : `LIVE_API` ou `JSON_IMPORT`
- `echantillon.statut` : `COMPLET`, `PARTIEL`, ou `INDETERMINE`
- `echantillon.numeros_pages_fournies` / `numeros_pages_manquantes`
- `echantillon.avertissement` : **non nul dès que l'échantillon n'est pas complet**, avec un message explicite empêchant toute conclusion hâtive de type "recette validée"

Fait : appel paramétrable à `/near_point`, pagination progressive avec
throttle, filtre établissement (`etat_administratif=A` + `date_fermeture=null`
+ code d'activité exact sur la nomenclature configurée), dédoublonnage
SIRET puis SIREN, conservation des établissements locaux actifs par SIREN,
distance minimale au point de référence, première qualification
`fit_cible` (CIBLE / HORS_CIBLE / INCONNU), métriques de rendement par
page, plafond de pagination configurable.

Ne fait PAS (hors périmètre, réservé à P0.2C) : interrogation de l'ADI,
fuzzy matching, exploitation téléphone/email, `preuve_metier`,
contactabilité, toute écriture en base, toute interface.

## Pourquoi ce module n'a pas pu produire le vrai rapport de recette ici

Ce sandbox n'a pas d'accès réseau sortant vers `recherche-entreprises.api.gouv.fr`
(domaine hors liste blanche). La tentative d'exécution réelle échoue avec :

```
HTTP 403 — Host not in allowlist: recherche-entreprises.api.gouv.fr
```

Le code lui-même est correct et complet (validé structurellement, voir
plus bas) — c'est une contrainte de l'environnement d'exécution actuel,
pas du code.

## Comment obtenir le vrai rapport sur la vraie zone

Depuis un environnement avec accès internet normal (poste de travail,
CI, ou plus tard l'infrastructure d'hébergement retenue) :

```bash
npm install    # aucune dépendance à installer en réalité (aucun package.json "dependencies"), commande sans effet mais inoffensive
npm run collect
```

Variables d'environnement disponibles (toutes optionnelles, valeurs par
défaut = POC Villeneuve-Saint-Georges) :

| Variable | Défaut | Rôle |
|---|---|---|
| `CENTER_LAT` | `48.7333` | Latitude du centre |
| `CENTER_LONG` | `2.4333` | Longitude du centre |
| `RADIUS_KM` | `20` | Rayon en km (max 50 côté API) |
| `ACTIVITE_CODES` | `71.20B` | Code(s) NAF ciblé(s), égalité stricte (jamais de préfixe). Trois usages : **un seul code** (`71.20B`) ; **plusieurs codes séparés par des virgules** (`71.20B,74.90A,71.12B`) pour un parcours métier couvrant plusieurs NAF ; **valeur vide** (`ACTIVITE_CODES=`) pour aucune restriction NAF (collecte multisectorielle). L'ancienne variable `ACTIVITE_CODE` (singulier) reste acceptée pour compatibilité mais `ACTIVITE_CODES` est la référence. |
| `ACTIVITE_NOMENCLATURE` | `naf2008` | `naf2008` ou `naf2025` — détermine quel champ sert au filtre exact |
| `MAX_PAGES` | `40` | Plafond de sécurité configurable |
| `THROTTLE_MS` | `250` | Délai minimal entre deux appels |

Le rapport JSON est écrit dans `output/rapport-p02b-<timestamp>.json` et
également imprimé sur la sortie standard. La progression page par page
est journalisée sur la sortie d'erreur (`stderr`), pour suivi en direct
sans polluer la sortie JSON.

## Validation structurelle déjà effectuée (sans réseau)

```bash
npm test
```

Exécute `test/pipeline.test.js` contre `test/fixture-realshape.json` — un
jeu de données dont la **structure** reproduit fidèlement de vraies
réponses de cette API (obtenues précédemment : DINUM, Boulangeries Paul),
mais dont les **valeurs** sont construites pour couvrir chaque cas de la
spécification :
- établissement actif 71.20B retenu
- établissement fermé exclu (même si l'entreprise reste "active" au niveau
  légal — le cas documenté qui a motivé la correction méthodologique)
- établissement actif mais NAF différent (71.20A) exclu
- grande structure (GE, réseau national) correctement classée HORS_CIBLE
  sur signaux convergents
- entreprise à effectif inconnu correctement classée INCONNU (jamais
  HORS_CIBLE ni CIBLE par défaut)
- un même SIREN avec deux établissements actifs dans la zone correctement
  regroupé en un seul prospect avec ses deux établissements rattachés

Résultat de la dernière exécution : **tous les tests passent** (voir
transcription dans la conversation).

`npm test` exécute aussi `test/json-import.test.js`, qui valide :
- la détection du statut `PARTIEL` sur une **simulation structurelle** de
  la situation "1 page sur 130" (mêmes `total_results`/`total_pages` que
  la vraie recherche, mais avec les entreprises fictives de la fixture —
  **ce n'est pas un test sur les vraies entreprises de la zone**, seule la
  mécanique de détection est vérifiée) ;
- la détection du statut `COMPLET` sur un lot cohérent de 2/2 pages, avec
  déduplication SIREN vérifiée *entre* plusieurs pages importées ;
- le refus explicite d'un lot dont les pages ont des `total_pages`,
  `total_results` ou numéros de page incohérents entre eux (jamais de
  fusion silencieuse, jamais de statut `COMPLET` sur un lot suspect) ;
- le refus explicite de toute valeur de `MODE` autre que `LIVE_API` ou
  `JSON_IMPORT` (aucune faute de frappe n'est silencieusement traitée
  comme `LIVE_API`).
