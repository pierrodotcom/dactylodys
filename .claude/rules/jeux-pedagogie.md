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
| `applyLessonResult(progress, result): ProgressState` | idem | Met à jour la progression, sans mutation |
| `isLessonUnlocked(progression, progress, lessonId): boolean` | idem | La première leçon est toujours ouverte |
| `emptyProgress(): ProgressState` | idem | État initial |
| `combineMetrics(list: readonly SessionMetrics[]): SessionMetrics` | `engine/metrics` | Agrège les groupes d'un exercice |
| `createProfile(input): Profile` / `defaultSettings(platform)` | `state/profile` | Identifiant, date et réglages injectés |
| `createMemoryProfileStore()` / `createIndexedDbProfileStore()` | `state/stores` | Deux implémentations de `ProfileStore` |
| `parseGeometry(data: unknown)` / `loadGeometry(id)` | `keyboard/geometry`, `keyboard/registry` | Forme physique du clavier |

Données : `content/<langue>/progression/<slug>.json`, `layouts/geometry/<id>.json`.

Un exercice est une suite de **groupes** courts ; le jeu ouvre une session par groupe et agrège les mesures. L'espace est une touche comme une autre, introduite par sa propre leçon.
