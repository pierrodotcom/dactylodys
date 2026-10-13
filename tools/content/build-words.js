import { join } from 'node:path';
import {
	CACHE_DIR,
	CONFIG,
	DATA_DIR,
	REPO_ROOT,
	parseArgs,
	readLines,
	readTable,
	writeBankJson,
	writeText
} from './lib/common.js';
import { loadCategory, loadLexique } from './lib/sources.js';

const args = parseArgs(process.argv.slice(2));
const REPORT_DIR = typeof args.report === 'string' ? args.report : join(CACHE_DIR, 'report');
const { candidates: RULES, levels: LEVELS } = CONFIG;
const WORD_PATTERN = new RegExp(RULES.pattern, 'u');
const THEME_IDS = CONFIG.themes.map((theme) => theme.id);
const GENERAL = 'general';
const FALLBACK_LEVEL = 2;

function band(bands, value, key, descending) {
	const hit = descending
		? bands.find((candidate) => value >= candidate[key])
		: bands.find((candidate) => value <= candidate[key]);
	return hit.points;
}

function computeLevel(entry) {
	const known = entry.known ?? (entry.freq >= RULES.unknownKnownIsTrueFromFreq ? 100 : 0);
	const points =
		band(LEVELS.freqBands, entry.freq, 'minFreq', true) +
		band(LEVELS.knownBands, known, 'minKnown', true) +
		band(LEVELS.lengthBands, [...entry.text].length, 'maxLetters', false);
	if (points <= LEVELS.level1MaxPoints) return 1;
	return points <= LEVELS.level2MaxPoints ? 2 : 3;
}

function loadDecisions() {
	const exclusions = new Map();
	for (const line of readLines(join(DATA_DIR, 'exclusions.txt'))) {
		const family = /^\[([^\]]+)\]\s+(.+)$/.exec(line);
		if (family) {
			family[2]
				.split(/\s+/)
				.filter((word) => !word.startsWith('#'))
				.forEach((word) => exclusions.set(word, family[1]));
		} else {
			const [word, why] = line.split('|').map((cell) => cell.trim());
			exclusions.set(word, why || 'relecture');
		}
	}
	const keep = new Set(
		readLines(join(DATA_DIR, 'keep.txt')).flatMap((line) =>
			line.replace(/\s+#.*$/, '').split(/\s+/)
		)
	);
	const additions = new Map();
	for (const [text, themes, level] of readTable(join(DATA_DIR, 'additions.txt'))) {
		additions.set(text, {
			text,
			themes: themes ? themes.split(',').map((t) => t.trim()) : [GENERAL],
			level: level ? Number(level) : null
		});
	}
	const corrections = new Map();
	for (const [text, spec] of readTable(join(DATA_DIR, 'theme-corrections.txt'))) {
		const change = corrections.get(text) ?? { add: new Set(), remove: new Set() };
		for (const token of spec.split(/\s+/)) {
			if (token.startsWith('-')) change.remove.add(token.slice(1));
			else change.add.add(token.replace(/^\+/, ''));
		}
		corrections.set(text, change);
	}
	return { exclusions, keep, additions, corrections };
}

function indexCategories(groups) {
	const index = new Map();
	for (const group of groups) {
		for (const category of group.categories) {
			const { titles } = loadCategory(category);
			for (const title of titles) {
				const hits = index.get(title) ?? new Set();
				hits.add(group.id);
				index.set(title, hits);
			}
		}
	}
	return index;
}

function passes(entry, rule) {
	const letters = [...entry.text].length;
	const known = entry.known ?? (entry.freq >= RULES.unknownKnownIsTrueFromFreq ? 100 : null);
	return (
		letters >= rule.minLetters &&
		letters <= (rule.maxLetters ?? RULES.maxLetters) &&
		entry.freq >= rule.minFreq &&
		known !== null &&
		known >= rule.minKnown
	);
}

