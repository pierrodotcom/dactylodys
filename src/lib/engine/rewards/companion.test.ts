import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { parseRewardCatalogue } from './catalogue';
import { resolveCompanion } from './companion';
import { catalogueData, rewardData } from './test-support';
import type { CompanionChoice } from './types';

const CONDITION = { kind: 'lesson-passed', lessonId: 'fr.lesson.a' };

const CATALOGUE = parseRewardCatalogue(
	catalogueData([
		rewardData('hat', CONDITION, { kind: 'item', slot: 'head' }),
		rewardData('crown', CONDITION, { kind: 'item', slot: 'head' }),
		rewardData('scarf', CONDITION, { kind: 'item', slot: 'neck' }),
		rewardData('fire', CONDITION, { kind: 'skill' }),
		rewardData('cup', CONDITION, { kind: 'trophy' })
	])
);

const ALL = new Set(CATALOGUE.rewards.map((reward) => reward.id));

function choice(overrides: Partial<CompanionChoice> = {}): CompanionChoice {
	return { name: 'Rex', colorId: null, wornItemIds: [], ...overrides };
}

function look(worn: string[], unlocked: ReadonlySet<string> = ALL) {
	return resolveCompanion(CATALOGUE, unlocked, choice({ wornItemIds: worn })).items.map(
		(item) => item.id
	);
}

describe('resolveCompanion', () => {
	it('keeps the name as chosen, empty included', () => {
		expect(resolveCompanion(CATALOGUE, ALL, choice({ name: 'Rex' })).name).toBe('Rex');
		expect(resolveCompanion(CATALOGUE, ALL, choice({ name: '' })).name).toBe('');
	});

	it('keeps a colour the catalogue has, and falls back to the default otherwise', () => {
		expect(resolveCompanion(CATALOGUE, ALL, choice({ colorId: 'blue' })).colorId).toBe('blue');
		expect(resolveCompanion(CATALOGUE, ALL, choice({ colorId: 'purple' })).colorId).toBeNull();
		expect(resolveCompanion(CATALOGUE, ALL, choice({ colorId: null })).colorId).toBeNull();
	});

	it('wears the unlocked items of the choice, in the order of the choice', () => {
		expect(look(['fr.reward.scarf', 'fr.reward.hat'])).toEqual([
			'fr.reward.scarf',
			'fr.reward.hat'
		]);
	});

	it('leaves out an item that is not unlocked', () => {
		expect(look(['fr.reward.hat', 'fr.reward.scarf'], new Set(['fr.reward.scarf']))).toEqual([
			'fr.reward.scarf'
		]);
	});

	it('leaves out an identifier the catalogue does not have', () => {
		expect(
			look(['fr.reward.gone', 'fr.reward.hat'], new Set(['fr.reward.gone', 'fr.reward.hat']))
		).toEqual(['fr.reward.hat']);
	});

	it('leaves out what is not an item, even when it is unlocked', () => {
		expect(look(['fr.reward.fire', 'fr.reward.cup', 'fr.reward.hat'])).toEqual(['fr.reward.hat']);
	});

	it('keeps only the last item chosen for a slot', () => {
		expect(look(['fr.reward.hat', 'fr.reward.scarf', 'fr.reward.crown'])).toEqual([
			'fr.reward.scarf',
			'fr.reward.crown'
		]);
	});

	it('falls back to the earlier item of a slot when the last one is not unlocked', () => {
		expect(look(['fr.reward.hat', 'fr.reward.crown'], new Set(['fr.reward.hat']))).toEqual([
			'fr.reward.hat'
		]);
	});

	it('wears an item named twice only once', () => {
		expect(look(['fr.reward.hat', 'fr.reward.hat'])).toEqual(['fr.reward.hat']);
	});

	it('returns the definitions of the catalogue', () => {
		const [hat] = resolveCompanion(
			CATALOGUE,
			ALL,
			choice({ wornItemIds: ['fr.reward.hat'] })
		).items;
		expect(hat).toBe(CATALOGUE.rewards[0]);
	});

	it('does not read the prototype chain for an identifier', () => {
		expect(look(['constructor', '__proto__', 'toString'], ALL)).toEqual([]);
	});

	describe('properties', () => {
		const ids = [...ALL, 'fr.reward.gone'];
		const choiceArb = fc.record({
			name: fc.string(),
			colorId: fc.option(fc.constantFrom('green', 'blue', 'purple'), { nil: null }),
			wornItemIds: fc.array(fc.constantFrom(...ids), { maxLength: 8 })
		});
		const unlockedArb = fc.subarray(ids).map((subset) => new Set(subset));

		it('never wears something that is not unlocked, nor two items of one slot', () => {
			fc.assert(
				fc.property(choiceArb, unlockedArb, (chosen, unlocked) => {
					const { items } = resolveCompanion(CATALOGUE, unlocked, chosen);
					for (const item of items) {
						expect(item.kind).toBe('item');
						expect(unlocked.has(item.id)).toBe(true);
						expect(chosen.wornItemIds).toContain(item.id);
					}
					const slots = items.map((item) => item.slot);
					expect(new Set(slots).size).toBe(slots.length);
				})
			);
		});

		it('is deterministic', () => {
			fc.assert(
				fc.property(choiceArb, unlockedArb, (chosen, unlocked) => {
					expect(resolveCompanion(CATALOGUE, unlocked, chosen)).toEqual(
						resolveCompanion(CATALOGUE, new Set(unlocked), structuredClone(chosen))
					);
				})
			);
		});

		it('only loses items when fewer are unlocked', () => {
			fc.assert(
				fc.property(choiceArb, unlockedArb, unlockedArb, (chosen, first, second) => {
					const fewer = new Set([...first].filter((id) => second.has(id)));
					const slotsOf = (unlocked: ReadonlySet<string>) =>
						new Set(resolveCompanion(CATALOGUE, unlocked, chosen).items.map((item) => item.slot));
					for (const slot of slotsOf(fewer)) expect(slotsOf(first).has(slot)).toBe(true);
				})
			);
		});
	});
});
