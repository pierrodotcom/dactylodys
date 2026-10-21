# DactyloDys — guide de travail des agents

> Chargé à chaque session : **rester sous 200 lignes**. Le détail vit dans `.claude/rules/` (chargé selon les fichiers touchés) et dans `docs/`. Une règle n'entre ici que si elle sert à presque toutes les tâches.

## 1. Mission

Appli web **libre et gratuite** d'apprentissage ludique du clavier pour les enfants de **8-12 ans TDAH et/ou dysgraphiques** (francophones et AZERTY d'abord, multilingue et multi-dispositions ensuite). Objectif mesurable pour l'enfant : taper **au moins aussi vite qu'il écrit à la main** (≈ 10-15 mots/min), de façon lisible, sans regarder ses mains, et avec plaisir.

Références : synthèse de recherche `reports/Dactylo ludique TDAH dysgraphie.md` · feuille de route `docs/FEUILLE_DE_ROUTE.md` · état d'avancement `docs/SUIVI.md`.

## 2. Principes produit non négociables

1. **Précision avant vitesse.** Jamais de jeu verrouillé par un seuil de vitesse ; l'erreur ne punit pas, elle se répare.
2. **Séances courtes** (mini-jeux de 2-4 min, séance de 10-15 min) avec **points d'arrêt naturels** : le jeu propose lui-même de s'arrêter.
3. **Aucun mécanisme addictif ou manipulateur** : pas de série (streak) punitive, pas de classement entre enfants, pas de récompense aléatoire type loot box, pas de notification, pas de monnaie achetable, pas de compte à rebours anxiogène.
4. **Récompenses liées à la maîtrise**, jamais à l'assiduité ni au temps passé. Le récit, le choix et l'humour priment sur les points.
5. **Zéro donnée personnelle, zéro tiers** : pas de compte, pas de traceur, pas de publicité, pas de ressource chargée depuis un domaine externe (polices et sons auto-hébergés).
6. **Accessibilité par défaut** : WCAG 2.2 AA, `prefers-reduced-motion`, mode calme, réglages sensoriels séparés (sons, musique, animations), texte grand et espacé, consignes écoutables.
7. **Non genré et inclusif** : avatar créature, aucun choix de genre, thèmes mélangés.
8. **Ce n'est pas un traitement** : aucune promesse médicale dans l'interface ni la documentation.

## 3. Stack (versions installées au jalon J0, épinglées dans `package.json`)

| Domaine | Choix |
|---|---|
| Langage / runtime | TypeScript 6.0.x strict (pas TS 7 : outillage incompatible) · Node 24 LTS · npm |
| Application | Svelte 5 + SvelteKit 2.x, `adapter-static` (site 100 % statique) · Vite |
| Rendu des jeux | DOM / SVG / CSS + canvas 2D natif. Pas de moteur de jeu sans décision (ADR) |
| Styles | Design tokens DTCG (`tokens/`) → Style Dictionary → variables CSS + module TS |
| i18n | Paraglide JS pour l'interface (`messages/`) · contenus pédagogiques en JSON (`content/<langue>/`) |
| Données locales | IndexedDB + export/import par fichier · pas de backend |
| Audio | Web Audio API · voix pré-générées (pas de `speechSynthesis` pour les consignes) |
| Tests | Vitest + fast-check · rejeu de traces clavier · Playwright (Chromium, Firefox, WebKit) + axe |
| Qualité | ESLint + typescript-eslint + eslint-plugin-svelte · Prettier · Stylelint (valeurs strictes) · lefthook · commitlint |
| CI / hébergement | GitHub Actions · GitHub Pages (Cloudflare Pages en repli) |
| Licences | Code AGPL-3.0-or-later · contenus et visuels CC BY-SA 4.0 · dispositions clavier CC0 |

**Ne jamais installer `latest`** : SvelteKit 3, TypeScript 7 et adapter-static 4 sont exclus (ADR-005) ; toute installation précise la version. **L'outillage est plus récent que les connaissances des modèles.** Avant d'utiliser une API de Svelte, SvelteKit, Vite, Vitest ou ESLint, lire la documentation de la **version installée** (`node_modules/<paquet>/` ou site officiel), pas sa mémoire.

## 4. Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run generate` | Régénère tokens (CSS + TS) et messages i18n ; lancé automatiquement par les autres commandes |
| `npm run check` | Types (svelte-check) |
| `npm run lint` | ESLint + Stylelint + Prettier (vérification) |
| `npm run test` | Tests unitaires et de propriétés |
| `npm run test:e2e` | Playwright sur 3 moteurs + axe |
| `npm run verify` | **Tout ce qui précède** — obligatoire avant tout commit |
| `npm run build` | Build statique |

Les scripts utilisent des rapporteurs silencieux : seuls les échecs s'affichent.

