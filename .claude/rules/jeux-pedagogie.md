---
paths:
  - "src/lib/games/**"
  - "src/lib/engine/progression/**"
  - "src/lib/engine/rewards/**"
---

# Mini-jeux, progression et récompenses

## Contrat d'un mini-jeu

- Un mini-jeu implémente `GameModule` : il reçoit une séquence à taper et des réglages, émet des événements (`keystroke`, `completed`, `paused`). Il ne décide ni du contenu, ni du score, ni des récompenses.
- Durée cible 2-4 minutes, pause possible à tout instant, reprise sans perte.
- Entièrement jouable au clavier ; fonctionne en mode calme et avec animations réduites.
- Jamais de « vies » qui mettent fin à la partie, jamais d'échec définitif : on ralentit, on aide, on propose un autre jeu.
- Le temps peut **rythmer** (une créature avance) mais jamais **menacer** (pas de compte à rebours rouge, pas de défaite au chrono).

## Progression

1. Critère de passage = **précision et régularité** sur les touches visées, jamais un seuil de vitesse.
2. Difficulté adaptative visant environ 85-95 % de réussite (heuristique à valider en test utilisateur) ; en cas de doute, **plus facile** : les enfants jouent plus longtemps quand ils réussissent.
3. Pratique **distribuée** : révision espacée des touches fragiles, mélangée aux nouvelles.
4. Retour immédiat et fréquent, visuel et sonore, sur chaque frappe ; l'erreur est signalée sans dramatisation et doit pouvoir être corrigée.
5. Montrer le doigt attendu et la touche ; retirer progressivement l'aide visuelle du clavier pour libérer le regard.
6. Attribuer la réussite à l'effort et à la stratégie (« tu as gardé tes doigts en place »), pas au talent.

## Récompenses

- Déclenchées par la **maîtrise** (touche acquise, précision tenue), pas par le nombre de jours ni le temps de jeu.
- **Prévisibles** : l'enfant sait ce qu'il débloque. Aucun tirage aléatoire.
- Le récit, le choix (quel monde, quel jeu, quelle apparence) et la collection priment sur les points.
- Comparaison uniquement avec **soi-même** (son record, sa progression). Aucun classement entre enfants. Les « tournois » sont des défis contre son propre fantôme ou coopératifs.
- Après une absence : accueil chaleureux, rien de perdu, aucun reproche.
- Le jeu propose de s'arrêter à la fin d'une séance ; la fin de séance est un moment gratifiant, pas une frustration.
- Renouveler la nouveauté régulièrement (nouveau monde, nouveau jeu) : l'effet de nouveauté s'épuise en quelques semaines.

## Interdits

Séries punitives · classements · loot boxes · monnaie achetable · notifications · lecture automatique enchaînée · publicité · fausse urgence · culpabilisation.

## Contrats figés (J2) — ne pas modifier sans passer par le chef d'orchestre

Types : `src/lib/engine/progression/types.ts`, `src/lib/state/types.ts`, `src/lib/games/types.ts`, géométrie dans `src/lib/keyboard/types.ts`.

| Fonction | Module | Rôle |
|---|---|---|
| `parseProgression(data: unknown): ProgressionDefinition` | `engine/progression/definition` | Valide une progression |
| `findLesson(progression, lessonId)` / `lessonIds(progression): string[]` | idem | Accès aux leçons, dans l'ordre |
| `learnedChars(progression, lessonId): string[]` | idem | Caractères connus jusqu'à cette leçon incluse |
| `generateExercise(progression, lessonId, rng): Exercise` | `engine/progression/exercise` | Groupes à taper, reproductibles |
| `evaluateLesson(rules, metrics): LessonEvaluation` | `engine/progression/progress` | Étoiles et déblocage, sur la précision seule |
| `applyLessonResult(progress, result, rules): ProgressState` | idem | Met à jour la progression, sans mutation ; ne garde par caractère que les parties récentes (`rules.recentCharWindow`) |
| `isLessonUnlocked(progression, progress, lessonId): boolean` | idem | La première leçon est toujours ouverte |
| `emptyProgress(): ProgressState` | idem | État initial |
| `combineMetrics(list: readonly SessionMetrics[]): SessionMetrics` | `engine/metrics` | Agrège les groupes d'un exercice |
| `createProfile(input): Profile` / `defaultSettings(platform)` | `state/profile` | Identifiant, date et réglages injectés |
| `createMemoryProfileStore()` / `createIndexedDbProfileStore()` | `state/stores` | Deux implémentations de `ProfileStore` |
| `parseGeometry(data: unknown)` / `loadGeometry(id)` | `keyboard/geometry`, `keyboard/registry` | Forme physique du clavier |
| `geometryIdFor(layout: LayoutDefinition): GeometryId` | `keyboard/registry` | Géométrie à dessiner pour une disposition ; la route ne choisit jamais |
| `GameProps.sounds: SoundPlayer` | `games/types` | Lecteur de sons **unique**, créé par la route `/jouer` et lié au réglage du profil ; un jeu n'en crée pas |

Données : `content/<langue>/progression/<slug>.json`, `layouts/geometry/<id>.json`.

