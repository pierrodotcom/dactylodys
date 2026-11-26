import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { voiceKey } from '../../src/lib/audio/voice-key';
import { mapStrings, stringsOf, typeset } from '../../tools/content/lib/typography.js';

const NBSP = '\u00a0';
/** The characters the rules look at, among others. */
const TEXTS = fc
	.array(
		fc.constantFrom('a', 'É', ' ', NBSP, ':', ';', '!', '?', '«', '»', '%', '7', "'", '\u2019', '.')
	)
	.map((chars) => chars.join(''));

describe('typeset', () => {
	it('puts a no-break space before the signs that never start a line, and inside quotation marks', () => {
		expect(typeset('Page deux : remplie ; bravo ! Prêt ?')).toBe(
			`Page deux${NBSP}: remplie${NBSP}; bravo${NBSP}! Prêt${NBSP}?`
		);
		expect(typeset('Réussis « Les œufs ».')).toBe(`Réussis «${NBSP}Les œufs${NBSP}».`);
		expect(typeset('Juste à 90 %.')).toBe(`Juste à 90${NBSP}%.`);
	});

	it('straightens a curly apostrophe', () => {
		expect(typeset('l\u2019arobase')).toBe("l'arobase");
	});

	it('only changes a space already there: a sign written against its word stays so', () => {
		expect(typeset('Alt Gr+2, Option+N, http://exemple.test')).toBe(
			'Alt Gr+2, Option+N, http://exemple.test'
		);
		expect(typeset('ici: là!')).toBe('ici: là!');
	});

	it('never changes what the voice hears: a recording keeps its text', () => {
		fc.assert(fc.property(TEXTS, (text) => voiceKey(typeset(text)) === voiceKey(text)));
	});

	it('changes nothing the second time', () => {
		fc.assert(fc.property(TEXTS, (text) => typeset(typeset(text)) === typeset(text)));
	});
});

describe('stringsOf and mapStrings', () => {
	const data = {
		title: 'Un : deux',
		lessons: [{ intro: 'Trois ; quatre', words: ['cinq ?'] }],
		pairs: [['six !']]
	};

	it('name each string by its keys, any element of an array as []', () => {
		expect(stringsOf(data).map((item) => item.path)).toEqual([
			'title',
			'lessons[].intro',
			'lessons[].words[]',
			'pairs[][]'
		]);
	});

	it('change only the strings at the places named', () => {
		expect(mapStrings(data, ['lessons[].intro', 'pairs[][]'], typeset)).toEqual({
			title: 'Un : deux',
			lessons: [{ intro: `Trois${NBSP}; quatre`, words: ['cinq ?'] }],
			pairs: [[`six${NBSP}!`]]
		});
	});
});
