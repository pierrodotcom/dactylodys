import { describe, expect, it } from 'vitest';
import { validateRewardCatalogue } from '$lib/engine/rewards';
import { LAYOUT_IDS } from '$lib/keyboard/layout-ids';
import { progressionFor } from './content';
import { HELP_QUEST_RULES, REWARD_CATALOGUE, rewardCatalogueFor } from './rewards';

describe('rewardCatalogueFor', () => {
	it.each(LAYOUT_IDS)('gives the catalogue of the progression of the layout %s', (layoutId) => {
		const progression = progressionFor(layoutId);
		expect(progression).toBeDefined();
		if (progression === undefined) return;
		const catalogue = rewardCatalogueFor(progression);
		expect(catalogue?.progressionId).toBe(progression.id);
		expect(catalogue).toBe(REWARD_CATALOGUE);
		expect(validateRewardCatalogue(REWARD_CATALOGUE, progression)).toEqual([]);
	});

	it('gives nothing for a progression it was not written for', () => {
		const progression = progressionFor(LAYOUT_IDS[0]);
		if (progression === undefined) throw new Error('expected a progression');
		expect(rewardCatalogueFor({ ...progression, id: 'fr.progression.other' })).toBeUndefined();
	});
});

describe('help quest rules', () => {
	it('are the rules of the shipped data', () => {
		expect(HELP_QUEST_RULES.schemaVersion).toBe(1);
		expect(HELP_QUEST_RULES.minCharCount).toBeLessThanOrEqual(HELP_QUEST_RULES.targetLength);
	});
});
