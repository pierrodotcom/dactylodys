# Chaîne de production des banques de mots et de phrases

Ces scripts produisent `content/fr/words/base.json` et `content/fr/phrases/base.json`, ainsi que les listes à cocher de `docs/relecture/`. Ils n'utilisent que Node (aucune dépendance) et sont reproductibles : relancer la chaîne redonne les mêmes fichiers.

## Licences des sources

- **Lexique 3.83** (New, Pallier et al., www.lexique.org), CC BY-SA 4.0 : fréquences et part d'adultes connaissant le mot.
- **Wiktionnaire français** (fr.wiktionary.org), CC BY-SA 4.0 : catégories thématiques et catégories d'exclusion, lues par l'API MediaWiki.
- Interdits : Manulex, ARASAAC, Dubois-Buyse, ÉOLE, WOLF, toute liste d'éditeur.

Les sources téléchargées vivent dans `tools/content/.cache/` (ignoré par git) et ne sont jamais versionnées. Les rapports aussi (`.cache/report/`, ou le dossier donné par `--report`).

## Étapes

```
node tools/content/fetch-sources.js [--lexique-zip <chemin>] [--refresh]
node tools/content/build-words.js [--report <dossier>] [--no-write]
node tools/content/build-phrases.js
node tools/content/check.js
```

1. **fetch-sources** : copie ou télécharge `Lexique383.zip` et en extrait la table ; lit pour chaque catégorie de `config.json` ses pages et ses sous-catégories directes (cache JSON, une catégorie par fichier).
2. **build-words** :
   1. _Candidats_ : mots de Lexique dont la forme est le lemme, noms, adjectifs, adverbes et verbes à l'infinitif, écrits en minuscules avec les seuls caractères de l'ordre d'apprentissage (donc sans trait d'union, sans apostrophe ni `œ`), de 2 à 10 lettres.
   2. _Thèmes_ : croisement avec les catégories du Wiktionnaire (`config.json`, section `themes`) ; un mot sans thème mais très fréquent et très connu reçoit le thème `general`. Seuils de fréquence (par million) et de notoriété (`deflem`, part d'adultes connaissant le lemme) dans `config.json`, section `candidates`.
   3. _Niveau_ de 1 à 3 par points (`config.json`, section `levels`) : fréquence (0 à 3 points), notoriété (0 à 2) et longueur (0 à 2). Jusqu'à 1 point : niveau 1 ; jusqu'à 3 : niveau 2 ; au-delà : niveau 3. Un niveau peut être imposé dans `data/additions.txt`.
   4. _Exclusion automatique_ : un mot présent dans une catégorie « dure » du Wiktionnaire (vulgaire, insulte, sexualité, drogue, armes, mort, maladie, religion, politique, justice, violence, péjoratif) est écarté, sauf s'il figure dans `data/keep.txt`. Les catégories « douces » (argot, prénoms, médecine) sont seulement signalées.
   5. _Décisions de relecture_ : `data/additions.txt` (ajouts), `data/theme-corrections.txt` (thèmes), `data/exclusions.txt` (retraits, appliqués en dernier et toujours gagnants).
3. **build-phrases** : transforme `data/phrases.fr.txt` (une phrase par ligne : `niveau | thèmes | texte`) en `content/fr/phrases/base.json`.
4. **check** : contrôle les deux fichiers (doublons, caractères de l'ordre d'apprentissage, nombre de mots et de phrases par palier de lettres) et affiche les chiffres réels.

## Rapports (hors dépôt)

Dans `.cache/report/` : `kept.tsv` (mots retenus avec fréquence et notoriété), `excluded.tsv` (mots écartés et motif), `flagged.tsv` (mots signalés par une catégorie), `review-pool.txt` (mots retenus par thème, pour la relecture) et `summary.txt`.

## Fichiers de décisions (versionnés)

| Fichier                      | Rôle                                                                 |
| ---------------------------- | -------------------------------------------------------------------- |
| `data/exclusions.txt`        | `mot \| motif` : retrait définitif                                   |
| `data/keep.txt`              | mots à sauver d'une exclusion automatique par catégorie              |
| `data/additions.txt`         | `mot \| thèmes \| niveau` : ajouts (les noms de dinosaures par ex.)  |
| `data/theme-corrections.txt` | `mot \| -thème +thème` : corrections de sens (par ex. « marine »)    |
| `data/phrases.fr.txt`        | phrases originales, `niveau \| thèmes \| texte`                      |

La relecture humaine (cases à cocher de `docs/relecture/`) se reporte dans ces fichiers, puis on relance la chaîne. Tout mot ou toute phrase générée porte `review: "agent"` ; seule une personne peut le faire passer à `"human"`.

## Niveaux de phrases

Niveau 1 : mots très simples et phrases courtes ; niveau 3 : phrases plus longues ou vocabulaire plus riche.

## Page de relecture

`node tools/content/build-review-page.js` régénère `docs/relecture/relecture.html`, une page autonome (aucune ressource externe) où une personne répond Oui ou Non à chaque mot et à chaque phrase, puis enregistre ses réponses dans un fichier JSON à déposer dans `docs/relecture/`.
