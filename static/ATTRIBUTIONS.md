# Attributions

Ce que l'application doit à d'autres : chaque ressource tierce embarquée et chaque contribution est déclarée dans ce tableau. La page « Crédits et licences » du jeu (`/credits`) reprend chaque ligne ; un test échoue si l'une d'elles y manque.

| Ressource                                                                                                                              | Auteur                                                                                                                                                                             | Source                                                                                                                                          | Licence                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Police Atkinson Hyperlegible Next (variable, axe de graisse)                                                                           | The Atkinson Hyperlegible Next Project Authors (Braille Institute of America)                                                                                                      | https://github.com/googlefonts/atkinson-hyperlegible-next, distribuée par le paquet npm `@fontsource-variable/atkinson-hyperlegible-next` 5.3.0 | SIL Open Font License 1.1                                                     |
| Disposition AZERTY France PC (`layouts/fr-fr-azerty-pc.json`), données dérivées du CLDR : `keyboards/windows/fr-t-k0-windows.xml`      | Unicode, Inc. et contributeurs du projet CLDR                                                                                                                                      | https://github.com/unicode-org/cldr/blob/release-43/keyboards/windows/fr-t-k0-windows.xml (CLDR 43, étiquette `release-43`)                     | Unicode License Agreement - Data Files and Software (Unicode-DFS-2016)        |
| Disposition AZERTY France Mac (`layouts/fr-fr-azerty-mac.json`), données dérivées du CLDR : `keyboards/osx/fr-t-k0-osx.xml`            | Unicode, Inc. et contributeurs du projet CLDR                                                                                                                                      | https://github.com/unicode-org/cldr/blob/release-43/keyboards/osx/fr-t-k0-osx.xml (CLDR 43, étiquette `release-43`)                             | Unicode License Agreement - Data Files and Software (Unicode-DFS-2016)        |
| Mots du jeu (`content/fr/words/base.json`) : fréquences et part d'adultes connaissant le mot, extraites de Lexique 3.83, puis filtrées | Boris New, Christophe Pallier et al. (Lexique 3.83, www.lexique.org ; New, Pallier, Brysbaert & Ferrand, 2004, Behavior Research Methods, Instruments, & Computers 36(3), 516-524) | http://www.lexique.org/                                                                                                                         | CC BY-SA 4.0                                                                  |
| Mots du jeu (`content/fr/words/base.json`) : rattachement aux thèmes et exclusions, d'après les catégories du Wiktionnaire français    | Contributeurs du Wiktionnaire français (voir l'historique de chaque page)                                                                                                          | https://fr.wiktionary.org/ (catégories lues par l'API MediaWiki, octobre 2026)                                                                  | CC BY-SA 4.0 (CC BY-SA 3.0 pour les contributions antérieures au 7 juin 2023) |
| Voix des consignes et du récit (`static/voice/fr/`)                                                                                    | contribution anonyme                                                                                                                                                               | Enregistrement original réalisé pour le projet, aucune source tierce                                                                            | CC BY-SA 4.0                                                                  |

## Créations originales

Tout le reste est une création originale du projet DactyloDys, sans source tierce, sous licence CC BY-SA 4.0 : le compagnon et l'icône de l'appli, les dessins des huit mini-jeux, de la carte, du récit et de la cabane, les leçons, les phrases, les textes à taper, le récit, les textes de l'interface et les sons, fabriqués par le jeu lui-même.

Le code est sous licence AGPL-3.0-or-later (fichier `LICENSE` du dépôt).

## Dispositions de clavier

Les fichiers `layouts/fr-fr-azerty-*.json` sont des données dérivées du CLDR (licence Unicode). Cette licence, Unicode-DFS-2016, demande de garder la notice qui suit avec les données ou dans leur documentation. La voici, telle qu'elle est écrite dans le fichier `unicode-license.txt` du CLDR 43 :

```text
COPYRIGHT AND PERMISSION NOTICE

Copyright © 1991-2023 Unicode, Inc. All rights reserved.
Distributed under the Terms of Use in https://www.unicode.org/copyright.html.

Permission is hereby granted, free of charge, to any person obtaining
a copy of the Unicode data files and any associated documentation
(the "Data Files") or Unicode software and any associated documentation
(the "Software") to deal in the Data Files or Software
without restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, and/or sell copies of
the Data Files or Software, and to permit persons to whom the Data Files
or Software are furnished to do so, provided that either
(a) this copyright and permission notice appear with all copies
of the Data Files or Software, or
(b) this copyright and permission notice appear in associated
Documentation.

THE DATA FILES AND SOFTWARE ARE PROVIDED "AS IS", WITHOUT WARRANTY OF
ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT OF THIRD PARTY RIGHTS.
IN NO EVENT SHALL THE COPYRIGHT HOLDER OR HOLDERS INCLUDED IN THIS
NOTICE BE LIABLE FOR ANY CLAIM, OR ANY SPECIAL INDIRECT OR CONSEQUENTIAL
DAMAGES, OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE,
DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THE DATA FILES OR SOFTWARE.

Except as contained in this notice, the name of a copyright holder
shall not be used in advertising or otherwise to promote the sale,
use or other dealings in these Data Files or Software without prior
written authorization of the copyright holder.
```
