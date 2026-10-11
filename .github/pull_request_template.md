## Ce que fait cette PR

<!-- Comportement observable, en termes simples. -->

## Définition de terminé

- [ ] `npm run verify` passe, sans test désactivé ni règle de lint neutralisée
- [ ] Tout comportement nouveau a un test ; toute correction de bogue commence par un test qui échoue
- [ ] `engine/` et `keyboard/` : tests unitaires et de propriétés ; traces de rejeu pour toute disposition ajoutée
- [ ] Tout nouvel écran passe axe sans violation et se joue entièrement au clavier
- [ ] Aucune valeur en dur (couleur, taille, texte, seuil, disposition) ; nouvelles chaînes présentes dans toutes les langues actives
- [ ] `docs/SUIVI.md` à jour ; erreurs évitables consignées dans `docs/LECONS.md`
- [ ] Assets tiers déclarés dans `static/ATTRIBUTIONS.md`
