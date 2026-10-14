# Journal des décisions (ADR)

Une décision = un paragraphe : contexte, choix, conséquence. Une décision remplacée n'est pas effacée : elle est marquée « Remplacée par ADR-xxx ».

| # | Date | Décision | État |
|---|---|---|---|
| 001 | 2026-10-11 | Données locales d'abord, synchro facultative plus tard | Acceptée |
| 002 | 2026-10-11 | Première version : français + AZERTY France (PC et Mac) | Acceptée |
| 003 | 2026-10-11 | Graphisme vectoriel plat + assets CC0, illustrations sur mesure ensuite | Acceptée |
| 004 | 2026-10-11 | Code AGPL-3.0-or-later, contenus CC BY-SA 4.0, dispositions CC0 | Acceptée |
| 005 | 2026-10-11 | Svelte 5 + SvelteKit 2.x statique, TypeScript 6, npm | Acceptée |
| 006 | 2026-10-11 | Rendu DOM/SVG/CSS + canvas natif, pas de moteur de jeu | Acceptée |
| 007 | 2026-10-11 | Frappe jugée sur le caractère produit ; disposition choisie et étalonnée | Acceptée |
| 008 | 2026-10-11 | Design tokens DTCG comme unique source visuelle | Acceptée |
| 009 | 2026-10-11 | Un jeu-cadre + mini-jeux courts sur un moteur unique | Acceptée |
| 010 | 2026-10-11 | Aucun classement, série, tirage aléatoire, notification, publicité ni traceur | Acceptée |
| 011 | 2026-10-11 | Voix pré-générées plutôt que synthèse du navigateur | Acceptée |
| 012 | 2026-10-11 | Doigté 10 doigts par défaut, profil de doigté adapté en option | Acceptée |

Feuille de route et ADR 005 à 011 validés par le porteur du projet le 2026-10-11.

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
La synthèse vocale des navigateurs est trop inégale (voix absentes ou en ligne selon les plateformes). Consignes pré-générées en fichiers audio par synthèse (choix du porteur : plus simple au départ) ; une voix humaine pourra remplacer les fichiers plus tard sans toucher au code.

## 012 — Doigté
La recherche montre que la vitesse dépend d'un doigté constant et du regard libéré, pas du nombre de doigts, et les ergothérapeutes adaptent le doigté pour les enfants dyspraxiques. Le doigté est donc un profil en données, distinct de la disposition : 10 doigts par défaut, doigté réduit sélectionnable à l'étalonnage ou dans l'espace adulte.

## 013 — Police d'interface (2026-10-11, acceptée)
Atkinson Hyperlegible Next (licence OFL), auto-hébergée via `@fontsource-variable`. Aucune police n'a d'effet démontré sur la dyslexie ; celle-ci est retenue parce qu'elle distingue nettement les caractères proches (b/d/p/q, I/l/1, O/0), ce qui compte pour montrer quoi taper. La famille est un token : en changer ne touche aucun composant.

## 014 — Vérification unique (2026-10-11, acceptée)
`npm run verify` (script `tools/verify.js`) enchaîne génération, types, lint, tests, build et tests de bout en bout, à l'identique en local et en CI, et n'affiche le détail qu'en cas d'échec. Les fichiers générés (tokens, messages compilés) ne sont pas versionnés. Le déploiement GitHub Pages est écrit mais ne s'exécute que si le dépôt est public (question Q1).

