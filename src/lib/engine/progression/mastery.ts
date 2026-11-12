import { recentCharStats } from './progress';
import type { MasteryRules, ProgressState } from './types';

export type { MasteryRules };

/**
 * Where a character stands for an adult reading the progress. `acquired`: typed often enough
 * and rarely wrong lately; `fragile`: often wrong lately; `learning`: typed, but neither yet;
 * `new`: never typed.
 */
export type CharMastery = 'acquired' | 'fragile' | 'learning' | 'new';

/**
 * Read, like the rewards that tame a key (`chars-mastered`), on the recent results of the
 * character only (`recentCharStats`): a key that was hard for long is acquired once it no longer is.
 */
export function charMastery(
	progress: ProgressState,
	char: string,
	rules: MasteryRules
): CharMastery {
	const { attempts, errors } = recentCharStats(progress, char);
	if (attempts <= 0) return 'new';
	const rate = Math.min(1, Math.max(0, errors / attempts));
	if (attempts >= rules.fragileMinAttempts && rate > rules.fragileMinErrorRate) return 'fragile';
	if (attempts >= rules.acquiredMinAttempts && rate <= rules.acquiredMaxErrorRate) {
		return 'acquired';
	}
	return 'learning';
}

export interface MasteryGroups {
	readonly acquired: readonly string[];
	readonly fragile: readonly string[];
	readonly learning: readonly string[];
}

/** The characters typed so far, by mastery, each group in the order of `compare`. */
export function masteryGroups(
	progress: ProgressState,
	rules: MasteryRules,
	compare: (first: string, second: string) => number
): MasteryGroups {
	const groups: Record<'acquired' | 'fragile' | 'learning', string[]> = {
		acquired: [],
		fragile: [],
		learning: []
	};
	for (const char of Object.keys(progress.chars)) {
		const mastery = charMastery(progress, char, rules);
		if (mastery !== 'new') groups[mastery].push(char);
	}
	return {
		acquired: groups.acquired.sort(compare),
		fragile: groups.fragile.sort(compare),
		learning: groups.learning.sort(compare)
	};
}
