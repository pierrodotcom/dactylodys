import { join } from 'node:path';
import { loadAges, withAges } from './lib/ages.js';
import { CONFIG, DATA_DIR, REPO_ROOT, readLines, writeBankJson } from './lib/common.js';

/*
 * Builds the bank of useful texts (ADR-057, proposal 10) from `data/texts.fr.txt`: a header line
 * `@ slug | lesson id | level`, then the lines of the text, one per line of the file. A text whose
 * identifier is listed in `data/validated-texts.txt` was read by a person (`review: "human"`).
 */

const HEADER = /^@\s*(.+)$/;

function parseHeader(line, number) {
	const cells = line.split('|').map((cell) => cell.trim());
	if (cells.length !== 3)
		throw new Error(`texts.fr.txt header ${number}: expected slug | lesson | level`);
	const [slug, lessonId, level] = cells;
	return { slug, lessonId, level: Number(level) };
}

function loadTexts() {
	const validated = new Set(readLines(join(DATA_DIR, 'validated-texts.txt')));
	const texts = [];
	readLines(join(DATA_DIR, 'texts.fr.txt')).forEach((line, index) => {
		const header = HEADER.exec(line);
		if (header !== null) {
			const { slug, lessonId, level } = parseHeader(header[1] ?? '', index + 1);
			const id = `fr.text.${slug}`;
			texts.push({ id, lessonId, lines: [], level, review: validated.has(id) ? 'human' : 'agent' });
			return;
		}
		const current = texts.at(-1);
		if (current === undefined) throw new Error(`texts.fr.txt: line "${line}" before any header`);
		current.lines.push(line.normalize('NFC'));
	});
	return texts;
}

const texts = withAges(loadTexts(), loadAges().texts, (entry) => entry.id, 'text');
const bank = {
	schemaVersion: 1,
	id: CONFIG.output.textBankId,
	locale: CONFIG.output.locale,
	texts
};
writeBankJson(join(REPO_ROOT, CONFIG.output.textsFile), bank, 'texts');
console.log(`Wrote ${texts.length} texts to ${CONFIG.output.textsFile}`);
