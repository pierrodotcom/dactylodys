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
| Accessibilité | axe via Playwright, **Chromium seul** | Chaque écran, en clair puis en sombre dans le même parcours (`expectNoAxeViolation` de `e2e/support.ts`) ; le titre du test contient « axe » |

## Règles

1. Correction de bogue : écrire **d'abord** le test qui échoue.
2. Jamais de `.skip`, `.only`, `expect` commenté ou délai arbitraire (`waitForTimeout`) dans un commit. Un test réservé à Chromium porte l'étiquette `CHROMIUM_ONLY` (`e2e/engines.ts`), jamais un `test.skip` selon le moteur.
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
9. Playwright sert un site **construit**, pas les sources : celui de `npm run build:e2e` (toutes les pages `/dev`, ADR-078), servi par `tools/e2e-server.js` comme GitHub Pages le sert (fichiers seuls, sans compression) ; `e2e/published.spec.ts` regarde le site publié de `npm run build`. Après tout changement de `src/`, reconstruire avant de lancer une spec (L-141). Chaque copie de travail a son port (dérivé de son chemin) et son site porte une marque que Playwright attend avant le premier test (L-149) ; `E2E_PORT` impose un port, `E2E_WORKERS` un nombre de workers. Le site est servi sur `::1` et `127.0.0.1` et ouvert en `http://localhost:<port>` : les trois moteurs passent par IPv6 (Firefox par `network.dns.preferIPv6`), la boucle locale IPv4 du poste retenant des connexions 8 à 30 s sous charge (L-169).
10. `vitest` ne contrôle pas les types : `npm run check` avant tout commit de `src/` ou de `tools/` (L-147, L-166).
11. Moteurs (Q-13, ADR-087) : un test qui ne dépend pas du moteur porte `CHROMIUM_ONLY` (`test('…', CHROMIUM_ONLY, …)` ou sur le `describe`) : pages `/dev`, mise en page mesurée, textes, logique d'écran déjà couverte en unitaire, API propre à Chromium (PDF, enregistrement de la voix). Restent sur les trois moteurs : saisie et jugement de la frappe (Maj, AltGr, Retour arrière, Entrée, touches mortes, Verr. Maj), focus et parcours au clavier, historique, son et voix, hors-ligne et service worker, impression, stockage (IndexedDB, sauvegarde, import, deux onglets) et une partie entière de chaque jeu (`games.spec.ts`).
12. Récompenses (Q-06, ADR-087) : une spec qui joue fixe `setRewards(page, 'instant')` (parcours : aucune touche après un groupe, aucune attente de récompense) ou `setRewards(page, 'hold')` pour regarder un groupe fini, sa bulle, sa note ou sa scène, puis `passReward(page)` pour continuer. Jamais d'assertion sur « Tout est tapé » en `instant`, jamais d'Entrée nue pour passer une récompense ; un test qui compte les cases faites d'un groupe qu'il peut finir garde la récompense (`hold`, L-168).

## Avant de rendre un lot

Exécuter `npm run verify` et rapporter le résultat réel (nombre de tests, échecs éventuels avec leur sortie). Tests manuels sur matériel réel exigés pour tout changement de `keyboard/input-adapter` : consigner navigateur, OS et clavier dans la PR.
