import { ghostProgress } from './ghost';
import type { GhostRun } from './types';

/** Who reached the end of the exercise first. A tie goes to the child. */
export type RaceWinner = 'child' | 'ghost';

function expectCharCount(charCount: number): void {
	if (!Number.isSafeInteger(charCount) || charCount <= 0) {
		throw new RangeError('charCount must be a positive integer');
	}
}

/**
 * Active time after which the ghost is done with an exercise of `charCount` correct characters.
 * The next exercise of a lesson is seldom as long as the recorded one: the ghost keeps its rhythm
 * in characters per millisecond, so a longer exercise takes it longer.
 */
export function ghostFinishMs(run: GhostRun, charCount: number, paceFactor: number): number {
	expectCharCount(charCount);
	if (!Number.isFinite(paceFactor) || paceFactor <= 0) {
		throw new RangeError('paceFactor must be a positive number');
	}
	return (run.activeMs / paceFactor) * (charCount / run.charCount);
}

/**
 * Share of an exercise of `charCount` correct characters, from 0 to 1, that the ghost has done
 * after `elapsedMs` of active time.
 */
export function ghostShare(
	run: GhostRun,
	elapsedMs: number,
	charCount: number,
	paceFactor: number
): number {
	// Compared before scaling, like `ghostProgress`, so that the finish time is exactly 1.
	if (elapsedMs >= ghostFinishMs(run, charCount, paceFactor)) return 1;
	return ghostProgress(run, (elapsedMs * run.charCount) / charCount, paceFactor);
}

/** The child took `childMs` of active time for the whole exercise of `charCount` characters. */
export function raceWinner(
	run: GhostRun,
	childMs: number,
	charCount: number,
	paceFactor: number
): RaceWinner {
	return childMs <= ghostFinishMs(run, charCount, paceFactor) ? 'child' : 'ghost';
}

/**
 * The same run, `paceFactor` times as fast: under 1, the ghost the child races is a little slower
 * than the play it was recorded from.
 */
export function slowGhostRun(run: GhostRun, paceFactor: number): GhostRun {
	if (!Number.isFinite(paceFactor) || paceFactor <= 0) {
		throw new RangeError('paceFactor must be a positive number');
	}
	const scale = (ms: number) => Math.round(ms / paceFactor);
	return {
		...run,
		activeMs: scale(run.activeMs),
		points: run.points.map((point) => ({ ...point, activeMs: scale(point.activeMs) }))
	};
}
