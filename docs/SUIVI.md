# Suivi de projet

Mis à jour à la fin de chaque lot. Garder court : ce qui est terminé depuis plus d'un jalon part dans l'historique git.

## État

| Jalon | État | Note |
|---|---|---|
| Cadrage et recherche | Terminé (2026-10-11) | Rapport dans `reports/` |
| J0 Fondations | En revue | PR `chore/j0-fondations` ; reste : CI verte, fusion, choix d'hébergement (Q1) |
| J1 Moteur de frappe | — | |
| J2 Tranche jouable | — | |
| J3 Pédagogie complète | — | |
| J4 Aventure | — | |
| J5 Version 1.0 | — | |

## Prochaines actions

1. Fusionner la PR du jalon J0 une fois la CI verte ; trancher Q1 pour activer la mise en ligne.
2. Le porteur confirme sur son poste : `npx playwright test --project=firefox` (Firefox n'a pu être lancé que hors bac à sable).
3. **J1 Moteur de frappe** (modèle recommandé : Opus pour figer les contrats, Sonnet pour l'exécution) :
   - contrat des types (`NormalizedKeystroke`, `LayoutDefinition`, `FingeringProfile`) et schéma JSON des dispositions ;
   - `fr-fr-azerty-pc` et `fr-fr-azerty-mac` depuis Kalamine/CLDR ;
   - `keyboard/input-adapter` + page d'enregistrement de traces ;
   - moteur de session (précision, vitesse, erreurs réparables) avec tests de propriétés ;
   - campagne de traces réelles (Q7).

## Livré au jalon J0

- Site statique SvelteKit, TypeScript strict, frontière `engine/`/`keyboard/` sans DOM (lint).
- Tokens DTCG → variables CSS + module TS, thèmes clair chaud et sombre, police auto-hébergée.
- Lint bloquant : valeurs visuelles en dur, styles en ligne, texte visible en dur.
- i18n d'interface (fr), test de complétude des clés.
- `npm run verify` : 68 tests unitaires et de schémas (dont contrastes WCAG), 30 tests de bout en bout sur 3 navigateurs avec axe.
- Hooks git (format, lint, message de commit), CI GitHub Actions, déploiement Pages prêt mais inactif tant que le dépôt est privé.

## Questions ouvertes

| # | Question | Bloque |
|---|---|---|
| Q1 | Rendre le dépôt public ? (GitHub Pages n'est gratuit que pour un dépôt public ; sinon Cloudflare Pages) — recommandation donnée, décision attendue | Mise en ligne J0 |
| Q6 | Nom définitif et ton du jeu (nom du compagnon, humour) ? | J2 |
| Q7 | Trouver des testeurs sur Mac/Safari, Firefox Linux, Chromebook : le porteur n'a que Windows | J1 |

## Réponses acquises

- Testeurs enfants disponibles ; matériel du porteur : Windows avec clavier physique uniquement.
- Pas d'ergothérapeute pour l'instant : à chercher quand une version présentable existe (après J2-J3).
- Le porteur développe un peu mais délègue le code : il valide les **résultats**. Comptes rendus orientés comportement observable, pas implémentation.
- Voix : synthèse pré-générée (ADR-011). Doigté : 10 doigts + mode adapté (ADR-012).

## Journal

- **2026-10-11** — Cadrage : recherche en 6 axes, décisions ADR-001 à ADR-011, CLAUDE.md, règles `.claude/rules/`, feuille de route. Dépôt initialisé.
- **2026-10-11** — J0 réalisé en 3 lots délégués (scaffold, tokens + i18n, tests + CI). Leçons L-011 à L-017, ADR-012 à 014.