## 5. Arborescence cible

```
src/lib/engine/     TS pur, zéro DOM : frappe, score, progression adaptative
src/lib/keyboard/   modèle de disposition, chargement, étalonnage
src/lib/games/      un dossier par mini-jeu, contrat commun GameModule
src/lib/ui/         composants Svelte réutilisables
src/lib/state/      profils, persistance, export/import
src/lib/audio/      sons et voix
src/routes/         pages
tokens/             design tokens (source de vérité visuelle)
layouts/            dispositions clavier en JSON
content/<langue>/   leçons, mots, phrases, récits
messages/           chaînes d'interface
static/             assets + ATTRIBUTIONS.md
e2e/  tests/traces/ tests de bout en bout et traces clavier réelles
docs/               feuille de route, suivi, décisions, leçons
```

## 6. Règles d'architecture

- `engine/` et `keyboard/` n'importent **ni Svelte ni le DOM** : ils sont testables en Node pur et déterministes (horloge et aléa injectés).
- La frappe est jugée sur le **caractère produit**, jamais sur `KeyboardEvent.code` seul ; `code` ne sert qu'à localiser la touche physique. Détail : `.claude/rules/clavier.md`.
- Un mini-jeu ne contient **aucune pédagogie** : il reçoit une séquence à taper et émet des événements. Progression, score et récompenses vivent dans `engine/`.
- Ajouter une langue, une disposition, un monde ou un thème visuel = **ajouter des données**, pas du code.
- Aucune dépendance d'exécution ajoutée sans ADR dans `docs/DECISIONS.md` (poids, licence, maintenance).

## 7. Zéro valeur en dur

- **Visuel** : aucune couleur, taille, espacement, rayon, ombre, durée, courbe ou z-index littéral dans un composant ou un jeu. Tout passe par un token (`var(--dd-…)` en CSS, module généré pour le canvas). Stylelint le bloque.
- **Texte** : aucune chaîne visible dans le code ; tout passe par `messages/`.
- **Pédagogie** : seuils, durées, ordre des touches, listes de mots sont dans `content/` ou dans une configuration typée, jamais dans la logique.
- **Clavier** : aucune hypothèse AZERTY dans le code ; tout vient de `layouts/`.

## 8. Conventions de nommage

| Objet | Convention | Exemple |
|---|---|---|
| Fichiers et dossiers | kebab-case | `typing-session.ts` |
| Composants Svelte | PascalCase | `KeyboardHint.svelte` |
| Types et classes | PascalCase | `LayoutDefinition` |
| Fonctions, variables | camelCase, verbe en tête | `scoreKeystroke()` |
| Constantes | SCREAMING_SNAKE_CASE | `MAX_SESSION_MINUTES` |
| Tokens CSS | `--dd-<catégorie>-<rôle>[-<variante>]` | `--dd-color-surface-raised` |
| Clés i18n | snake_case préfixé par domaine | `game_meteor_start` |
| Identifiants de contenu | `<langue>.<type>.<slug>` | `fr.lesson.home-row-01` |
| Dispositions | `<langue>-<pays>-<variante>-<plateforme>` | `fr-fr-azerty-pc` |
| Tests | `*.test.ts` à côté du code · `*.spec.ts` dans `e2e/` | |
| Branches | `<type>/<slug-court>` | `feat/typing-engine` |

Code, identifiants et commentaires en **anglais** ; documentation et messages de commit en **français**. Commentaires rares : uniquement le *pourquoi* non évident.

## 9. Tests et définition de « terminé »

Un lot est terminé quand **tout** est vrai :

1. `npm run verify` passe, sans test désactivé ni règle de lint neutralisée.
2. Tout comportement nouveau a un test ; toute correction de bogue commence par un test qui échoue.
3. `engine/` et `keyboard/` : tests unitaires + de propriétés ; toute disposition ajoutée a ses traces de rejeu.
4. Tout nouvel écran passe axe sans violation et se joue entièrement au clavier.
5. Aucune valeur en dur (§ 7) ; nouvelles chaînes présentes dans toutes les langues actives.
6. `docs/SUIVI.md` est à jour ; toute erreur évitable rencontrée est consignée dans `docs/LECONS.md`.

Ne jamais déclarer « terminé » sans avoir exécuté la vérification et en donner le résultat réel. Détail : `.claude/rules/tests.md`.

## 10. Git

