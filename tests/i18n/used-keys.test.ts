import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ADULT_RULES } from '../../src/routes/adulte/adult-rules';
import { FREE_PRACTICE_RULES } from '../../src/routes/jouer/free-practice';
import { PLAY_RULES } from '../../src/routes/jouer/play-rules';

/*
 * The messages and the code stay in step (audit C-15): a message nothing shows is a text to keep
 * up to date for nobody. A message is used when its key is written in the code of the app or of
 * its tools, as `m.<key>` or as a string; the compiled messages and the tests do not count.
 */
const CODE_DIRECTORIES = ['src', 'tools'];
const CODE_FILE = /\.(ts|js|svelte)$/;
const NOT_CODE = /(^|[\\/])(paraglide|generated)[\\/]|\.test\.ts$|[\\/]test-support\.ts$/;

const messages = JSON.parse(readFileSync('messages/fr.json', 'utf8')) as Record<string, string>;
const code = CODE_DIRECTORIES.flatMap((directory) =>
	readdirSync(directory, { recursive: true, encoding: 'utf8' })
		.filter((file) => CODE_FILE.test(file) && !NOT_CODE.test(file))
		.map((file) => readFileSync(join(directory, file), 'utf8'))
).join('\n');

describe('the keys of the messages', () => {
	it('are each used by the app or its tools', () => {
		const unused = Object.keys(messages).filter(
			(key) => key !== '$schema' && !new RegExp(`(?<![\\w$])${key}(?!\\w)`).test(code)
		);

		expect(unused).toEqual([]);
	});
});

/*
 * Some messages give a number without a singular form (« après {exercises} parties », « un code à
 * {length} chiffres »): they hold while the rules never give 1 (audit C-15). Rather than variants
 * that no rule uses, this test fails the day one does: then give the message its `_one` form.
 */
describe('the numbers written without a singular form', () => {
	it.each(Object.entries(PLAY_RULES.sessionLengths))(
		'are never 1 for a %s session: plays and minutes before a break',
		(_length, rules) => {
			for (const value of [rules.earlyExercises, rules.typingMinutes, rules.clockMinutes]) {
				expect(value).toBeGreaterThanOrEqual(2);
			}
		}
	);

	it('are never 1 for the code of the adult space, nor for the words of the adult', () => {
		expect(ADULT_RULES.codeLength).toBeGreaterThanOrEqual(2);
		expect(FREE_PRACTICE_RULES.maxWords).toBeGreaterThanOrEqual(2);
		expect(FREE_PRACTICE_RULES.maxWordLength).toBeGreaterThanOrEqual(2);
	});
});