function run() {
	const lexique = loadLexique();
	const decisions = loadDecisions();
	const themeIndex = indexCategories(CONFIG.themes.filter((theme) => theme.categories.length > 0));
	const exclusionIndex = indexCategories(CONFIG.exclusionGroups);
	const autoGroups = new Set(CONFIG.exclusionGroups.filter((g) => g.auto).map((g) => g.id));
	const kept = new Map();
	const excluded = [];
	const flagged = [];
	const applied = new Set();
	const notInLexique = [];

	const consider = (entry, themes, origin) => {
		const reasons = [...(exclusionIndex.get(entry.text) ?? [])];
		const hard = reasons.filter((id) => autoGroups.has(id));
		if (reasons.length > 0) flagged.push({ entry, reasons });
		if (hard.length > 0 && !decisions.keep.has(entry.text) && origin !== 'addition') {
			excluded.push({ text: entry.text, stage: 'categorie', reason: hard.join(',') });
			return;
		}
		const manual = decisions.exclusions.get(entry.text);
		if (manual !== undefined) {
			applied.add(entry.text);
			excluded.push({ text: entry.text, stage: 'relecture', reason: manual });
			return;
		}
		const level =
			decisions.additions.get(entry.text)?.level ??
			(entry.pos.length === 0 ? FALLBACK_LEVEL : computeLevel(entry));
		kept.set(entry.text, { entry, themes, level, origin, flags: reasons });
	};

	for (const entry of lexique.values()) {
		if (!WORD_PATTERN.test(entry.text)) continue;
		const letters = [...entry.text].length;
		if (letters < RULES.minLetters || letters > RULES.maxLetters) continue;
		const themes = new Set(
			CONFIG.themes
				.filter((theme) => themeIndex.get(entry.text)?.has(theme.id))
				.map((theme) => theme.id)
		);
		const change = decisions.corrections.get(entry.text);
		change?.add.forEach((id) => themes.add(id));
		change?.remove.forEach((id) => themes.delete(id));
		if (themes.size > 0) {
			if (passes(entry, RULES.themed)) consider(entry, [...themes], 'theme');
		} else if (passes(entry, RULES.general)) {
			consider(entry, [GENERAL], 'general');
		}
	}

	for (const addition of decisions.additions.values()) {
		const found = lexique.get(addition.text);
		const entry = found ?? { text: addition.text, pos: [], freq: 0, known: null };
		if (!found) notInLexique.push(addition.text);
		if (!WORD_PATTERN.test(addition.text)) {
			throw new Error(`additions.txt: "${addition.text}" has characters that cannot be typed`);
		}
		const current = kept.get(addition.text);
		const themes = new Set([...(current?.themes ?? []), ...addition.themes]);
		const change = decisions.corrections.get(addition.text);
		change?.remove.forEach((id) => themes.delete(id));
		if (themes.size > 1) themes.delete(GENERAL);
		kept.delete(addition.text);
		consider(entry, [...themes], 'addition');
	}

	const unused = [...decisions.exclusions.keys()].filter((word) => !applied.has(word));
	return {
		kept,
		excluded: excluded.filter((item) => !kept.has(item.text)),
		flagged,
		unused,
		notInLexique
	};
}

function buildBank(result) {
	const validated = new Set(readLines(join(DATA_DIR, 'validated-words.txt')));
	const words = [...result.kept.values()]
		.map(({ entry, themes, level }) => ({
			text: entry.text,
			themes: THEME_IDS.filter((id) => themes.includes(id)),
			level,
			review: validated.has(entry.text) ? 'human' : 'agent'
		}))
		.sort((a, b) => a.text.localeCompare(b.text, 'fr'));
	const used = new Set(words.flatMap((word) => word.themes));
	return {
		schemaVersion: 1,
		id: CONFIG.output.wordBankId,
		locale: CONFIG.output.locale,
		sources: [
			{
				name: 'Lexique 3.83 (New, Pallier, et al.): fréquences et part d’adultes connaissant le mot',
				url: 'http://www.lexique.org/',
				license: 'CC BY-SA 4.0'
			},
			{
				name: 'Wiktionnaire français (catégories thématiques et d’exclusion), contributeurs du Wiktionnaire',
				url: 'https://fr.wiktionary.org/',
				license: 'CC BY-SA 4.0'
			}
		],
		themes: CONFIG.themes
			.filter((theme) => used.has(theme.id))
			.map((theme) => ({ id: theme.id, title: theme.title })),
		words
	};
}

