# Voix de synthèse françaises pour les consignes (recherche du 2026-10-13)

Recherche documentaire faite par un agent, sans aucun téléchargement. Les faits ci-dessous ont été lus aux adresses citées ; ils n'ont pas été recoupés par une seconde lecture. Aucun avis juridique.

## Besoin

Une centaine de consignes d'une phrase, en français de France, lues par des fichiers audio pré-générés hors ligne et auto-hébergés (ADR-011, ADR-022). La licence de la voix doit permettre de redistribuer les fichiers produits dans un projet libre, y compris en cas de réutilisation commerciale.

## Moteur Piper

- `rhasspy/piper` (MIT) est archivé depuis octobre 2025 ; le développement continue dans `OHF-Voice/piper1-gpl` (GPL-3.0), distribué comme paquet Python `piper-tts` (pas d'exécutable Windows autonome repéré).
- Dernier exécutable Windows autonome : version 2023.11.14-2 de l'ancien dépôt, `piper_windows_amd64.zip`, 22,5 Mo.
- Piper s'appuie sur espeak-ng (GPL) pour la phonétisation. Le mainteneur dit ne pas savoir si cela touche les fichiers produits (discussion 271 du dépôt d'origine).

## Voix `fr_FR` de Piper (dépôt Hugging Face `rhasspy/piper-voices`)

| Voix | Taille | Données, licence écrite sur la fiche | Origine du modèle | Sorties redistribuables |
|---|---|---|---|---|
| mls medium | 76,7 Mo | MLS (openslr 94), CC BY 4.0, 125 locuteurs | entraîné de zéro | oui, avec la réserve générale ci-dessous |
| siwis medium | 63,2 Mo | SIWIS, CC BY 4.0 selon la fiche, 1 voix | affiné depuis la voix anglaise lessac | doute fort |
| siwis low | 28,1 Mo | idem | affiné depuis la voix anglaise ryan | doute fort |
| upmc medium | 76,7 Mo | UPMC, CC BY-SA 4.0, 2 voix | affiné depuis lessac | doute fort |
| tom medium | 63,5 Mo | fiche « AGPLv3 », provenance des données non établie | non indiquée | à écarter |
| gilles low | 63,1 Mo | fiche « CC0 », non confirmée à la source | affiné depuis ryan | doute |
| mls_1840 low | 63,1 Mo | MLS, CC BY 4.0, 1 voix | affiné depuis ryan | doute |

Seules les qualités « low » et « medium » existent en français.

Le point dur : la plupart des voix françaises sont **affinées à partir d'une voix anglaise** sous licence restrictive. La voix `ryan` est sous CC BY-NC-SA 4.0 (non commercial). La voix `lessac` renvoie à la licence Blizzard 2013, qui exclut l'usage commercial. Aucune source lue ne dit si les fichiers audio produits héritent de ces licences ; les mainteneurs renvoient la responsabilité à l'utilisateur.

## Autres moteurs hors ligne

- **Kokoro-82M** : Apache-2.0 ; une voix française, `ff_siwis`, déclarée CC BY (données SIWIS), qualité notée moyenne par ses auteurs. Meilleure piste après Piper sur le plan des licences. Usage sous Windows non vérifié.
- MMS-TTS (Meta) : CC BY-NC, à écarter. Coqui XTTS-v2 : licence non libre, à écarter. eSpeak NG : libre mais voix robotique. Mimic 3 : abandonné.

## Format audio pour le web

MP3 est lu partout, y compris sur Safari et iOS. Opus n'est pleinement pris en charge sur iOS que depuis la version 18.4. Ordre de grandeur calculé, non mesuré : une phrase de 3 secondes en MP3 mono à 64 kb/s pèse environ 24 ko, soit 2 à 3 Mo pour cent consignes.

## Conclusion provisoire

1. `fr_FR-mls-medium` est la seule voix Piper sans licence restrictive en amont.
2. Kokoro `ff_siwis` est l'alternative propre, avec un autre moteur.
3. `fr_FR-siwis-medium` peut servir de point de comparaison à l'oreille, mais ne doit pas être publiée sans décision sur la licence Blizzard.
4. Une voix humaine enregistrée par le projet lève toute question de licence (ADR-011 la prévoit).

## Non vérifié

Licence réelle de SIWIS à sa source (la page d'origine ne nomme pas de licence) ; licence du jeu de données de `gilles` ; provenance des données de `tom` ; sexe des voix ; options exactes de l'ancien exécutable ; adresses de téléchargement, déduites de l'arborescence et non testées.

## Sources

- https://github.com/rhasspy/piper · https://github.com/OHF-Voice/piper1-gpl · https://github.com/rhasspy/piper/discussions/271
- https://huggingface.co/rhasspy/piper-voices/tree/main/fr/fr_FR (fiches `MODEL_CARD` de chaque voix)
- https://www.cstr.ed.ac.uk/projects/blizzard/2013/lessac_blizzard2013/license.html
- https://huggingface.co/hexgrad/Kokoro-82M · https://huggingface.co/facebook/mms-tts-fra · https://huggingface.co/coqui/XTTS-v2
- https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Audio_codecs · https://caniuse.com/opus

## Échantillons du 2026-10-13

Avec l'accord du porteur, téléchargés hors du dépôt (dossier temporaire de la session, à refaire dans une nouvelle session) : `piper_windows_amd64.zip` (22 477 236 octets, https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip) et `fr_FR-mls-medium.onnx` avec son `.onnx.json` (76 733 750 et 7 036 octets, https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/mls/medium/). Tailles conformes aux annonces des sources.

Le modèle contient 125 voix (22 050 Hz). Huit échantillons, voix 0 à 7, envoyés au porteur dans une page autonome. Commande, le texte étant lu sur l'entrée standard :

```
piper.exe --model fr_FR-mls-medium.onnx --speaker <numéro> --output_file <sortie>.wav
```

Environ une seconde de calcul pour dix secondes de son, sans carte graphique. Aucun fichier audio n'entre dans le dépôt tant que la voix et sa licence ne sont pas choisies.
