import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * « de » and « que » before a name elide before a vowel: « Bilan d'Ali », not « Bilan de Ali »
 * (audit C-03). A message that writes them before `{name}` has its `_elided` variant, which the
 * screen picks for such a name; or it is written another way (« (Lou peut aussi les changer) »).
 */
const messages = JSON.parse(readFileSync('messages/fr.json', 'utf8')) as Record<string, string>;
const BEFORE_NAME = /(?<!\p{L})(de|que) \{name\}/iu;

describe('the messages that name a child', () => {
	it('have an elided variant wherever « de » or « que » comes before the name', () => {
		const named = Object.keys(messages).filter(
			(key) => !key.endsWith('_elided') && BEFORE_NAME.test(messages[key] ?? '')
		);
		expect(named.length).toBeGreaterThan(0);

		expect(named.filter((key) => messages[`${key}_elided`] === undefined)).toEqual([]);
	});
});