function writeReports(result, bank) {
	const lines = ['text\tstatus\tthemes\tlevel\tpos\tfreq\tknown\tfromLexique'];
	for (const { entry, themes, level, origin } of result.kept.values()) {
		lines.push(
			[
				entry.text,
				`kept:${origin}`,
				themes.join(','),
				level,
				entry.pos.join(','),
				entry.freq.toFixed(2),
				entry.known ?? '',
				entry.pos.length > 0
			].join('\t')
		);
	}
	writeText(join(REPORT_DIR, 'kept.tsv'), `${lines.join('\n')}\n`);

	const excluded = result.excluded
		.map((item) => `${item.text}\t${item.stage}\t${item.reason}`)
		.sort((a, b) => a.localeCompare(b, 'fr'));
	writeText(join(REPORT_DIR, 'excluded.tsv'), `text\tstage\treason\n${excluded.join('\n')}\n`);

	const byTheme = new Map();
	for (const { entry, themes, level, flags } of result.kept.values()) {
		for (const id of themes) {
			const list = byTheme.get(id) ?? [];
			list.push(`${entry.text}${level}${flags.length > 0 ? `~${flags.join('/')}` : ''}`);
			byTheme.set(id, list);
		}
	}
	const sections = THEME_IDS.filter((id) => byTheme.has(id)).map(
		(id) =>
			`## ${id} (${byTheme.get(id).length})\n${byTheme
				.get(id)
				.sort((a, b) => a.localeCompare(b, 'fr'))
				.join(' ')}`
	);
	writeText(join(REPORT_DIR, 'review-pool.txt'), `${sections.join('\n\n')}\n`);

	const flagged = result.flagged
		.map(({ entry, reasons }) => `${entry.text}\t${entry.freq.toFixed(1)}\t${reasons.join(',')}`)
		.sort((a, b) => a.localeCompare(b, 'fr'));
	writeText(join(REPORT_DIR, 'flagged.tsv'), `text\tfreq\tgroups\n${flagged.join('\n')}\n`);

	const counts = {};
	for (const word of bank.words) for (const id of word.themes) counts[id] = (counts[id] ?? 0) + 1;
	const summary = [
		`words kept: ${bank.words.length}`,
		`excluded: ${result.excluded.length} (category: ${result.excluded.filter((e) => e.stage === 'categorie').length}, review: ${result.excluded.filter((e) => e.stage === 'relecture').length})`,
		`themes: ${JSON.stringify(counts)}`,
		`exclusions that matched no candidate: ${result.unused.length}`,
		`additions absent from Lexique (level 2 unless given): ${result.notInLexique.join(' ')}`
	];
	writeText(join(REPORT_DIR, 'summary.txt'), `${summary.join('\n')}\n`);
	console.log(summary.join('\n'));
}

function writeReviewDoc(bank) {
	const out = [
		'# Relecture des mots (français)',
		'',
		'Cocher `[x]` = garder le mot. Barrer (`~~mot~~`) = retirer le mot du jeu.',
		'Pour corriger un thème, écrire à la suite du mot : `→ thème` (par exemple `- [ ] marine → espace`).',
		'Ce fichier est généré par `tools/content/build-words.js` ; reporter les décisions dans `tools/content/data/`.'
	];
	for (const theme of bank.themes) {
		const inTheme = bank.words.filter((word) => word.themes.includes(theme.id));
		out.push('', `## ${theme.title} (${inTheme.length})`);
		for (const level of [1, 2, 3]) {
			const group = inTheme.filter((word) => word.level === level);
			if (group.length === 0) continue;
			out.push('', `### Niveau ${level} (${group.length})`, '');
			group.forEach((word) => out.push(`- [ ] ${word.text}`));
		}
	}
	writeText(join(REPO_ROOT, CONFIG.output.wordReviewDoc), `${out.join('\n')}\n`);
}

const result = run();
const bank = buildBank(result);
writeReports(result, bank);
if (!args['no-write']) {
	writeBankJson(join(REPO_ROOT, CONFIG.output.wordsFile), bank, 'words');
	writeReviewDoc(bank);
	console.log(`Wrote ${CONFIG.output.wordsFile} and ${CONFIG.output.wordReviewDoc}`);
}
console.log(`Reports in ${REPORT_DIR}`);
