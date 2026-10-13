import { join } from 'node:path';
import {
	CONFIG,
	DATA_DIR,
	REPO_ROOT,
	readLines,
	readTable,
	writeBankJson,
	writeText
} from './lib/common.js';

const THEME_TITLES = new Map(CONFIG.themes.map((theme) => [theme.id, theme.title]));
const NO_THEME = 'Sans thème particulier';

function loadPhrases() {
	const validated = new Set(readLines(join(DATA_DIR, 'validated-phrases.txt')));
	return readTable(join(DATA_DIR, 'phrases.fr.txt')).map(([level, themes, text], i) => {
		const ids = themes === '' ? [] : themes.split(',').map((id) => id.trim());
		for (const id of ids) {
			if (!THEME_TITLES.has(id))
				throw new Error(`phrases.fr.txt line ${i + 1}: unknown theme "${id}"`);
		}
		const normalized = text.normalize('NFC');
		return {
			text: normalized,
			themes: ids,
			level: Number(level),
			review: validated.has(normalized) ? 'human' : 'agent'
		};
	});
}

function writeReviewDoc(phrases) {
	const out = [
		'# Relecture des phrases (français)',
		'',
		'Cocher `[x]` = garder la phrase. Barrer (`~~phrase~~`) = retirer la phrase du jeu.',
		'Pour corriger un thème ou une formulation, écrire la correction à la suite : `→ correction`.',
		'Ce fichier est généré par `tools/content/build-phrases.js` ; reporter les décisions dans `tools/content/data/`.'
	];
	const groups = [...THEME_TITLES.keys(), ''];
	for (const id of groups) {
		const inGroup = phrases.filter((p) =>
			id === '' ? p.themes.length === 0 : p.themes.includes(id)
		);
		if (inGroup.length === 0) continue;
		out.push('', `## ${id === '' ? NO_THEME : THEME_TITLES.get(id)} (${inGroup.length})`);
		for (const level of [1, 2, 3]) {
			const group = inGroup.filter((p) => p.level === level);
			if (group.length === 0) continue;
			out.push('', `### Niveau ${level} (${group.length})`, '');
			group.forEach((p) => out.push(`- [ ] ${p.text}`));
		}
	}
	writeText(join(REPO_ROOT, CONFIG.output.phraseReviewDoc), `${out.join('\n')}\n`);
}

const phrases = loadPhrases();
const bank = {
	schemaVersion: 1,
	id: CONFIG.output.phraseBankId,
	locale: CONFIG.output.locale,
	phrases
};
writeBankJson(join(REPO_ROOT, CONFIG.output.phrasesFile), bank, 'phrases');
writeReviewDoc(phrases);
console.log(`Wrote ${phrases.length} phrases to ${CONFIG.output.phrasesFile}`);
