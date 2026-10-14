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
