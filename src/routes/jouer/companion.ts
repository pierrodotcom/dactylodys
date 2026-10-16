import { applyCharResults } from '$lib/engine/progression/progress';
import type { ProgressionDefinition } from '$lib/engine/progression/types';
import {
	lessonPlays,
	rewardsOfLesson,
	rewardsToAnnounce,
	type CompanionChoice,
	type CompanionLook,
	type HelpQuest,
	type RewardCatalogue,
	type RewardDefinition
} from '$lib/engine/rewards';
import type { SessionMetrics } from '$lib/engine/types';
import type { CompanionAppearance } from '$lib/ui/companion/appearance';
import { withEarnedRewards, withHelpQuest, withProgress } from '$lib/state/profile';
import type { Profile } from '$lib/state/types';

const SPACE = ' ';

/** The profile once the rewards its progress unlocks are kept, and those that are new to it. */
export interface EarnedRewards {
	readonly profile: Profile;
	/** In the order of the catalogue; what the screen announces, one card after the other. */
	readonly announced: readonly RewardDefinition[];
}

/**
 * Keeps in the profile what its progress unlocks and the profile has not kept yet (ADR-027). Call
 * it with the progress already updated: what it returns is what this play earned. The profile is
 * returned as is when nothing is new, so that nothing is stored for nothing.
 */
export function earnRewards(
	profile: Profile,
	catalogue: RewardCatalogue | undefined,
	progression: ProgressionDefinition
): EarnedRewards {
	if (catalogue === undefined) return { profile, announced: [] };
	const announced = rewardsToAnnounce(
		catalogue,
		progression,
		profile.earnedRewardIds,
		profile.progress
	);
	return {
		profile: withEarnedRewards(
			profile,
			announced.map((reward) => reward.id)
		),
		announced
	};
}

/**
 * The profile after a help quest: the keystrokes count in the recent results of the keys, never
 * in a lesson (no stars, no ghost), and the quest is kept so that it does not come back before
 * another lesson is played. A tamed row of keys may earn a trophy.
 */
export function recordHelpOutcome(
	profile: Profile,
	progression: ProgressionDefinition,
	catalogue: RewardCatalogue | undefined,
	quest: HelpQuest,
	metrics: SessionMetrics
): EarnedRewards {
	const progress = applyCharResults(profile.progress, metrics, progression.rules);
	const helped = withHelpQuest(withProgress(profile, progress), {
		char: quest.char,
		lessonPlays: lessonPlays(progress)
	});
	return earnRewards(helped, catalogue, progression);
}

/** How a key is named to the child: a letter as a capital, like on the keycap; the space by its name. */
export function keyLabel(char: string, spaceName: string, locale: string): string {
	return char === SPACE ? spaceName : char.toLocaleUpperCase(locale);
}

/** The items of one slot of the companion; `slot: null` gathers the slots the screen has no name for. */
export interface SlotGroup {
	readonly slot: string | null;
	readonly items: readonly RewardDefinition[];
}

/**
 * The items of the catalogue by slot, the named slots in the given order, then the others
 * together. Within a slot, the order of the catalogue; empty slots are left out.
 */
export function groupBySlot(
	rewards: readonly RewardDefinition[],
	slotOrder: readonly string[]
): readonly SlotGroup[] {
	const items = rewards.filter((reward) => reward.kind === 'item');
	const named = slotOrder
		.map((slot) => ({ slot, items: items.filter((reward) => reward.slot === slot) }))
		.filter((group) => group.items.length > 0);
	const others = items.filter(
		(reward) => reward.slot === undefined || !slotOrder.includes(reward.slot)
	);
	return others.length > 0 ? [...named, { slot: null, items: others }] : named;
}

/** Where an item goes: an item without a slot holds a place of its own. */
function placeOf(catalogue: RewardCatalogue, id: string): string {
	const reward = catalogue.rewards.find((candidate) => candidate.id === id);
	return reward?.slot ?? id;
}

/** Puts the item on: whatever the companion wore in the same slot comes off. */
export function wearItem(
	choice: CompanionChoice,
	catalogue: RewardCatalogue,
	itemId: string
): CompanionChoice {
	const place = placeOf(catalogue, itemId);
	const kept = choice.wornItemIds.filter((id) => placeOf(catalogue, id) !== place);
	return { ...choice, wornItemIds: [...kept, itemId] };
}

export function takeOffItem(choice: CompanionChoice, itemId: string): CompanionChoice {
	return { ...choice, wornItemIds: choice.wornItemIds.filter((id) => id !== itemId) };
}

/** What every companion of the route draws. */
export function appearanceOf(look: CompanionLook | null): CompanionAppearance {
	return {
		colorId: look?.colorId ?? null,
		itemArtIds: look?.items.map((item) => item.artId) ?? []
	};
}

/** What the lesson earns and the child does not own yet; `null` when there is nothing left to win. */
export function prizeOfLesson(
	catalogue: RewardCatalogue | undefined,
	lessonId: string,
	owned: ReadonlySet<string>
): RewardDefinition | null {
	if (catalogue === undefined) return null;
	return rewardsOfLesson(catalogue, lessonId).find((reward) => !owned.has(reward.id)) ?? null;
}

/**
 * The companion asks for its name after a passed lesson, as long as it has none, unless the child
 * said "later" during this visit: never a duty.
 */
export function shouldAskName(passed: boolean, name: string, postponed: boolean): boolean {
	return passed && name.trim() === '' && !postponed;
}

/**
 * The colour shown as chosen: `null` is the colour the companion comes with, the first of the
 * catalogue.
 */
export function chosenColorId(catalogue: RewardCatalogue, colorId: string | null): string | null {
	const known = catalogue.colors.some((color) => color.id === colorId);
	return known ? colorId : (catalogue.colors[0]?.id ?? null);
}