## 015 — Politique d'erreur par défaut (2026-10-11, acceptée)
Deux politiques dans le moteur de session : `retry` (une mauvaise touche ne fait pas avancer ; il suffit de taper la bonne) et `backspace` (le mauvais caractère s'affiche et doit être effacé). `retry` est le défaut pour les débutants : pas de punition, pas de manipulation supplémentaire. `backspace` sert plus tard à enseigner la correction.

## 016 — Source des dispositions AZERTY (2026-10-11, acceptée)
Dispositions Windows et macOS reprises de Unicode CLDR 43 (`Unicode-DFS-2016`), seule source libre qui décrit les claviers réels de ces systèmes. Elles restent **à confirmer par des traces réelles** : codes `Backquote`/`IntlBackslash` des claviers Apple ISO, niveaux absents de CLDR.

## 017 — Périmètre de la tranche jouable J2 (2026-10-11, acceptée)
Un parcours complet et court pour un premier test avec un enfant : accueil → profil (pseudo, local) → vérification du clavier → carte d'un monde (dinosaures) de 6 leçons (`f j`, espace, `d k`, `s l`, `q m`, `e i`) → mini-jeu « L'éclosion » → bilan en étoiles sur la précision seule → pause proposée. Un exercice est une suite de groupes courts, une session par groupe. Sons synthétisés (aucun fichier), pas encore de voix ni de musique. Export/import et installation hors-ligne restent en J5.

## 018 — Ordre d'introduction des touches (2026-10-12, acceptée)
Constat de recherche : commencer par `f j` puis la rangée de repos par paires en miroir est l'usage dominant, par tradition ; aucun ordre n'a été montré supérieur et aucune étude n'en compare chez l'enfant. Le seul critère appuyé par des données (anciennes, adultes et lycéens) est de taper de vrais mots le plus tôt possible. Or la rangée de repos AZERTY ne contient aucune voyelle. Proposition : ordre hybride — `f j`, espace, `d k`, `s l`, `e i`, `r u`, `t n`, `a o`, `q m`, `c p`, `é '`, `g h`, `v b`, `y x`, `z w`, `è à`, `ç ù`, puis majuscules et ponctuation. Premiers mots et phrases à la cinquième leçon (« je », « les », « elle », « je lis ») ; les quatre premières leçons sont raccourcies pour y arriver en quelques minutes.

## 019 — Mots regroupés par thèmes (2026-10-12, acceptée)
Lexique ne contient aucune information thématique. Proposition : croiser Lexique (fréquence, part d'adultes connaissant le mot) avec les catégories du Wiktionnaire français (CC BY-SA 4.0), filtrer, puis **relecture humaine obligatoire** mot par mot (environ la moitié des mots classés automatiquement sont des homographes ou trop rares, et aucun filtre ne reconnaît prénoms et marques). Les thèmes ne deviennent praticables qu'à partir de 13 à 15 lettres apprises (mesuré : cuisine 57 mots, animaux 50, véhicules 43 avec 14 lettres) : avant, le thème est porté par le décor et les phrases. Chaque mot porte ses thèmes et un niveau, pour préparer l'adaptation à l'âge. Sources exclues : Manulex, ARASAAC (non commercial), Dubois-Buyse, ÉOLE (éditeurs), WOLF (licence logicielle).

## 020 — Périmètre de J3 (2026-10-12, acceptée)
Progression complète dans l'ordre de l'ADR-018, en cinq mondes ; banque de mots thématiques et banque de phrases, chaque entrée portant thèmes, niveau et état de relecture ; exercices mêlant suites, mots et phrases, avec davantage de pratique sur les caractères que l'enfant rate ; deux nouveaux mini-jeux (une fusée qui monte, une recette farfelue), choix du jeu par l'enfant ; carte de tous les mondes. Les mots et phrases relus seulement par un agent sont jouables pendant le développement ; la version 1.0 n'utilisera que ceux validés par une personne. La course contre son propre fantôme est reportée à J4.

## 021 — Noms des doigts (2026-10-13, acceptée)
Choix du porteur : les noms exacts partout (« auriculaire », « annulaire », « majeur », « index », « pouce »), dans les textes d'introduction comme dans l'aide à l'écran. Ce sont les mots des ergothérapeutes et l'enfant les apprend en jouant. À la première leçon qui utilise un doigt, le texte le situe en quelques mots (« les doigts juste après les majeurs », « le plus petit doigt »).

## 022 — Périmètre de J4 « Aventure » (2026-10-13, acceptée)
Constats du rapport de recherche : un récit simple suffit et doit avancer parce que l'enfant tape ; le retour sur la compétence nourrit la motivation, la récompense attendue pour la simple participation la mine ; les détails séduisants hors sujet nuisent ; la voix est le seul levier à effet mesuré (sur la compréhension) ; rien n'est démontré sur la course contre son fantôme. Proposition :
- **Récompenses calculées, jamais stockées** : ce que l'enfant a débloqué est une fonction pure de sa progression et d'un catalogue en données. Rien ne peut se perdre, tout est prévisible et affiché à l'avance, les profils existants reçoivent ce qu'ils ont déjà mérité. Le profil ne garde que les **choix** de l'enfant (nom et apparence du compagnon).
- **Compétences et objets** débloqués par leçon réussie (seuil de précision de la leçon, jamais la vitesse ni l'assiduité) ; **trophées** pour une maîtrise plus haute (rangée, monde, touche fragile apprivoisée). Aucun trophée de durée, de jours ou de nombre de parties.
- **Récit minimal en données** : une ouverture et une fin par monde, une ligne par leçon réussie, affichées entre les exercices, jamais pendant la frappe ; textes écrits par un agent, relus par le porteur.
- **Voix** : fichiers pré-générés hors ligne (ADR-011) par une chaîne `tools/voice/`, lecteur dans `audio/`, bouton « Écouter » sur chaque consigne, réglage séparé des sons. La voix et sa licence sont choisies par le porteur sur échantillons.
- **Fantôme** : mini-jeu facultatif, proposé seulement pour rejouer une leçon déjà réussie ; le fantôme suit le rythme de la tentative précédente de l'enfant (allure enregistrée, pas le texte), légèrement ralenti ; pas de défaite, pas d'étoile ni de trophée liés à la vitesse.
- **Préalable** : profil en version 2 avec migration, et lecture tolérante (aujourd'hui un profil au format inattendu est écarté sans message).
Hors périmètre : nouveaux mondes, musique, espace adulte, export/import, installation hors ligne (J5).
Choix du porteur à l'acceptation : l'enfant nomme lui-même son compagnon (quelques suggestions proposées) ; un objet se débloque dès la leçon réussie (seuil de précision de la leçon), les trophées demandent une précision plus haute ; les consignes s'écoutent par un bouton « Écouter », sans lecture automatique, et la voix est choisie par le porteur sur deux ou trois échantillons aux licences vérifiées ; le fantôme est le dernier lot. Ordre : lot 0 (socle : profil version 2, contrats, dette ci-dessous), puis quatre lots parallèles (récompenses et compagnon, récit, voix, fantôme), puis assemblage.

## 023 — Espace avant « ? », « ! » et « : » (2026-10-13, acceptée)
Choix du porteur (réponse donnée dans la session parallèle du même jour, à confirmer à la relecture des phrases) : les phrases suivent la typographie française, avec une espace avant « ? », « ! » et « : ». C'est une espace ordinaire, celle que l'enfant tape à la barre d'espace ; l'espace insécable n'est pas enseignée. À l'écran, le signe reste sur la même ligne que le mot qui le précède. Le point-virgule et les guillemets, absents de la progression, ne sont pas décidés.

## 024 — Répétitions des nouveaux signes et retrait de « ü » (2026-10-13, acceptée)
Mesure : à partir des accents graves, chaque nouveau signe n'était tapé que 2 à 3 fois par exercice, parce qu'une phrase n'en porte qu'un. Décision : l'exercice commence par quelques suites d'échauffement sur les signes de la leçon, jusqu'à un nombre minimal de frappes par signe fixé dans les règles de la progression (donnée, pas code), puis mêle suites, mots et phrases comme avant. « ü » sort de la leçon des trémas : aucun mot courant ne le contient (« ë » et « ï » restent).

## 025 — Résultats récents par touche, leçon des circonflexes en deux (2026-10-13, acceptée)
Demande du porteur : les tout premiers résultats d'une touche ne doivent plus compter quand ils n'ont plus de rapport avec le niveau atteint. Décision : le profil garde, pour chaque caractère, ses résultats partie par partie, et seules les parties les plus récentes comptent, jusqu'à couvrir **30 frappes** de ce caractère (`recentCharWindow` dans les règles de la progression, donnée réglable) ; ce qui est plus ancien n'est plus pris en compte du tout. Trente frappes représentent trois à six parties pour une touche en cours d'apprentissage : assez pour ne pas juger sur un accident, assez peu pour qu'une touche apprivoisée cesse vite d'être traitée comme fragile. Ce taux récent sert au choix des mots et phrases à réviser (à la place du cumul à vie) et aux récompenses de maîtrise d'une touche. Le cumul à vie reste enregistré pour l'espace adulte. Profil en version 3, avec migration.
La leçon des circonflexes est coupée en deux (« ê â », les plus fréquents, puis « î ô û ») : cinq signes à touche morte d'un coup donnaient vingt-cinq frappes d'échauffement d'affilée.

## 026 — Toute phrase à taper a un sens (2026-10-13, acceptée)
Constat du porteur à la relecture : les phrases des premiers paliers, écrites avec une dizaine de lettres, étaient des suites de mots sans sens (« le sel se dresse sur le fil »). Un enfant cherche à les comprendre, pose des questions et perd sa concentration. Décision : une phrase doit décrire une scène qu'on peut se représenter ; l'absurde reste permis et voulu (« la tortue danse sur le toit »), le non-sens ne l'est pas. Les 32 phrases des deux premiers paliers sont réécrites ; quand les lettres manquent, on écrit moins de phrases ou de plus courtes plutôt que de forcer.

## 027 — Récompenses acquises pour toujours, carte parcourue aux flèches, histoire relisible (2026-10-13, acceptée)
Trois décisions du porteur qui précisent l'ADR-022.
- **Ce qui a été débloqué reste acquis.** Une récompense de maîtrise d'une touche se lit sur les résultats récents : une touche redevenue fragile la retirerait, ce qui contredit « rien de perdu ». Le calcul sert donc à débloquer, jamais à reprendre : le profil garde la liste des récompenses déjà obtenues, et ce que l'enfant possède est l'union de cette liste et du calcul. L'ADR-022 disait « jamais stockées » ; elle est amendée sur ce point. Une touche redevenue fragile est retravaillée sans rien retirer : le choix des mots et des phrases la favorise déjà (résultats récents, ADR-025), et le compagnon peut demander de l'aide sur cette touche par une courte quête facultative, sans étoile en jeu (le rapport de recherche relève que les enfants fournissent plus d'effort pour un personnage qu'ils aident). Jamais de reproche, jamais de retrait, pas plus d'une quête de ce genre à la fois.
- **La carte se parcourt aux flèches**, entre les exercices : le compagnon avance d'une étape à l'autre, Entrée pour entrer. Pas de flèches pendant la frappe (la main droite quitterait la rangée de repos) ni de monde à explorer librement (temps hors frappe). Les quêtes sont des exercices mis en récit. Une quête « réparer une phrase » (flèches et Effacer dans un texte) rejoint les quêtes d'informatique de J6.
- **Un écran « l'histoire jusqu'ici »** permet de relire les moments du récit déjà gagnés, y compris pour un enfant qui avait réussi des leçons avant l'arrivée du récit.

## 028 — Voix humaine pour les consignes (2026-10-13, acceptée)
Remplace le choix de synthèse de l'ADR-011. Le porteur a écouté huit des 125 voix de `fr_FR-mls-medium`, seule voix française du moteur Piper sans licence restrictive en amont : toutes butent sur des mots au point de les rendre incompréhensibles. Les voix de synthèse plus propres dérivent d'une voix anglaise réservée à la recherche non commerciale, et personne ne tranche si les fichiers produits en héritent (`research_notes/Voix pré-générées/`). Décision : les consignes sont **enregistrées par une personne** (le porteur ou un proche), avec une page d'enregistrement du projet (`/dev/voix`) qui affiche chaque texte, enregistre au micro, permet de réécouter et de refaire, puis exporte les fichiers nommés par l'empreinte du texte. Rien n'est envoyé nulle part. Les fichiers sont publiés avec le site sous CC BY-SA 4.0, comme les autres contenus : la personne enregistrée doit en être d'accord, et elle est créditée dans `static/ATTRIBUTIONS.md` sous le nom qu'elle choisit. Un texte modifié change d'empreinte : son enregistrement est à refaire, et l'outil le signale.

## 029 — Retours du premier test avec un enfant (2026-10-14, acceptée)
Décisions du porteur après le test du 2026-10-13 (observations dans `docs/SUIVI.md`), à réaliser avant la suite de J4 :
- **Exercices courts** : environ 35 caractères par exercice (moins de 2 minutes pour un débutant à 15-20 caractères par minute), au lieu de 60 à plus de 100 aujourd'hui. Plus d'exercices, plus courts ; les mondes défilent plus vite.
- **Consigne dite automatiquement** à l'ouverture d'une leçon (une phrase, voix humaine de l'ADR-028), avec un réglage pour la couper. Revient sur le « bouton seul » de l'ADR-022 : l'enfant ne lit aucune consigne et ne cliquera pas davantage sur un bouton. Ce n'est pas une lecture automatique enchaînée.
- **Main guide** : deux mains en contour semi-transparentes posées sur la rangée de repos du clavier à l'écran ; à chaque nouvelle touche, le bon doigt glisse vers elle puis revient (auriculaire de l'autre main sur Maj pour une majuscule), **pendant que la voix explique le mouvement**. Systématique dans les premières leçons, puis seulement pour une touche nouvelle ou après une erreur, puis plus du tout ; réglable ; avec les animations calmes, le doigt est mis en évidence sans mouvement. Le jeu ne voit pas les doigts de l'enfant : la main montre, elle ne vérifie pas.
- **Animations** plus longues (assez pour être vues, la cuisine en tête), plusieurs variantes par jeu qui tournent dans un ordre fixe (pas de tirage au hasard), un jeu différent proposé à chaque nouvelle leçon.
- **Animations « Complètes » par défaut** (réglage existant ; le défaut actuel est « Comme l'appareil »). À concilier avec le principe 6 de `CLAUDE.md` (`prefers-reduced-motion`) : vérifier d'abord si l'ordinateur du test avait les effets d'animation de Windows désactivés, ce qui expliquerait des animations « trop courtes et rapides » ; présenter alors au porteur le choix entre ce défaut et le respect du réglage de l'appareil.
