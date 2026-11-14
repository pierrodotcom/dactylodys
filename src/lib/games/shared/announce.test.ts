import { describe, expect, it } from 'vitest';
import type { NormalizedKeystroke } from '../../keyboard/types';
import { repairToErase, shellAnnouncement, typingAnnouncement, type TypingWords } from './announce';
import { createGame, reduce, type GameState } from './game-state';
import { viewOf } from './game-view';

const WORDS: TypingWords = {
	group: (text) => `type ${text}`,
	error: (char) => `expected ${char}`,
	erase: (char) => `erase ${char}`,
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

	it('says the wrong character to erase, then the expected key once it is erased', () => {
		const wrong = type(createGame(['fj'], 'backspace'), 'fx');
		expect(announced(wrong)).toBe('erase x');
		const twice = type(wrong, ' ');
		expect(announced(twice)).toBe('erase space');

		const backspace: NormalizedKeystroke = {
			kind: 'backspace',
			char: null,
			code: 'Backspace',
			timestamp: 1000,
			composed: false
		};
		const once = reduce(twice, { type: 'keystroke', keystroke: backspace }).state;
		expect(announced(once)).toBe('erase x');
		const erased = reduce(once, { type: 'keystroke', keystroke: backspace }).state;
		expect(announced(erased)).toBe('expected j');
		expect(announced(type(erased, 'j'))).toBe('');
	});

	it('says the text of a begun group and what to erase first, then only what is left to erase', () => {
		const words = { ...WORDS, repair: (text: string, char: string) => `repair ${text}, ${char}` };
		const begun = createGame(['fj f'], 'retry', { starts: [{ typed: 2, pending: ['k', ' '] }] });
		expect(typingAnnouncement(viewOf(begun, false), words)).toBe('repair fj f, space');
		expect(announced(begun)).toBe('erase space');

		const backspace: NormalizedKeystroke = {
			kind: 'backspace',
			char: null,
			code: 'Backspace',
			timestamp: 1000,
			composed: false
		};
		const once = reduce(begun, { type: 'keystroke', keystroke: backspace }).state;
		expect(typingAnnouncement(viewOf(once, false), words)).toBe('erase k');
	});

	it('says the next group once the reward of the last one is over, and nothing in between', () => {
		const done = type(createGame(['fj', 'jf'], 'retry'), 'fj');
		expect(announced(done)).toBe('');
		expect(announced(reduce(done, { type: 'advance' }).state)).toBe('type jf');
	});
});

describe('repairToErase', () => {
	const spoken = WORDS.spoken;

	it('names the wrong character a group arrives with, as it is said', () => {
		const begun = createGame(['fj f'], 'retry', { starts: [{ typed: 2, pending: ['k', ' '] }] });
		expect(repairToErase(viewOf(begun, false), spoken)).toBe('space');
	});

	it('is silent once the child has pressed a key in the group', () => {
		const begun = createGame(['fj f'], 'retry', { starts: [{ typed: 2, pending: ['k'] }] });
		const backspace: NormalizedKeystroke = {
			kind: 'backspace',
			char: null,
			code: 'Backspace',
			timestamp: 1000,
			composed: false
		};
		const erased = reduce(begun, { type: 'keystroke', keystroke: backspace }).state;
		expect(repairToErase(viewOf(erased, false), spoken)).toBeNull();
	});

	it('is silent for a group that arrives empty, for a mistake of the child, and for a reward', () => {
		expect(repairToErase(viewOf(createGame(['fj'], 'backspace'), false), spoken)).toBeNull();
		const wrong = type(createGame(['fj'], 'backspace'), 'fx');
		expect(repairToErase(viewOf(wrong, false), spoken)).toBeNull();
		const done = type(createGame(['fj', 'jf'], 'retry'), 'fj');
		expect(repairToErase(viewOf(done, false), spoken)).toBeNull();
	});
});

describe('shellAnnouncement', () => {
	const NOTHING = { away: null, capsLock: null, reminder: null };

	it('says what the game says when nothing else is to be said', () => {
		expect(shellAnnouncement('type fj', NOTHING)).toBe('type fj');
		expect(shellAnnouncement('', NOTHING)).toBe('');
	});

	it('says how to go on, and nothing else, while the keys do not reach the game', () => {
		const notices = { away: 'press a letter', capsLock: 'caps lock is on', reminder: 'look up' };
		expect(shellAnnouncement('type fj', notices)).toBe('press a letter');
	});

	it('adds the Caps Lock help after the expected key, in the same sentence of the same region', () => {
		expect(shellAnnouncement('expected f', { ...NOTHING, capsLock: 'caps lock is on' })).toBe(
			'expected f caps lock is on'
		);
		expect(shellAnnouncement('', { ...NOTHING, capsLock: 'caps lock is on' })).toBe(
			'caps lock is on'
		);
	});

	it('says the reminder once, after the reward, when no recorded voice says it', () => {
		expect(shellAnnouncement('well done', { ...NOTHING, reminder: 'look up' })).toBe(
			'well done look up'
		);
		expect(shellAnnouncement('well done', NOTHING)).toBe('well done');
	});
});
