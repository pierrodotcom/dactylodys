---
paths:
  - "src/**/*.svelte"
  - "src/**/*.css"
  - "src/lib/ui/**"
  - "tokens/**"
---

# Interface et design tokens

## Tokens

1. `tokens/` (format DTCG) est la seule source de vérité visuelle. On ne modifie jamais à la main les fichiers générés.
2. Trois niveaux : **primitifs** (`color.blue.500`) → **sémantiques** (`color.surface.raised`) → **composant** si nécessaire. Les composants ne consomment que les niveaux sémantique et composant.
3. Catégories obligatoirement tokenisées : couleur, typographie (famille, taille, graisse, interligne, espacement des lettres et des mots), espacement, taille, rayon, bordure, ombre, opacité, durée, courbe d'animation, z-index, point de rupture.
4. Un thème (clair, sombre, calme, contraste élevé, un monde du jeu) est un jeu de valeurs pour les tokens sémantiques. Aucun composant ne teste le thème courant.
5. Le canvas lit les mêmes tokens via le module TS généré.
6. Valeur manquante → **ajouter un token**, jamais contourner. Aucun `stylelint-disable` pour une valeur en dur.
7. Seule exception admise : une **position calculée** à l'exécution à partir de mesures (ex. la bulle de « Décollage », `greetingPlace`) est passée à la feuille de style par une propriété personnalisée posée par une attache (`{@attach}`) ; c'est une donnée de géométrie, comme une coordonnée SVG, jamais une couleur, une taille de design ou une durée.

## Accessibilité (enfants dys / TDAH)

- Texte à taper : police sans empattement droite, jamais d'italique, taille de base généreuse, espacement des lettres et des mots **réglable** par l'utilisateur. Les polices « spéciales dyslexie » n'ont pas d'effet démontré : option possible, jamais argument.
- Fond chaud par défaut, contraste WCAG AA au minimum, information jamais portée par la couleur seule (doigts : couleur **et** forme ou position).
- Cibles cliquables ≥ 48 px ; tout est utilisable au clavier, focus toujours visible.
- Animations : respecter `prefers-reduced-motion` (le mode réduit **retire le mouvement mais garde un fondu visible** pour les récompenses de jeu : `data-reward`, ADR-030) ; jamais plus de 3 flashs par seconde ; aucune animation décorative pendant la frappe.
- **Mode calme** et réglages séparés pour sons, musique, voix et animations. La stimulation doit venir de la tâche, pas de l'entourer.
- Peu de texte de consigne : une phrase, écoutable, illustrée. L'enfant saute les consignes longues.
- Ne jamais paraître « bébé » : le public va jusqu'à 12 ans.

## Composants

- Un composant réutilisable vit dans `src/lib/ui/` avec ses états (repos, survol, focus, actif, désactivé) et un test d'accessibilité.
- Aucune ressource externe : polices, icônes et sons sont auto-hébergés.

## Ergonomie des écrans (ADR-046)

- **Sortie en haut** : tout écran qu'on quitte (Retour, Fermer, Annuler) la donne à `ScreenFrame` par sa prop `back` ; elle s'affiche en haut à gauche, au même endroit partout. Jamais de bouton de sortie en bas de page. Testé par `e2e/ergonomics.spec.ts` : ajouter tout nouvel écran à ce test.
- **On voit l'effet là où on agit** : un choix qui change le compagnon (objet, couleur) se fait avec le compagnon visible (aperçu collant de « Mon compagnon », compagnon dans la carte « Nouveau ! »). Vérifier sur un écran de portable (1280 × 720) après défilement.
- Tout écran du parcours se vérifie à 1280 × 720 : rien d'essentiel hors de vue sans défiler (L-060).
