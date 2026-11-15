import type { GameView } from './game-view';

/** The sentences a screen reader hears while a group is typed, given by the caller. */
export interface TypingWords {
	/** A group appears: its whole text. */
	readonly group: (text: string) => string;
	/** A wrong key: the character that was expected instead. */
	readonly error: (char: string) => string;
	/** A wrong character written in the text (`backspace` policy): the one to erase. */
	readonly erase: (char: string) => string;
	/**
	 * A group arrives begun (lesson of repairs): its whole text, then the wrong character written at
	 * the end, to erase first. Absent: only the character to erase is said.
	 */
	readonly repair?: (text: string, char: string) => string;
	/** How a single character is said, e.g. a space as a word. */
	readonly spoken: (grapheme: string) => string;
}

/**
 * What a screen reader says while a group is typed: its text when it appears (and what to erase
 * when it arrives begun), the wrong character to erase while one is written, the expected key after
 * a mistake, and nothing on a right key, which the screen reader already echoes.
 */
export function typingAnnouncement(view: GameView, words: TypingWords): string {
	if (view.phase !== 'typing') return '';
	const repair = repairToErase(view, words.spoken);
	if (repair !== null && words.repair) return words.repair(view.group.join(''), repair);
	const toErase = view.pending.at(-1);
	if (toErase !== undefined) return words.erase(words.spoken(toErase));
	if (view.errorIndex !== null) {
		const expected = view.group[view.errorIndex];
		return expected === undefined ? '' : words.error(words.spoken(expected));
	}
	if (view.position > 0) return '';
	const text = view.group.length === 1 ? words.spoken(view.group[0] ?? '') : view.group.join('');
	return words.group(text);
}

/**
 * The wrong character to erase first in a group that arrives begun (lesson of repairs), as it is
 * said; `null` for any other group, and as soon as the child has pressed a key in it.
 */
export function repairToErase(view: GameView, spoken: (grapheme: string) => string): string | null {
	const toErase = view.pending.at(-1);
	if (view.phase !== 'typing' || !view.untouched || toErase === undefined) return null;
	return spoken(toErase);
}

/** What the shell of a game adds to the announcement of the game; `null` for nothing. */
export interface ShellNotices {
	/** The keys no longer reach the game: how to go on. */
	readonly away: string | null;
	/** The help about Caps Lock, while it is on screen. */
	readonly capsLock: string | null;
}

/**
 * Everything the one live region of a game says: what the game or the typing announces, then the
 * help about Caps Lock, each said once. While the keys do not reach the game, only how to go on.
 * The reminder to look at the screen is not in it: the recorded voice says it.
 */
export function shellAnnouncement(base: string, notices: ShellNotices): string {
	if (notices.away !== null) return notices.away;
	return [base, notices.capsLock].filter((part) => part !== null && part !== '').join(' ');
}
