# Suivi de projet

Mis à jour à la fin de chaque lot. Garder court : ce qui est terminé depuis plus d'un jalon part dans l'historique git.

## État

| Jalon | État | Note |
|---|---|---|
| Cadrage et recherche | Terminé (2026-10-11) | Rapport dans `reports/` |
| J0 Fondations | Terminé (2026-10-11) | En ligne : https://pierrodotcom.github.io/dactylodys/ |
| J1 Moteur de frappe | Validé sur Windows (Chrome, Firefox) | Reste : Mac/Safari, Linux, Chromebook (Q7) ; rangée de chiffres avec Maj et tilde/accent grave à réenregistrer |
| J2 Tranche jouable | — | |
| J3 Pédagogie complète | — | |
| J4 Aventure | — | |
| J5 Version 1.0 | — | |

## Prochaines actions

1. **J2 Tranche jouable** (modèle : Opus pour le cadrage du mini-jeu et de l'étalonnage, Sonnet pour l'exécution).
2. À prévoir dans J2, d'après les traces réelles : reconnaître le pavé numérique et Verr. Maj (le caractère est juste mais pas la touche attendue) et guider l'enfant sans le pénaliser.
3. Le porteur réenregistre deux consignes après mise en ligne (chiffres de la rangée du haut ; tilde et accent grave) : fichiers à déposer dans `tests/traces/fr-fr-azerty-pc/`.
4. Trouver des testeurs Mac/Safari, Linux, Chromebook (Q7) : envoyer le lien de la page `/dev/traces`.
5. Diagnostiquer L-021 (premier chargement e2e parfois > 60 s en local).

## Livré au jalon J1 (code)

- Dispositions `fr-fr-azerty-pc` et `fr-fr-azerty-mac` (CLDR 43), doigté dix doigts, index caractère → touches, détection des caractères non productibles.
- Normaliseur d'entrée pur + adaptateur DOM mince ; format de trace, rejeu, 11 traces synthétiques.
- Page d'enregistrement `/dev/traces` (13 consignes, téléchargement JSON, rien n'est envoyé).
- Moteur de session (politiques `retry` et `backspace`) et mesures (précision, vitesse, statistiques par caractère).
- 403 tests unitaires et de propriétés ; 44 tests de bout en bout (Chromium + WebKit en local).

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
| Q6 | Nom définitif et ton du jeu (nom du compagnon, humour) ? | J2 |
| Q7 | Trouver des testeurs sur Mac/Safari, Firefox Linux, Chromebook : le porteur n'a que Windows | J1 |

## Réponses acquises

- Testeurs enfants disponibles ; matériel du porteur : Windows avec clavier physique uniquement.
- Pas d'ergothérapeute pour l'instant : à chercher quand une version présentable existe (après J2-J3).
- Le porteur développe un peu mais délègue le code : il valide les **résultats**. Comptes rendus orientés comportement observable, pas implémentation.
- Voix : synthèse pré-générée (ADR-011). Doigté : 10 doigts + mode adapté (ADR-012).
- Dépôt public, GitHub Pages (Q1). Adresse anonyme GitHub pour tous les commits ; le porteur a activé le blocage des pushs exposant son adresse.
- Ports locaux dédiés : 5273 (dev) et 4273 (aperçu, tests) ; 5173 appartient à un autre projet du porteur.

## Journal

- **2026-10-11** — Cadrage : recherche en 6 axes, décisions ADR-001 à ADR-011, CLAUDE.md, règles `.claude/rules/`, feuille de route. Dépôt initialisé.
- **2026-10-11** — J0 réalisé en 3 lots délégués (scaffold, tokens + i18n, tests + CI). Leçons L-011 à L-017, ADR-012 à 014.
- **2026-10-11** — Dépôt recréé en public avec un historique sans adresse personnelle ; J0 fusionné et déployé.
- **2026-10-11** — J1 : contrats figés (PR 2), puis 3 lots parallèles en worktrees (dispositions, capture, session) assemblés sans conflit. Leçons L-022 à L-026, ADR-015 et 016.
- **2026-10-11** — Traces réelles Windows (Chrome 155, Firefox 157, clavier NuPhy Node 100) : 26 consignes rejouées, un défaut du normaliseur corrigé (L-027), disposition PC conforme sur toutes les touches frappées.
