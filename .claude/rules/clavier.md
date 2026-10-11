---
paths:
  - "src/lib/engine/**"
  - "src/lib/keyboard/**"
  - "layouts/**"
  - "tests/traces/**"
---

# Clavier et moteur de frappe

## Faits établis (recherche du 2026-10-11)

- `navigator.keyboard.getLayoutMap()` n'existe que sur Chromium, ne donne que la couche sans modificateur et pas forcément la disposition active. **Ne jamais en dépendre** : la disposition est choisie par l'utilisateur, puis confirmée par un étalonnage (« appuie sur la touche à droite de L »).
- Touches mortes (`^`, `¨`) : événements de composition sur macOS, pas sur Windows ; `key` vaut `Dead` ou diverge selon le navigateur ; Safari n'émet pas les événements dans l'ordre de la spécification.
- AltGr sous Windows = `ControlLeft` + `AltRight` : ne pas l'interpréter comme un raccourci Ctrl.
- Playwright ne simule ni disposition non-US ni touche morte.

## Règles

1. La frappe est validée sur le **caractère produit** (`key`, `beforeinput`/`input`, fin de composition). `code` sert uniquement à savoir quelle touche physique allumer et quel doigt est attendu.
2. Le moteur consomme un flux d'événements **normalisés** (`{ char, code, timestamp, modifiers }`). Toute la complexité navigateur vit dans un seul adaptateur, `keyboard/input-adapter`.
3. Une disposition est une donnée JSON : touche physique (`code`) → caractères par couche (base, Maj, AltGr, Maj+AltGr, touches mortes) → doigt assigné. Variantes PC et Mac séparées. Aucun `if (layout === 'azerty')` dans le code.
4. L'assignation des doigts est un **profil de doigté** distinct de la disposition (10 doigts, doigté réduit) pour permettre les adaptations recommandées par les ergothérapeutes.
5. Toute disposition ajoutée est livrée avec des **traces réelles** enregistrées sur matériel (navigateur × OS) dans `tests/traces/`, rejouées en test. L'outil d'enregistrement fait partie du projet.
6. Le moteur est déterministe : horloge et générateur aléatoire injectés.
7. Mesures : caractères corrects par minute et précision ; « mots par minute » = caractères corrects / 5. Ne jamais afficher une vitesse sans la précision.
8. Sources de données autorisées pour les dispositions : Kalamine (MIT), CLDR (Unicode-3.0), XKB (MIT). **Interdit** : kbdlayout.info (pas de licence), fichiers de doigté de Tux Typing (QWERTY par défaut, faux en AZERTY).
