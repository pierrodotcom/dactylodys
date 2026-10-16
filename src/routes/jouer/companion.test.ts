import { describe, expect, it } from 'vitest';
import { lessonIds } from '$lib/engine/progression/definition';
import type { ProgressState } from '$lib/engine/progression/types';
import type { CompanionChoice, RewardDefinition } from '$lib/engine/rewards';
import type { CharStats, SessionMetrics } from '$lib/engine/types';
import { LAYOUT_IDS } from '$lib/keyboard/layout-ids';
import { createProfile, withEarnedRewards, withProgress } from '$lib/state/profile';
import type { Profile } from '$lib/state/types';
import {
	appearanceOf,
	chosenColorId,
	earnRewards,
	groupBySlot,
	keyLabel,
	prizeOfLesson,
	recordHelpOutcome,
	shouldAskName,
	takeOffItem,
	wearItem
} from './companion';
import { progressionFor } from './content';
import { REWARD_CATALOGUE } from './rewards';

const found = progressionFor(LAYOUT_IDS[0]);
if (found === undefined) throw new Error('expected a progression');
const progression = found;
const catalogue = REWARD_CATALOGUE;
const [FIRST, SECOND] = lessonIds(progression) as [string, string];
const PASSED = { bestAccuracy: 100, stars: 3, attempts: 1, lastPlayedAt: 1 } as const;
const SLOTS = ['head', 'face', 'neck', 'body', 'back', 'hand', 'feet'];

function stats(attempts: number, errors: number): CharStats {
	return { attempts, errors, meanLatencyMs: null };
}

function metricsOf(perChar: Record<string, CharStats>): SessionMetrics {
	return {
		elapsedMs: 10_000,
		totalKeystrokes: 20,
		correctKeystrokes: 20,
		errorCount: 0,
		accuracy: 100,
		correctCharsPerMinute: 120,
		wordsPerMinute: 24,
		perChar
	};
}

function profileWith(progress: ProgressState): Profile {
	const created = createProfile({ id: 'kid', name: 'Kid', now: 1, platform: 'pc' });
	return withProgress(created, progress);
}

function rewardsOf(lessonId: string): readonly RewardDefinition[] {
	return catalogue.rewards.filter(
		(reward) => reward.condition.kind === 'lesson-passed' && reward.condition.lessonId === lessonId
	);
}

function itemOf(lessonId: string): RewardDefinition {
	const item = rewardsOf(lessonId).find((reward) => reward.kind === 'item');
	if (!item) throw new Error(`No item for ${lessonId}`);
	return item;
}

const passedFirst: ProgressState = { lessons: { [FIRST]: PASSED }, chars: {} };

describe('earnRewards', () => {
	it('keeps and announces what a passed lesson unlocks, once', () => {
		const { profile, announced } = earnRewards(profileWith(passedFirst), catalogue, progression);
		expect(announced.map((reward) => reward.id)).toEqual(rewardsOf(FIRST).map((r) => r.id));
		expect(profile.earnedRewardIds).toEqual(announced.map((reward) => reward.id));

		const again = earnRewards(profile, catalogue, progression);
		expect(again.announced).toEqual([]);
		expect(again.profile).toBe(profile);
	});

	it('never announces again what the profile already kept, even when the progress lost it', () => {
		const kept = withEarnedRewards(profileWith({ lessons: {}, chars: {} }), [itemOf(FIRST).id]);
		const { profile, announced } = earnRewards(kept, catalogue, progression);
		expect(announced).toEqual([]);
		expect(profile).toBe(kept);
	});

	it('changes nothing without a catalogue', () => {
		const start = profileWith(passedFirst);
		expect(earnRewards(start, undefined, progression)).toEqual({ profile: start, announced: [] });
	});
});

describe('recordHelpOutcome', () => {
	const quest = { char: 'f', lessonId: FIRST };
	const start = profileWith({
		lessons: { [FIRST]: PASSED },
		chars: { f: { attempts: 10, errors: 5, recent: [{ attempts: 10, errors: 5 }] } }
	});

	it('adds the keystrokes to the recent results of the keys, and to no lesson', () => {
		const { profile } = recordHelpOutcome(
			start,
			progression,
			catalogue,
			quest,
			metricsOf({ f: stats(6, 1) })
		);
		expect(profile.progress.lessons).toEqual(start.progress.lessons);
		expect(profile.progress.chars['f']).toEqual({
			attempts: 16,
			errors: 6,
			recent: [
				{ attempts: 10, errors: 5 },
				{ attempts: 6, errors: 1 }
			]
		});
		expect(profile.ghosts).toEqual(start.ghosts);
	});

	it('keeps the quest with the number of lessons played, so that it waits for another one', () => {
		const { profile } = recordHelpOutcome(start, progression, catalogue, quest, metricsOf({}));
		expect(profile.helpQuest).toEqual({ char: 'f', lessonPlays: PASSED.attempts });
	});

	it('announces a row of keys tamed by the quest', () => {
		const trophy = catalogue.rewards.find(
			(reward) => reward.condition.kind === 'chars-mastered' && reward.condition.chars.includes('q')
		);
		if (trophy?.condition.kind !== 'chars-mastered') throw new Error('expected a trophy of keys');
		const { chars, minAttempts } = trophy.condition;
		const tamed = {
			attempts: minAttempts,
			errors: 0,
			recent: [{ attempts: minAttempts, errors: 0 }]
		};
		const almost = profileWith({
			lessons: {},
			chars: Object.fromEntries(chars.filter((char) => char !== 'q').map((char) => [char, tamed]))
		});
		const { profile, announced } = recordHelpOutcome(
			almost,
			progression,
			catalogue,
			{ char: 'q', lessonId: FIRST },
			metricsOf({ q: stats(minAttempts, 0) })
		);
		expect(announced.map((reward) => reward.id)).toContain(trophy.id);
		expect(profile.earnedRewardIds).toContain(trophy.id);
	});
});

