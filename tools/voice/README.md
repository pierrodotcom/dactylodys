# Voix des consignes : de l'enregistrement aux fichiers publiés

Les consignes sont dites par une personne, pas par une voix de synthèse (ADR-028). Rien n'est envoyé sur Internet : on enregistre dans le navigateur, on télécharge une archive, on la dépose dans le dépôt, et cet outil en fait les fichiers que le site publie.

Un texte = un fichier, nommé par l'empreinte du texte (`voiceKey`). Un texte réécrit n'a donc plus d'enregistrement : l'outil le signale.

## 1. Enregistrer

Ouvrir la page `/dev/voix` du site (en HTTPS, ou sur `localhost` pendant le développement), de préférence sur un téléphone. Lire chaque texte, puis télécharger l'archive `voix-fr__<date>.zip`. Les prises restent dans le navigateur tant qu'on ne les efface pas : on peut s'y reprendre en plusieurs fois.

## 2. Importer

Déposer l'archive dans le projet (par exemple dans `docs\voix\`), puis, depuis l'invite de commandes Windows :

```
node "C:\Projets\DactyloDys\tools\voice\import.js" "C:\Projets\DactyloDys\docs\voix\voix-fr__2026-10-14.zip"
```

L'outil :

- vérifie l'archive (`enregistrements.json`, un fichier WAV mono 16 bits par texte, empreinte de chaque texte) ;
- écrit `static\voice\fr\<clé>.mp3` si `ffmpeg` est dans le PATH (MP3 mono, débit `mp3BitrateKbps` de `content\common\voice.json`), sinon `static\voice\fr\<clé>.wav`, et il le dit ;
- écrit `static\voice\fr\manifest.json`, que l'appli lit pour savoir quels textes ont une voix ;
- ajoute ou met à jour la ligne de la voix dans `static\ATTRIBUTIONS.md` (nom à créditer ou « contribution anonyme », licence CC BY-SA 4.0) ;
- affiche un rapport : textes sans enregistrement, enregistrements dont le texte n'existe plus, poids total.

Importer une deuxième archive complète la première : un texte enregistré de nouveau remplace l'ancien fichier, les autres sont gardés, et chaque personne reste créditée.

Pour supprimer les enregistrements dont le texte n'existe plus :

```
node "C:\Projets\DactyloDys\tools\voice\import.js" "C:\Projets\DactyloDys\docs\voix\voix-fr__2026-10-14.zip" --prune
```

Pour garder les fichiers WAV même si `ffmpeg` est installé, ajouter `--no-ffmpeg`. Pour écrire ailleurs que dans le dépôt (essai), ajouter `--target "C:\un\autre\dossier"`.

## 3. Vérifier et publier

```
cd /d "C:\Projets\DactyloDys" && npm run verify
```

Puis valider `static\voice\` et `static\ATTRIBUTIONS.md` dans le même commit.

## À savoir

- L'outil n'utilise que Node 24, sans aucune dépendance. Il charge directement les modules TypeScript de l'appli (`src/lib/audio/`) : l'empreinte d'un texte et la liste des textes à dire n'existent qu'à un seul endroit.
- Les parcours et récits dont il faut dire les textes sont listés dans `tools/voice/config.json`. Ajouter un récit = ajouter son chemin dans `story`.
- Sans `ffmpeg`, compter environ 45 Ko par seconde de voix (WAV) ; avec, environ 8 Ko par seconde (MP3 à 64 kbit/s).
- La logique (plan d'import, manifeste, rapport, tableau des attributions) est dans `tools/voice/lib/` et testée par `src/lib/audio/voice-import.test.ts` ; l'outil entier est lancé par `src/routes/dev/voix/import-tool.test.ts`.
