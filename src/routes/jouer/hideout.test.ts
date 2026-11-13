import fc from 'fast-check';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { RewardDefinition } from '$lib/engine/rewards';
import {
	arrangeHideout,
	decorationsFor,
	HIDEOUT_RULES,
	isDecoration,
	parseHideoutRules,
	placeDecoration,
	placesOf,
	removeDecoration,
	type HideoutLayout
} from './hideout';
import { REWARD_CATALOGUE } from './rewards';

const rules = HIDEOUT_RULES;
const catalogue = REWARD_CATALOGUE;
const decorations = catalogue.rewards.filter((reward) => isDecoration(rules, reward));
const everything: ReadonlySet<string> = new Set(catalogue.rewards.map((reward) => reward.id));

function byArt(artId: string): RewardDefinition {
	const reward = catalogue.rewards.find((candidate) => candidate.artId === artId);
	if (!reward) throw new Error(`no reward drawn as ${artId}`);
	return reward;
}

const CROWN = byArt('crown');
const HAT = byArt('chef-hat');
const MEDAL = byArt('medal-dinosaurs');
const TRICK = catalogue.rewards.find((reward) => reward.kind === 'skill');
const [CROWN_PLACE, CROWN_OTHER_PLACE] = placesOf(rules, CROWN) as [string, string];
const NOT_FOR_CROWN = rules.places.find((place) => !placesOf(rules, CROWN).includes(place)) ?? '';

const placeArb = fc.constantFrom(...rules.places);
const rewardArb = fc.constantFrom(...decorations);
const ownedArb = fc
	.subarray(catalogue.rewards.map((reward) => reward.id))
	.map((ids): ReadonlySet<string> => new Set(ids));
/** What a profile may hold: places and rewards known or not, owned or not. */
const layoutArb: fc.Arbitrary<HideoutLayout> = fc.dictionary(
	fc.oneof(placeArb, fc.constantFrom('attic', 'roof')),
	fc.oneof(
		rewardArb.map((reward) => reward.id),
		fc.constantFrom('fr.reward.gone', TRICK?.id ?? 'fr.reward.trick')
	),
	{ maxKeys: 8 }
);

describe('the rules of the hideout', () => {
	it('reads the shipped rules', () => {
		const data: unknown = JSON.parse(readFileSync('content/common/hideout.json', 'utf8'));
		expect(parseHideoutRules(data)).toEqual(HIDEOUT_RULES);
	});

	it('has about ten places', () => {
		expect(rules.places.length).toBeGreaterThanOrEqual(8);
		expect(rules.places.length).toBeLessThanOrEqual(12);
	});

	it('gives every item and every trophy of the catalogue at least one place', () => {
		for (const reward of catalogue.rewards.filter((candidate) => candidate.kind !== 'skill')) {
			expect(placesOf(rules, reward), reward.artId).not.toHaveLength(0);
		}
	});

	it('names no drawing that the catalogue does not have, and no trick', () => {
		const objects = catalogue.rewards.filter((reward) => reward.kind !== 'skill');
		expect(Object.keys(rules.decorations).sort()).toEqual(objects.map((r) => r.artId).sort());
		if (TRICK) expect(isDecoration(rules, TRICK)).toBe(false);
	});

	it('gives every place at least one object', () => {
		for (const place of rules.places) {
			expect(decorationsFor(rules, catalogue, everything, place), place).not.toHaveLength(0);
		}
	});

	it.each([
		['a place twice', { places: ['shelf', 'shelf'], decorations: {} }, /places\[1\]/],
		['an unknown place', { places: ['shelf'], decorations: { crown: ['roof'] } }, /crown\[0\]/],
		['an object with no place', { places: ['shelf'], decorations: { crown: [] } }, /crown/],
		['no place at all', { places: [], decorations: {} }, /places/],
		['an unknown property', { places: ['shelf'], decorations: {}, coins: 1 }, /coins/]
	])('refuses %s', (_label, data, message) => {
		expect(() => parseHideoutRules({ schemaVersion: 1, ...data })).toThrow(message);
	});
});

