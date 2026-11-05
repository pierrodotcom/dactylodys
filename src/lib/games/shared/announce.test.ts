import { describe, expect, it } from 'vitest';
import type { NormalizedKeystroke } from '../../keyboard/types';
import { typingAnnouncement, type TypingWords } from './announce';
import { createGame, reduce, type GameState } from './game-state';
import { viewOf } from './game-view';

const WORDS: TypingWords = {
	group: (text) => `type ${text}`,
	error: (char) => `expected ${char}`,
	spoken: (grapheme) => (grapheme === ' ' ? 'space' : grapheme)
};

function type(state: GameState, text: string): GameState {
	return [...text].reduce((current, value, index) => {
		const keystroke: NormalizedKeystroke = {
			kind: 'char',
			char: value,
			code: `Key${value.toUpperCase()}`,
			timestamp: (index + 1) * 100,
			composed: false
		};
		return reduce(current, { type: 'keystroke', keystroke }).state;
	}, state);
}

function announced(state: GameState): string {
	return typingAnnouncement(viewOf(state, false), WORDS);
}

describe('typingAnnouncement', () => {
	it('says the text of a group when it appears', () => {
		expect(announced(createGame(['fj f', 'jj'], 'retry'))).toBe('type fj f');
	});

	it('says nothing on a right key, so as not to repeat what the screen reader echoes', () => {
		expect(announced(type(createGame(['fj f'], 'retry'), 'f'))).toBe('');
	});

	it('says the expected key after a mistake, and nothing more once it is typed', () => {
		const wrong = type(createGame(['fj'], 'retry'), 'fx');
		expect(announced(wrong)).toBe('expected j');
		expect(announced(type(wrong, 'j'))).toBe('');
	});

	it('spells a space as a word, since a blank is not heard', () => {
		expect(announced(type(createGame(['f j'], 'retry'), 'fx'))).toBe('expected space');
		expect(announced(createGame([' '], 'retry'))).toBe('type space');
	});

	it('says the next group once the reward of the last one is over, and nothing in between', () => {
		const done = type(createGame(['fj', 'jf'], 'retry'), 'fj');
		expect(announced(done)).toBe('');
		expect(announced(reduce(done, { type: 'advance' }).state)).toBe('type jf');
	});
});
