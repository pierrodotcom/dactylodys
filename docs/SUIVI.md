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
| J4 Aventure | Code terminé : récompenses, compagnon, récit dit et illustré, fantôme, carte aux flèches ; test avec un enfant à faire | Cadrage validé le 2026-10-13 (ADR-022) |
| J5 Version 1.0 | Cadrage validé (2026-11-04, ADR-054) ; lots 1 (socle), 2a et 2b (espace adulte), 3 (hors-ligne), 4 (audit) faits ; essai NVDA du porteur attendu ; lot 5 (documentation) à lancer | Espace adulte, sauvegarde, hors-ligne, audit, documentation |

## Prochaines actions

**Attendu du porteur : l'adresse mail de contact** (phrase 92 de la page « Accessibilité », ADR-057). Le lot 5 de J5 attend cette adresse pour être fusionné ; ensuite, CI proposée sur 3 navigateurs et version 1.0.

**Après la 1.0 (ADR-057)**, un lot à la fois : ~~phrases qui racontent~~ (fait, ADR-058) → ~~animations, niveau 1~~ (fait, ADR-059) → ~~retour arrière au choix de l'adulte~~ (fait, ADR-060) → ~~clavier qui s'efface~~ (fait, ADR-061) → ~~fiche « séance type »~~ (fait, ADR-062) → ~~réglages sensoriels~~ (fait, ADR-063) → ~~images du récit à deux états~~ (fait, ADR-064) → ~~animations niveau 2 (décors)~~ (fait, ADR-065) → deux nouveaux jeux → textes utiles après la leçon 24 → dictée (étude de la voix synthétique d'abord) → doigté simplifié (revue des publications d'abord) → contenu selon l'âge → coin à soi (gros chantier de dessin) → faire connaître le jeu.