Un jeu lit l'état de Verr. Maj dans les `RawInputEvent` (`capsLock`) fournis par `keyboard-capture`, pas dans un écouteur `window` à lui.

Un exercice est une suite de **groupes** courts ; le jeu ouvre une session par groupe et agrège les mesures. L'espace est une touche comme une autre, introduite par sa propre leçon.

## Contrats figés (J3)

Ajouts dans `engine/progression/types.ts` : `ExerciseMix`, `LessonUnlock`, `WordBank`, `PhraseBank`, `ExerciseContext`, règles `weakCharBoost` et `themeBoost`, champs de leçon `mix`, `unlocks`, `targetLength`, champ de monde `gameIds`. Dans `games/types.ts` : `GameDefinition`.

| Fonction | Module | Rôle |
|---|---|---|
| `generateExercise(progression, lessonId, rng, context?)` | `engine/progression/exercise` | Mélange suites, mots et phrases selon `mix` ; s'arrête à `targetLength` ou `groupCount` ; garantit le minimum de frappes par caractère nouveau et au moins un mot quand `mix.words > 0` |
| `parseWordBank(data)` / `parsePhraseBank(data)` | `engine/progression/banks` | Valident les banques |
| `usableWords(bank, learned, options?)` / `usablePhrases(bank, learned, options?)` | idem | Entrées écrites uniquement avec les caractères connus, filtrées par niveau |
| `learnedChars(progression, lessonId)` | `engine/progression/definition` | Inclut les capitales des lettres non accentuées dès qu'une leçon porte `unlocks: ["uppercase"]` |
| `GAMES` / `findGame(id)` | `games/registry` | Liste des mini-jeux |

Données : `content/<langue>/words/<slug>.json`, `content/<langue>/phrases/<slug>.json`. Un mot ou une phrase `review: "agent"` est jouable pendant le développement ; seuls les `"human"` le seront à partir de la version 1.0.

## Contrats figés (J4, lot 0)

Le contrat réel d'un mini-jeu est un composant Svelte `Component<GameProps>` (il n'existe pas de type `GameModule`).

Règle de progression `newCharMinCount` (`engine/progression/types.ts`, ADR-024) : chaque caractère nouveau d'une leçon est demandé au moins ce nombre de fois, par des suites d'échauffement en tête d'exercice ; 0 désactive. Le parseur refuse une progression où ce minimum dépasse `groupCount`.

Profil version 3 (`state/types.ts`) : `companion` (choix de l'enfant : nom, couleur, objets portés), `lastGameByWorld`, `ghosts` (allure de la dernière partie réussie, par leçon), réglage `voiceEnabled`. **Une récompense n'est jamais stockée** : elle se calcule à partir de la progression et du catalogue.

| Fonction | Module | Rôle |
|---|---|---|
| `migrateProfile(data)` / `readProfile(data)` | `state/migrations` | Chaîne de migrations par version ; tout nouveau champ de profil = une étape de plus, avec ses valeurs par défaut écrites en dur dans l'étape |
| `ProfileStore.listUnreadable()` | `state/stores` | Enregistrements ni migrables ni lisibles : jamais supprimés, jamais écrasés (`save` et `remove` les refusent) |
| `withCompanion` / `withLastGame` / `withGhost` | `state/profile` | Mises à jour sans mutation |
| `toGhostRun(points, recordedAt)` / `ghostProgress(run, elapsedMs, paceFactor)` / `parseGhostRun(data)` | `engine/ghost/ghost` | Allure d'une partie ; part de l'exercice accomplie par le fantôme, dans [0, 1] |
| `GameOutcome.pace` / `GameProps.ghost?` | `games/types` | Allure rendue par tout jeu (un point par groupe) ; fantôme facultatif reçu par un jeu |
| `isLessonPassed(rules, progress, lessonId)` | `engine/progression/progress` | Seule définition de « leçon réussie » ; ne pas la recopier |
| `recentCharStats(progress, char)` / `recentErrorRate(progress, char)` | `engine/progression/progress` | Résultats d'une touche sur ses parties récentes seulement (ADR-025) : c'est ce que lisent la révision des touches fragiles et les récompenses de maîtrise, jamais le cumul à vie |

Types seuls, à implémenter par les lots suivants sans les modifier : `engine/rewards/types.ts` (`RewardCondition`, `RewardDefinition`, `RewardCatalogue`, `CompanionChoice`, `CompanionLook`), `engine/story/types.ts` (`StoryDefinition`), `audio/voice-types.ts` (`VoiceManifest`, `VoicePlayer`). Les signatures attendues sont en tête de chaque fichier. Aucune condition de récompense ne porte sur le temps, les jours, le nombre de parties ou la vitesse.

À savoir : le temps « actif » d'une partie est la somme des durées de groupes, de la première à la dernière frappe de chaque groupe (le fantôme avance sur cette horloge) ; `ProgressState.chars[c]` porte le cumul à vie (`attempts`, `errors`) et les parties récentes (`recent`) ; `voiceKey` doit être synchrone. Une version de profil déjà fusionnée dans `main` est en ligne : on ne modifie plus son étape de migration, on en ajoute une.
