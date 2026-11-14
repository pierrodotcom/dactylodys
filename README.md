# DactyloDys

Application web **libre et gratuite** pour apprendre à taper au clavier en jouant, pensée pour les enfants de 8 à 12 ans avec un TDAH et/ou une dysgraphie.

- Sans compte, sans publicité, sans traceur : aucune donnée sur l'enfant ne quitte l'appareil.
- Séances courtes, récompenses liées aux progrès, aucun mécanisme addictif.
- Français et clavier AZERTY d'abord ; autres langues et dispositions ensuite.

**État : version 1.0 en préparation** : huit mini-jeux, 34 leçons en six mondes, un récit, un espace adulte, jouable hors connexion et installable. DactyloDys est un outil d'apprentissage, pas un traitement médical.

## Pages pour les adultes

Cinq pages du jeu, reliées en bas de l'accueil et depuis l'espace adulte, disponibles hors connexion :

- `/pour-les-adultes` : à quoi sert le jeu, une séance, la cible personnelle, l'espace adulte, des conseils ; s'imprime sur une feuille A4 recto verso ;
- `/pour-les-professionnels` : fiche pour les ergothérapeutes et les enseignants (choix de conception et leurs raisons, limites, appel à relecture) ; s'imprime sur une feuille A4 recto verso. Sa version à diffuser par courriel : [fiche pour les professionnels](docs/fiche-professionnels.md) ;
- `/confidentialite` : ce qui est gardé sur l'appareil, ce que voit l'hébergeur, comment sauvegarder et tout effacer ;
- `/accessibilite` : ce qui a été vérifié, les limites connues, les réglages, comment signaler un problème ;
- `/credits` : les licences, et ce que le jeu doit à d'autres (chaque ligne de [`static/ATTRIBUTIONS.md`](static/ATTRIBUTIONS.md)).

Leur texte est dans `messages/fr.json` (clés `guide_`, `pro_`, `privacy_`, `a11y_`, `credits_` et `info_`).

## Développer

Il faut Node 24 et npm.

| Commande         | Rôle                                                                      |
| ---------------- | ------------------------------------------------------------------------- |
| `npm ci`         | Installe les dépendances, aux versions exactes                            |
| `npm run dev`    | Lance le jeu en local, avec toutes les pages d'essai de `/dev`            |
| `npm run verify` | Types, lint, tests unitaires, construction et tests de bout en bout       |
| `npm run build`  | Construit le site publié, dans `build/` (site statique, sans serveur)     |

Le site publié ne garde que deux pages d'essai : `/dev/traces` (pour enregistrer les frappes d'un clavier) et `/dev/voix` (pour enregistrer la voix). Les autres sont des outils de l'équipe : elles s'ouvrent avec `npm run dev`, et dans le site construit pour les tests (`npm run build:e2e`). Aucune page d'essai n'est gardée pour le jeu hors connexion.

Le site ne charge rien depuis un autre site : une politique de sécurité de contenu (CSP), écrite dans chaque page, l'interdit au navigateur.

## Documentation

- [Feuille de route](docs/FEUILLE_DE_ROUTE.md)
- [Suivi de projet](docs/SUIVI.md)
- [Décisions](docs/DECISIONS.md)
- [Leçons apprises](docs/LECONS.md)
- [Synthèse de recherche](reports/Dactylo%20ludique%20TDAH%20dysgraphie.md)

## Licences

- Code : [AGPL-3.0-or-later](LICENSE).
- Contenus pédagogiques, textes, dessins, sons et voix créés pour le projet : CC BY-SA 4.0.
- Dispositions de clavier (`layouts/`) : données dérivées du CLDR (licence Unicode).
- Ressources tierces et contributions : [`static/ATTRIBUTIONS.md`](static/ATTRIBUTIONS.md), repris dans la page « Crédits et licences » du jeu.
