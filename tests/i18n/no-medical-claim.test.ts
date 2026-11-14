import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The game trains typing and nothing else: no text of the interface promises to treat, cure or
// improve a disorder (CLAUDE.md, principle 8). The French words are checked in the French file.
const FRENCH_CLAIMS =
	/\b(soign\p{L}*|guéri\p{L}*|traite|traitent|traiter|améliore\p{L}* (le|la|les) (tdah|dysgraphie|trouble\p{L}*)|thérapeutique)\b/iu;
const NOT_A_TREATMENT = /n'est pas un traitement/u;
/** The Markdown version of the sheet for professionals, to send by mail or post on a forum. */
const SHEET_FOR_PROFESSIONALS = 'docs/fiche-professionnels.md';

const locales = readdirSync('messages').filter((file) => file.endsWith('.json'));

function readMessages(file: string): Record<string, string> {
	return JSON.parse(readFileSync(`messages/${file}`, 'utf8')) as Record<string, string>;
}

describe('the French messages', () => {
	const messages = readMessages('fr.json');

	it('make no medical promise', () => {
		const claims = Object.entries(messages).filter(([, text]) => FRENCH_CLAIMS.test(text));
		expect(claims).toEqual([]);
	});

	it('say on the guide for adults that the game is not a treatment', () => {
		expect(messages['guide_not_treatment']).toMatch(NOT_A_TREATMENT);
	});

	it('say on the sheet for professionals that the game is not a treatment', () => {
		expect(messages['pro_not_treatment']).toMatch(NOT_A_TREATMENT);
	});
});

describe('the sheet for professionals, sent outside the game', () => {
	const sheet = readFileSync(SHEET_FOR_PROFESSIONALS, 'utf8');

	it('makes no medical promise', () => {
		const claims = sheet.split(/\r?\n/u).filter((line) => FRENCH_CLAIMS.test(line));
		expect(claims).toEqual([]);
	});

	it('says that the game is not a treatment', () => {
		expect(sheet).toMatch(NOT_A_TREATMENT);
	});
});

describe.each(locales)('the messages of %s', (file) => {
	it('say on the guide for adults that the game is not a treatment', () => {
		expect(readMessages(file)['guide_not_treatment']?.trim()).toBeTruthy();
	});

	it('say on the sheet for professionals that the game is not a treatment', () => {
		expect(readMessages(file)['pro_not_treatment']?.trim()).toBeTruthy();
	});
});
