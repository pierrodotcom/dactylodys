# Suivi de projet

Mis à jour à la fin de chaque lot. Garder court : ce qui est terminé depuis plus d'un jalon part dans l'historique git.

## État

| Jalon | État | Note |
|---|---|---|
| Cadrage et recherche | Terminé (2026-10-11) | Rapport dans `reports/` |
| J0 Fondations | À lancer | En attente de validation de la feuille de route |
| J1 Moteur de frappe | — | |
| J2 Tranche jouable | — | |
| J3 Pédagogie complète | — | |
| J4 Aventure | — | |
| J5 Version 1.0 | — | |

## Prochaines actions (J0)

1. Valider la feuille de route et répondre aux questions ouvertes ci-dessous.
2. Initialiser le projet (SvelteKit statique, TypeScript strict, npm) et confirmer les versions réellement installées.
3. Chaîne de tokens (`tokens/` → variables CSS + module TS) et lint bloquant les valeurs en dur.
4. i18n d'interface (français) et test de complétude des clés.
5. Tests : Vitest, fast-check, Playwright 3 moteurs, axe ; script `npm run verify`.
6. Hooks git (lefthook, commitlint) et CI GitHub Actions.
7. Déploiement automatique + prévisualisation par PR.

## Questions ouvertes

| # | Question | Bloque |
|---|---|---|
| Q1 | Rendre le dépôt public ? (GitHub Pages n'est gratuit que pour un dépôt public ; sinon Cloudflare Pages) | Déploiement J0 |
| Q2 | Enfants testeurs disponibles (âge, profil) et matériel réel accessible (Windows, Mac, Chromebook, tablette + clavier) ? | J1, J2 |
| Q3 | Un ou une ergothérapeute peut-il relire la méthode ? | J3 |
| Q4 | Niveau technique du porteur de projet et degré de relecture souhaité (code, ou résultats seulement) ? | Organisation |
| Q5 | Voix des consignes : synthèse pré-générée, ou voix humaine enregistrée ? | J4 |
| Q6 | Nom définitif et ton du jeu (nom du compagnon, humour) ? | J2 |

## Journal

- **2026-10-11** — Cadrage : recherche en 6 axes, décisions ADR-001 à ADR-011, CLAUDE.md, règles `.claude/rules/`, feuille de route. Dépôt initialisé.
