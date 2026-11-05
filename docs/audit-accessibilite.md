# Audit d'accessibilité (J5, lot 4)

Référence : WCAG 2.2 niveau AA (ADR-054). Audit du 5 novembre 2026, sur Chromium et Firefox, en thème clair et sombre. Sert de base à la page « Accessibilité » (lot 5).

## Méthode

- axe (règles WCAG A et AA, jusqu'à 2.2, dont la taille des cibles) sur chaque écran, en clair et en sombre. Les écrans déjà couverts par les specs existantes n'ont pas été dupliqués ; `e2e/accessibility.spec.ts` ajoute ceux qui manquaient (formulaire du code adulte, écrans à 320 px).
- Recadrage : chaque écran ouvert à 320 × 640 px (équivalent de 1280 px zoomé à 400 %), en vérifiant qu'aucun défilement horizontal n'apparaît.
- Contrastes : paires de tokens vérifiées par `tests/schemas/tokens.test.ts` dans les deux thèmes. Pour le texte posé sur un dessin, là où axe ne conclut pas, on vérifie les tokens à la main.
- Clavier, focus et lecteur d'écran : parcours au clavier seul, focus suivi à chaque changement d'écran, noms, rôles et régions `aria-live` relus dans le code et vérifiés par des tests.
- Un essai réel avec NVDA reste à faire par le porteur (`docs/essai-nvda.md`).

## Constats

Chaque constat donne l'écran, le critère, ce qui a été vu, puis s'il est corrigé.

### Tous les jeux et l'avant-leçon — 1.4.10 Recadrage

Le clavier à l'écran gardait sa taille, 836 px de large : la page défilait de côté sous 900 px environ, donc aussi à 200 % de zoom sur un portable.
**Corrigé.** Le clavier rétrécit pour tenir dans la place qu'il a, sans changer de forme (`KeyboardView`). Sur grand écran, rien ne change.

### L'éclosion — 1.4.10 Recadrage

L'œuf, le texte et le dino restaient sur une seule ligne. Sur un écran étroit, le texte n'avait plus de place.
**Corrigé.** Le texte passe sous l'œuf quand la place manque. Sur portable, l'écran ne change pas.

### Carte des mondes — 1.4.10 Recadrage

Le chemin en zigzag (décalage fixe de 64 px) et les étoiles à côté du titre faisaient 420 px de large au minimum.
**Corrigé.** Le décalage et les marges rétrécissent sur un écran étroit, et les étoiles passent sous le titre de la leçon si besoin. Le compagnon garde sa place à côté de la leçon.

### Choix du jeu, écrans à titre (`ScreenFrame`) — 1.4.10 Recadrage

La colonne de la page s'élargissait selon son contenu.
**Corrigé.** La colonne ne dépasse jamais la largeur de la page, et les mots longs vont à la ligne.

### Espace adulte (accueil, bilan) — 1.4.10 Recadrage

Le champ « Recharger une sauvegarde » et les tableaux élargissaient la page jusqu'à 440 px.
**Corrigé.** Le champ prend la largeur disponible. Un tableau trop large défile seul dans son cadre, que le clavier peut atteindre tant qu'il défile.

### Mon compagnon — 2.4.11 Focus non masqué

En revenant en arrière avec Maj + Tab, l'objet qui recevait le focus passait sous l'aperçu du compagnon, qui reste collé en haut de l'écran.
**Corrigé.** La page garde une marge de la hauteur de l'aperçu : l'élément qui a le focus apparaît toujours en dessous.

### Code de l'espace adulte, mesure de la vitesse à la main — 3.3.1 et 4.1.2

Le message d'erreur était bien annoncé, mais il n'était pas relié à son champ. Relu plus tard, le champ ne disait pas pourquoi il était refusé.
**Corrigé.** Le champ en cause porte `aria-invalid` et `aria-describedby`, qui pointent vers le message.

### Jeux — 4.1.3 Messages d'état

Avant, le lecteur d'écran n'annonçait que la récompense de fin de groupe. Le texte à taper n'était lisible qu'en allant le chercher, et une erreur ne disait pas quelle touche était attendue.
**Corrigé.** Une seule région `role="status"` dit maintenant trois choses : le texte d'un groupe quand il apparaît, la touche attendue après une erreur, et la récompense. Rien n'est dit sur une touche juste, puisque le lecteur répète déjà chaque frappe. Une même erreur répétée est redite. Le jeu n'est pas présenté comme jouable sans la vue.

### Contrastes — 1.4.3 et 1.4.11

Les contrastes n'étaient pas vérifiés pour deux cas : le texte d'erreur posé sur le fond de la page, et les bulles des jeux, qu'axe ne sait pas juger sur un dessin.
**Vérifié, conforme** dans les deux thèmes. Ces paires sont ajoutées au test des tokens. La bulle garde sa surface claire en thème sombre ; son contour se lit sur cette surface.

### Clavier à l'écran sous la main guide — 1.4.3

La main semi-transparente passe au-dessus de certaines étiquettes de touches, et axe ne conclut pas.
**Non corrigé**, volontairement. La main est une aide visuelle passagère : elle montre le doigt à utiliser. La lettre attendue est aussi écrite en grand dans « Touche F — index gauche », hors du clavier. Le réglage « Main qui montre chaque touche : jamais » la retire.

### Clavier à l'écran sur un écran très étroit — 1.4.4 et 1.4.10

À 320 px, le clavier entier tient dans la page, mais ses étiquettes deviennent petites, environ 7 px.
**Accepté.** Le clavier est un dessin en deux dimensions, ce que le critère 1.4.10 admet. Le texte à taper et la touche attendue restent en grand au-dessus. Le réglage « Afficher le clavier à l'écran » permet de le masquer.

### Titre de l'onglet sur `/jouer` — 2.4.2 Titre de page

Le titre de l'onglet reste « Jouer » d'un écran à l'autre (carte, leçon, jeu). Chaque écran a pourtant son titre de niveau 1, qui prend le focus à son arrivée.
**Non corrigé.** C'est conforme, car le titre décrit bien la page. Un titre d'onglet propre à chaque écran serait un confort de plus : piste pour plus tard.

## Déjà conforme (vérifié, rien à changer)

- **Clavier.** Tout se fait au clavier, sans piège. Échap sort de chaque écran par le bouton du haut. La carte se parcourt avec les flèches et n'occupe qu'un seul arrêt de Tab. La pause est un vrai dialogue modal, et le jeu devient inerte derrière lui.
- **Focus.** Le contour de focus est un token, visible dans les deux thèmes, et le test des tokens vérifie qu'il a assez de contraste. À chaque changement d'écran, le focus va sur le titre de niveau 1, ou sur le champ de saisie dans un jeu.
- **Cibles.** Elles font au moins 48 px (token `touch-target-min`). La règle axe de taille des cibles (2.5.8) passe partout.
- **Mouvement.** Le mode calme et `prefers-reduced-motion` sont respectés : fondu sans mouvement pour les récompenses, aucune scène surprise, compagnon placé sans marcher. Des tests existants le vérifient.
- **Lecteur d'écran.** Repères `main`, `header` et `nav`, et langue `fr` sur la page. Le clavier à l'écran est masqué au lecteur, la touche et le doigt sont dits en texte. Les étoiles et la progression des jeux ont un nom. Les erreurs de formulaire passent par `role="alert"`, et les confirmations (réglage enregistré, fichier téléchargé, sauvegarde rechargée) par `role="status"`.

## Tests ajoutés

- `e2e/accessibility.spec.ts` :
  - recadrage à 320 px de tous les écrans de l'enfant, des six jeux et de l'espace adulte ;
  - focus non masqué sur l'écran du compagnon ;
  - espace adulte parcouru au seul clavier ;
  - erreur du code reliée à son champ ;
  - annonces d'un jeu ;
  - axe en clair et en sombre, à 320 px, et sur le formulaire du code.
- `src/lib/games/shared/announce.test.ts` : ce que le lecteur d'écran entend pendant la frappe.
- `tests/schemas/tokens.test.ts` : contrastes du texte d'erreur et des bulles.
