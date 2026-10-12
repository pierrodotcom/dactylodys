# Feuille de route DactyloDys

Fondée sur la synthèse de recherche `reports/Dactylo ludique TDAH dysgraphie.md` (notes sources dans `research_notes/`). État d'avancement : `docs/SUIVI.md`. Décisions : `docs/DECISIONS.md`.

## 1. Ce que la recherche change au projet

| Constat | Conséquence |
|---|---|
| Aucun outil libre, ludique, francophone et pensé pour les dys/TDAH n'existe. Les deux seuls outils francophones dédiés sont l'un payant, l'autre de licence inconnue. | Le projet comble un vrai manque. |
| Chez l'enfant dysgraphique ou TDC, le clavier est d'abord **plus lent** que la main ; il ne devient utile qu'après un apprentissage structuré (25-30 h au minimum, souvent 1 à 2 ans). Le bénéfice démontré est la **lisibilité**. | Viser la durée : le vrai défi est de tenir des mois, pas de séduire une semaine. Objectif affiché : taper aussi vite qu'on écrit à la main. |
| La vitesse dépend d'un doigté **constant** et du regard libéré, pas du nombre de doigts. | Mode 10 doigts par défaut, **doigté adapté** possible ; retrait progressif de l'aide visuelle. |
| Aucune étude ne porte sur l'apprentissage du clavier chez l'enfant TDAH. | Les choix TDAH sont des inférences : à valider par des tests avec des enfants, dès le jalon J2. |
| TDAH : préférence forte pour la récompense immédiate, usure de l'attention en cours de séance, sensibilité à l'échec. | Retour à chaque frappe, mini-jeux de 2-4 min, erreur sans punition, variété. |
| Les récompenses attendues minent la motivation intrinsèque ; le récit fait mieux que points et badges ; les classements sont l'élément le plus nocif ; la nouveauté s'épuise en 4 semaines environ. | Récit + choix + collection ; récompenses de maîtrise ; pas de classement ; nouveaux mondes réguliers. |
| Les détails amusants hors sujet nuisent à l'apprentissage. | L'humour est **dans ce qu'on tape**, pas autour. |
| Les polices « dyslexie » n'ont pas d'effet ; taille, espacement et synthèse vocale en ont. | Réglages de taille et d'espacement, consignes écoutables. |
| Sur le web, la disposition du clavier ne peut pas être détectée de façon fiable et les touches mortes diffèrent selon navigateur et OS. | Le moteur de frappe est le **premier** chantier, testé sur matériel réel. |
| L'offre gratuite existante vit de la publicité (jusqu'à 631 partenaires publicitaires) et de séries de 120 jours. | Zéro pub, zéro traceur, zéro série : c'est un argument en soi. |

## 2. Concept retenu

**Un grand jeu-cadre fait de nombreux mini-jeux courts.** L'enfant accompagne une créature-compagnon (non genrée, personnalisable) dans un voyage à travers des **mondes** : dinosaures, espace, cuisine farfelue, fonds marins, garage de véhicules, forêt… Chaque monde introduit un groupe de touches et renouvelle décor, humour et mini-jeux.

- **Un seul moteur de frappe**, plusieurs habillages : les mini-jeux changent, la compétence travaillée reste suivie finement.
- **Mini-jeux** (2-4 min) : lettres qui tombent ou traversent l'écran, course contre son propre fantôme, recettes à assembler en tapant les ingrédients, réparation de fusée, fouille de fossiles, dialogues absurdes à compléter…
- **Progression du personnage** : chaque touche maîtrisée débloque une compétence ou un objet visible (prévisible, jamais tiré au sort) ; trophées de maîtrise ; « tournois » contre soi-même ou coopératifs.
- **Quêtes bonus d'informatique** : Entrée, Effacer, Majuscule, flèches, copier-coller, enregistrer, l'arobase, la souris et le pavé tactile, écrire un message.
- **Espace adulte** (parent, enseignant, ergothérapeute) : progression, précision par touche, réglages, export.

## 3. Méthode pédagogique