describe('arrangeHideout', () => {
	it('shows an empty cabin for a new profile', () => {
		expect(arrangeHideout({}, rules, catalogue, everything).size).toBe(0);
	});

	it('leaves out an unknown reward, an unknown place and what is not owned', () => {
		const layout = {
			[CROWN_PLACE]: 'fr.reward.gone',
			roof: CROWN.id,
			[CROWN_OTHER_PLACE]: CROWN.id
		};
		expect([...arrangeHideout(layout, rules, catalogue, everything)]).toEqual([
			[CROWN_OTHER_PLACE, CROWN]
		]);
		expect(arrangeHideout(layout, rules, catalogue, new Set()).size).toBe(0);
	});

	it('leaves out a reward put where it does not fit, and a trick', () => {
		const layout = { [NOT_FOR_CROWN]: CROWN.id, [CROWN_PLACE]: TRICK?.id ?? '' };
		expect(arrangeHideout(layout, rules, catalogue, everything).size).toBe(0);
	});

	it('only shows owned rewards, each once, in places that fit them', () => {
		fc.assert(
			fc.property(layoutArb, ownedArb, (layout, owned) => {
				const arranged = arrangeHideout(layout, rules, catalogue, owned);
				const ids = [...arranged.values()].map((reward) => reward.id);
				expect(new Set(ids).size).toBe(ids.length);
				for (const [place, reward] of arranged) {
					expect(owned.has(reward.id)).toBe(true);
					expect(placesOf(rules, reward)).toContain(place);
				}
			})
		);
	});
});

describe('placeDecoration', () => {
	it('sets an owned object down in a place that fits it', () => {
		const layout = placeDecoration({}, rules, catalogue, everything, CROWN_PLACE, CROWN.id);
		expect(layout).toEqual({ [CROWN_PLACE]: CROWN.id });
	});

	it('moves an object from where it was', () => {
		const first = placeDecoration({}, rules, catalogue, everything, CROWN_PLACE, CROWN.id);
		const moved = placeDecoration(first, rules, catalogue, everything, CROWN_OTHER_PLACE, CROWN.id);
		expect(moved).toEqual({ [CROWN_OTHER_PLACE]: CROWN.id });
	});

	it('replaces what was in the place', () => {
		const place = placesOf(rules, HAT).find((where) => placesOf(rules, MEDAL).includes(where));
		if (place === undefined) throw new Error('expected a place for a hat and a medal');
		const first = placeDecoration({}, rules, catalogue, everything, place, HAT.id);
		expect(placeDecoration(first, rules, catalogue, everything, place, MEDAL.id)).toEqual({
			[place]: MEDAL.id
		});
	});

	it('does not set down an object that is not won yet', () => {
		const owned = new Set([HAT.id]);
		expect(placeDecoration({}, rules, catalogue, owned, CROWN_PLACE, CROWN.id)).toEqual({});
	});

	it('does not set down an object where it does not fit, nor something unknown', () => {
		expect(placeDecoration({}, rules, catalogue, everything, NOT_FOR_CROWN, CROWN.id)).toEqual({});
		expect(placeDecoration({}, rules, catalogue, everything, 'roof', CROWN.id)).toEqual({});
		expect(placeDecoration({}, rules, catalogue, everything, CROWN_PLACE, 'fr.reward.x')).toEqual(
			{}
		);
	});

	it('never shows an object not won, nor one object twice', () => {
		fc.assert(
			fc.property(layoutArb, ownedArb, placeArb, rewardArb, (layout, owned, place, reward) => {
				const after = placeDecoration(layout, rules, catalogue, owned, place, reward.id);
				const fits = owned.has(reward.id) && placesOf(rules, reward).includes(place);
				if (!fits) {
					expect(after).toBe(layout);
					return;
				}
				const arranged = arrangeHideout(after, rules, catalogue, owned);
				expect(Object.keys(after).sort()).toEqual([...arranged.keys()].sort());
				expect(arranged.get(place)?.id).toBe(reward.id);
				const ids = Object.values(after);
				expect(new Set(ids).size).toBe(ids.length);
			})
		);
	});
});

describe('removeDecoration', () => {
	it('empties the place and keeps the others', () => {
		const one = placeDecoration({}, rules, catalogue, everything, CROWN_PLACE, CROWN.id);
		const hatPlace = placesOf(rules, HAT)[0] ?? '';
		const two = placeDecoration(one, rules, catalogue, everything, hatPlace, HAT.id);
		expect(removeDecoration(two, rules, catalogue, everything, CROWN_PLACE)).toEqual({
			[hatPlace]: HAT.id
		});
	});

	it('leaves the place empty whatever was there', () => {
		fc.assert(
			fc.property(layoutArb, ownedArb, placeArb, (layout, owned, place) => {
				const after = removeDecoration(layout, rules, catalogue, owned, place);
				expect(arrangeHideout(after, rules, catalogue, owned).has(place)).toBe(false);
			})
		);
	});
});
