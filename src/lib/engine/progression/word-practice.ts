import { toGraphemes } from '../graphemes';
import { recentCharStats } from './progress';
import type { ProgressState, Rng, WeakCharRules } from './types';

const CAPITAL_PATTERN = /^\p{Lu}$/u;
const LETTER_OR_DIGIT_PATTERN = /^[\p{L}\p{N}]$/u;

/** A word an exercise can take: its text, cut into graphemes, and how much it is preferred. */
export interface PracticeWord {
	readonly text: string;
	readonly graphemes: readonly string[];
	readonly weight: number;
	/** Level of a word of the bank; absent for a word picked by hand for its lesson. */
	readonly level?: number;
}

export function isCapital(char: string): boolean {
	return CAPITAL_PATTERN.test(char);
}

export function isLetterOrDigit(char: string): boolean {
	return LETTER_OR_DIGIT_PATTERN.test(char);
}

/** How many of the keystrokes still lacking a word brings: each character up to what it lacks. */
export function coverage(word: PracticeWord, lacking: ReadonlyMap<string, number>): number {
	let total = 0;
	for (const [char, count] of lacking) {
		if (count <= 0) continue;
		const held = word.graphemes.filter((grapheme) => grapheme === char).length;
		total += Math.min(held, count);
	}
	return total;
}

export interface PracticePick {
	/** Words already typed in this exercise: taken again only when no other one does. */
	readonly used: ReadonlySet<string>;
	/** Texts never taken: the word or the group just before, so that none comes twice in a row. */
	readonly avoid: readonly (string | undefined)[];
	readonly rng: Rng;
	/**
	 * Share (above 0, up to 1) of the best score a word must reach to be drawn: under 1, the draw
	 * is wider than the best words alone. Absent: 1.
	 */
	readonly scoreShare?: number;
	/**
	 * Level of the word this one goes with: a word of the same level, or without any, is taken
	 * first among those that can be drawn. Absent: any level.
	 */
	readonly level?: number;
}

/**
 * A word among those that score best, or near the best with `scoreShare`: one not typed yet
 * first, of the level asked if any, then by chance, a short word more often than a long one.
 * Nothing when no word scores.
 */
export function pickPracticeWord<T extends PracticeWord>(
	pool: readonly T[],
	score: (word: T) => number,
	{ used, avoid, rng, scoreShare = 1, level }: PracticePick
): T | undefined {
	const scored = pool
		.filter((word) => !avoid.includes(word.text))
		.map((word) => ({ word, score: score(word) }))
		.filter((entry) => entry.score > 0);
	if (scored.length === 0) return undefined;
	const unused = scored.filter((entry) => !used.has(entry.word.text));
	const fresh = unused.length > 0 ? unused : scored;
	const best = Math.max(...fresh.map((entry) => entry.score));
	const near = fresh.filter((entry) => entry.score >= best * scoreShare).map((entry) => entry.word);
	const alike = near.filter((word) => word.level === undefined || word.level === level);
	const finalists = level !== undefined && alike.length > 0 ? alike : near;
	const weights = finalists.map((word) => word.weight / Math.max(1, word.graphemes.length));
	const total = weights.reduce((sum, weight) => sum + weight, 0);
	let remaining = rng() * total;
	for (let i = 0; i < finalists.length; i++) {
		remaining -= weights[i] as number;
		if (remaining < 0) return finalists[i];
	}
	return finalists[finalists.length - 1];
}

/**
 * The characters to review (`rules.weakChars`): those of `candidates` typed often enough lately
 * and wrong too often, the worst first, as many as the rules allow.
 */
export function weakCharsOf(
	progress: ProgressState,
	candidates: readonly string[],
	rules: WeakCharRules
): string[] {
	return candidates
		.map((char, index) => {
			const { attempts, errors } = recentCharStats(progress, char);
			return { char, index, attempts, rate: attempts > 0 ? errors / attempts : 0 };
		})
		.filter((entry) => entry.attempts >= rules.minAttempts && entry.rate > rules.minErrorRate)
		.sort((a, b) => b.rate - a.rate || a.index - b.index)
		.slice(0, rules.maxChars)
		.map((entry) => entry.char);
}

/** The capital of a small letter, when that capital is learned. */
export function capitalOf(
	letter: string | undefined,
	learned: ReadonlySet<string>
): string | undefined {
	if (letter === undefined) return undefined;
	const capital = letter.toUpperCase();
	return capital !== letter && isCapital(capital) && learned.has(capital) ? capital : undefined;
}

/** The text with a capital first letter, when it has a small one whose capital is learned. */
export function capitalized(text: string, learned: ReadonlySet<string>): string | undefined {
	const [first, ...rest] = toGraphemes(text);
	const capital = capitalOf(first, learned);
	return capital === undefined ? undefined : `${capital}${rest.join('')}`;
}

/**
 * The graphemes of a phrase as it is typed once capitals and the mark that ends a sentence are
 * learned: with its capital first letter when that capital is learned, and with the mark at its
 * end when it ends with a letter or a digit.
 */
export function completedGraphemes(
	graphemes: readonly string[],
	learned: ReadonlySet<string>,
	end: string
): string[] {
	const [first, ...rest] = graphemes;
	if (first === undefined) return [];
	const last = graphemes[graphemes.length - 1] as string;
	const completed = [capitalOf(first, learned) ?? first, ...rest];
	if (isLetterOrDigit(last)) completed.push(end);
	return completed;
}

/**
 * A phrase written before capitals and the mark that ends a sentence were learned, as it is typed
 * once they are (`completedGraphemes`). Unchanged before, or when it already has them.
 */
export function completePhrase(text: string, learned: ReadonlySet<string>, end: string): string {
	if (!learned.has(end) || ![...learned].some(isCapital)) return text;
	return completedGraphemes(toGraphemes(text), learned, end).join('');
}
