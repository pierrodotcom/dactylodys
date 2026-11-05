# Icône de l'appli

Le compagnon (dessin réel de `src/lib/ui/components/Companion.svelte`, humeur calme, couleur par défaut, rien sur lui) est assis sur une touche de clavier. Les PNG de `static/icons/` sont **commis** : le site n'a pas besoin de ce script pour se construire.

## Relancer

À refaire à la main quand le compagnon ou les couleurs (`tokens/`) changent :

```
cd "C:\Projets\DactyloDys"
npm run generate
node tools/icons/build-icons.js
```

Le script démarre un serveur de développement Vite sur le port `devServerPort`, ouvre la page `/dev/compagnon` avec le Chromium de Playwright, reprend le dessin du compagnon tel que l'appli l'affiche (styles résolus, épaisseurs de trait ramenées aux unités du dessin), le pose sur la touche dessinée par `icon-svg.js`, puis enregistre les PNG. `--svg` écrit aussi les SVG sources à côté des PNG (à ne pas commiter). Aucune dépendance de plus.

Sorties : `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (dessin réduit pour tenir dans le cercle sûr de 80 %, fond plein jusqu'aux bords), `apple-touch-icon.png` (180). Le manifeste (`tools/build-pwa.js`) les déclare.

## Changer de variante

Une seule valeur : `"variant"` dans `config.json`, puis relancer le script.

- `A` : fond sombre, touche brune à face crème (celle de départ) ;
- `C` : fond turquoise (`color.accent.base` du thème sombre), face de touche claire.

Les couleurs sont des références à des tokens (`<thème>.<nom du token>`) : pour une autre variante, ajouter une entrée à `variants`.

## Licence

Icône sous CC BY-SA 4.0, comme le compagnon dont elle est tirée (voir `static/ATTRIBUTIONS.md`).
