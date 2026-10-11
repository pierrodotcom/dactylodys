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

## Confirmé par traces réelles (Windows 10/11, Chrome 155 et Firefox 157, AZERTY, 2026-10-11)

- Aucun événement de composition. Chaque caractère produit arrive par `beforeinput` + `input` (`insertText`).
- Touche morte `^`/`¨` : `keydown` avec `key: "Dead"`, rien d'inséré ; la frappe suivante porte le caractère composé dans `key` et dans `data`. Touche morte + Espace insère le signe seul (l'espace est consommé).
- **Chrome annonce une fausse touche pour une touche morte AltGr** : AltGr+2 (tilde mort) donne `key: "é"` au lieu de `Dead`, sans insertion. Firefox annonce `Dead`. D'où la règle 1 : `key` ne sert jamais à déduire un caractère.
- Les utilisateurs tapent les chiffres au pavé numérique (`Numpad0`…) et les majuscules avec Verr. Maj : le caractère reste juste, mais la touche physique n'est pas celle que montre l'aide visuelle.

## Règles

1. La frappe est validée sur le **caractère produit**, lu uniquement dans `beforeinput`/`input` et la fin de composition, **jamais dans `key`**. `code` sert uniquement à savoir quelle touche physique allumer et quel doigt est attendu.
2. Le moteur consomme des `NormalizedKeystroke`. Toute la complexité navigateur vit dans **un** normaliseur pur, `keyboard/input-adapter/` : il reçoit des `RawInputEvent` (copies en données simples des événements DOM) et n'accède jamais au DOM. Le branchement des écouteurs DOM est un adaptateur mince dans `src/lib/ui/keyboard-capture/`, qui ne contient aucune logique. C'est ce qui permet de rejouer les traces en Node.
3. Une disposition est une donnée JSON : touche physique (`code`) → caractères par couche (base, Maj, AltGr, Maj+AltGr, touches mortes) → doigt assigné. Variantes PC et Mac séparées. Aucun `if (layout === 'azerty')` dans le code.
4. L'assignation des doigts est un **profil de doigté** distinct de la disposition (10 doigts, doigté réduit) pour permettre les adaptations recommandées par les ergothérapeutes.
5. Toute disposition ajoutée est livrée avec des **traces réelles** enregistrées sur matériel (navigateur × OS) dans `tests/traces/`, rejouées en test. L'outil d'enregistrement fait partie du projet.
6. Le moteur est déterministe : horloge et générateur aléatoire injectés.
7. Mesures : caractères corrects par minute et précision ; « mots par minute » = caractères corrects / 5. Ne jamais afficher une vitesse sans la précision.
8. Sources de données autorisées pour les dispositions : Kalamine (MIT), CLDR (Unicode-3.0 ; `Unicode-DFS-2016` pour les versions ≤ 43, seules à contenir les dispositions Windows et macOS), XKB (MIT). **Interdit** : kbdlayout.info (pas de licence), fichiers de doigté de Tux Typing (QWERTY par défaut, faux en AZERTY).

## Contrats figés (J1) — ne pas modifier sans passer par le chef d'orchestre

Types : `src/lib/keyboard/types.ts`, `src/lib/keyboard/layout-ids.ts`, `src/lib/engine/types.ts`.

| Fonction | Module | Rôle |
|---|---|---|
| `parseLayout(data: unknown): LayoutDefinition` | `keyboard/layout` | Valide une disposition, lève une erreur explicite |
| `parseFingeringProfile(data: unknown): FingeringProfile` | `keyboard/fingering` | Idem pour un profil de doigté |
| `buildCharIndex(layout): CharIndex` | `keyboard/layout` | Caractère → séquences de touches |
| `findUnproducible(index: CharIndex, text: string): string[]` | `keyboard/layout` | Caractères du texte que la disposition ne produit pas |
| `fingerForKey(profile, code): Finger \| null` | `keyboard/fingering` | Doigt attendu pour une touche physique |
| `loadLayout(id: LayoutId): Promise<LayoutDefinition>` | `keyboard/registry` | Charge et valide une disposition de `layouts/` |
| `createInputNormalizer(): InputNormalizer` | `keyboard/input-adapter` | `RawInputEvent` → `NormalizedKeystroke` (le normaliseur ignore `capsLock` : un jeu qui veut aider lit ce champ dans le flux brut) |
| `geometryIdFor(layout: LayoutDefinition): GeometryId` | `keyboard/registry` | Géométrie à dessiner pour une disposition (table en données) ; lève une erreur si la forme physique n'a pas de dessin |
| `parseTrace(data: unknown): KeyboardTrace` | `keyboard/trace` | Valide une trace ; `capsLock` (état Verr. Maj, `getModifierState('CapsLock')`) est un champ optionnel des événements, absent des traces enregistrées avant son ajout |
| `replayTrace(trace): string` | `keyboard/trace` | Texte obtenu en rejouant la trace (retours arrière appliqués) |
| `createSession(text, options?): SessionState` | `engine/session` | Découpe en graphèmes NFC |
| `applyKeystroke(state, keystroke): SessionStep` | `engine/session` | Réducteur pur |
| `computeMetrics(state, now?): SessionMetrics` | `engine/metrics` | Précision, vitesse, statistiques par caractère |

Données : `layouts/<id>.json`, `layouts/fingering/<id>.json`. Traces réelles : fichier téléchargé depuis `/dev/traces`, déposé **tel quel** dans `tests/traces/<layoutId>/` (nom `<layoutId>__<os>-<navigateur>__<date>.json`). Si le testeur n'a pas tapé exactement la consigne, `expectedText` est corrigé pour refléter ce qui a réellement été tapé, et le commit le dit.

Sur AZERTY PC, `É` et `Ç` ne sont pas productibles sans Verr. Maj ; `È` et `À` ne le sont que par la touche morte AltGr+7 : `findUnproducible` signale les premiers, et les contenus pour débutants évitent toutes les majuscules accentuées. Le modèle n'a pas de couche Verr. Maj.
