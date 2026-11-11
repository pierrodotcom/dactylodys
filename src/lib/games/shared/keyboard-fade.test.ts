import { describe, expect, it } from 'vitest';
import { buildCharIndex, parseLayout } from '../../keyboard/layout';
import azertyPc from '../../../../layouts/fr-fr-azerty-pc.json';
import { fadedKeysShown } from './keyboard-fade';

const charIndex = buildCharIndex(parseLayout(azertyPc));

describe('fadedKeysShown', () => {
	it('fades every key the route faded while nothing was missed', () => {
		expect(fadedKeysShown(['KeyF', 'KeyJ'], charIndex, [])).toEqual(['KeyF', 'KeyJ']);
	});

	it('writes again the key of a character missed in the game', () => {
		expect(fadedKeysShown(['KeyF', 'KeyJ'], charIndex, ['j'])).toEqual(['KeyF']);
	});

	it('writes again the key of a missed capital, not Shift', () => {
		expect(fadedKeysShown(['KeyF', 'KeyJ'], charIndex, ['F'])).toEqual(['KeyJ']);
	});

	it('leaves the faded keys alone when the missed key was written anyway', () => {
		expect(fadedKeysShown(['KeyF'], charIndex, ['d', ' '])).toEqual(['KeyF']);
	});

	it('fades nothing when the route faded nothing', () => {
		expect(fadedKeysShown([], charIndex, ['f'])).toEqual([]);
	});
});
