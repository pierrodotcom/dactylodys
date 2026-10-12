# Mots par thématiques pour DactyloDys : sources, licences, faisabilité

Recherche du 2026-10-12. Public visé : enfants francophones de 8 à 12 ans. Projet : code AGPL-3.0, contenus CC BY-SA 4.0.

**Convention de lecture**
- « Lu à la source » = j'ai ouvert la page officielle, le README ou le fichier de licence du dépôt.
- « Non vérifiée » = je n'ai pas pu lire la licence à la source. Je le dis explicitement.
- « Mesuré » = chiffre calculé par moi sur le fichier téléchargé. « Estimé » = raisonnement, non calculé.
- Rien de ce qui est téléchargé n'est dans le dépôt. Les fichiers (Lexique 3.83, Lexique 4.1, WordNet 3.0, tables WOLF, sorties de scripts) sont dans `C:\Users\Pierro\AppData\Local\Temp\claude\C--Projets-DactyloDys\254309a1-3f92-4fdc-8d51-ba3e7e68989e\scratchpad\` (sous-dossiers `lexique\`, `web\`, `scripts\`).
- Ce document n'est pas un avis juridique. Les points de compatibilité de licences sont à faire confirmer avant publication.

---

## Réponse courte

1. Lexique 3.83 ne contient aucune information sémantique ou thématique (35 colonnes lues, voir Q1). Il faut donc une source externe de thèmes, puis un croisement par la forme écrite du mot.
2. La meilleure source libre de thèmes est le **Wiktionnaire français** (CC BY-SA, ses catégories « Animaux », « Lexique de la cuisine »…). Elle est exploitable hors ligne via les dumps Wikimedia. Elle est utile mais bruitée (catégories au niveau de la page, pas du sens), et très inégale selon les thèmes.
3. Sous contrainte de lettres, le gisement thématique est mince : avec les 14 lettres `fjdkslqmeiantr`, j'ai mesuré 934 « mots de base » au total, dont environ 310 (avec doublons entre thèmes) tombent dans l'un des 16 thèmes testés, avant relecture humaine.
4. Un thème devient praticable (au moins 30 mots distincts) vers 13 à 16 lettres pour les thèmes riches (cuisine, animaux, véhicules, espace, maison, sport), vers 16 à 17 pour métiers, vêtements, émotions, famille, et au-delà de 19 lettres pour couleurs, musique, magie.
5. Les dinosaures sont impossibles avec la base seule : les noms sont longs (les 11 présents dans Lexique 3.83 ont tous au moins 9 lettres).
6. Le niveau d'âge ne peut pas venir des normes françaises d'âge d'acquisition, qui sont petites, adultes, ou sous licence non libre. Il faut un proxy : fréquence Lexique + `deflem` + relecture.

---

## Q1. Lexique 3.83 et OpenLexicon

### Constats sourcés

