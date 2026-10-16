import type { ProgressionDefinition, ProgressState } from '../progression/types';
import type { RewardCatalogue, RewardDefinition } from './types';
import { unlockedRewards } from './unlock';

/**
 * What the child owns: what the progress earns now, plus what the profile kept from before
 * (ADR-027). Kept identifiers the catalogue does not know are left out, never an error.
 */
export function ownedRewards(
	catalogue: RewardCatalogue,
	progression: ProgressionDefinition,
	progress: ProgressState,
	earned: readonly string[]
): ReadonlySet<string> {
	const owned = new Set(unlockedRewards(catalogue, progression, progress));
	const known = new Set(catalogue.rewards.map((reward) => reward.id));
	for (const id of earned) {
		if (known.has(id)) owned.add(id);
	}
	return owned;
}

/**
 * The list to keep in the profile: `earned` followed by what `progress` unlocks that it lacks, in
 * the order of the catalogue. Nothing is ever removed. Returns `earned` itself when nothing is new.
 */
export function withNewlyEarned(
	catalogue: RewardCatalogue,
	progression: ProgressionDefinition,
	progress: ProgressState,
	earned: readonly string[]
): readonly string[] {
	const unlocked = unlockedRewards(catalogue, progression, progress);
	const kept = new Set(earned);
	const added = catalogue.rewards
		.filter((reward) => unlocked.has(reward.id) && !kept.has(reward.id))
		.map((reward) => reward.id);
	return added.length === 0 ? earned : [...earned, ...added];
}

/** What `after` unlocks that the profile has not kept yet: what the screen announces. */
export function rewardsToAnnounce(
	catalogue: RewardCatalogue,
	progression: ProgressionDefinition,
	earned: readonly string[],
	after: ProgressState
): readonly RewardDefinition[] {
	const unlocked = unlockedRewards(catalogue, progression, after);
	const kept = new Set(earned);
	return catalogue.rewards.filter((reward) => unlocked.has(reward.id) && !kept.has(reward.id));
}
