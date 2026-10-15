# Suivi de projet

Mis à jour à la fin de chaque lot. Garder court : ce qui est terminé depuis plus d'un jalon part dans l'historique git.

## État

| Jalon | État | Note |
|---|---|---|
| Cadrage et recherche | Terminé (2026-10-11) | Rapport dans `reports/` |
| J0 Fondations | Terminé (2026-10-11) | En ligne : https://pierrodotcom.github.io/dactylodys/ |
| J1 Moteur de frappe | Validé sur Windows (Chrome, Firefox) | Reste : Mac/Safari, Linux, Chromebook (Q7) |
| J2 Tranche jouable | Critère de sortie atteint au premier test (2026-10-13) | L'enfant a joué environ 15 minutes et voulait recommencer ; il regardait ses mains |
| J3 Pédagogie complète | Mots et phrases relus par le porteur ; test avec un enfant à faire | 5 mondes, 24 leçons, 926 mots et 216 phrases relus par le porteur, 3 mini-jeux |
| J4 Aventure | En cours : lot 0 (socle) | Cadrage validé le 2026-10-13 (ADR-022) |
| J5 Version 1.0 | — | |

## Prochaines actions

1. **Test avec un enfant** par le porteur (grille d'observation ci-dessous), puis ajustements.
2. **Voix** : voix humaine (ADR-028). Outillage livré (PR 29) : page `/dev/voix`, lecteur, bouton « Écouter » (branché sur l'avant-leçon depuis T3, consigne dite à l'ouverture), outil `tools/voice/import.js` (mode d'emploi dans `tools/voice/README.md`). **Attendu du porteur** : enregistrer depuis son ordinateur les 24 consignes de leçon sur la page en ligne, en commençant par deux ou trois pour juger du résultat, puis déposer `voix-fr__<date>.zip` dans `docs/voix/`. Le chef d'orchestre lance alors l'import et ouvre la PR. Jamais essayé avec un vrai micro ; `ffmpeg` absent du poste (fichiers WAV tant qu'il n'est pas installé). Les textes du récit s'y ajouteront quand ils seront écrits.
3. Écrire aux auteurs de Lexique pour confirmer la licence (Q9).
4. Dette de J3, par ordre de gêne pour l'enfant :
   - la scène de « Décollage » est petite ; un profil d'avant J3 voit sa leçon `q m` reverrouillée tant que les leçons insérées avant ne sont pas passées ; la ligature `œ` n'est enseignée nulle part ; le point-virgule et les guillemets ne sont dans aucune leçon.
5. Dette plus ancienne : `GameSettings.soundEnabled` inutilisé ; validation du pseudo en double. La langue ne dépend plus de `localStorage` (stratégie `baseLocale` seule) : il faudra réintroduire un choix de langue quand une deuxième langue arrivera (J6).
6. **PROCHAIN LOT — Retours du test** (ADR-029, validé le 2026-10-14), dans cet ordre, une session par lot :
   - **T1 Durée et animations** : fait (PR 33, ADR-030) — exercices à 35 caractères (35 à 47 en pratique), récompenses 400 ms après la dernière frappe et d'1,4 s, quatre variantes par jeu, un jeu différent par leçon, mode réduit en fondu visible (option C). Mesures ci-dessous.
   - **T2 Main guide** : fait (ADR-031) — deux mains en contour sur le clavier à l'écran, le bon doigt va vers la touche puis revient (Maj et AltGr compris), chaque touche en leçons 1 à 4, touches nouvelles et après une erreur en leçons 5 à 15, rien ensuite ; réglage Selon les leçons / Toujours / Jamais ; profil version 4.
   - **Lot A (retours sur T1 et T2, ADR-032)** : fait — réglages en haut, étoiles célébrées, démonstration répétée, main complète au 2ᵉ monde.
   - **T3 Consignes montrées et dites** : fait (ADR-033) — avant-leçon réduit avec les jeux en grandes images qui lancent la partie, consigne dite à l'ouverture (réglage « Voix qui lit les consignes »), rappel « regarde l'écran » tous les 4 groupes. **Attendu du porteur** : enregistrer aussi la phrase du rappel sur `/dev/voix` avec les 24 consignes.
   - **A1 Scènes surprises** : premier paquet fait (ADR-034) — 4 scènes par jeu (1, 2, 3, 4, 13, 14, 15, 20, 25, 26, 28, 30) et 5 danses du compagnon (37), une nouvelle scène par jeu toutes les 2 leçons réussies. **Attendu du porteur** : réponses par numéro sur les 40 propositions (`docs/SCENES_SURPRISES.md`) pour les paquets suivants.
   - Puis la suite de J4, en tenant compte du constat : un récit en texte ne sera pas lu ; il doit être dit et illustré, en phrases très courtes.
7. **J4 Aventure** (ADR-022, acceptée ; en pause derrière le lot 6) :
   - **Lot 0, socle** : fait — minimum de 5 frappes par nouveau signe et retrait de « ü » (PR 16, ADR-024) ; profil version 2 avec migration, profils illisibles conservés et listés, jeu choisi retrouvé à la visite suivante, allure de chaque partie réussie enregistrée, types des récompenses, du récit et de la voix (PR 17). Contrats dans `.claude/rules/jeux-pedagogie.md`.
   - **Lot 0c** : fait (PR 19, ADR-025) — seules les parties récentes d'une touche comptent, jusqu'à 30 frappes ; profil version 3 ; leçon des circonflexes en deux (« ê â », puis « î ô û » : « Le casque du copilote ») ; `isLessonPassed` exporté. 21 phrases ajoutées pour les circonflexes et les trémas.
   - À faire au lot d'assemblage : afficher les profils illisibles et permettre de les supprimer explicitement (aujourd'hui le store refuse de les effacer).
   - **Lots R1 et S1** : faits (PR 25 et PR 24) — moteur des récompenses et moteur du récit, fonctions pures, pas encore branchés à l'écran.
   - **Après le retour du test avec un enfant** : R2 catalogue des récompenses, écrans du compagnon, récompenses acquises pour toujours (profil version 5, la version 4 étant prise par le réglage de la main guide), quête « le compagnon a besoin d'aide » sur une touche redevenue fragile · S2 textes du récit, écrans, écran « l'histoire jusqu'ici » · V2 branchement du bouton « Écouter » dans le parcours et enregistrement des textes définitifs · F fantôme (en dernier) · assemblage : carte parcourue aux flèches (ADR-027), profils illisibles.
   - **Puis assemblage** dans le parcours `/jouer`.
4. Trouver des testeurs Mac/Safari, Linux, Chromebook (Q7) : envoyer le lien de la page `/dev/traces`.

## Retours du premier test avec un enfant (2026-10-13, observés par le porteur)

- **Trop long** : l'enfant a dit « c'est long » au début de la 5ᵉ leçon des dinosaures. Mesure : un exercice passe d'environ 25 caractères (leçons 1 à 4) à 61 (leçon 5), 69 (leçons 7 à 11) puis plus de 100 (leçons 12 et suivantes), soit 4 à 7 minutes pour un débutant à 15-20 caractères par minute, loin des 2 à 4 minutes visées.
- **Animations** : amusantes sur les deux premiers exercices, vite redondantes ; trop courtes et trop rapides pour être vues, surtout dans le monde de la cuisine. À diversifier, à allonger, et à renouveler plus souvent (thème ou variantes).
- **Consignes jamais lues** : l'enfant ne lit pas les textes d'introduction. Conséquence directe : il n'a pas placé les bons doigts.
- Durée : environ 15 minutes ; il voulait recommencer ; il regardait ses mains.
- **Proposition du porteur** : afficher une main dessinée, un peu transparente, sur le clavier à l'écran, qui déplace le bon doigt vers la touche demandée puis revient en place, pour les premiers exercices.

## Mesures du lot T1 (200 graines par leçon, avant → après)

Caractères par exercice, moyenne (plafond après) · frappes minimales par signe nouveau (jamais sous 5) · part des groupes qui sont des mots · part des phrases :

| Leçons | Caractères | Min. par signe | Mots | Phrases |
|---|---|---|---|---|
| 1 à 4 (suites seules) | 25 → 25 | 5 à 8 → 5 à 8 | 0 % | 0 % |
| 5 et 6 (mots) | 61 → 36 (≤ 40) | 9-10 → 6 | 54-57 % → 39-42 % | 0 % |
| 7 à 11 (cuisine) | 67-69 → 40-41 (≤ 47) | 5-6 → 5 | 33-36 % → 28-29 % | 11 % → 5-6 % |
| 12 à 15 (animaux) | 100-104 → 42 (≤ 47) | 5 → 5 | 29-30 % → 24-25 % | 18-19 % → 8-9 % |
| 16 à 24 (espace, véhicules) | 103-105 → 41-44 (≤ 47) | 5 → 5 | 15-29 % → 18-43 % | 25-59 % → 11-44 % |

Garde-fous tenus : au moins un mot par exercice quand la leçon en annonce, minimum de 5 frappes par signe, tous les signes demandés connus (tests de `tests/schemas/content-coherence.test.ts`). Les phrases restent présentes mais moins nombreuses : une phrase de 32 caractères médiane tient mal dans 35 (voir ADR-030).

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
- **2026-10-13** — PR 21 fusionnée (phrases qui ont un sens ; test e2e rendu déterministe, L-045). Relecture des phrases par le porteur appliquée. Le moteur garantit au moins un mot dans tout exercice qui en annonce.
- **2026-10-13** — PR 22 fusionnée (mot garanti, relecture des phrases). Les 5 phrases de remplacement sont validées par le porteur : toute la banque est relue par une personne. Recherche sur les voix consignée. Lots R1 et S1 lancés.
- **2026-10-13** — PR 23, 24 et 25 fusionnées. Décisions du porteur : récompenses acquises pour toujours, carte aux flèches, écran « l'histoire jusqu'ici » (ADR-027). Téléchargement du moteur Piper et de la voix `fr_FR-mls-medium` autorisé pour des échantillons, hors du dépôt.
- **2026-10-13** — PR 26 fusionnée. Échantillons de voix envoyés au porteur. Fin de session : reprendre par le retour du test avec un enfant, puis les lots R2, S2, V, F et l'assemblage (une session par lot).
- **2026-10-13** — PR 27 fusionnée. Voix de synthèse écartée après écoute, voix humaine retenue (ADR-028) ; lot V1 lancé.
- **2026-10-13** — PR 28 et 29 fusionnées : outillage de la voix humaine en ligne (lot V1).
- **2026-10-14** — Retours du premier test avec un enfant consignés ; lot « retours du test » proposé au porteur.
- **2026-10-14** — Décisions du porteur sur les retours du test (ADR-029). Critère de sortie de J2 atteint. Passage à une nouvelle session pour le lot T1.
- **2026-10-14** — Lot T1 : les effets d'animation de Windows étaient désactivés sur l'ordinateur du test (cause des animations « trop courtes ») ; le porteur choisit de garder « Comme l'appareil » et de rendre le mode réduit visible (ADR-030). Il demande aussi un délai avant les animations et un rappel régulier « regarde l'écran » (inscrit en T3).
- **2026-10-14** — PR 33 fusionnée (lot T1, CI verte sur 3 navigateurs). Prochain lot : T2 (main guide), à lancer dans une nouvelle session sur Opus 5.5, effort élevé.
- **2026-10-15** — Lot T2 (main guide, ADR-031) réalisé dans la même session, à la demande du porteur.
- **2026-10-15** — PR 35 fusionnée (T2). Retours du porteur sur T1 et T2 (ADR-032) ; lot A réalisé ; propositions de scènes surprises envoyées.
- **2026-10-15** — PR 36 fusionnée (lot A). Lot T3 réalisé (ADR-033).
- **2026-10-15** — PR 37 fusionnée (T3). Lot A1, premier paquet de scènes surprises (ADR-034).
