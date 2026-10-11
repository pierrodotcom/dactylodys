# Leçons apprises

Chaque erreur évitable rencontrée est consignée ici **au moment où elle est trouvée**. Format : une ligne par leçon. Une leçon qui revient deux fois devient une règle dans `.claude/rules/` ou un contrôle automatique (lint, test, hook), puis est marquée « Automatisée ».

| # | Date | Domaine | Symptôme ou piège | Règle | État |
|---|---|---|---|---|---|
| L-001 | 2026-10-11 | Clavier | `navigator.keyboard.getLayoutMap()` absent de Firefox et Safari, incomplet sur Chromium | Ne jamais détecter la disposition automatiquement : choix + étalonnage | Règle `clavier.md` |
| L-002 | 2026-10-11 | Clavier | Touches mortes : événements différents sur Windows, macOS et Safari | Juger le caractère produit ; toute la complexité dans `input-adapter` | Règle `clavier.md` |
| L-003 | 2026-10-11 | Tests | Playwright ne simule ni AZERTY ni touches mortes | Rejouer des traces réelles enregistrées | Règle `tests.md` |
| L-004 | 2026-10-11 | Données | Safari efface le stockage après 7 jours sans visite | Export/import par fichier obligatoire ; proposer l'installation | À traiter J2 |
| L-005 | 2026-10-11 | Outillage | TypeScript 7 exclu par typescript-eslint et svelte-check | Épingler TypeScript 6.0.x | À vérifier J0 |
| L-006 | 2026-10-11 | Outillage | Versions majeures très récentes (Vite 8, Vitest 5, ESLint 10) | Lire la documentation de la version installée avant d'écrire | Règle `CLAUDE.md` |
| L-007 | 2026-10-11 | Licences | Manulex est non commercial ; plusieurs projets GitHub de dactylo n'ont aucune licence | Vérifier le fichier LICENSE avant toute réutilisation ; sources interdites listées | Règle `contenu-i18n.md` |
| L-008 | 2026-10-11 | Données | Le thème français de Tux Typing utilise un doigté QWERTY | Ne pas reprendre ses fichiers de doigté | Règle `clavier.md` |
| L-009 | 2026-10-11 | Hébergement | GitHub Pages payant pour un dépôt privé | Dépôt public ou Cloudflare Pages | Question Q1 |
| L-010 | 2026-10-11 | Environnement | PowerShell 5.1 : pas de `&&`, encodage ANSI par défaut pour `Set-Content` | Utiliser Bash pour les redirections vers des fichiers ; `;` et `if ($?)` en PowerShell | Active |
