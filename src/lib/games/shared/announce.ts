import type { GameView } from './game-view';

/** The sentences a screen reader hears while a group is typed, given by the caller. */
export interface TypingWords {
	/** A group appears: its whole text. */
	readonly group: (text: string) => string;
	/** A wrong key: the character that was expected instead. */
	readonly error: (char: string) => string;
	/** How a single character is said, e.g. a space as a word. */
	readonly spoken: (grapheme: string) => string;
}

/**
 * What a screen reader says while a group is typed: its text when it appears, the expected key
 * after a mistake, and nothing on a right key, which the screen reader already echoes.
 */
export function typingAnnouncement(view: GameView, words: TypingWords): string {
	if (view.phase !== 'typing') return '';
	if (view.errorIndex !== null) {
		const expected = view.group[view.errorIndex];
		return expected === undefined ? '' : words.error(words.spoken(expected));
	}
	if (view.position > 0) return '';
	const text = view.group.length === 1 ? words.spoken(view.group[0] ?? '') : view.group.join('');
	return words.group(text);
}
