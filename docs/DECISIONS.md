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

## 030 — Durée des exercices et animations de récompense (2026-10-14, acceptée)
Réalise l'ADR-029 (lot T1) et consigne trois réponses du porteur.
- **Exercices.** `targetLength` passe à **35** pour les leçons 5 à 24 (les quatre premières restent à 24). Un mot ou une phrase qui ferait dépasser `targetLength + lengthSlack` (12, règle de progression facultative) est remplacé par une suite : un exercice mesure 35 à 47 caractères (moyenne 40 à 44) au lieu de 60 à 133. Le mot dû par `mix.words` et le minimum de 5 frappes par signe sont inchangés.
- **Animations.** Une récompense commence **400 ms après la dernière frappe** (`--dd-duration-reward-delay`, à la demande du porteur : l'enfant est encore concentré sur sa frappe), dure **1,4 s** (`--dd-duration-reward`) et la récompense en entier dure 2,8 s (`--dd-duration-celebration`). Quatre variantes par jeu, dans un ordre fixe (`groupIndex % 4`). Une touche ne passe la récompense qu'une fois qu'elle a pu être vue.
- **Un jeu différent par leçon.** Le monde des dinosaures offre aussi « La recette farfelue » ; chaque nouvelle leçon propose le jeu suivant du monde ; une leçon déjà jouée garde le jeu choisi. L'enfant peut toujours en choisir un autre.
- **Mouvement réduit : option C du porteur.** Les effets d'animation de Windows étaient désactivés sur l'ordinateur du test (vérifié), d'où des animations « trop courtes et rapides ». Le défaut « Comme l'appareil » est **conservé** (principe 6 de `CLAUDE.md`) ; en revanche le mode réduit ne supprime plus les récompenses : il les montre en fondu, sans déplacement, avec la même durée.
- **Rappel « regarde l'écran »** : demandé par le porteur, inscrit au lot T3 (consignes dites), non préparé en T1.

## 031 — Main guide sur le clavier à l'écran (2026-10-15, acceptée)
Réalise la « main guide » de l'ADR-029 (lot T2).
- **Dessin.** Deux mains en contour, semi-transparentes, posées sur le clavier à l'écran : chaque bout de doigt sur sa touche de repos (profil de doigté), les pouces sur la barre d'espace, les paumes coupées par le bas du clavier. Tout se calcule à partir de la géométrie et du profil de doigté (`keyboard/hands.ts`, sans DOM) : une autre disposition ou un autre doigté n'a besoin d'aucun code.
- **Mouvement.** Pour la touche attendue, le bon doigt s'allonge vers elle (0,5 s), y reste (0,4 s), puis revient ; il reste coloré jusqu'à la touche suivante. Pour une majuscule, l'auriculaire de l'autre main va aussi sur Maj ; pour AltGr, le pouce droit. Une touche de repos (F, J…) est montrée par une petite pression vers le bas. Durées et courbe viennent des tokens. Animations calmes : le doigt se colore sans bouger.
- **Quand.** Leçons 1 à 4 : chaque touche. Leçons 5 à 15 : seulement les touches nouvelles de la leçon (et les majuscules qu'elle débloque) et la touche qui suit une erreur. À partir de la leçon 16 : plus du tout. Ces bornes sont des données (`handGuide` dans les règles de la progression). Sur l'écran d'avant-leçon, la main montre une fois chaque touche nouvelle, l'une après l'autre.
- **Réglage** « Main qui montre le bon doigt » : Selon les leçons (défaut), Toujours, Jamais. Profil en **version 4** (migration : « Selon les leçons »). Le lot R2 passera donc le profil en version 5.
- La main **montre**, elle ne vérifie pas : le jeu ne voit pas les doigts de l'enfant. La voix qui explique le mouvement viendra avec le lot T3.

## 032 — Retours du porteur sur T1 et T2 (2026-10-15, acceptée)
Six remarques du porteur après avoir vu T1 et T2, toutes acceptées ; principe commun : l'enfant ne lit pas et son regard dérive, il faut montrer, répéter et surprendre.
1. **Réglages en haut** : une barre en haut de la carte, de l'avant-leçon, du bilan et de la pause (nom du joueur, « Réglages » avec une roue dentée, « Changer de joueur ») ; jamais pendant la frappe. Les réglages s'ouvrent aussi depuis la pause d'un jeu (retour à l'avant-leçon) et reviennent toujours à l'écran d'où ils ont été ouverts.
2. **Choix du jeu en images** : chaque jeu devient une grande image qui lance la partie ; le jeu proposé est plus grand. Fait avec le lot T3, qui refait l'avant-leçon.
3. **Étoiles célébrées** : grandes étoiles qui apparaissent une par une, un petit son par étoile, une gerbe de confettis brève ; en animations calmes, un fondu sans confettis ; aucune célébration à zéro étoile.
4. **Démonstration répétée** : sur l'avant-leçon, la main refait la démonstration des touches nouvelles toutes les 3 secondes (`--dd-duration-guide-pause`) tant que l'écran est affiché.
5. **Scènes surprises** propres à chaque jeu, débloquées par la réussite des leçons, en ordre fixe (lot A1, propositions dans `docs/SCENES_SURPRISES.md`).
6. **Main complète au 2ᵉ monde** : chaque touche montrée jusqu'à la leçon 11, puis les touches nouvelles et après une erreur jusqu'à la leçon 24 (amende l'ADR-031).

## 033 — Consignes montrées et dites, choix du jeu en images (2026-10-15, acceptée)
Réalise le lot T3 (ADR-029) et le point 2 de l'ADR-032.
- **Avant-leçon** : numéro, titre, consigne (plus petite) avec un bouton « Écouter », clavier avec la main qui répète la démonstration, puis les jeux du monde en **grandes images** : chaque image lance la leçon avec ce jeu (« Jouer à … »). Le jeu proposé pour la leçon vient en premier, plus grand, encadré, et reçoit le focus (Entrée lance la partie) ; l'image bouge doucement toutes les 3 secondes, les autres jeux font un petit signe pour montrer qu'on peut les prendre. Plus de cases à cocher ni de bouton « C'est parti ».
- **Consigne dite automatiquement** à l'ouverture de l'avant-leçon (voix humaine de l'ADR-028), une seule fois ; le bouton « Écouter » la redit. Nouveau réglage « Voix qui lit les consignes » (Oui / Non, `Settings.voiceEnabled` existant). Tant que les enregistrements ne sont pas publiés (`static/voice/fr/manifest.json`), rien n'est dit et le bouton n'apparaît pas : le site marche sans voix.
- **Rappel « regarde l'écran »** : tous les 4 groupes (`lookReminderEveryGroups` dans `content/common/play-rules.json`, 0 pour jamais), entre deux groupes et jamais pendant la frappe ni après le dernier, un bandeau avec deux yeux dit « Tes yeux sur l'écran : tes doigts savent où aller ! », et la voix le dit. Aucun reproche. Le texte est ajouté à la page d'enregistrement `/dev/voix` (rubrique « Rappel pendant les jeux »).
- La voix qui **explique le mouvement** de la main (ADR-029) se résume pour l'instant à la consigne de la leçon, dite pendant que la main montre les touches ; des phrases propres à chaque mouvement viendront si le porteur le souhaite après avoir entendu le résultat.

## 034 — Scènes surprises, premier paquet (2026-10-15, acceptée)
Réalise le point 5 de l'ADR-032 avec le premier paquet conseillé de `docs/SCENES_SURPRISES.md`, en attendant les choix du porteur sur les 40 propositions.
- **Scènes** : éclosion — chute par le bas (étoiles autour de la tête), coquille qui éclate (le bébé garde un morceau en chapeau), triple saut, coucou ; recette — saut périlleux avec éclaboussure, rebond sur le bord, plongeoir, rot de marmite ; fusée — looping, tonneau, habitant qui saute de joie et salue, feu d'artifice doux ; compagnon du bilan — cinq danses, une par leçon dans l'ordre.
- **Déblocage** par la maîtrise : une nouvelle scène par jeu toutes les **2 leçons réussies** (`content/common/scenes.json`), calculée à partir de la progression, jamais stockée (`engine/rewards/scenes.ts`). Dans un exercice, les scènes débloquées passent en premier, puis les quatre entrées communes, et on recommence : ordre fixe, aucun hasard.
- **Durée** : 2 secondes (`--dd-duration-scene`) après le délai de 0,4 s ; une touche ne passe la scène qu'une fois finie. En animations calmes, pas de scène : l'entrée commune en fondu.
- La page d'essai `/dev/jeux` montre toutes les scènes du jeu d'emblée (case à cocher), pour les voir sans avoir réussi de leçon.

## 035 — Toutes les scènes surprises (2026-10-16, acceptée)
Le porteur accepte les 40 propositions de `docs/SCENES_SURPRISES.md` ; le lot A2 réalise les 27 qui restaient après l'ADR-034.
- **Douze scènes par jeu** (`content/common/scenes.json`, dans l'ordre de déblocage) : les quatre de l'ADR-034, puis éclosion — bouchon, toupie, culotte de coquille, bateau, haltérophile, bâillement, jumeaux, roulade ; recette — toboggan, catapulte, parachute, ballon, couvercle gourmand, planche, vapeur en forme (cœur, étoile ou dino selon le groupe), vague ; fusée — créneau, cache-cache, cerceau, comète, vache de l'espace, fumée en cœur, cadeau, lunettes de soleil. Toujours une scène de plus par jeu toutes les 2 leçons réussies : toutes sont débloquées à la fin du parcours (24 leçons).
- **Fin d'exercice** : la scène du bilan est présentée comme une **photo souvenir** (cadre, date du jour) ; à la fin d'un monde, les bébés dinos **défilent** (un par leçon du monde) ; un groupe tapé **sans erreur** fait s'échapper une **note de musique** de sa dernière touche sur le clavier à l'écran. Rien de tout cela en animations calmes, sauf la photo, immobile.

## 036 — Retours du porteur après le parcours en ligne (2026-10-16, acceptée)
- **Rappel** : le texte devient « Regarde seulement l'écran, pas tes doigts ;-) » (amende l'ADR-033). Il reste **4 secondes** (`--dd-duration-reminder`) et une touche ne le raccourcit pas ; la voix le dira avec le nouveau texte (à enregistrer tel quel).
- **Rien ne bouge quand un message apparaît** : le doigt à utiliser, le rappel et l'aide Verr. Maj partagent une seule case de hauteur fixe sous le texte à taper (`.slot` de `GameShell`) ; le clavier ne descend plus. Règle : tout message qui vient et qui part dans un jeu se place dans cette case, jamais dans le flux de la page.
- **Écran de leçon compact** : touches du clavier plus petites (`--dd-size-key-unit-compact`), liste des touches sur une ligne, images de jeu plus petites ; les jeux restent entièrement visibles sur un portable de 720 px de haut (test). L'image de l'œuf ne déborde plus sur son titre.

## 037 — Récompenses et compagnon (2026-10-16, acceptée)
Réalise le lot R2 (ADR-022, ADR-027) avec le catalogue validé par le porteur (`docs/RECOMPENSES.md`, réponse « oui pour tout »).
- **Catalogue en données** (`content/fr/rewards/azerty-decouverte.json`) : 24 objets à porter, un par leçon réussie, regroupés en une tenue par monde, sur 7 emplacements (tête, visage, cou, corps, dos, main, pieds ; un objet par emplacement) ; 5 tours appris, un par monde terminé ; 10 trophées : une médaille par monde quand chaque leçon a au moins 2 étoiles (90 %), et 5 « touches apprivoisées » (rangées du milieu, du haut, du bas, accents, ponctuation : au moins 20 frappes récentes de chaque touche, au plus 1 erreur sur 10). 8 couleurs au choix dès le départ et 8 idées de nom ; l'enfant tape le nom qu'il veut.
- **Acquis pour toujours** : profil en **version 5** (`earnedRewardIds`, ajout seul, jamais de retrait ; `helpQuest`). Ce que l'enfant possède = cette liste ∪ ce que la progression débloque. À l'ouverture d'un profil, ce qu'il a déjà mérité y est ajouté sans annonce (en mémoire, enregistré à la partie suivante : ouvrir un profil ne le réécrit jamais) ; seul ce qui est gagné ensuite est annoncé.
- **Bilan** : une carte « Nouveau ! » par récompense gagnée, avec « Le mettre » pour un objet ; au premier bilan réussi d'un compagnon sans nom, il demande « Tu me donnes un nom ? » (« Plus tard » possible). Un écran « Mon compagnon », ouvert depuis la barre du haut, permet de le nommer, de choisir sa couleur et ses objets, de voir ses tours et ses trophées ; ce qui n'est pas encore gagné apparaît en silhouette avec ce qu'il faut réussir.
- **Quête « le compagnon a besoin d'aide »** (`content/common/help-quest.json`) : une touche d'une leçon réussie dont plus de 2 frappes sur 10 sont fausses sur au moins 10 frappes récentes ; la plus difficile, une seule à la fois ; proposée dans une bulle du compagnon en haut de la carte, vers laquelle la carte défile (« Oui ! » / « Plus tard »), un exercice d'une vingtaine de caractères qui la fait taper au moins 6 fois, sans étoiles ni pourcentage, terminé par un merci et une danse ; ses frappes comptent dans les résultats récents de la touche, pas dans les leçons. Pas de nouvelle quête avant une autre leçon jouée. Aucune récompense propre à la quête.

## 038 — Jeux variés et animation plus tardive (2026-10-16, acceptée)
Retours du deuxième test avec un enfant (voir `docs/SUIVI.md`).
- **Un jeu différent à chaque fois** : une leçon jamais jouée propose le jeu de sa place dans le monde ; une leçon déjà jouée propose le **jeu qui suit** celui avec lequel elle a été jouée en dernier (amende l'ADR-032, point « le jeu choisi est retrouvé »). Cause du constat « toujours des œufs » : une leçon déjà jouée reproposait le jeu mémorisé du monde. L'enfant peut toujours prendre l'autre image ; l'image cliquée est celle qui démarre.
- **Délai de l'animation** : 0,6 s après la dernière frappe au lieu de 0,4 s (`--dd-duration-reward-delay`).

## 039 — Suite du deuxième test : exercices, étoiles, main, pause (2026-10-16, acceptée)
Décisions du porteur (« oui à tout ») sur les retours du deuxième test.
- **Exercices à 8 étapes au plus** : `groupCount` 8 pour toutes les leçons et groupes de 4 à 6 caractères à partir de la leçon 5 ; un exercice mesure 34 à 47 caractères (jusqu'à 18 pour les deux premières leçons), 6 à 8 étapes. Le minimum de 5 frappes par signe nouveau tient.
- **Étoiles** : la 3ᵉ étoile s'obtient à **95 %** (97 % avant). Quand il manquait peu (3 points, `starAlmostMargin`), l'étoile suivante est dessinée à moitié pleine et le bilan dit « Tu y es presque : l'étoile suivante n'est pas loin ! ». La précision seule compte toujours.
- **Main guide** (amende l'ADR-031) : chaque touche seulement aux **2 premières leçons** ; ensuite la main montre les touches nouvelles, la touche qui suit une erreur et la touche attendue après **3 secondes sans frappe** (`hesitationMs`), jusqu'à la leçon 24. L'enfant lit d'abord le texte, la main l'aide ensuite.
- **Pause** : proposée après **4 exercices terminés** (`breakAfterExercises`), en plus des 12 minutes ; l'enfant peut continuer.
- **Rappel** : « Regarde toujours l'écran, jamais tes doigts ;-) » (amende l'ADR-036 : « toujours » au lieu de « seulement », que l'enfant prenait pour le prochain texte seulement).

## 040 — Nouveaux jeux et mondes mêlés (2026-10-16, acceptée)
Réponse du porteur à la lassitude des dinos et des aliments à chaque monde (« 4b directement », plus des visites d'un monde dans un autre). Remplace le choix de jeux par monde de l'ADR-020.
- **Trois jeux de plus**, chacun avec ses 8 scènes surprises (6 propres et 2 visites) : **le dessin magique** (un dessin se trace trait après trait, 6 sujets fixes, puis se colore), **le train qui s'allonge** (un wagon par groupe, le train part à la fin) et **la tour de blocs** (un bloc par groupe, un drapeau tout en haut). Même contrat que les autres : `data-probe`, progression en `role="img"`, répliques `game_<id>_quip_<n>`, entrées communes puis scènes débloquées ; ils tiennent avec 5 à 10 groupes.
- **Deux jeux par monde, de son thème** : dinosaures — éclosion, dessin ; cuisine — recette, tour ; animaux — dessin, tour ; espace — fusée, tour ; véhicules — train, fusée. L'œuf ne sort plus des dinos, la marmite de la cuisine.
- **Visites d'un autre monde**, toutes les trois scènes dans chaque jeu (positions 3, 6 et 9 de la liste, donc vues dès la 6ᵉ leçon réussie) : éclosion — bébé en toque, soucoupe, voiture qui klaxonne ; recette — dino qui attrape l'ingrédient au vol, fusée livreuse, girafe ; fusée — dino qui monte à bord, planète-cuisine, voiture ; dessin — dino derrière la feuille, fusée qui suit le trait ; train — dino à la fenêtre, fusée sur le toit ; tour — dino qui cale le bloc, fusée-grue.
- Chaque jeu a **douze à quinze scènes** (liste dans `content/common/scenes.json`), débloquées toutes les 2 leçons réussies.

## 041 — Pouce gauche retiré de la main guide, trophées des rangées (2026-10-16, acceptée)
Deux demandes du porteur après avoir vu R2 et la main guide.
- **Un seul pouce sur la barre d'espace** (amende l'ADR-031) : seul un pouce qui a une touche de repos dans le profil de doigté est dessiné ; en dix doigts, c'est le pouce droit. Deux pouces sur l'espace laissaient croire que les deux pouvaient la frapper. La main gauche montre ses quatre doigts.
- **Trophées des rangées** (amende l'ADR-037, option 1 sur 3 proposées) : trois grosses touches sur une estrade, avec les trois premières lettres de la rangée lues dans le catalogue (« Q S D », « A Z E », « W X C » en AZERTY, aucune lettre écrite dans le dessin). Dans la silhouette d'un trophée pas encore gagné, les lettres et les symboles restent découpés : chaque trophée se reconnaît avant d'être gagné.

## 042 — Ton et fil du récit (2026-10-17, acceptée)
Décisions du porteur sur le brouillon du récit (`docs/RECIT_BROUILLON.md`, version 2 validée « ok pour tout »), à réaliser par le lot S2.
- **Ton des 8-12 ans** : phrases courtes (6 à 12 mots) et mots simples, car beaucoup d'enfants dys ou TDAH lisent en dessous de leur âge ; mais un ton qui ne fait pas « petit » : humour pince-sans-rire, compagnon gourmand et sûr de lui, pas de félicitations dans le récit (le bilan et les étoiles s'en chargent).
- **Fil conducteur** : le carnet de voyage du compagnon, dont chaque monde remplit une page ; la dernière phrase rend la main à l'enfant (« La suite, c'est toi qui l'écris »).
- **Le nom du compagnon n'apparaît jamais dans le récit** (option A) : les textes sont dits par une voix enregistrée, qui ne peut pas dire un nom choisi par l'enfant.
- **Enregistrement** : d'abord les 10 ouvertures et fins de monde ; les 24 lignes de leçon restent écrites en attendant.

## 043 — Récit dit et illustré entre deux exercices (2026-10-17, acceptée)
Réalise le lot S2 (ADR-022, ADR-027, ADR-042) avec les 34 textes validés.
- **Données** : `content/fr/story/azerty-decouverte.json`, validé contre la progression (chaque monde a son ouverture et sa fin, chaque leçon sa ligne). Chaque texte **nomme son image** (`openingArt`, `endingArt`, `art`), comme `artId` pour les récompenses : une autre langue réutilise les dessins sans code. Un moment du récit dit aussi son monde et sa leçon.
- **Quand** : l'ouverture d'un monde avant l'avant-leçon, tant qu'aucune leçon de ce monde n'a été jouée ; la ligne d'une leçon réussie pour la première fois, puis la fin du monde, **après le bilan, quand l'enfant le quitte** (choix du porteur : il voit d'abord ses étoiles), quelle que soit la sortie (leçon suivante, carte, rejouer, pause). Prendre la leçon suivante à la fin d'un monde enchaîne fin et ouverture du monde suivant. Jamais pendant la frappe.
- **Écran** : le titre du monde, une image, une phrase **dite une fois** à l'apparition (réglage « Voix qui lit les consignes » ; rien tant qu'aucun enregistrement n'est publié), le bouton « Écouter », puis « Continuer » qui prend le focus après un court délai (Entrée sur le bilan ne le saute pas). Pas de barre du haut.
- **Images** : 34 dessins SVG fixes, sans animation, dans le style des jeux et avec les tokens `color.story.*` ; le compagnon y apparaît avec la couleur et les objets choisis par l'enfant (`StoryDino`), jamais son nom. Seuls textes dessinés : « miam » et le « A » d'apprenti, dans `messages/`. Page d'essai `/dev/recit`.
- **« L'histoire jusqu'ici »** : ouverte depuis la carte, une page par monde avec les moments déjà gagnés, chacun avec son image et « Écouter ». Rien n'est stocké : tout se déduit de la progression (`storySoFar`), donc un enfant qui avait réussi des leçons avant l'arrivée du récit y retrouve ses moments ; une ouverture n'y figure qu'une fois une leçon du monde jouée.
- **Enregistrement** : `/dev/voix` propose d'abord les 10 ouvertures et fins, puis les consignes et le rappel, puis les 24 lignes ; l'outil d'import connaît le récit (`tools/voice/config.json`).
