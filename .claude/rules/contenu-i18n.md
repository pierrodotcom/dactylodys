---
paths:
  - "content/**"
  - "messages/**"
  - "src/lib/**/i18n/**"
---

# Contenus pédagogiques et internationalisation

## Séparation

- `messages/` : chaînes d'**interface** (boutons, consignes, réglages). Traduites.
- `content/<langue>/` : **matière à taper** (leçons, mots, phrases, récits, blagues). Elle n'est pas traduite mais **écrite pour chaque langue** : fréquences des lettres, accents et humour diffèrent.
- La progression (ordre des touches) dépend du couple **langue × disposition** et vit dans les données.

## Règles de contenu

1. Chaque fichier de contenu respecte un schéma validé en test (identifiants uniques, caractères tous disponibles dans la disposition visée, touches déjà introduites à ce stade de la progression).
2. Un exercice n'utilise que des touches déjà apprises, plus la ou les touches nouvelles de la leçon.
3. Vocabulaire adapté aux 8-12 ans, issu de sources libres : **Lexique 3.83 (CC BY-SA 4.0)**. **Interdit sans autorisation écrite** : Manulex (clause non commerciale), listes Dubois-Buyse et ÉOLE (éditeurs).
4. En français, les accents fréquents (`é`, `è`, `à`) arrivent **tôt** dans la progression, pas après toutes les lettres.
5. L'humour est **dans le texte à taper** ou entre deux exercices, jamais en distraction pendant la frappe. Ressorts adaptés : incongruité, absurde, devinettes, jeux de mots.
8. **Toute phrase à taper a un sens** (ADR-026) : en la lisant, on peut dessiner la scène, même absurde (« le chat range ses chaussettes dans le four »). Jamais une suite de mots forcée par les lettres disponibles (« le sel se dresse sur le fil ») : l'enfant cherche à comprendre et décroche. Quand les lettres apprises ne permettent pas une vraie phrase, on en écrit moins, ou de plus courtes.
6. Contenu non genré, sans stéréotype, sans marque, sans référence datée. Aucun prénom réel d'enfant stocké ailleurs que dans le profil local.
7. Pour la dyslexie associée : mots réguliers et fréquents d'abord, syllabes avant mots, graphèmes complexes introduits explicitement.

9. **Pas de mots de tout-petit pour les 10-12 ans** (audit C-16, ADR-094) : une bulle de jeu qui dit « coucou », « piou », « youpi », « tchou-tchou », « tut tut » ou « miam » a une variante `_older` (`withOlderVariant`, `games/shared/age-text.ts`), dite aux 10-12 ans ; un test le vérifie (`src/lib/games/texts.test.ts`). Le récit et les consignes, dits par une seule voix, n'en contiennent pas. Un texte à taper peut dire « Coucou » dans un message entre amis : c'est l'usage à tout âge.

## Règles i18n

- Aucune chaîne visible dans le code. Pas de concaténation de fragments : une phrase = une clé, avec paramètres.
- Clés en snake_case préfixées par domaine (`settings_`, `game_<nom>_`, `adult_`).
- Toute clé ajoutée l'est dans **toutes les langues actives** dans le même commit ; un test échoue sinon.
- Nombres, durées et pluriels passent par les API `Intl`.
- Le français est la langue source.
- **Caractères invisibles** (L-156, L-186, L-191, L-197) : une espace insécable (` `, ` `) ou une apostrophe courbe (`’`) ne s'écrit jamais par les outils Write ou Edit, qui décodent l'échappement en vrai caractère, dans le JSON comme dans le `.ts` et le `.js` ; passer par un script (Python ou Node) qui écrit l'échappement. Les textes que l'enfant tape n'en contiennent jamais.

## Pages imprimables (L-160, L-178)

Un texte de la fiche des professionnels (`pro_*`), des guides pour les adultes (`guide_*`), de la fiche de séance (`adult_sheet_*`) ou du bilan imprimé change : `npm run build:e2e` puis `npx playwright test e2e/info-pages.spec.ts e2e/adult.spec.ts --project=chromium -g print` avant de commiter. La fiche des professionnels tient sur deux pages et reste identique à `docs/fiche-professionnels.md` ; la fiche de séance tient sur une page. Si la place manque, resserrer plutôt qu'ajouter.
