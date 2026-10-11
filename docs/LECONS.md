# Leçons apprises

Chaque erreur évitable rencontrée est consignée ici **au moment où elle est trouvée**. Format : une ligne par leçon. Une leçon qui revient deux fois devient une règle dans `.claude/rules/` ou un contrôle automatique (lint, test, hook), puis est marquée « Automatisée ».

| # | Date | Domaine | Symptôme ou piège | Règle | État |
|---|---|---|---|---|---|
| L-001 | 2026-10-11 | Clavier | `navigator.keyboard.getLayoutMap()` absent de Firefox et Safari, incomplet sur Chromium | Ne jamais détecter la disposition automatiquement : choix + étalonnage | Règle `clavier.md` |
| L-002 | 2026-10-11 | Clavier | Touches mortes : événements différents sur Windows, macOS et Safari | Juger le caractère produit ; toute la complexité dans `input-adapter` | Règle `clavier.md` |
| L-003 | 2026-10-11 | Tests | Playwright ne simule ni AZERTY ni touches mortes | Rejouer des traces réelles enregistrées | Règle `tests.md` |
| L-004 | 2026-10-11 | Données | Safari efface le stockage après 7 jours sans visite | Export/import par fichier obligatoire ; proposer l'installation | À traiter J2 |
| L-005 | 2026-10-11 | Outillage | TypeScript 7 exclu par typescript-eslint (peer `<6.1.0`) et svelte-check | Épingler TypeScript 6.0.x | Confirmée J0 |
| L-006 | 2026-10-11 | Outillage | Versions majeures très récentes (Vite 8, Vitest 5, ESLint 10) | Lire la documentation de la version installée avant d'écrire | Règle `CLAUDE.md` |
| L-007 | 2026-10-11 | Licences | Manulex est non commercial ; plusieurs projets GitHub de dactylo n'ont aucune licence | Vérifier le fichier LICENSE avant toute réutilisation ; sources interdites listées | Règle `contenu-i18n.md` |
| L-008 | 2026-10-11 | Données | Le thème français de Tux Typing utilise un doigté QWERTY | Ne pas reprendre ses fichiers de doigté | Règle `clavier.md` |
| L-009 | 2026-10-11 | Hébergement | GitHub Pages payant pour un dépôt privé | Dépôt public ou Cloudflare Pages | Question Q1 |
| L-010 | 2026-10-11 | Environnement | PowerShell 5.1 : pas de `&&`, encodage ANSI par défaut pour `Set-Content` | Utiliser Bash pour les redirections vers des fichiers ; `;` et `if ($?)` en PowerShell | Active |
| L-011 | 2026-10-11 | Outillage | Les `latest` npm sont SvelteKit 3, TypeScript 7 et adapter-static 4, incompatibles avec la stack retenue | Toujours installer une version explicite ; adapter-static reste en 3.x tant que Kit est en 2.x | Règle `CLAUDE.md` |
| L-012 | 2026-10-11 | i18n | Paraglide charge par défaut son module de format depuis un CDN à chaque build | Module installé en local et référencé par chemin dans `project.inlang/settings.json` | Corrigée |
| L-013 | 2026-10-11 | Environnement | Git Bash convertit `VAR=/chemin` en chemin Windows (`BASE_PATH=/dactylodys` casse le build) | Préfixer par `MSYS_NO_PATHCONV=1` ou utiliser PowerShell | Active |
| L-014 | 2026-10-11 | Tests | Playwright avec tous les cœurs fige la machine ; Firefox de Playwright ne démarre pas dans le bac à sable des agents (« spawn UNKNOWN ») | 2 workers en local ; Firefox validé par la CI et par le porteur dans son terminal | Active |
| L-015 | 2026-10-11 | Outillage | npm 11 n'exécute pas les scripts d'installation des dépendances (hooks lefthook non posés) | Script `prepare` → `tools/install-hooks.js` | Corrigée |
| L-016 | 2026-10-11 | Environnement | `npm install` dure environ 3 minutes sur ce poste | Prévoir un délai d'exécution ≥ 5 minutes | Active |
| L-017 | 2026-10-11 | Orchestration | Un agent a rendu un compte rendu renvoyant à un « texte ci-dessus » non transmis | Exiger un compte rendu final autonome, et toujours vérifier par `git status` + `npm run verify` | Active |
