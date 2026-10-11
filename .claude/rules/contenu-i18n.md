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
6. Contenu non genré, sans stéréotype, sans marque, sans référence datée. Aucun prénom réel d'enfant stocké ailleurs que dans le profil local.
7. Pour la dyslexie associée : mots réguliers et fréquents d'abord, syllabes avant mots, graphèmes complexes introduits explicitement.

## Règles i18n

- Aucune chaîne visible dans le code. Pas de concaténation de fragments : une phrase = une clé, avec paramètres.
- Clés en snake_case préfixées par domaine (`settings_`, `game_<nom>_`, `adult_`).
- Toute clé ajoutée l'est dans **toutes les langues actives** dans le même commit ; un test échoue sinon.
- Nombres, durées et pluriels passent par les API `Intl`.
- Le français est la langue source.