- Commits conventionnels (vérifiés par commitlint) : `<type>(<portée>): <description en français>` avec `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `content`, `a11y`, `ci`, `perf`, `revert`.
- Jamais de commit direct sur `main` après le jalon J0 : une branche par lot, une PR, CI verte, fusion par squash.
- Petits commits cohérents. Pas de `--no-verify`, pas de `push --force` sur `main`.
- **Décisions du porteur (2026-10-11)** : le chef d'orchestre active l'Auto-fix sur chaque PR et la fusionne lui-même dès que la CI est verte. La CI (3 navigateurs, Linux) fait foi. En local, Firefox et WebKit marchent (copies de Playwright) : lancer `--project=firefox` sur les specs touchées, surtout au clavier ; un `page.goto` expiré vient d'un poste saturé, pas du code (L-070).
- Les agents ne peuvent pas réécrire l'historique git : si c'est nécessaire, donner la commande au porteur.
- Tout asset tiers est déclaré dans `static/ATTRIBUTIONS.md` (source, auteur, licence) **dans le même commit**.

## 11. Orchestration multi-agents

La session principale est **chef d'orchestre** : elle découpe, délègue, vérifie, fusionne et tient `docs/SUIVI.md`. Elle ne délègue pas ce qui tient en quelques appels d'outils.

- Un lot parallèle = un worktree = une branche. Deux agents ne modifient jamais les mêmes fichiers ; les contrats partagés (types d'`engine/`, schémas JSON) sont figés **avant** de paralléliser.
- Chaque ordre de mission contient : objectif, fichiers autorisés, contrat d'interface, tests attendus, ce qui est déjà décidé, format de retour (≤ 15 lignes : fait / non fait / résultat de `verify` / leçons).
- Le résultat d'un agent est vérifié (diff + `verify`) avant fusion ; son compte rendu n'est pas une preuve.
- Un champ obligatoire ajouté à un type partagé casse les autres lots en cours : après chaque fusion, fusionner `main` dans les branches encore ouvertes et relancer `npm run check` avant de les fusionner (L-035, L-042).
- Seul le chef d'orchestre modifie `CLAUDE.md`, `.claude/` et `docs/DECISIONS.md`.
- Plusieurs sessions écrivent des ADR en parallèle : le numéro se vérifie dans `origin/main` **juste avant d'ouvrir la PR** (et après chaque fusion de `main`), et se renumérote en cas de collision (L-054).
- **Avant chaque jalon ou lot**, annoncer au porteur du projet le modèle et l'effort recommandés pour la session, et attendre qu'il ait pu en changer.
- Le porteur valide les **résultats**, pas le code : comptes rendus en termes de comportement observable et de ce qu'il peut essayer lui-même.
- **Reprise dans une nouvelle session** : lire `docs/SUIVI.md` (état, prochaines actions, attentes côté porteur), puis les règles de `.claude/rules/` du domaine touché. Rien d'utile ne doit rester seulement dans une conversation : toute décision va dans `docs/DECISIONS.md`, toute erreur dans `docs/LECONS.md`.

## 12. Économie de tokens

- Une session = un lot ; repartir d'un contexte propre entre deux lots. L'état durable est dans `docs/SUIVI.md`, pas dans la conversation.
- Lire ciblé : rechercher avant de lire, lire des plages de lignes, ne jamais relire un fichier qu'on vient de modifier.
- Déléguer l'exploration large à un sous-agent pour ne garder que la conclusion.
- Modèle selon la tâche : le plus capable pour l'architecture et les revues, un modèle rapide pour l'exécution mécanique.
- Sorties d'outils courtes : rapporteurs silencieux, pas de journaux complets dans la conversation.
- Les garde-fous répétitifs (format, lint, tokens) sont des scripts et des hooks, pas des vérifications faites par le modèle.
- Pas de document intermédiaire non demandé ; pas de récapitulatif de ce qui est déjà dans le diff.

## 13. Fichiers de suivi

| Fichier | Contenu | Mise à jour |
|---|---|---|
| `docs/SUIVI.md` | Jalon en cours, lots, prochaines actions, questions ouvertes | Fin de chaque lot |
| `docs/LECONS.md` | Erreurs rencontrées → règle pour ne pas les refaire | Dès qu'une erreur évitable est trouvée |
| `docs/DECISIONS.md` | Décisions structurantes (ADR courts) | À chaque choix technique ou produit |
| `docs/FEUILLE_DE_ROUTE.md` | Vision, problématiques, jalons | Quand un jalon change |

Une leçon qui revient deux fois est promue en règle dans `.claude/rules/` ou en contrôle automatique (lint, test, hook).

## 14. Règles détaillées (chargées selon les fichiers touchés)

| Fichier | Portée |
|---|---|
| `.claude/rules/clavier.md` | `engine/`, `keyboard/`, `layouts/` |
| `.claude/rules/ui-tokens.md` | composants, styles, `tokens/` |
| `.claude/rules/contenu-i18n.md` | `content/`, `messages/` |
| `.claude/rules/jeux-pedagogie.md` | `games/`, progression |
| `.claude/rules/tests.md` | tests unitaires et e2e |
