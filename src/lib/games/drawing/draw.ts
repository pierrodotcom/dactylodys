import type { GameView } from '../shared/game-view';
import { groupRatio } from '../shared/stage';
import { DRAWINGS, type DrawingPicture } from './shapes';

/** Steps of the probe the tests read: it changes with each good key of the first group, never before. */
export const PROBE_STEPS = 100;

const HASH_BASE = 31;

/**
 * The drawing of a play, never at random: each new play of the game takes the next subject, from
 * a starting point that depends on the lesson (ADR-049).
 */
export function pictureFor(lessonId: string, playCount = 0): DrawingPicture {
	let hash = 0;
	for (const char of lessonId) hash = (hash * HASH_BASE + (char.codePointAt(0) ?? 0)) >>> 0;
	const turn = Number.isSafeInteger(playCount) && playCount > 0 ? playCount : 0;
	return DRAWINGS[(hash + turn) % DRAWINGS.length] ?? DRAWINGS[0];
}

/**
 * Share (0 to 1) of the whole drawing that is traced: it grows with every good key of every
 * group, and while a reward is on screen it counts the group that has just been finished.
 */
export function drawnShare(view: GameView): number {
	if (view.total <= 0) return 0;
	const inProgress = view.phase === 'typing' ? groupRatio(view.position, view.group.length) : 0;
	return Math.min(1, (view.completed + inProgress) / view.total);
}

/** How much of each stroke is drawn (0 to 1) when `share` of the drawing is traced. */
export function strokeFractions(weights: readonly number[], share: number): number[] {
	if (share >= 1) return weights.map(() => 1);
	const total = weights.reduce((sum, weight) => sum + weight, 0);
	let start = 0;
	return weights.map((weight) => {
		const fraction = total > 0 && weight > 0 ? (share * total - start) / weight : 0;
		start += weight;
		return Math.min(1, Math.max(0, fraction));
	});
}

/** The stroke being drawn at `share` of the drawing, and how far along it is. */
export function locateShare(
	weights: readonly number[],
	share: number
): { index: number; fraction: number } {
	const fractions = strokeFractions(weights, share);
	let index = fractions.findIndex((fraction) => fraction < 1);
	if (index < 0) index = Math.max(0, weights.length - 1);
	return { index, fraction: fractions[index] ?? 0 };
}

/** The coloured shapes show once the last group is done. */
export function isColored(view: GameView): boolean {
	return view.phase !== 'typing' && view.completed >= view.total;
}