1. **Étalonnage** au premier lancement : disposition du clavier, doigté (10 doigts ou adapté), réglages sensoriels, lettres du prénom en premier (pratique d'ergothérapeutes).
2. **Ordre des touches natif AZERTY et français** : ancrage sur `f j` et la rangée de repos, mais voyelles très tôt pour taper de vrais mots (la rangée de repos AZERTY n'a aucune voyelle) ; puis lettres par fréquence en français, accents fréquents tôt, majuscules, ponctuation, chiffres. Aucune étude ne compare des ordres chez l'enfant : l'ordre est une donnée, ajustable après tests (voir `research_notes/Ordre des touches et mots thématiques/`).
3. **Syllabes → mots fréquents → phrases drôles → petits textes utiles** (un message, une recette, une légende).
4. **Passage sur la précision et la régularité**, jamais sur la vitesse.
5. **Révision espacée** des touches fragiles, mêlée aux nouveautés.
6. **Séance type** : 10-15 minutes, 3 à 5 fois par semaine ; le jeu propose de s'arrêter.

## 4. Problématiques et solutions retenues

| Problématique | Solution |
|---|---|
| Tenir la motivation sur des mois | Mondes renouvelés, récit, choix, humour, récompenses de maîtrise, séances courtes |
| Engager sans rendre dépendant | Points d'arrêt naturels, aucun streak, classement, tirage aléatoire ou notification |
| Frustration et sensibilité à l'échec | Erreur réparable, difficulté adaptative plutôt facile, aucun échec définitif |
| Hétérogénéité des profils | Doigté adaptable, réglages sensoriels séparés, mode calme, taille et espacement réglables |
| Compatibilité tous navigateurs et OS | Site statique standard, moteur de frappe jugé sur le caractère, traces réelles rejouées, tests sur 3 moteurs |
| Plusieurs claviers et langues | Dispositions, progressions et contenus en données ; interface traduite séparément |
| Uniformité visuelle sans valeurs en dur | Design tokens, thèmes par données, lint bloquant |
| Budget nul | Site statique, hébergement gratuit, assets CC0, voix pré-générées, aucun backend |
| Enfants mineurs et vie privée | Aucun compte, aucune donnée hors de l'appareil, aucun tiers |
| Perte de la progression (Safari efface le stockage après 7 jours sans visite) | Installation en application, export/import par fichier, synchro facultative plus tard |
| Graphismes sans illustrateur | Vectoriel plat + banques CC0 ; illustrations sur mesure ensuite |
| Projet mené par une personne et des agents | Règles écrites, tests automatiques, lots isolés en worktrees, suivi dans `docs/` |
| Validation scientifique limitée | Tests avec enfants dès J2 ; contact d'ergothérapeutes ; aucune promesse médicale |

## 5. Jalons

Chaque jalon se termine par `npm run verify` vert, une démonstration déployée et la mise à jour de `docs/SUIVI.md`.

| Jalon | Contenu | Critère de sortie |
|---|---|---|
| **J0 Fondations** | Dépôt, licence, stack, CI, tokens, i18n, lint strict, déploiement automatique, page d'accueil vide mais conforme | Une PR déclenche tests + prévisualisation ; aucune valeur en dur possible |
| **J1 Moteur de frappe** | Modèle de disposition, AZERTY France PC et Mac, adaptateur d'entrée, enregistreur de traces, mesures | Traces réelles rejouées pour Chrome, Firefox, Safari, Edge × Windows, macOS ; accents et touches mortes corrects |
| **J2 Tranche jouable** | Étalonnage, un monde, un mini-jeu, premières leçons, profil local, réglages d'accessibilité | **Test avec au moins un enfant** : il joue 10 minutes seul et veut recommencer |
| **J3 Pédagogie complète** | Toutes les lettres, accents, majuscules, ponctuation ; progression adaptative ; 3-4 mini-jeux ; contenus français | Un enfant peut aller de zéro à des phrases complètes |
| **J4 Aventure** | Carte des mondes, compagnon et personnalisation, compétences, trophées, récit, humour, sons et voix | Deux semaines d'usage réel sans lassitude signalée |
| **J5 Version 1.0** | Espace adulte, export/import, mode hors-ligne installable, audit d'accessibilité, documentation | Ouverture publique |
| **J6 Ouverture** | Anglais + QWERTY, AZERTY belge, QWERTZ suisse, canadien, BÉPO ; quêtes d'informatique ; traduction communautaire | Une disposition s'ajoute sans toucher au code |
| **J6 bis Adaptation à l'âge** | Tranche d'âge choisie au profil (8-9 ans, 10-12 ans) : vocabulaire, longueur et complexité des textes, rythme, puis thèmes et graphismes plus détaillés pour les plus grands. Préparé dès J3 : chaque mot porte un niveau. | Un enfant de 12 ans ne trouve pas le jeu « bébé », un enfant de 8 ans n'est pas noyé |
| **J7 Extensions** | Synchro facultative, illustrations sur mesure, défis coopératifs, partenariats ergothérapeutes et associations | Selon retours |

## 6. Risques principaux

| Risque | Parade |
|---|---|
| Comportements clavier imprévus selon matériel | J1 entièrement dédié ; enregistreur de traces ; appel à testeurs |
| Outillage plus récent que les connaissances des modèles | Lire la documentation de la version installée ; versions épinglées |
| Lassitude malgré tout | Mesurer en test réel dès J2 ; architecture qui rend un nouveau mini-jeu peu coûteux |
| Qualité graphique insuffisante | Direction artistique simple et cohérente par tokens avant tout contenu |
| Dérive du périmètre | Un jalon à la fois ; tout ajout passe par `docs/SUIVI.md` |
| Licences d'assets ou de données | Registre `static/ATTRIBUTIONS.md` ; sources interdites listées dans les règles |