0. **J5 (ADR-054)**, une session par lot : ~~lot 1 socle~~ (fait) → ~~lot 2a espace adulte~~ (fait) → ~~lot 2b~~ (fait) → ~~lot 3 hors-ligne~~ (fait, icône A choisie par le porteur le 2026-11-05) → ~~lot 4 audit~~ (fait ; essai NVDA du porteur avec `docs/essai-nvda.md`) → **lot 5** documentation et fin de jalon.
1. **Test avec un enfant** par le porteur (grille d'observation ci-dessous), puis ajustements.
2. **Voix** : voix humaine (ADR-028), **tous les textes enregistrés par le porteur** : les 24 consignes, le rappel « regarde l'écran » et les 34 textes du récit (59 fichiers MP3, 3 Mo, contribution anonyme ; archives dans `docs/voix/`, hors dépôt). Page `/dev/voix`, lecteur, bouton « Écouter » sur l'avant-leçon et sur les écrans du récit, outil `tools/voice/import.js` (mode d'emploi dans `tools/voice/README.md`). Un texte réécrit perd son enregistrement : le réenregistrer sur `/dev/voix`, puis importer l'archive avec `--prune`.
3. ~~Écrire aux auteurs de Lexique (Q9)~~ : levée le 2026-10-23, la licence est écrite par les auteurs dans l'archive (voir Q9). Un courriel de courtoisie reste possible (`docs/COURRIEL_LEXIQUE.md`), mais rien n'en dépend.
4. Dette de J3, par ordre de gêne pour l'enfant :
   - la scène de « Décollage » : agrandie (PR 57, option C du porteur : toute la largeur, 1,4 à 1,7 fois plus haute avec le clavier, bulle près de l'habitant). « œ », point-virgule et guillemets : décidés le 2026-10-18 (ADR-045).
5. Dette plus ancienne : soldée le 2026-10-18 (`GameSettings.soundEnabled` retiré, règle du pseudo à un seul endroit). La langue ne dépend plus de `localStorage` (stratégie `baseLocale` seule) : il faudra réintroduire un choix de langue quand une deuxième langue arrivera (J6).
6. **PROCHAIN LOT — Retours du test** (ADR-029, validé le 2026-10-14), dans cet ordre, une session par lot :
   - **T1 Durée et animations** : fait (PR 33, ADR-030) — exercices à 35 caractères (35 à 47 en pratique), récompenses 400 ms après la dernière frappe et d'1,4 s, quatre variantes par jeu, un jeu différent par leçon, mode réduit en fondu visible (option C). Mesures ci-dessous.
   - **T2 Main guide** : fait (ADR-031) — deux mains en contour sur le clavier à l'écran, le bon doigt va vers la touche puis revient (Maj et AltGr compris), chaque touche en leçons 1 à 4, touches nouvelles et après une erreur en leçons 5 à 15, rien ensuite ; réglage Selon les leçons / Toujours / Jamais ; profil version 4.
   - **Lot A (retours sur T1 et T2, ADR-032)** : fait — réglages en haut, étoiles célébrées, démonstration répétée, main complète au 2ᵉ monde.
   - **T3 Consignes montrées et dites** : fait (ADR-033) — avant-leçon réduit avec les jeux en grandes images qui lancent la partie, consigne dite à l'ouverture (réglage « Voix qui lit les consignes »), rappel « regarde l'écran » tous les 4 groupes. **Attendu du porteur** : enregistrer aussi la phrase du rappel sur `/dev/voix` avec les 24 consignes.
   - **A1 et A2 Scènes surprises** : faits (ADR-034, ADR-035) — les 40 scènes acceptées par le porteur : 12 par jeu, débloquées toutes les 2 leçons réussies, plus photo souvenir, défilé de fin de monde, notes de musique et 5 danses du compagnon.
   - **Lot R2** (récompenses, compagnon) : fait (PR 42, ADR-037), puis trophées des rangées redessinés et pouce gauche retiré de la main guide (PR 44 et 46, ADR-041) ; détail au point 7.
   - Puis la suite de J4, en tenant compte du constat : un récit en texte ne sera pas lu ; il doit être dit et illustré, en phrases très courtes.
7. **J4 Aventure** (ADR-022, acceptée ; en pause derrière le lot 6) :
   - **Lot 0, socle** : fait — minimum de 5 frappes par nouveau signe et retrait de « ü » (PR 16, ADR-024) ; profil version 2 avec migration, profils illisibles conservés et listés, jeu choisi retrouvé à la visite suivante, allure de chaque partie réussie enregistrée, types des récompenses, du récit et de la voix (PR 17). Contrats dans `.claude/rules/jeux-pedagogie.md`.
   - **Lot 0c** : fait (PR 19, ADR-025) — seules les parties récentes d'une touche comptent, jusqu'à 30 frappes ; profil version 3 ; leçon des circonflexes en deux (« ê â », puis « î ô û » : « Le casque du copilote ») ; `isLessonPassed` exporté. 21 phrases ajoutées pour les circonflexes et les trémas.
   - Profils illisibles : faits le 2026-10-18 — listés à part sur l'écran des joueurs (nom, raison), supprimables un par un après confirmation (`removeUnreadable`).
   - **Lots R1 et S1** : faits (PR 25 et PR 24) — moteur des récompenses et moteur du récit, fonctions pures, pas encore branchés à l'écran.
   - **R2** : fait (ADR-037) — catalogue de 39 récompenses validé par le porteur (`docs/RECOMPENSES.md`) : un objet par leçon réussie, un tour par monde terminé, 10 trophées ; écran « Mon compagnon » (nom, 8 couleurs, objets par emplacement, tours, trophées, silhouettes de ce qui reste à gagner) ; carte « Nouveau ! » et question du nom sur le bilan ; « À gagner » sur l'avant-leçon ; profil version 5 (récompenses acquises pour toujours) ; quête « le compagnon a besoin d'aide » sur une touche redevenue fragile ; page d'essai `/dev/compagnon`. **Attendu du porteur** : regarder le compagnon habillé et l'écran « Mon compagnon », dire ce qui gêne (dessins, longueur de l'écran, place de la bulle).
   - **S2** : fait (ADR-043) — les 34 textes validés en données (`content/fr/story/`), chacun avec son dessin (34 scènes, page d'essai `/dev/recit`) ; ouverture d'un monde avant sa première leçon, ligne et fin après le bilan quand l'enfant le quitte ; texte dit une fois et « Écouter » ; carnet « L'histoire jusqu'ici » depuis la carte. Dessins revus deux fois à la demande du porteur, textes enregistrés (le récit est dit).
   - **F fantôme** : fait (ADR-047) — course facultative contre son « fantôme copieur » quand on rejoue une leçon réussie : case jamais cochée d'avance sur l'avant-leçon, piste en haut de l'écran de jeu (compagnon et fantôme en drap, drapeau), fantôme qui attend en grignotant puis salue, phrase sans chiffre au bilan, « Continuer sans le fantôme » dans la pause ; page d'essai `/dev/fantome`. Nom, dessin et salut confirmés par le porteur (PR 63).
   - **Assemblage** : fait — carte parcourue aux flèches, le compagnon avance d'étape en étape (PR 60, ADR-027) ; « Écouter » branché sur l'avant-leçon (T3) et les écrans du récit (S2). Tous les lots de J4 sont dans le parcours `/jouer` : reste un test avec un enfant avant de clore le jalon.
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

## Retours du deuxième test avec un enfant (2026-10-16, observés par le porteur)

- **Écran de leçon** : il clique tout de suite, sur le jeu proposé, sans se demander s'il pouvait choisir. Il regarde les mains du clavier virtuel et plus les lettres à taper.
- **Frappe** : il regarde l'écran (le clavier virtuel), plus ses mains ; les index sont bien placés, les autres doigts moins. Il trouve que l'animation pourrait venir un peu plus tard après la dernière frappe (délai passé de 0,4 à 0,6 s).
- **Rappel** : vu, mais pris pour une consigne qui ne vaut que pour le prochain texte.
- **Lassitude** : les dinos et les aliments, même au 3ᵉ monde ; « toujours des œufs de dinosaure » (cause trouvée : une leçon déjà jouée reproposait toujours le jeu mémorisé du monde ; corrigé, ADR-037).
- **Étoiles** : il a vu que le bilan avait changé, mais s'est senti frustré avec 2 étoiles pour 26 sur 28.
- **Durée** : « c'est long » sur un exercice de plus de 10 étapes ; il décroche au bout d'environ 4 exercices (5 minutes). Pas de touche pressée par accident.

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
| Q9 | ~~Confirmer la licence de Lexique~~ **Levée (2026-10-23)** : le `README-Lexique.txt` de l'archive Lexique383.zip dit « License : CC BY SA 4.0 » ; les pages actuelles de lexique.org n'indiquent aucune licence, demandent seulement de citer les publications, et ne donnent aucune adresse (forum Google Groups seulement) | — |
| Q6 | Nom définitif et ton du jeu (nom du compagnon, humour) ? « DactyloDys » retenu pour l'application installée (ADR-054). Vérifié le 2026-11-04 : aucun domaine `dactylodys` (.fr, .com, .org, .net, .app) enregistré, aucun produit publié sous ce nom ; un dépôt GitHub isolé (DamienRichir2007/dactylodys-reparee, aide à l'écriture pour dyslexiques, 1 commit, sans licence ni site) porte le même nom. Base INPI : rien trouvé par le porteur le 2026-11-04. Le nom n'est écrit qu'à un endroit (ADR-055) | J5 lot 3 |
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
- **2026-10-16** — PR 38 fusionnée (A1). Le porteur accepte les 40 scènes ; lot A2 réalisé par trois sous-agents en parallèle (un par jeu) et le chef d'orchestre (fin d'exercice). Session R2 proposée.
- **2026-10-16** — Parcours complet vérifié sur le site en ligne avant le deuxième test avec un enfant ; trois défauts corrigés (ADR-036) : image de l'œuf qui déborde, jeux coupés sur un portable, rappel trop court et qui décalait le clavier.
- **2026-10-16** — Brouillon du récit (`docs/RECIT_BROUILLON.md`, 34 textes numérotés) envoyé au porteur pour validation par numéros : lot S2 à construire ensuite. Grille du test de ce soir : `docs/TEST_SOIR.md`.
- **2026-10-16** — Deuxième test avec un enfant (retours ci-dessus) : corrections de l'ADR-037 (jeux variés, délai 0,6 s) et de l'ADR-039 (8 étapes, 3ᵉ étoile à 95 %, main sur hésitation, pause après 4 exercices, rappel « toujours »). Lot « mondes mêlés et nouveaux jeux » (dessin, train, tour, visites d'autres mondes) confié à six agents en parallèle.
- **2026-10-16** — Six agents en parallèle, assemblés par le chef d'orchestre : trois nouveaux jeux (dessin, train, tour) et les visites d'un autre monde (ADR-040). Leçons L-053 à L-056.
- **2026-10-16** — PR 39 (A2, autre session) fusionnée. Lot R2 en trois lots parallèles (moteur, dessins, écrans) après contrats figés : récompenses acquises pour toujours, compagnon habillé, quête d'aide (ADR-037). Leçons L-053 à L-057.
- **2026-10-16** — PR 42 (R2) et PR 44 (pouce gauche retiré de la main guide) fusionnées. Trophées des rangées redessinés au choix du porteur (ADR-041).
- **2026-10-17** — Récit : le porteur valide le brouillon sauf le n° 25, choisit de ne jamais mettre le nom du compagnon dans le récit (la voix enregistrée ne peut pas le dire) et trouve le ton trop « 8 ans ». Version 2 de `docs/RECIT_BROUILLON.md` envoyée : même longueur, humour pince-sans-rire, compagnon gourmand, fil du carnet de voyage. **Attendu du porteur** : réponses par numéro, puis lot S2 dans une nouvelle session.
- **2026-10-17** — Récit version 2 validée par le porteur (« ok pour tout »), enregistrement d'abord des 10 ouvertures et fins (ADR-042). Prochain lot : S2, dans une nouvelle session (Opus 5.5, effort élevé).
- **2026-10-17** — Voix : 24 consignes et le rappel enregistrés par le porteur (archive `docs/voix/voix-fr__2026-10-17.zip`, 25 fichiers MP3 après installation de `ffmpeg`, 3 min 42 s, 1,7 Mo, contribution anonyme), importés et publiés. Défaut de l'outil d'import corrigé : il ignorait le rappel.
- **2026-10-17** — Lot S2 : récit en données, écrans et carnet par le chef d'orchestre, 34 dessins par cinq agents en parallèle (un par monde, un fichier chacun) après contrats figés. Choix du porteur : la ligne du récit vient après le bilan (ADR-043). Leçons L-059 à L-063.
- **2026-10-18** — Le porteur refuse la première version des dessins (membres en rectangles, parties détachées, zèbre, comète, véhicules trop simples, café qui flotte sur la Lune) : les 34 images sont redessinées par cinq agents avec une consigne de qualité (anatomie en courbes, tout attaché, volume) ; le café flotte désormais en orbite, le dino en combinaison spatiale. Le porteur valide tout sauf le T-rex (refait, bouche sans aplat noir) et réécrit le texte 23 : « En micropesanteur, le café est bon, mais il flotte. » Il demande aussi un compagnon moins simpliste (lot suivant).
- **2026-10-18** — Compagnon, 24 objets et 10 trophées redessinés par deux agents en parallèle dans le même gabarit (ADR-044) ; tours, danses, images du récit et tests inchangés. Retours du porteur : yeux grand ouverts au repos, objets, tours et trophées refaits une seconde fois, bras levés écartés en V et soudés au corps (une seule forme, aisselles sans coupure) ; compagnon validé (« ok pour tout »).
- **2026-10-18** — Une leçon réussie reste ouverte même quand des leçons sont insérées avant elle (dette de J3 : la leçon `q m` d'un profil d'avant J3 se reverrouillait).
- **2026-10-18** — Point-virgule et guillemets droits ajoutés aux leçons *Pause sur la planète Virgule* et *Le klaxon rigolo*, 17 phrases ; « œ » n'est pas tapé (ADR-045). **Attendu du porteur** : réenregistrer les consignes de ces deux leçons sur `/dev/voix`.
- **2026-10-18** — PR 53, 54, 56 et 57 fusionnées : leçon réussie toujours ouverte, réglages compacts (« Fermer » en haut, défilement indépendant), point-virgule et guillemets (ADR-045), « Décollage » agrandi avec la bulle près de l'habitant.
- **2026-10-18** — Profils impossibles à ouvrir : listés sur l'écran des joueurs et supprimables après confirmation (dette du lot d'assemblage).
- **2026-10-21** — Récit enregistré par le porteur (archive `voix-fr__2026-10-21.zip`, 59 textes, dont les 34 du récit et deux consignes réenregistrées après l'ADR-045) ; deux anciens fichiers supprimés (`--prune`). Le récit est dit à l'apparition de chaque écran ; test e2e de la voix sur l'ouverture du premier monde.
- **2026-10-21** — PR 61 fusionnée (récit dit). Retours du porteur sur l'ergonomie (ADR-046) : sortie en haut de chaque écran (`ScreenFrame` `back`, test `ergonomics.spec.ts`), dino visible en choisissant un objet (aperçu collant, compagnon dans la carte « Nouveau ! »), carnet en colonne sous l'image, son préchargé au survol de « Écouter ».
- **2026-10-22** — Lot F (fantôme, ADR-047) : propositions validées par le porteur (2A à 8A, « fantôme » plutôt qu'« ombre »), dessin du fantôme par un agent ; nom, dessin et salut à confirmer. Leçons L-071 à L-074.
- **2026-10-22** — PR 63 fusionnée (fantôme copieur, ADR-047) après un délai de CI porté à 30 minutes (L-075) ; le porteur confirme le nom, le dessin et le salut. PR 60 fusionnée (carte aux flèches) : le code de J4 est terminé.
- **2026-10-23** — PR 65 fusionnée : le rappel « regarde l'écran » ne décale plus le clavier (tour, zone de texte étroite ; L-076). Jeu des œufs redessiné au niveau du compagnon (œuf en volume, fêlures, bébés dinos, 15 scènes) à la demande du porteur, qui ne l'avait pas encore été depuis l'ADR-044. Validé par le porteur.
- **2026-10-23** — PR 67 fusionnée (jeu des œufs redessiné, validé par le porteur). Les cinq autres jeux (fusée, recette, dessin magique, train, tour) redessinés au même niveau par cinq agents en parallèle, assemblés par le chef d'orchestre ; validés par le porteur (« ok pour tout ») et fusionnés (PR 68). Tous les dessins de l'appli sont désormais au niveau de l'ADR-044. Leçons L-079 à L-083 (dont un test contre les groupes de tokens écrits deux fois).
- **2026-10-24** — Revue des boutons du parcours (ADR-048) : « Faire une pause » ne passe plus par l'écran du récit ; « Réglages » dans la pause d'un jeu rend la partie en pause au lieu de la perdre. Leçon L-084.
- **2026-10-25** — Relecture du récit par le porteur dans un document modifiable : les 34 textes du jeu (dont le n° 25) validés sans changement, longueur des phrases acceptée. Vérification : les 59 textes dits (24 consignes, rappel « Regarde toujours l'écran, jamais tes doigts ;-) », 34 du récit) ont tous un enregistrement publié ; rien à réenregistrer. `docs/RECIT_BROUILLON.md` reste la copie de référence des textes.
- **2026-10-25** — Quota gratuit de minutes GitHub Actions épuisé (annonce du porteur) : la CI ne démarre plus. Règle consignée (ADR-050, CLAUDE.md § 10) et transmise aux sessions DactyloDys en cours : `verify` local fait foi, un push par lot, jamais de push « pour voir ». Réglé le 2026-11-01 (ADR-053).
- **2026-10-25** — Dessin magique : un sujet différent à chaque partie (ADR-049, profil version 6 qui compte les parties de chaque jeu).
- **2026-10-26** — Chaque bouton mène là où il le dit (ADR-051) : le récit n'est plus raconté avant la carte ni avant « Rejouer », l'ouverture d'un monde une seule fois par visite, l'écran de pause dit « Retour à la carte ». Leçon L-089.
- **2026-10-27** — Mains guides retouchées (ADR-052) : jointures sous la rangée du bas, doigts droits un peu moins penchés et plus fins ; validé par le porteur à la quatrième version. Leçon L-090.
- **2026-11-01** — Ménage du disque : 17 copies de travail d'agents oubliées retirées (6,6 Go libérés, travail déjà fusionné, branches conservées). Nouveau script `npm run clean:worktrees` et règle « une copie de travail ne survit jamais à sa PR » (L-092).
- **2026-11-01** — Quota de CI revenu, mais partagé avec les autres projets du porteur : la CI ne démarre plus qu'à la demande (étiquette `ci`, proposée au porteur quand le local ne suffit pas) ; plus de second passage après fusion ; pas de déploiement pour la documentation seule (ADR-053, CLAUDE.md § 10).
- **2026-11-04** — Cadrage de J5 validé par le porteur (ADR-054) : espace adulte avec barrière légère et code facultatif, bilan, évolution, cible personnelle, fichier des mesures, placer plus loin, mots de l'adulte ; sauvegarde par fichier ; hors-ligne installable ; audit avec essai NVDA ; page « Pour les adultes » imprimable. Durée de séance réglable et doigtés simplifiés reportés.
- **2026-11-04** — Nom de l'appli écrit une seule fois (`app_name`), les autres textes le reçoivent en paramètre, un test le vérifie (ADR-055, CLAUDE.md § 7). Lot 1 de J5 lancé dans une copie de travail.
- **2026-11-04** — J5 lot 1 (socle) : profil version 7 (journal des séances, gardé sur les 2000 dernières ; jours joués, jamais raccourcis ; vitesses d'écriture à la main, mots de l'adulte, mondes ouverts d'avance), migration sans perte, chaque partie finie est notée. Fichier de sauvegarde : écriture, nom proposé, lecture avec refus motivé (pas une sauvegarde, version plus récente, abîmé) et choix « remplacer » ou « garder les deux ». Rien de visible pour l'enfant ; l'espace adulte (lot 2) s'en servira. Les jours joués ne sont pas reconstitués pour les parties d'avant (fuseau inconnu) : le compte part de cette version.
- **2026-11-05** — J5 lot 2a : espace adulte (`/adulte`), ouvert par un lien de l'écran des joueurs. Barrière : un nombre écrit en lettres à recopier en chiffres (`content/fr/adult/gate-numbers.json`), remplacé par le code à 4 chiffres si l'adulte en a mis un (demander les deux ne protège pas mieux). Bilan par enfant (leçons, étoiles, clavier des touches acquises et fragiles, mêmes seuils que les récompenses), évolution (précision, vitesse, jours pratiqués par semaine en cumul, graphiques doublés de tableaux), cible personnelle (vitesse à la main, médiane des 5 dernières séances au clavier), fichier des mesures CSV, sauvegarde et rechargement (« garder les deux » proposé d'abord, la copie devient « Lou (2) »), date de la dernière sauvegarde. Lot 2 découpé en 2a et 2b pour garder des sessions de taille raisonnable ; lots enchaînés un par un, le poste étant saturé.
- **2026-11-05** — J5 lot 2b : l'adulte ouvre un monde d'avance (sa première leçon s'ouvre, le reste suit la règle habituelle, rien n'est donné pour les mondes sautés), colle une liste de mots (ceux que la disposition de l'enfant ne produit pas sont refusés et listés) que l'enfant tape dans un exercice libre depuis la carte (« Les mots choisis pour toi » : ni étoiles ni déblocage, les touches et le jour comptent, une récompense de maîtrise d'une touche reste possible), et change les réglages de l'enfant. Script de ménage des copies : un dossier verrouillé ne l'arrête plus.
- **2026-11-05** — J5 lot 3 : le jeu entier (pages, code, polices, voix, icônes) est gardé à la première visite et marche ensuite sans connexion, rien d'une autre origine. Une nouvelle version ne remplace jamais une partie ouverte : elle attend que tous les onglets soient fermés (pas de rechargement ni de bandeau, un test le garde). Manifeste généré depuis `app_name` et les tokens, chemin de base respecté. Bouton « Installer sur cet appareil » dans l'espace adulte seulement, avec explication iPhone/iPad et cas « pas possible ici ». Icône du compagnon assis sur une touche (A), produite par script à partir du vrai dessin ; variante C sur fond turquoise en une valeur. Tests Playwright : service worker bloqué partout sauf `offline.spec.ts`.
- **2026-11-05** — Tests de bout en bout : quand Windows réserve la plage qui contient le port 4273, la configuration Playwright prend d'elle-même un port libre ; plus besoin de `E2E_PORT` à la main (L-091, L-093 automatisées). Rien ne change en CI.
- **2026-11-05** — J5 lot 4 (audit d'accessibilité, constats dans `docs/audit-accessibilite.md`) : à 320 px de large (zoom 400 %), plus aucun écran ne défile de côté (le clavier à l'écran rétrécit pour tenir en entier, les tableaux de l'espace adulte défilent dans leur cadre) ; le focus ne passe plus sous l'aperçu du compagnon ; les erreurs du code adulte et de la vitesse à la main sont reliées à leur champ ; dans les jeux, le lecteur d'écran dit le texte à taper et, après une erreur, la touche attendue, rien sur une touche juste. Liste de l'essai NVDA en 15 étapes pour le porteur (`docs/essai-nvda.md`). PR 80 fusionnée : port e2e libre choisi tout seul.
- **2026-11-07** — Bouton des jeux : « Jouer à Le dessin magique » relevé par le porteur. Chaque jeu a sa propre phrase (`game_<id>_play` : « Jouer au dessin magique », « Jouer au train qui s’allonge », « Jouer à la tour de blocs », « Jouer à la recette farfelue », « Jouer à l'éclosion », « Jouer au décollage ») au lieu d'un titre collé après « à » ; un test refuse « à le », « à les » et un article en majuscule après « à ».
- **2026-11-08** — Espace adulte : « Bilan de Ali » devient « Bilan d'Ali » devant un pseudo qui commence par une voyelle ou un h (7 phrases, variante `_elided` entière pour chacune, lettres concernées dans `ui_elision_initials`, choix dans `src/lib/ui/elision.ts`). Un test vérifie que chaque phrase avec « de {name} » a sa variante (L-106).
- **2026-11-08** — Analyse produit (synthèse envoyée au porteur, `docs/propositions-amelioration.md`, 14 propositions à cocher). Première mise en œuvre sans décision nécessaire : le bilan de l'espace adulte liste les touches « justes mais longues à trouver », comparées aux autres touches de l'enfant (ADR-056, profil version 8). Rien ne change côté enfant.
- **2026-11-11** — Phrases qui racontent (ADR-058) : 36 phrases relues par le porteur, 2 par leçon des mondes 2 à 5 ; la première partie d'une leçon finit par une de ses phrases, puis une partie sur deux. Décisions sur l'analyse produit (ADR-057). La chaîne `build-phrases` garde les phrases de l'histoire et les 17 phrases de l'ADR-045 (L-108).
- **2026-11-11** — Animations, niveau 1 (ADR-059) : une partie rejouée reprend la suite des scènes surprises, des bulles et des variantes de dessin là où la précédente s'était arrêtée, au lieu de tout recommencer.
- **2026-11-11** — Retour arrière au choix de l'adulte (ADR-060) : réglage de l'espace adulte, coupé par défaut ; activé, une mauvaise lettre s'écrit dans le texte et l'enfant l'efface avec Retour arrière avant de continuer. Profil version 9.
- **2026-11-11** — Clavier qui s'efface (ADR-061) : sur le clavier dessiné des jeux, la lettre d'une touche bien connue s'efface en douceur et revient après une erreur sur elle ; activé par défaut, l'adulte peut le couper. Profil version 10.
- **2026-11-12** — Fiche « séance type » (ADR-062) : dans le bilan d'un enfant, une fiche d'une page à imprimer et poser à côté de l'ordinateur (où en est l'enfant, avant / pendant / après la séance). Texte à relire par le porteur : `docs/relecture-fiche-seance.md` (hors dépôt).
- **2026-11-12** — Réglages sensoriels (ADR-063) : « Effets lumineux » séparés des mouvements, « Bruit de fond doux » (coupé au départ) et bouton « Tout calmer » dans les réglages de l'enfant. Profil version 11. Le bruit de fond n'a été écouté que par des tests, pas sur un vrai haut-parleur : à essayer par le porteur.
- **2026-11-12** — Images du récit à deux états (ADR-064) : chaque image de l'histoire montre d'abord la situation, puis ce qui a changé, en fondu ; planches de relecture envoyées au porteur (`docs/captures-recit/`, hors dépôt).
- **2026-11-12** — Un décor par partie (ADR-065) : chaque jeu rejoué change de décor (moment du jour, saison, lieu), sans hasard ; la première partie garde le décor d'avant. Planches envoyées au porteur (`docs/captures-decors/`, hors dépôt).
