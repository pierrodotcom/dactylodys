---
paths:
  - "**/*.test.ts"
  - "e2e/**"
  - "tests/**"
  - "vitest.config.*"
  - "playwright.config.*"
---

# Tests

## Pyramide

| Niveau | Outil | Cible |
|---|---|---|
| Unitaires | Vitest | `engine/`, `keyboard/`, `state/` : toute fonction publique |
| Propriétés | fast-check | Moteur de frappe et progression (invariants) |
| Rejeu de traces | Vitest | Chaque disposition × navigateur × OS enregistré dans `tests/traces/` |
| Schémas | Vitest | Tous les fichiers de `content/`, `layouts/`, `messages/`, `tokens/` |
| Composants | Vitest (navigateur) + Testing Library | Composants de `ui/` et mini-jeux |
| Bout en bout | Playwright (Chromium, Firefox, WebKit) | Parcours : premier lancement, une leçon, reprise, réglages, export/import |
| Accessibilité | axe via Playwright | Chaque écran, dans chaque thème |

## Règles

1. Correction de bogue : écrire **d'abord** le test qui échoue.
2. Jamais de `.skip`, `.only`, `expect` commenté ou délai arbitraire (`waitForTimeout`) dans un commit.
3. Tests déterministes : horloge et aléa injectés, aucune dépendance réseau.
4. Invariants minimaux du moteur (propriétés) :
   - une séquence tapée sans faute donne 100 % de précision ;
   - la précision est toujours comprise entre 0 et 100 ;
   - rejouer les mêmes événements donne le même résultat ;
   - aucun exercice généré ne demande une touche non encore introduite ;
   - tout caractère demandé est productible dans la disposition active.
5. Playwright ne simule pas les dispositions non-US ni les touches mortes : la couverture clavier passe par le **rejeu de traces réelles**, pas par `page.keyboard`.
6. Chaque écran testé de bout en bout l'est aussi **au clavier seul** et avec animations réduites.
7. Un test qui échoue en CI n'est jamais relancé « pour voir » : on cherche la cause ; un test instable est un bogue.
8. Nommer un test par le comportement attendu, en anglais : `it('keeps accuracy at 100 when no error is made')`.

## Avant de rendre un lot

Exécuter `npm run verify` et rapporter le résultat réel (nombre de tests, échecs éventuels avec leur sortie). Tests manuels sur matériel réel exigés pour tout changement de `keyboard/input-adapter` : consigner navigateur, OS et clavier dans la PR.
