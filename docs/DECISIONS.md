# Journal des décisions (ADR)

Une décision = un paragraphe : contexte, choix, conséquence. Une décision remplacée n'est pas effacée : elle est marquée « Remplacée par ADR-xxx ».

| # | Date | Décision | État |
|---|---|---|---|
| 001 | 2026-10-11 | Données locales d'abord, synchro facultative plus tard | Acceptée |
| 002 | 2026-10-11 | Première version : français + AZERTY France (PC et Mac) | Acceptée |
| 003 | 2026-10-11 | Graphisme vectoriel plat + assets CC0, illustrations sur mesure ensuite | Acceptée |
| 004 | 2026-10-11 | Code AGPL-3.0-or-later, contenus CC BY-SA 4.0, dispositions CC0 | Acceptée |
| 005 | 2026-10-11 | Svelte 5 + SvelteKit 2.x statique, TypeScript 6, npm | Proposée |
| 006 | 2026-10-11 | Rendu DOM/SVG/CSS + canvas natif, pas de moteur de jeu | Proposée |
| 007 | 2026-10-11 | Frappe jugée sur le caractère produit ; disposition choisie et étalonnée | Proposée |
| 008 | 2026-10-11 | Design tokens DTCG comme unique source visuelle | Proposée |
| 009 | 2026-10-11 | Un jeu-cadre + mini-jeux courts sur un moteur unique | Proposée |
| 010 | 2026-10-11 | Aucun classement, série, tirage aléatoire, notification, publicité ni traceur | Proposée |
| 011 | 2026-10-11 | Voix pré-générées plutôt que synthèse du navigateur | Proposée |

## 001 — Données locales d'abord
Enfants mineurs, budget nul. Progression dans IndexedDB, profils multiples sur l'appareil, export/import par fichier. La couche de persistance est une interface (`ProfileStore`) pour pouvoir brancher une synchro facultative sans réécrire le jeu. Conséquence : aucune obligation de consentement parental tant que rien ne quitte l'appareil.

## 002 — Français + AZERTY France en premier
Cible principale. L'architecture reste pilotée par les données dès J0 ; l'anglais et les autres dispositions arrivent en J6 et servent de preuve que rien n'est codé en dur.

## 003 — Direction artistique
Vectoriel plat, formes simples, banques CC0 (Kenney en priorité). Net à toute taille, léger, entièrement pilotable par tokens. Les illustrations générées par IA viendront ensuite si leur cohérence et leur statut de licence sont satisfaisants ; elles remplaceront des fichiers, pas du code.

## 004 — Licences
AGPL-3.0-or-later : toute version modifiée, même seulement hébergée, doit rester libre. Contenus et visuels originaux en CC BY-SA 4.0. Données de dispositions en CC0 pour être réutilisables partout. Compatible avec la réutilisation de données de Monkeytype (GPL-3.0) et de Lexique (CC BY-SA 4.0). **Réversibilité** : tant que le porteur du projet est seul titulaire des droits, il peut changer de licence pour les versions futures ; dès la première contribution externe, il faut l'accord de chaque contributeur (ou un accord de contribution prévu à l'avance). Les versions déjà publiées restent sous leur licence.

## 005 — Stack applicative
Svelte 5 : peu de code, bon typage, sortie légère. SvelteKit 2.x avec `adapter-static` plutôt que la version 3 sortie le 2026-10-01 (écosystème pas encore aligné, mal connue des modèles). TypeScript 6.0.x car la version 7 est exclue par l'outillage. npm car déjà installé et projet mono-paquet. À confirmer au scaffold.

## 006 — Rendu
Les jeux sont centrés sur du texte : le DOM donne netteté, accessibilité et i18n gratuitement. Canvas 2D natif pour les effets. Un moteur (PixiJS ≈ 232 kB, Phaser ≈ 346 kB compressés) ne sera ajouté que si un mini-jeu le justifie.

## 007 — Gestion du clavier
La détection automatique n'est fiable sur aucun navigateur ; les touches mortes diffèrent entre Windows et macOS. Le moteur juge le caractère produit, la position physique sert à l'aide visuelle. Tests par rejeu de traces réelles.

## 008 — Design tokens
Format DTCG, transformés en variables CSS et module TS. Thèmes par jeux de valeurs. Lint bloquant.

## 009 — Format de jeu
La recherche montre que le récit et la variété soutiennent mieux la motivation que points et badges, et que la nouveauté s'épuise en quelques semaines : un cadre narratif durable + des mini-jeux peu coûteux à ajouter.

## 010 — Éthique de conception
Conforme aux référentiels pour mineurs (ICO, UNICEF RITEC, CNIL, lignes directrices DSA de juillet 2025). Détail dans `.claude/rules/jeux-pedagogie.md`.

## 011 — Voix
La synthèse vocale des navigateurs est trop inégale (voix absentes ou en ligne selon les plateformes). Consignes pré-générées en fichiers audio, ou voix humaine enregistrée (question Q5).