**Fichier, taille, URL**
- Téléchargement : `http://www.lexique.org/databases/Lexique383/Lexique383.zip`. Je l'ai téléchargé : 27 243 156 octets. Le zip contient `Lexique383.tsv` (25 850 780 octets, UTF-8 valide), `.rds`, `.xlsb`, `Manuel_Lexique.3.pdf`, `README-Lexique.txt`, `RELEASE NOTES-Lexique.txt`, `make_rds.R`. (mesuré)
- Le tableau compte 142 694 lignes de données (142 695 avec l'en-tête), dont 125 653 formes orthographiques distinctes. Le manuel dit « 125 653 entrées orthographiquement différentes ». (mesuré ; manuel dans le zip)
- Parmi ces formes distinctes, 77 827 sont uniquement faites de lettres a-z non accentuées. (mesuré)
- Le README de la 3.83 dit « ~140000 mots ». Source : http://www.lexique.org/databases/Lexique383/README-Lexique.txt

**Champs réellement présents** (en-tête du tsv, 35 colonnes, mesuré) :
`ortho, phon, lemme, cgram, genre, nombre, freqlemfilms2, freqlemlivres, freqfilms2, freqlivres, infover, nbhomogr, nbhomoph, islem, nblettres, nbphons, cvcv, p_cvcv, voisorth, voisphon, puorth, puphon, syll, nbsyll, cv-cv, orthrenv, phonrenv, orthosyll, cgramortho, deflem, defobs, old20, pld20, morphoder, nbmorph`.
- Fréquences par million : deux corpus (sous-titres de films, livres), pour la forme et pour le lemme.
- `cgram` prend 23 valeurs (NOM, VER, ADJ, ADV, AUX, PRE, CON, ONO, PRO:*, ART:*…). `cgramortho` liste les catégories possibles d'une forme (« NOM,VER »).
- `deflem` = « pourcentage de personnes ayant dit qu'il connaissait le lemme » sur le site « Combien de mots connaissez-vous ? » ; `defobs` = nombre de répondants (définitions dans `Manuel_Lexique.3.pdf`, lu dans le zip). `deflem` est renseigné sur 123 967 lignes sur 142 694. (mesuré) Ce sont des répondants adultes d'un site web : proxy de familiarité, pas une norme enfant.
- `morphoder` (décomposition dérivationnelle, ex. « plume-age ») et `nbmorph` existent depuis la 3.70 (notes de version dans le zip).
- `syll`, `nbsyll`, `orthosyll` : syllabation. `nblettres` : nombre de lettres.
- **Aucune information sémantique, thématique, de domaine, d'âge ou de registre (vulgaire, familier).** Aucun marqueur de nom propre ni de marque : toutes les entrées sont en minuscules, les noms propres sont des NOM comme les autres (ex. `paris`, `alain`, `max`, mesuré).

**Licence et attribution (lu à la source)**
- README Lexique 383, section License : « CC BY SA40.0 » avec lien vers `LICENSE-CC-BY-SA4.0.txt` (http://www.lexique.org/databases/Lexique383/README-Lexique.txt). Ce fichier de licence renvoie un 404 sur le serveur (testé) ; le texte officiel de CC BY-SA 4.0 est sur creativecommons.org.
- Le dépôt OpenLexicon dit : sauf README ou fichier de licence propre à un dossier, CC BY-SA 4.0. Il demande de citer les publications associées à chaque base (README OpenLexicon : https://raw.githubusercontent.com/chrplr/openlexicon/master/README.md et https://raw.githubusercontent.com/chrplr/openlexicon/master/datasets-info/README.md).
- Références à citer d'après le README : New, Pallier, Brysbaert, Ferrand (2004), *Lexique 2: A New French Lexical Database*, Behavior Research Methods, Instruments, & Computers 36(3), 516-524 ; New, Brysbaert, Veronis, Pallier (2007), *The use of film subtitles to estimate word frequencies*, Applied Psycholinguistics 28(4), 661-677 ; et New, Pallier, Ferrand, Matos (2001), L'Année Psychologique 101(3).
- **Incohérence sur la page d'accueil de lexique.org** (lue à la source, http://www.lexique.org/) : le texte dit « Creative Commons Attribution – Partage dans les mêmes conditions 4.0 », mais le lien associé pointe vers `creativecommons.org/licenses/by-nc/4.0/` (BY-NC, non commercial). Le texte, les README de Lexique 3.83 et 4.00 et le dépôt OpenLexicon disent tous BY-SA. L'erreur est très probablement dans le lien, mais à signaler aux auteurs et à consigner (capture de page datée) dans le dépôt DactyloDys.

**Version plus récente : Lexique 4.10**
- La page d'accueil propose maintenant Lexique 4.10 (http://www.lexique.org/databases/Lexique410/Lexique4.1.zip). Je l'ai téléchargé : 48 896 901 octets, `Lexique4.1.tsv` de 189 863 lignes et 37 colonnes (`1_Mot … 33_Preval, 34_PrevalNb, 35_RT_FLP…`). (mesuré)
- Licence lue dans son README (https://www.lexique.org/databases/Lexique410/README-Lexique.txt, et Lexique400) : CC BY SA 4.0. Références : New, Pallier, Schalchli, Bourgin, Gimenes (2026), *Lexique 4*, Behavior Research Methods.
- Différences utiles : fréquences d'un seul corpus de sous-titres de 316 millions de mots (plus de séparation films/livres), prévalence (`Preval`, renseignée sur 115 084 lignes). Toujours aucune information thématique. Le porteur a validé la 3.83 ; la 4.10 est un candidat sérieux pour la fréquence et la couverture (190 000 formes contre 125 653 formes distinctes). Exemple : 20 des 76 titres de la catégorie « Dinosaures en français » sont dans la 4.1, 11 dans la 3.83 (mesuré).
- Mes chiffres 3.83 et 4.1 ne sont pas comparables tels quels (définitions de fréquence et de lemme différentes).

**Autres jeux OpenLexicon utiles pour le français** (liste lue dans https://raw.githubusercontent.com/chrplr/openlexicon/master/datasets-info/README.md)
- Chacqfam : âge d'acquisition estimé et familiarité de 1225 mots mono- et bisyllabiques ; README sans licence propre (https://raw.githubusercontent.com/chrplr/openlexicon/master/datasets-info/chacqfam/README-Chacqfam.md). Licence propre : non vérifiée.
- Gougenheim100 : 1064 mots du « français fondamental » (livre de 1964), README sans licence propre (…/Gougenheim100/README-Gougenheim.md). Droits de l'ouvrage d'origine : non vérifiés.
- SemantiQc : familiarité conceptuelle et force perceptuelle de 3596 noms, adultes québécois ; données hébergées sur lingualab.ca ; licence propre non vérifiée.
- Fr-familiarity660 : 660 mots, adultes jeunes et âgés ; licence non vérifiée.
- Morphalou 3.1 : 159 271 lemmes, licence « Lesser General Public License For Linguistic Resources » (README OpenLexicon …/Morphalou/README-Morphalou.md). Pas de thèmes.
- Brulex, Voisins, Anagrammes, Megalex, FLP, Chronolex : phonologie, voisinage, temps de réaction ; pas de thèmes.
- **Manulex n'est pas dans la liste OpenLexicon** (il est sur manulex.org, voir Q2/Q3).
- Réserve : le fait que OpenLexicon applique CC BY-SA 4.0 « par défaut » ne prouve pas que les auteurs d'une base tierce (Chacqfam, SemantiQc, etc.) ont consenti à cette licence. Je ne retiens que ce qui a un README ou une licence explicite.

### Lacunes
- Je n'ai pas lu le fichier `LICENSE-CC-BY-SA4.0.txt` annoncé (404).
- Je n'ai pas contacté les auteurs pour l'incohérence BY-SA / BY-NC du site.
- Les licences individuelles de plusieurs bases OpenLexicon (Chacqfam, SemantiQc, Fr-familiarity660, Gougenheim) ne sont pas vérifiées à la source.

---

## Q2. Sources de regroupement thématique

### 2.1 Wiktionnaire français (source principale recommandée)

**Licence (lue à la source)**
- Page du Wiktionnaire : contributions sous CC BY-SA 4.0 ; les contributions antérieures au 7 juin 2023 relèvent de la version 3.0 de la même licence ; les illustrations peuvent avoir d'autres conditions (https://fr.wiktionary.org/wiki/Wiktionnaire:Licence). Citation suggérée par la page : « Wiktionnaire, “Wiktionnaire:Licence”, … Creative Commons BY-SA 4.0, fr.wiktionary.org ».
- Conditions de Wikimedia pour les réutilisateurs : attribuer par lien vers la page, lien vers une copie stable équivalente, ou liste des auteurs ; indiquer les modifications ; fournir l'avis de licence avec lien ; toute version modifiée sous CC BY-SA 4.0 ou ultérieure ; le réutilisateur peut respecter CC BY-SA ou la GFDL, ou les deux (https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use).
- Compatibilité avec une redistribution en CC BY-SA 4.0 : oui pour la part 4.0. Pour la part sous 3.0, la page des licences compatibles de Creative Commons énumère « BY-SA 3.0 ou ultérieure » parmi les options de contribution à du BY-SA 3.0, sans dire expressément qu'une adaptation de 3.0 peut passer en 4.0 (https://creativecommons.org/share-your-work/licensing-considerations/compatible-licenses/). C'est une pratique courante de Wikimedia, mais **à faire valider** (point ouvert).
- Remarque de nature : une simple appartenance « mot X ∈ catégorie Y » est un fait ; mais le droit des bases de données (producteur de base, art. L341-1 du Code de la propriété intellectuelle) peut s'appliquer à une extraction substantielle. D'où l'intérêt de rester sous CC BY-SA et d'attribuer. Non vérifié par un juriste.

**Ce qui existe (mesuré par l'API fr.wiktionary.org le 2026-10-12, `prop=categoryinfo`, nombre de pages directes ; sous-catégories entre parenthèses)**
| Catégorie | Pages | Sous-cat. |
|---|---|---|
| Lexique en français de la cuisine | 1657 | 14 |
| Animaux en français | 39 | 16 |
| Mammifères en français | 225 | 11 |
| Oiseaux en français | 1100 | 15 |
| Poissons en français | 2010 | 4 |
| Insectes en français | 710 | 6 |
| Reptiles en français | 61 | 4 |
| Dinosaures en français | 75 | 1 |
| Fruits en français | 548 | 7 |
| Légumes en français | 496 | 3 |
| Véhicules en français | 345 | 4 |
| Sports en français | 172 | 11 |
| Couleurs en français | 103 | 2 |
| Métiers en français | 151 | 8 |
| Vêtements en français | 977 | 2 |
| Instruments de musique en français | 89 | 4 |
| Planètes en français | 58 | 3 |
| Meubles en français | 302 | 0 |
| Outils en français | 648 | 3 |
| Lexique en français du fantastique | 306 | 2 |
| Sentiments en français | 630 | 0 |
| Lexique en français de la famille | 573 | 2 |
- Catégories **absentes ou vides** sous les noms attendus : « Lexique en français de l'école / de la maison / de la magie / du corps humain / des émotions » (inexistantes), « Lexique en français de l'astronomie » et « … de l'anatomie » (0 page directe : tout est dans des sous-catégories). Le Wiktionnaire propose aussi des « Thésaurus » (ex. « Thésaurus en français concernant la nourriture » 49 pages, « … concernant des animaux » 49) plus petits mais plus éditorialisés.
- Les catégories sont posées au niveau de la **page** (le mot), pas du sens : « marine », « main », « mer » apparaissent dans plusieurs thèmes (voir mesures, Q5).

**Extractions structurées**
- Dumps Wikimedia (liste lue le 2026-10-12, https://dumps.wikimedia.org/frwiktionary/latest/) : `categorylinks.sql.gz` (202 Mo), `linktarget.sql.gz` (97 Mo), `page.sql.gz` (187 Mo), `pages-articles.xml.bz2` (884 Mo). Pour obtenir « mot → catégories » hors ligne, il suffit de `page` + `linktarget` + `categorylinks` (pas de l'XML complet).
- kaikki.org (wiktextract) : une extraction brute de l'édition française existe, marquée « work in progress » : `fr-extract.jsonl` 6,4 Go, 702,5 Mo en gz, sans date indiquée (https://kaikki.org/dictionary/rawdata.html). J'ai téléchargé les 8 premiers Mo du gz : chaque entrée a un champ `categories` (et `senses[].categories`) — donc **par sens** quand le modèle de catégorie est posé par sens. Licence annoncée : « same licenses as Wiktionary - both CC-BY-SA and GFDL » (https://kaikki.org/dictionary/). Citation demandée pour la recherche : Ylonen, LREC 2022 ; lien vers kaikki.org souhaité mais non obligatoire.
- DBnary : jeu de données sous **CC BY-SA 3.0** (pas 4.0) ; extracteur sous licence MIT ; format RDF/Turtle (ontolex) (http://kaiko.getalp.org/about-dbnary/). La page ne dit rien sur les catégories thématiques : DBnary ne les contient apparemment pas (non vérifié dans les fichiers).
- GLAWI : XML issu du Wiktionnaire, « free license » d'après les articles (Sajous & Hathout 2015, https://halshs.archives-ouvertes.fr/halshs-01191012/file/Sajous_Hathout_ELEX2015_GLAWI.pdf), taille de 1 341 410 articles. Le site redac.univ-tlse2.fr ne répond (ECONNREFUSED). **Licence non vérifiée.**

### 2.2 WordNet français, WordNet Domains

- **WOLF** : dans l'OMW, le fichier `wns/fra/LICENSE` est le texte de la **CeCILL-C** ; l'en-tête du tableau indique « WOLF (Wordnet Libre du Français) fra http://alpage.inria.fr/~sagot/wolf-en.html CeCILL-C » (https://raw.githubusercontent.com/omwn/omw-data/main/wns/fra/LICENSE et …/wn-data-fra.tab). Citation : Sagot & Fišer (2008), LREC. Le fichier contient 102 647 couples synset-lemme, 51 334 lemmes distincts (mesuré).
- **WoNeF** : licence LGPL-LR d'après l'article GWC 2014 (Pradet, de Chalendar, Baguenier Desormeaux), trouvé via recherche, non lu à la source (https://preview.aclanthology.org/fix_video/W14-0105.pdf) ; pas de lien de téléchargement trouvé. **Non vérifiée.**
- **Open Multilingual Wordnet** : le site dit seulement que les ressources sont « open » (https://omwn.org/) ; la licence réelle est celle de chaque wordnet (voir WOLF).
- **Princeton WordNet 3.0** (indispensable pour obtenir les « lexnames » comme noun.animal, noun.food, noun.body) : licence permissive de type « permission to use, copy, modify and distribute… for any purpose and without fee », avec obligation de reproduire l'avis de copyright et d'en conserver le texte sur toutes les copies (fichier LICENSE du tar, https://wordnetcode.princeton.edu/3.0/WordNet-3.0.tar.gz).
- **WordNet Domains** (FBK) : la page dit « distributed under a Creative Commons Attribution 3.0 Unported License » ; les téléchargements demandent d'accepter un accord dont le texte n'a pas été lu (https://wndomains.fbk.eu/ et https://wndomains.fbk.eu/download.html). Les domaines portent sur les synsets anglais ; le français passe par le mapping WOLF → synsets PWN. Version et couverture : non vérifiées.
- **Qualité du mapping WOLF → lexnames** (mesuré) : sur 7357 noms Lexique (a-z, 3-8 lettres, forme = lemme, fréquence ≥ 0,5/M), 5111 sont dans WOLF. Sur les 14 lettres, 52 « noun.animal », 62 « noun.food », 33 « noun.body », 39 « noun.plant ». Échantillon animal : on y trouve `aile`, `essai`, `test`, `ministre` (faux). Les traductions de WOLF sont en grande partie automatiques ; c'est un signal faible, pas une liste de référence.
- **Compatibilité CeCILL-C avec CC BY-SA 4.0** : CeCILL-C est une licence de logiciel (copyleft faible) ; son application à des données et sa combinaison avec du BY-SA ne sont pas clarifiées. **Non vérifiée, risque juridique.** Recommandation : ne pas redistribuer de données WOLF dans le jeu de mots publié ; au mieux l'utiliser en interne comme signal de relecture.

### 2.3 Wikidata, ConceptNet, JeuxDeMots

- **Wikidata** : « All structured data (… Property, Lexeme, and EntitySchema namespaces) is released into the public domain » sous CC0 (https://www.wikidata.org/wiki/Wikidata:Licensing). Requête SPARQL (query.wikidata.org, 2026-10-12, mesuré) : 31 505 lexèmes français, dont 31 469 ont un sens, et 19 710 ont un sens relié à un élément (propriété P5137) ; 12 791 sont des noms. En descendant les sous-classes d'un élément (ex. animal, aliment), j'obtiens quelques centaines de lemmes par classe (animal 257, aliment 363, véhicule 145, partie du corps 305…), mais seulement 4 à 25 mots tombent dans les 14 lettres après croisement avec Lexique. Couverture faible, mais licence idéale (CC0) et hiérarchie propre.
- **ConceptNet 5** : données sous CC BY-SA 4.0 ; attribution et partage à l'identique ; le Wiktionnaire et Wikipédia y sont repris sous CC BY-SA 3.0 ; WordNet « unencumbered license » (https://github.com/commonsense/conceptnet5/wiki/Copying-and-sharing-ConceptNet). Couverture du français et qualité non mesurées.
- **JeuxDeMots / RezoJDM** : l'en-tête du README officiel dit « Licence CreativeCommons Libre de droit - cc0 » (http://www.jeuxdemots.org/JDM-LEXICALNET-FR/JEUXDEMOTS-README.txt), et la page d'accueil du projet dit « licence C0 Domaine Public » (http://www.jeuxdemots.org/jdm-about.php). Dernier dump complet 20260103 de 7,32 Go (zip), fichier des termes de 551,84 Mo, 20 231 972 termes. Le README décrit les relations `r_domain` (« domaine », exemple corner → football/sport), `r_domain-1`, `r_isa` (générique), `r_lieu`, `r_carac`. Réseau constitué par des joueurs : riche en associations, mais bruité, avec des termes inappropriés. Je n'ai pas téléchargé le dump (taille). **Intérêt** : relations `r_domain` / `r_isa` en CC0 pour détecter des thèmes et des mots sensibles.
- Licence BabelNet : non étudiée (non libre pour un usage commercial d'après mes souvenirs ; **non vérifiée**).

### 2.4 Listes scolaires

- **Éduscol, liste de fréquence lexicale** : « près de 1500 mots, les plus fréquents de la langue française », constituée par Étienne Brunet, ramenés à leur base lexicale ; téléchargeable en PDF, ODS et XLS (https://eduscol.education.gouv.fr/6873/liste-de-frequence-lexicale, lue le 2026-10-12 via le navigateur intégré, car curl/WebFetch reçoivent un 403). Mentions légales d'éduscol : documents « mis à disposition selon les termes de la licence etalab-2.0 sauf cas particuliers », avec exclusion des contenus de tiers « concédés à la Dgesco ou acquis par celle-ci » (https://eduscol.education.gouv.fr/4656/mentions-legales). Il reste à confirmer que la liste de Brunet n'entre pas dans les exclusions. La Licence Ouverte 2.0 est conçue pour être compatible avec toute licence libre exigeant au moins la mention de paternité, et cite nommément CC-BY (section « Compatibility of this licence » du texte anglais, https://raw.githubusercontent.com/etalab/licence-ouverte/master/open-licence.md). Utilité : pas thématique ; sert de **liste de mots de base** (fréquence/niveau).
- Éduscol « Lexique et culture » : fiches par mot, étymologie, cycles 3 et 4 (https://eduscol.education.gouv.fr/6828/lexique-et-culture). Pas de listes thématiques exploitables en l'état.
- **Manulex** : 54 manuels, G1 (CP), G2 (CE1), G3-5 (CE2-CM2) + G1-5 ; 48 886 formes et 23 812 lemmes ; licence « Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported » ; « Permissions beyond the scope of this license may be available by contacting us » ; les références aux articles doivent toujours accompagner la version électronique (http://www.manulex.org/). **Non commercial : incompatible avec une redistribution en CC BY-SA 4.0** (voir le tableau de compatibilité ci-dessous : aucune licence non-CC n'est déclarée compatible avec BY-NC-SA).
- **Échelle Dubois-Buyse** (environ 3000 à 4000 mots, taux de réussite par niveau ; édition de 1977 à l'OCDL, de 1964 chez Meissellier, d'après des notices bibliographiques trouvées par recherche) et **ÉOLE** (échelle d'acquisition d'orthographe lexicale, environ 12 000 termes, enquête de 2000 enseignants et 50 000 élèves, éditeur Retz d'après la recherche) : œuvres éditées sous droit d'auteur, aucune licence libre trouvée ; **non vérifiées**. À considérer comme inutilisables sans accord écrit. Les « listes Dubois-Buyse par niveau » circulant en ligne sont des sélections de tiers sans statut clair.
- Ce qui rend certaines de ces ressources inutilisables : droit d'auteur de l'éditeur (Dubois-Buyse, ÉOLE), clause non commerciale (Manulex), absence de licence (suppléments d'articles).

### 2.5 Imagiers et dictionnaires pour enfants

- **Vikidia** : double licence CC-BY-SA 3.0 + GFDL ; pour réutiliser : placer sous CC-BY-SA 3.0, indiquer l'auteur, fournir l'adresse de l'article (https://fr.vikidia.org/wiki/Vikidia:Copyright, lue via le navigateur intégré). L'API déclare « Creative Commons Attribution-Share Alike 3.0 » et 45 951 articles (https://fr.vikidia.org/w/api.php?action=query&meta=siteinfo&siprop=statistics|rightsinfo&format=json). Ce sont des articles encyclopédiques : utiles pour repérer **les thèmes qu'un enfant lit** (titres d'articles, catégories), pas pour un lexique de mots courants. Les licences des images ne sont pas étudiées.
- **Wikimini** : textes sous CC-BY-SA 3.0 (placer sous la même licence, citer Wikimini.org et l'URL) ; **images, sons et autres documents « propriété exclusive de Wikimini »**, ne pas réutiliser sans accord (https://fr.wikimini.org/wiki/Wikimini:Droits_d'utilisation, lue via le navigateur intégré). 22 280 articles (API, la rubrique `rightsinfo` de l'API est vide).
- **ARASAAC** : pictogrammes des « Government of Aragon », créés par Sergio Palao, licence **CC BY-NC-SA** ; usage commercial exclu (https://aulaabierta.arasaac.org/en/terms-of-use pour les ressources de l'Aula Abierta ; recherche : la page principale `arasaac.org/terms-of-use` est rendue par JavaScript et n'a pas pu être lue). Version précise CC BY-NC-SA 4.0 non confirmée à la source principale. **Inutilisable** dans un projet CC BY-SA. Pour le vocabulaire par catégories, aucune extraction ne pourra être redistribuée.
- « Dico des écoliers » et autres dictionnaires scolaires : non étudiés ; à considérer comme sous droit d'éditeur tant qu'une licence libre n'est pas démontrée.

### Lacunes
- Licence de GLAWI, de WoNeF, de BabelNet non lues à la source.
- Compatibilité 3.0 → 4.0 pour les données Wiktionnaire/Vikidia/Wikimini : à valider.
- Éduscol : la liste Brunet est-elle couverte par la Licence Ouverte (exclusions de tiers) ? à confirmer auprès de la Dgesco.
- Dubois-Buyse, ÉOLE : droits non vérifiés.
- Je n'ai pas exploité Vikidia/Wikimini en données (catégories, titres).
- Je n'ai pas évalué ConceptNet en français ni les dumps JeuxDeMots.

---

## Q3. Adapter à l'âge

### Constats sourcés

| Norme | Contenu / couverture | Public | Accès | Licence |
|---|---|---|---|---|
| Manulex (Lété et al. 2004) | Fréquence par niveau CP / CE1 / CE2-CM2 : 23 812 lemmes, 48 886 formes | Manuels scolaires 6-11 ans | manulex.org | **CC BY-NC-SA 3.0, lue** (http://www.manulex.org/) |
| Syssau & Monnier 2009 | Valence émotionnelle de 600 mots, par âge | Enfants de 5, 7 et 9 ans | Supplément BRM | NoRaRe (https://norare.clld.org/contributions) cite le jeu ; licence du supplément **non vérifiée** |
| FANchild, Monnier & Syssau 2017 | Valence et éveil, 720 mots | 908 enfants/adolescents de 7, 9, 11 et 13 ans (d'après une recherche web, non lu à la source) | Supplément BRM | **Non vérifiée** |
| FAN, Monnier & Syssau 2014 | Valence/éveil de 1031 mots | Adultes | Supplément BRM | **Non vérifiée** |
| Bonin, Méot & Bugaiska 2018 | Concrétude, disponibilité du contexte, valence, éveil, plus de 1400 mots (le titre dit 1 659) | Adultes (étudiants) | Supplément BRM | **Non vérifiée**. NoRaRe dit être sous CC BY 4.0, mais il s'agit de la base de métadonnées ; elle ne redistribue pas les données brutes (« the original data set will be downloaded into the raw folder. It is only locally stored », README https://raw.githubusercontent.com/concepticon/norare-data/master/README.md) |
| Desrochers & Thompson 2009 | Fréquence subjective et imageabilité, noms (français canadien) | Adultes | Supplément BRM | **Non vérifiée** |
| Chedid et al. 2019 (SemantiQc) | Familiarité conceptuelle et force perceptuelle, 3596 noms | Adultes québécois | lingualab.ca | **Non vérifiée** |
| Chacqfam (Lachaud 2007) | Âge d'acquisition estimé + familiarité, 1225 mots mono/bisyllabiques | Adultes, mots courts | HAL, OpenLexicon | **Non vérifiée** |
| FEEL (Abdaoui et al. 2017) | Polarité et 6 émotions par mot, dérivé de l'EmoLex du NRC | — | advanse.lirmm.fr/feel | **Non vérifiée**. Le lexique NRC d'origine est connu pour des conditions de recherche non commerciale (mes souvenirs, non vérifié) |
| Lexique `deflem` (inclus dans Lexique 3.83) | % d'adultes connaissant le lemme, 123 967 lignes | Adultes (site web) | Lexique | CC BY-SA 4.0 (lu) |
| Lexique 4.10 `Preval` | Prévalence, 115 084 lignes | Adultes | Lexique | CC BY-SA 4.0 (lu) |

- Lexique-infra / Manulex-infra : ce sont des statistiques graphèmes-phonèmes (Peereman, Lété & Sprenger-Charolles 2007), non des normes lexicales par âge. Je n'ai pas trouvé de ressource nommée « Lexique-infra » avec licence. **EQOL** : je n'ai pas pu identifier cette ressource (peut-être une confusion avec ÉOLE). **Non vérifié.**
- La NoRaRe indique aussi : jeux français « Ferrand-2010 » (French Lexicon Project, temps de décision lexicale) ; aucune norme française d'âge d'acquisition **chez l'enfant** à grande échelle n'est apparue dans mes recherches (absence constatée, pas démontrée). Les AoA existantes sont des estimations d'adultes sur des échantillons de mots restreints (400, 1225, 1493 mots).

**Ce qu'on peut légalement utiliser pour filtrer ou classer dans un projet libre**
- Sans ambiguïté : **les données propres de Lexique** (fréquence, `deflem`, `Preval`), CC BY-SA 4.0 ; les listes Etalab sous réserve de confirmation ; Wikidata et JeuxDeMots en CC0.
- Zone grise : utiliser une base NC ou sans licence comme **outil interne de sélection** sans en republier les valeurs. La loi ne protège pas le fait qu'un mot soit « connu à 7 ans », mais le droit des bases de données peut protéger l'extraction substantielle, et les conditions des suppléments d'articles ne sont pas lues. Si on veut s'appuyer sur Manulex, la page invite à demander une permission : à faire par écrit.
- Interdit pour une redistribution CC BY-SA : toute valeur extraite de Manulex (NC), ARASAAC (NC), ÉOLE/Dubois-Buyse (droit d'éditeur).

### Lacunes
- Je n'ai pas pu ouvrir les suppléments des articles (Springer renvoie une redirection d'authentification, HAL un écran anti-robot) ni la page de téléchargement de FEEL.
- Je ne sais pas si les données de Syssau & Monnier sont accessibles hors paywall.

---

## Q4. Exclusion de mots inadaptés

### Constats sourcés

- **LDNOOBW (List of Dirty, Naughty, Obscene, and Otherwise Bad Words)**, fichier `fr` : 91 entrées ; le dépôt déclare **CC BY 4.0** (API GitHub, `license: cc-by-4.0`, dernier push 2024-08-05 ; https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words ; fichier https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master/fr). CC BY 4.0 est combinable dans un jeu CC BY-SA 4.0 en l'attribuant. La liste est très courte (91 entrées) : 73 sont des formes de Lexique 3.83, 35 passent mes filtres (a-z, 3-8 lettres, fréquence ≥ 1, forme = lemme). Sur 14 lettres, elle attrape 2 mots (`merde`, `emmerder`). (mesuré)
- **Wiktionnaire**, catégories d'exclusion (pages directes, API) : Termes vulgaires en français 1234 ; Insultes en français 715 (+2 sous-catégories) ; Lexique de la sexualité 1109 (+7) ; Lexique de la pornographie 117 ; Lexique de la drogue 126 ; Drogues 103 ; Armes 265 ; Lexique de la mort 883 ; Termes péjoratifs 4024 ; Termes argotiques 3911 ; Prénoms masculins 3792 ; Prénoms féminins 5253 ; Noms de famille en français 18 888. Aucune catégorie « marques » trouvée en français. Licence : CC BY-SA, comme ci-dessus.
- **Résultats mesurés sur les 934 mots de base du jeu `fjdkslqmeiantr`** (voir Q5 pour la définition) :
  - vulgaire 11, insulte 7, sexualité 6, drogue 5, armes 7, mort 38, péjoratif 42, argot 68 ; union des 8 catégories : 159 sur 934 (17 %).
  - union des 4 catégories « dures » (vulgaire, insulte, sexualité, drogue) : 26 mots, dont de vrais faux positifs : `faire`, `mettre`, `animal`, `rat`, `sale`, `retrait`, `tirelire`, `siffler`, `inter` (une acception vulgaire ou argotique d'un mot courant suffit à classer la page).
  - Sur toute la base (3-8 lettres, fréquence ≥ 1) : 409 mots touchés par les 4 catégories dures.
  - Côté inverse, des mots clairement sensibles non captés par une catégorie sont possibles (à vérifier par relecture, voir lacunes).
- **Prénoms et noms de famille** : le Wiktionnaire les catégorise avec majuscule, Lexique est en minuscules sans marqueur ; mettre les titres en minuscules puis croiser donne 109 coïncidences sur les 934 (exemples : `mai`, `terre`, `marine`, `mars`, `star`, `miel`) qui sont presque toutes des **homographes de mots ordinaires**, pas des prénoms. Le filtre par prénoms ne marche donc pas tel quel. Il faut une liste de prénoms français contemporains (hors périmètre, non cherchée) ou une règle manuelle ciblée.
- **Marques déposées** : aucune liste libre trouvée. Exemples visibles dans les échantillons : `diesel`, `kraft`, `master` (mots ordinaires, mais aussi noms de marque). À traiter à la main (liste noire interne). Wikidata contient des éléments « marque » mais je ne l'ai pas exploité.
- **Termes sensibles à la lecture seule** repérés dans l'échantillon Lexique : `sida`, `sadisme`, `fesse`, `dealer` ; ils posent un problème de contexte (école, famille), pas de grossièreté.

**Limites d'un filtrage automatique**
- Catégories par page, pas par sens : sur- et sous-blocage simultanés (`faire` flaggé, mots sensibles non flaggés).
- Les mots à fort risque pour des 8-12 ans ne sont pas qu'obscènes : maladies, morts, armes, drogues, religions, politique. Seule une relecture avec une grille de critères fixe peut trancher.
- Les listes d'insultes sont culturelles (Québec, Belgique, Suisse : « Insultes en français québécois » 48 pages) et évoluent.

### Lacunes
- Je n'ai pas cherché de liste libre française de prénoms (INSEE « Fichier des prénoms » est en Licence Ouverte d'après mes souvenirs, **non vérifié**).
- Je n'ai pas évalué les listes de mots d'autres projets (ex. listes de modération de moteurs de jeux).
- Je n'ai pas relu à la main les 934 mots.

---

## Q5. Faisabilité sous contrainte de lettres (mesurée)

### Définitions et méthode (mesure, pas estimation)
- Données : `Lexique383.tsv`, 142 694 lignes, agrégées par forme `ortho`.
- Critères de ce que j'appelle un « mot candidat » : forme uniquement en a-z non accentués, **3 à 8 lettres**, somme des fréquences films + livres **≥ 1 occurrence par million** (≥ 0,5 pour les croisements thématiques), au moins une catégorie parmi NOM, ADJ, VER, ADV, et **forme égale à son lemme** (nom singulier, verbe à l'infinitif, adjectif au masculin singulier) pour éviter les conjugaisons et pluriels. Les formes acceptées ne sont donc pas des mots « sûrs pour des enfants » : abréviations (`mme`), mots rares, vulgarités restent présents.
- Ordre des lettres : `f j d k s l q m e i a n t r` (les 14 lettres demandées dans cet ordre). Au-delà de 14 lettres, j'ai **supposé** l'ordre `o u p c b v g h y z w x` : c'est une hypothèse de calcul, pas une proposition de progression.

### Nombre de mots candidats selon le nombre de lettres (mesuré)
| Lettres (k) | Dernière lettre ajoutée | Formes, toutes catégories, 3-8 lettres, sans seuil | Formes de contenu, fréquence ≥ 1 | dont forme = lemme (mots de base) | dont noms |
|---|---|---|---|---|---|
| 6 | `l` (fjdksl) | 1 | 0 | 0 | 0 |
| 8 | `m` (…qm) | 1 | 0 | 0 | 0 |
| 9 | `e` | 35 | 22 | 14 | n.m. |
| 10 | `i` | 148 | 89 | 57 | n.m. |
| 11 | `a` | 492 | 283 | 150 | 133 |
| 12 | `n` | 888 | 478 | 246 | 215 |
| 13 | `t` | 1870 | 978 | 428 | 362 |
| 14 | `r` | 4037 | 2001 | **934** | 658 |
| 15 (hyp.) | `o` | — | — | 1481 | 1081 |
| 16 (hyp.) | `u` | — | — | 2423 | 1748 |
| 18 (hyp.) | `c` | — | — | 4474 | 3304 |
| 20 (hyp.) | `v` | — | — | 5904 | 4348 |
| 22 (hyp.) | `h` | — | — | 7573 | 5673 |
| 26 | tout a-z | — | — | 8213 | 6125 |
- Les 8 premières lettres (la rangée de base `fjdkslqm`) ne donnent quasiment aucun mot réel : il faut voyelles et consonnes fréquentes.
- Premier seuil utile : 9-10 lettres (`e`, `i`), mais avec 14 et 57 mots de base, surtout courts.
- Avec 14 lettres : 934 mots de base, soit 11 % des 8213 mots de base disponibles avec les 26 lettres non accentuées (avec les mêmes critères). Le gain est fort entre 13 (428) et 14 (934) grâce au `r`.
- Les mots accentués sont exclus de tous ces comptages ; dans les thèmes, 14 à 20 % des mots candidats portent un accent (ex. 91 sur 636 pour les animaux, 165 sur 934 pour la cuisine, mesuré) et seront accessibles plus tard.

### Mots thématiques sous contrainte (mesuré)
Méthode : membres des catégories du Wiktionnaire (profondeur 1 : la catégorie plus ses sous-catégories directes, fetch API du 2026-10-12), restreints aux titres d'un seul mot en minuscules a-z de 3 à 8 lettres, présents dans Lexique 3.83 avec forme = lemme et fréquence ≥ 0,5/M. Les thèmes regroupent plusieurs catégories (ex. « animaux » = mammifères, oiseaux, poissons, insectes, reptiles, animaux).

| Thème | Titres Wikt. | Candidats Lexique, 26 lettres | k=12 | k=14 | k=16 (hyp.) | k=18 (hyp.) | Lettres pour 30 mots (hyp.) |
|---|---|---|---|---|---|---|---|
| animaux | 9 736 | 459 | 12 | 50 | 138 | 247 | 14 |
| cuisine/aliments | 3 463 | 491 | 19 | 57 | 148 | 271 | 13 |
| véhicules | 2 970 | 340 | 9 | 43 | 84 | 164 | 14 |
| espace (planètes, astronomie, météo) | 5 387 | 160 | 6 | 20 | 53 | 94 | 15 |
| maison (meubles, outils) | 1 842 | 232 | 7 | 24 | 56 | 122 | 15 |
| sport et jeux | 1 322 | 155 | 5 | 20 | 43 | 81 | 15 |
| famille | 738 | 78 | 11 | 17 | 30 | 49 | 16 |
| métiers | 3 081 | 151 | 1 | 12 | 50 | 90 | 16 |
| vêtements | 1 286 | 242 | 4 | 16 | 59 | 130 | 16 |
| émotions (sentiments) | 630 | 113 | 6 | 11 | 37 | 66 | 16 |
| nature (arbres, fleurs) | 1 976 | 91 | 5 | 12 | 23 | 47 | 17 |
| fruits et légumes | 1 540 | 100 | 8 | 13 | 28 | 55 | 17 |
| magie / fantastique | 463 | 46 | 3 | 9 | 19 | 24 | 21 |
| couleurs | 156 | 40 | 1 | 2 | 11 | 21 | 20 |
| musique (instruments) | 1 006 | 61 | 0 | 4 | 12 | 26 | 19 |
| dinosaures | 76 | 0 | 0 | 0 | 0 | 0 | jamais |
- « Lettres pour 30 mots » est le plus petit k pour lequel le thème atteint 30 candidats (hypothèse d'ordre au-delà de 14 lettres).
- Somme des 16 thèmes à 14 lettres : 310 mots (avec doublons entre thèmes), 214 avec une fréquence ≥ 2/M, 154 avec une fréquence ≥ 5/M, 83 avec une fréquence ≥ 20/M. La fréquence ≥ 5/M réduit de moitié, ce qui est un filtre indispensable pour des enfants de 8 ans (ex. animaux : 50 → 16 mots à ≥ 5/M).
- Avec la profondeur 2 (catégories de catégories), les chiffres montent (animaux 55 à 14 lettres, cuisine 90) mais le bruit aussi.
- Qualité observée sur les échantillons à 14 lettres (lecture personnelle, non systématique) : environ la moitié des mots est conforme au thème ; les autres sont des homographes ou des mots peu connus des enfants. Exemples : `marine` et `aile` classés « véhicules », `main` classé « sport », `diamant` ou `nase` côté animaux (oiseau ou poisson, mais rare pour un enfant). Le Wiktionnaire est donc plus précis que WOLF (où `aile` est un animal) mais ne dispense pas d'une relecture.
- Autres sources thématiques à 14 lettres (mesurées) : Wikidata CC0 : 11 animaux, 25 aliments, 24 outils, 19 parties du corps, 6 véhicules ; WOLF : 52 animaux, 62 aliments, 39 plantes, 33 corps. Sans relecture, ces nombres comptent faux positifs.
- Dinosaures : sur 76 titres, 11 sont dans Lexique 3.83 (20 dans la 4.1), tous de 9 lettres au moins (`diplodocus`, `stégosaure`…). Avec la limite de 8 lettres, rien. Un thème « dinosaures » exigerait de lever la limite de longueur ou de s'écarter de Lexique.

### Réponse à « à partir de combien de lettres un thème devient praticable ? »
- Définition retenue : au moins 30 mots distincts (3 séries de 10) **avant** relecture, ce qui laisse sans doute 15 à 20 après relecture (estimation).
- Thèmes riches : 13 à 15 lettres. Thèmes moyens : 16 à 17 lettres. Thèmes pauvres (couleurs, musique, magie) : 19 à 21 lettres, ou bien les alimenter à la main. (Les valeurs au-delà de 14 lettres supposent mon ordre hypothétique.)
- Sur 14 lettres, seuls cuisine/aliments (57), animaux (50) et véhicules (43) ont un volume correct.

### Lacunes
- L'ordre des lettres au-delà de 14 est supposé ; une autre progression (par exemple avec `o` plus tôt) change les seuils.
- Pas de mesure avec Lexique 4.10 hors le total de 624 mots de base à 14 lettres (a-z, 3-8, `IsLem`=1, catégorie de contenu, fréquence ≥ 1) ; non comparable avec 934.
- Les « candidats » ne sont pas filtrés pour l'exclusion de mots inadaptés (Q4) ; ce filtre retire environ 17 % de l'ensemble à 14 lettres.

---

## Q6. Chaîne de production recommandée

1. **Base de mots** : Lexique 3.83 (ou 4.10). Filtrer : a-z pour le jeu de lettres, longueur 3-8 (à adapter pour dinosaures), catégorie NOM/ADJ/VER/ADV, forme = lemme (ou pluriels réguliers plus tard), fréquence minimale, exclure abréviations (`mme`), onomatopées (`ONO`), sigles. Garder `deflem` comme signal de familiarité.
2. **Thèmes** : extraire du dump `frwiktionary` (`page`, `linktarget`, `categorylinks`) la table mot → catégories. Choisir à la main, une fois, une liste de catégories par thème DactyloDys (profondeur 1 par défaut), plus quelques Thésaurus. Option : kaikki `fr-extract.jsonl` pour une catégorie **par sens**. Conserver la source (catégorie exacte et date du dump) pour chaque affectation.
3. **Signaux complémentaires** (facultatifs, internes) : `r_domain` / `r_isa` de JeuxDeMots (CC0) et classes Wikidata (CC0) pour proposer des thèmes manquants (corps, école, magie) ; ne pas utiliser WOLF comme source publiée.
4. **Niveau (8 ans / 12 ans)** : proxy = fréquence Lexique (films et livres) + `deflem` + longueur + nombre de syllabes, en trois bandes (A, B, C), puis relecture. Pas de norme française libre d'âge d'acquisition : c'est une lacune à signaler au porteur. Manulex pourrait servir de contrôle ponctuel si l'accord de ses auteurs est obtenu.
5. **Liste d'exclusion** : (a) LDNOOBW fr (CC BY 4.0) ; (b) catégories Wiktionnaire dures (vulgaire, insulte, sexualité, drogue) en **signalement**, pas en suppression automatique ; (c) liste maison : prénoms, marques, mots sensibles (maladies, mort, armes, religion, politique) ; (d) abréviations. Chaque exclusion est tracée (motif).
6. **Relecture humaine obligatoire** : (i) chaque mot publié, par une personne qui connaît le public 8-12 ans ; (ii) le **sens retenu** (homographes : `marine`, `main`, `mer`) ; (iii) les mots exclus par catégorie (les faux positifs comme `faire`) ; (iv) les marques et prénoms ; (v) l'adéquation au thème et à l'âge ; (vi) l'orthographe/graphie (accents, pluriels). Aucune automatisation n'est suffisante pour (ii)-(v).
7. **Publication** : jeu de données en CC BY-SA 4.0 avec fichier d'attributions (voir ci-dessous) ; journal de relecture versionné.

### Format de données proposé pour un mot
```json
{
  "mot": "salade",
  "lemme": "salade",
  "cgram": "NOM",
  "nb_lettres": 6,
  "lettres": ["a", "d", "e", "l", "s"],
  "themes": ["cuisine", "nature"],
  "sens_retenu": "plat de légumes crus",
  "niveau": 1,
  "niveau_base": {"freq_films_livres": 6.2, "deflem": 99, "syllabes": 2},
  "sources": [
    {"type": "theme", "origine": "wiktionnaire:Catégorie:Lexique en français de la cuisine", "date_dump": "2026-10-01"},
    {"type": "frequence", "origine": "Lexique 3.83"}
  ],
  "exclusions_detectees": [],
  "relecture": {"statut": "valide", "par": "initiales", "date": "2026-10-12", "note": ""},
  "licence": "CC BY-SA 4.0"
}
```
- `niveau` : 1 à 3 (8 ans → 12 ans), jamais une donnée Manulex tant que la licence n'est pas réglée.
- Les champs `exclusions_detectees` et `relecture.note` gardent la trace pour contester un choix.
- Les valeurs numériques exactes sont purement illustratives.

### Mentions d'attribution à porter (fichier `NOTICE` ou page « Crédits »)
- **Lexique** : « Lexique 3.83 (ou 4.10), New, B., Pallier, C., et al. — www.lexique.org — CC BY-SA 4.0 » ; citer New et al. (2004) et, si 4.10, New et al. (2026) ; indiquer les modifications apportées (filtrage, sélection). Corriger toute confusion avec la licence NC.
- **Wiktionnaire** : « Données thématiques issues du Wiktionnaire (fr.wiktionary.org), contributeurs listés dans l'historique des pages, CC BY-SA 4.0 (et 3.0 pour les contributions antérieures au 2023-06-07) » ; mentionner la date du dump ; fournir un lien vers la licence.
- **Vikidia / Wikimini** si utilisés : CC BY-SA 3.0, nom du site et URL de l'article.
- **Éduscol** si utilisé : « Source : éduscol, ministère de l'Éducation nationale, Licence Ouverte 2.0 (Etalab) », avec la date de réutilisation.
- **JeuxDeMots, Wikidata** : CC0, mention de courtoisie.
- **LDNOOBW** : CC BY 4.0, attribution obligatoire.
- **Princeton WordNet** : seulement si des données en sont redistribuées ; alors reproduire l'avis de copyright du fichier LICENSE.

### Risques
- **Licence** : Manulex (NC), ARASAAC (NC), ÉOLE et Dubois-Buyse (droit d'éditeur), WOLF (CeCILL-C), suppléments d'articles sans licence. Chacun peut rendre le jeu non redistribuable en CC BY-SA 4.0 s'il y entre. L'incohérence du site Lexique (lien BY-NC) est à faire corriger ou à documenter.
- **Compatibilité 3.0 → 4.0** : pour les données Wiktionnaire/Vikidia/Wikimini antérieures à juin 2023 ; à valider (ou publier en BY-SA 3.0 pour cette part).
- **Bruit thématique** : homographes, catégories au niveau de la page, thèmes pauvres ou absents (corps, école, magie, dinosaures).
- **Rareté sous contrainte de lettres** : sous 13 lettres, aucun thème n'est praticable ; il faudra que les exercices mélangent thèmes et mots courants (934 mots à 14 lettres, 11 % du potentiel).
- **Adéquation à l'âge** : la fréquence est celle d'adultes (sous-titres, livres) ; des mots comme `nase` ou `jarret` sont fréquents dans leurs thèmes mais inconnus d'un enfant. Pas de norme libre d'âge.
- **Sécurité des contenus** : un filtre automatique ne remplace pas la relecture (faux positifs comme `faire`, faux négatifs possibles, marques, prénoms, sujets sensibles).
- **Dérive des sources** : le Wiktionnaire change chaque jour ; figer un dump daté et garder les catégories utilisées.
- **Disponibilité** : Éduscol, HAL, Springer et le site GLAWI bloquent ou ne répondent pas aux robots (403, anti-bot, ECONNREFUSED) ; leurs conditions ont dû être lues par navigateur ou sont restées non lues.

---

## Tableau comparatif des sources de thèmes

| Source | Licence (lue à la source ?) | Compatible CC BY-SA 4.0 pour redistribuer ? | Volume | Effort | Remarque |
|---|---|---|---|---|---|
| Wiktionnaire fr (dumps catégories) | CC BY-SA 4.0 (3.0 avant 2023-06-07) — oui | Oui (part 4.0) ; part 3.0 à valider | 16 thèmes testés : 40 à 490 candidats Lexique chacun (26 lettres) | Moyen (SQL + tri des catégories) | Bruit page/sens ; absent pour corps, école, magie |
| kaikki.org `fr-extract` | « same licenses as Wiktionary » — oui | Idem Wiktionnaire | 6,4 Go brut | Élevé (gros JSONL) | Catégories par sens ; extraction « work in progress » |
| DBnary | CC BY-SA 3.0 — oui | À valider (3.0) | Non mesuré | Moyen | Pas de catégories thématiques confirmées |
| GLAWI | « free license » — **non vérifiée** | Inconnu | 1,34 M d'articles | Moyen | Site inaccessible |
| WOLF (via OMW) | CeCILL-C — oui | **Douteux** (licence logicielle) | 51 334 lemmes | Moyen (+ Princeton WordNet) | Bruit élevé ; lexnames utiles seulement comme indice |
| WoNeF | LGPL-LR — **non vérifiée** | Douteux | Non mesuré | Introuvable | Pas de téléchargement trouvé |
| WordNet Domains | CC BY 3.0 (page) + accord de téléchargement non lu | Oui sur le papier, à confirmer | Domaines sur synsets anglais | Élevé | Passe par un mapping anglais |
| Wikidata lexèmes + classes | CC0 — oui | Oui | 31 505 lexèmes fr, 19 710 avec sens relié | Moyen (SPARQL) | Faible couverture, hiérarchie propre |
| ConceptNet 5 | CC BY-SA 4.0 — oui | Oui | Non mesuré (fr) | Moyen | Qualité non évaluée |
| JeuxDeMots / RezoJDM | CC0 (README + site) — oui | Oui | 20 M de termes, dump 7,3 Go | Élevé (gros fichier) | Bruité, contenu non filtré |
| Éduscol (liste Brunet) | Etalab 2.0 général, exclusions de tiers — oui avec réserve | Oui si confirmé | ~1500 mots | Faible | Pas de thèmes ; liste de base |
| Manulex | **CC BY-NC-SA 3.0** — oui | **Non** | 23 812 lemmes | — | Contacter les auteurs |
| Dubois-Buyse, ÉOLE | Droit d'éditeur — non vérifiée | Non | 3 000 à 12 000 mots | — | Inutilisables sans accord |
| Vikidia | CC BY-SA 3.0 + GFDL — oui | À valider (3.0) | 45 951 articles | Moyen | Pour repérer les thèmes lus par des enfants |
| Wikimini | CC BY-SA 3.0 (textes) — oui ; images exclues | À valider (3.0) | 22 280 articles | Moyen | Images non réutilisables |
| ARASAAC | CC BY-NC-SA (partiellement lue) | **Non** | — | — | Inutilisable |
| LDNOOBW fr (exclusion) | CC BY 4.0 — oui | Oui | 91 mots | Très faible | Très incomplète |

---

## Chaîne de production : version courte

Lexique (filtre lettres/longueur/catégorie/fréquence) → croisement avec les catégories du Wiktionnaire (dump daté) → score de niveau (fréquence + deflem + longueur) → signalement des exclusions (LDNOOBW + catégories dures + liste maison) → **relecture humaine mot par mot et sens par sens** → publication CC BY-SA 4.0 avec fichier d'attributions.

Ordres de grandeur à retenir : 934 mots de base à 14 lettres ; environ 310 mots thématiques candidats (avec doublons) avant relecture ; environ 17 % de ces 934 mots signalés par au moins une catégorie sensible.

## Fichiers de travail (hors dépôt)
Dans `C:\Users\Pierro\AppData\Local\Temp\claude\C--Projets-DactyloDys\254309a1-3f92-4fdc-8d51-ba3e7e68989e\scratchpad\` :
- `lexique\Lexique383.zip`, `lexique\x\` (tsv, manuel), `lexique\Lexique4.1.zip`, `lexique\x41\`
- `web\` : README OpenLexicon, extraits de pages, membres de catégories Wiktionnaire (`themes_members*.json`, `excl_members.json`), table WOLF, WordNet 3.0, début de `fr-extract.jsonl.gz`
- `scripts\` : scripts Python de mesure (`measure.py`, `themes_fetch*.py`, `themes_measure*.py`, `curve.py`, `theme_curve.py`, `excl.py`, `wolf_measure.py`, `wd*.py`)