describe('keyLabel', () => {
	it('names a letter by its capital, like on the keycap', () => {
		expect(keyLabel('q', 'Espace', 'fr')).toBe('Q');
		expect(keyLabel('é', 'Espace', 'fr')).toBe('É');
	});

	it('names the space by its name, and leaves a sign as it is', () => {
		expect(keyLabel(' ', 'Espace', 'fr')).toBe('Espace');
		expect(keyLabel(',', 'Espace', 'fr')).toBe(',');
	});
});

describe('groupBySlot', () => {
	it('gathers every item of the catalogue by slot, in the given order, without the skills and trophies', () => {
		const groups = groupBySlot(catalogue.rewards, SLOTS);
		expect(groups.map((group) => group.slot)).toEqual(SLOTS);
		const items = catalogue.rewards.filter((reward) => reward.kind === 'item');
		expect(groups.flatMap((group) => group.items)).toHaveLength(items.length);
		for (const group of groups) {
			expect(group.items.every((item) => item.slot === group.slot)).toBe(true);
		}
	});

	it('puts the slots it has no name for together, at the end, and leaves out the empty ones', () => {
		const groups = groupBySlot(catalogue.rewards, ['feet', 'head']);
		expect(groups.map((group) => group.slot)).toEqual(['feet', 'head', null]);
		const others = groups[2]?.items ?? [];
		expect(others.some((item) => item.slot === 'neck')).toBe(true);
		expect(groupBySlot([], SLOTS)).toEqual([]);
	});
});

describe('wearing items', () => {
	const necklace = itemOf(FIRST);
	const second = itemOf(SECOND);
	const sameSlot = catalogue.rewards.find(
		(reward) => reward.kind === 'item' && reward.slot === necklace.slot && reward.id !== necklace.id
	);
	const bare: CompanionChoice = { name: '', colorId: null, wornItemIds: [] };

	it('puts an item on, next to the items of other slots', () => {
		const worn = wearItem(wearItem(bare, catalogue, necklace.id), catalogue, second.id);
		expect(worn.wornItemIds).toEqual([necklace.id, second.id]);
	});

	it('replaces the item of the same slot', () => {
		if (!sameSlot) throw new Error('expected two items for one slot');
		const worn = wearItem(wearItem(bare, catalogue, necklace.id), catalogue, sameSlot.id);
		expect(worn.wornItemIds).toEqual([sameSlot.id]);
	});

	it('takes an item off and keeps the others', () => {
		const worn = wearItem(wearItem(bare, catalogue, necklace.id), catalogue, second.id);
		expect(takeOffItem(worn, necklace.id).wornItemIds).toEqual([second.id]);
	});

	it('draws the colour and the art of the worn items', () => {
		expect(appearanceOf({ name: 'Pipo', colorId: 'sky', items: [necklace] })).toEqual({
			colorId: 'sky',
			itemArtIds: [necklace.artId]
		});
		expect(appearanceOf(null)).toEqual({ colorId: null, itemArtIds: [] });
	});
});

describe('prizeOfLesson', () => {
	it('shows what the lesson earns until it is owned', () => {
		expect(prizeOfLesson(catalogue, FIRST, new Set())?.id).toBe(itemOf(FIRST).id);
		expect(prizeOfLesson(catalogue, FIRST, new Set([itemOf(FIRST).id]))).toBeNull();
		expect(prizeOfLesson(undefined, FIRST, new Set())).toBeNull();
	});
});

describe('shouldAskName', () => {
	it('asks after a passed lesson while the companion has no name and the child did not say later', () => {
		expect(shouldAskName(true, '', false)).toBe(true);
		expect(shouldAskName(false, '', false)).toBe(false);
		expect(shouldAskName(true, 'Pipo', false)).toBe(false);
		expect(shouldAskName(true, '', true)).toBe(false);
	});
});

describe('chosenColorId', () => {
	it('shows the colour the companion comes with as the first one', () => {
		const first = catalogue.colors[0]?.id;
		const last = catalogue.colors.at(-1)?.id ?? null;
		expect(chosenColorId(catalogue, null)).toBe(first);
		expect(chosenColorId(catalogue, 'unknown')).toBe(first);
		expect(chosenColorId(catalogue, last)).toBe(last);
	});
});
