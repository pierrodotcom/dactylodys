import { toGraphemes } from '../graphemes';
import type { Exercise, Rng } from '../progression/types';

/**
 * What an exercise of free practice carries in place of a lesson: it belongs to no lesson, so
 * that nothing of it is ever taken for a lesson played.
 */
export const FREE_PRACTICE_EXERCISE_ID = 'free-practice';

export interface FreeExerciseRules {
	/** Characters typed in one exercise, about: it stops at the first word that reaches them. */
	readonly targetLength: number;
}

function shuffled(words: readonly string[], rng: Rng): string[] {
	const copy = [...words];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.min(i, Math.floor(rng() * (i + 1)));
		[copy[i], copy[j]] = [copy[j] as string, copy[i] as string];
	}
	return copy;
}

/**
 * One word per group, the words taken in a shuffled order and all of them before any comes again;
 * never the same word twice in a row when there are several. It stops once `targetLength`
 * characters are reached. The same `rng` gives the same exercise.
 */
export function generateFreeExercise(
	words: readonly string[],
	rules: FreeExerciseRules,
	rng: Rng
): Exercise {
	const pool = [...new Set(words.filter((word) => word !== ''))];
	if (pool.length === 0) throw new RangeError('No word to type');
	if (!Number.isSafeInteger(rules.targetLength) || rules.targetLength < 1) {
		throw new RangeError('targetLength must be a positive integer');
	}
	const groups: string[] = [];
	let total = 0;
	while (total < rules.targetLength) {
		const round = shuffled(pool, rng);
		if (round.length > 1 && round[0] === groups.at(-1)) {
			[round[0], round[1]] = [round[1] as string, round[0] as string];
		}
		for (const word of round) {
			if (total >= rules.targetLength) break;
			groups.push(word);
			total += toGraphemes(word).length;
		}
	}
	return { lessonId: FREE_PRACTICE_EXERCISE_ID, groups };
}
