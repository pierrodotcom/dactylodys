# Suivi de projet

Mis à jour à la fin de chaque lot. Garder court : ce qui est terminé depuis plus d'un jalon part dans l'historique git.

## État

| Jalon | État | Note |
|---|---|---|
| Cadrage et recherche | Terminé (2026-10-11) | Rapport dans `reports/` |
| J0 Fondations | Terminé (2026-10-11) | En ligne : https://pierrodotcom.github.io/dactylodys/ |
| J1 Moteur de frappe | Validé sur Windows (Chrome, Firefox) | Reste : Mac/Safari, Linux, Chromebook (Q7) |
| J2 Tranche jouable | Code livré, test avec un enfant à faire | Critère de sortie : un enfant joue 10 minutes seul et veut recommencer |
| J3 Pédagogie complète | Mots relus ; phrases à relire ; test avec un enfant à faire | 5 mondes, 24 leçons, 926 mots relus par le porteur, 217 phrases relues par un agent seulement, 3 mini-jeux |
| J4 Aventure | En cours : lot 0 (socle) | Cadrage validé le 2026-10-13 (ADR-022) |
| J5 Version 1.0 | — | |

## Prochaines actions

1. **Test avec un enfant** par le porteur (grille d'observation ci-dessous), puis ajustements.
2. **Relecture humaine des phrases** (217 ; le 2026-10-13 : 66 ajoutées pour la ponctuation, « où », les circonflexes et les trémas, et les 32 des deux premiers paliers réécrites pour avoir un sens, ADR-026 ; une espace précède désormais « ? », « ! » et « : »), pas encore faite : ouvrir `docs/relecture/relecture.html`, choisir « Afficher : les phrases », répondre, puis cliquer sur « Enregistrer mes réponses dans un fichier » et déposer ce fichier dans `docs/relecture/` (sans ce clic, les réponses restent dans le navigateur). Application : `node tools/content/apply-review.js phrases --no "<phrase refusée>"`.
3. Écrire aux auteurs de Lexique pour confirmer la licence (Q9).
4. Dette de J3, par ordre de gêne pour l'enfant :
   - la scène de « Décollage » est petite ; un profil d'avant J3 voit sa leçon `q m` reverrouillée tant que les leçons insérées avant ne sont pas passées ; la ligature `œ` n'est enseignée nulle part ; le point-virgule et les guillemets ne sont dans aucune leçon.
5. Dette plus ancienne : `GameSettings.soundEnabled` inutilisé ; validation du pseudo en double. La langue ne dépend plus de `localStorage` (stratégie `baseLocale` seule) : il faudra réintroduire un choix de langue quand une deuxième langue arrivera (J6).
6. **J4 Aventure** (ADR-022, acceptée) :
   - **Lot 0, socle** : fait — minimum de 5 frappes par nouveau signe et retrait de « ü » (PR 16, ADR-024) ; profil version 2 avec migration, profils illisibles conservés et listés, jeu choisi retrouvé à la visite suivante, allure de chaque partie réussie enregistrée, types des récompenses, du récit et de la voix (PR 17). Contrats dans `.claude/rules/jeux-pedagogie.md`.
   - **Lot 0c** : fait (PR 19, ADR-025) — seules les parties récentes d'une touche comptent, jusqu'à 30 frappes ; profil version 3 ; leçon des circonflexes en deux (« ê â », puis « î ô û » : « Le casque du copilote ») ; `isLessonPassed` exporté. 21 phrases ajoutées pour les circonflexes et les trémas.
   - À faire au lot d'assemblage : afficher les profils illisibles et permettre de les supprimer explicitement (aujourd'hui le store refuse de les effacer).
   - **Puis quatre lots parallèles**, à lancer après le retour du test avec un enfant : R récompenses et compagnon · S récit · V voix (échantillons à faire écouter au porteur d'abord) · F fantôme (en dernier).
   - **Puis assemblage** dans le parcours `/jouer`.
4. Trouver des testeurs Mac/Safari, Linux, Chromebook (Q7) : envoyer le lien de la page `/dev/traces`.

## Grille d'observation pour le test J2

À observer sans aider, pendant 10 minutes : l'enfant comprend-il seul quoi faire à chaque écran ? regarde-t-il le clavier à l'écran ou ses mains ? que fait-il après une erreur (s'énerve, réessaie, ne remarque pas) ? le délai d'une seconde entre deux œufs lui paraît-il long ? rit-il ou sourit-il, et à quel moment ? à quel moment décroche-t-il ? veut-il rejouer ? Noter aussi tout mot incompris et toute touche Tab, Entrée ou Verr. Maj pressée par accident.

## Livré au jalon J3 (code)

- Progression complète en données, dans l'ordre de l'ADR-018 : 5 mondes (dinosaures, cuisine, animaux, espace, véhicules), 23 leçons, de `f j` aux trémas, majuscules et ponctuation comprises. Vrais mots dès la 5ᵉ leçon, phrases dès la 6ᵉ.
- Banque de 929 mots (11 thèmes, 3 niveaux) issue de Lexique et du Wiktionnaire par une chaîne reproductible (`tools/content/`), et 150 phrases originales ; tout est relu par un agent, rien encore par une personne.
- Exercices mêlant suites, mots et phrases, avec davantage de pratique sur les caractères que l'enfant rate et une préférence pour le thème du monde.
- Trois mini-jeux sur un socle commun (« L'éclosion », « Décollage », « La recette farfelue »), choix du jeu par l'enfant, carte de tous les mondes, page d'essai `/dev/jeux`.

## Livré au jalon J2 (code)

- Parcours `/jouer` : choix du joueur (pseudo, local), vérification du clavier, carte du monde des dinosaures (6 leçons), avant-leçon, mini-jeu « L'éclosion », bilan en étoiles sur la précision seule, pause proposée après 12 minutes de jeu, réglages (son, thème, animations, taille et espacement du texte, clavier visible, disposition).
- Progression et contenu en données ; profils dans IndexedDB ; sons synthétisés ; clavier visuel avec couleur par doigt ; compagnon original.
- 957 tests unitaires et de propriétés ; 134 tests de bout en bout (Chromium + WebKit en local).

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
| Q9 | Confirmer la licence de Lexique auprès de ses auteurs : le fichier dit CC BY-SA, la page d'accueil du site pointe vers une licence non commerciale | Publication des listes de mots |
| Q6 | Nom définitif et ton du jeu (nom du compagnon, humour) ? | J2 |
| Q7 | Trouver des testeurs sur Mac/Safari, Firefox Linux, Chromebook : le porteur n'a que Windows | J1 |

## Réponses acquises

- Matériel du porteur : Windows, clavier NuPhy Node 100 en AZERTY, navigateurs Chrome et Firefox (ni Edge, ni Mac). Il lance ses commandes depuis l'invite de commandes Windows.
- Branches locales de travail déjà fusionnées (`feat/j1-*`, `feat/j2-*`, `feat/j3-*`, `worktree-agent-*`) : supprimables.

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
- **2026-10-11** — Traces complémentaires (rangée de chiffres, tilde, accent grave) conformes. J2 : contrats (PR 5), 3 lots parallèles en worktrees puis un lot d'assemblage (jeu et écrans). Leçons L-031 à L-034.
- **2026-10-11** — Dette de contrats de J2 soldée (Verr. Maj dans les événements bruts, sons passés au jeu, limites du pseudo, géométrie), reprise directe du dernier joueur, « Jouer » en vrai lien, ouverture hydratée dans toutes les specs e2e.
- **2026-10-12** — Recherche complémentaire : ordre des touches et regroupement thématique des mots (notes dans `research_notes/Ordre des touches et mots thématiques/`). ADR-018 et 019 proposés ; jalon « J6 bis Adaptation à l'âge » ajouté à la feuille de route.
- **2026-10-12** — ADR-018 et 019 acceptés. J3 : contrats, 3 lots parallèles (moteur et progression, banques, mini-jeux) puis un lot de branchement. Audits axe limités à Chromium. Leçons L-035 à L-039, ADR-020.
- **2026-10-12** — J3 fusionné et en ligne (PR 9). Page de relecture Oui/Non générée par `tools/content/build-review-page.js`.
- **2026-10-13** — Langue sans `localStorage` (travail d'une session parallèle, reporté sur `main`). Page de relecture publiée en ligne pour le téléphone, réponses dans sa base.
- **2026-10-13** — Relecture humaine faite par le porteur : « toast », « lis » et « divan » retirés, tout le reste validé (`review: "human"`). L'enregistrement en ligne de la page de relecture n'a pas fonctionné sur son téléphone (cause inconnue) ; les refus ont été donnés dans la conversation.
- **2026-10-13** — Correction : seuls les mots avaient été relus. Les 150 phrases reviennent à `review: "agent"` ; `apply-review.js` ne valide plus qu'une banque à la fois.
- **2026-10-13** — Dette de J3 : les phrases favorisent les nouveaux caractères ; 45 phrases ajoutées (ponctuation, « où ») ; espace avant « ? », « ! » et « : », gardée sur la même ligne que le mot à l'écran ; noms exacts des doigts dans les textes d'introduction (ADR-021) ; test de cohérence « au moins six phrases pour un signe qu'aucun mot ne contient ». Leçons L-040 et L-041. Cadrage de J4 proposé (ADR-022).
- **2026-10-13** — PR 14 fusionnée. Cadrage de J4 validé par le porteur (ADR-022, ADR-024) ; lot 0 lancé. Test avec un enfant annoncé par le porteur pour le soir même.
- **2026-10-13** — J4, lot 0 : PR 16 (répétitions, « ü ») et PR 17 (profil version 2, contrats) fusionnées après relecture du diff et CI verte. Décisions du porteur : leçon des circonflexes à alléger, oubli des anciens résultats par touche (ADR-025). Leçons L-042 et L-043.
- **2026-10-13** — J4, lot 0c : PR 19 fusionnée après relecture du diff et CI verte. Le lot 0 est terminé ; les quatre lots parallèles attendent le retour du test avec un enfant.
- **2026-10-13** — Retour du porteur : des phrases ne voulaient rien dire. Phrases des deux premiers paliers réécrites, règle « toute phrase a un sens » (ADR-026, L-044). PR 20 fusionnée (phrases avec circonflexes et trémas).
