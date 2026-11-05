import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The game trains typing and nothing else: no text of the interface promises to treat, cure or
// improve a disorder (CLAUDE.md, principle 8). The French words are checked in the French file.
const FRENCH_CLAIMS =
	/\b(soign\p{L}*|guéri\p{L}*|traite|traitent|traiter|améliore\p{L}* (le|la|les) (tdah|dysgraphie|trouble\p{L}*)|thérapeutique)\b/iu;
const NOT_A_TREATMENT = /n'est pas un traitement/u;

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
});

describe.each(locales)('the messages of %s', (file) => {
	it('say on the guide for adults that the game is not a treatment', () => {
		expect(readMessages(file)['guide_not_treatment']?.trim()).toBeTruthy();
	});
});
