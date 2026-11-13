import { describe, expect, it } from 'vitest';
import { REWARD_CATALOGUE } from '../../../routes/jouer/rewards';
import { HIDEOUT_RULES, placesOf } from '../../../routes/jouer/hideout';
import { ITEM_ARTS, TROPHY_ARTS } from '../companion/items';
import { DECORATION_ARTS, extentOf, fitScale, HOLDER_HEIGHT, placePoint } from './decorations';
import { markOf, PLACE_SPOTS, SCENE_HEIGHT, SCENE_WIDTH } from './places';

const objects = REWARD_CATALOGUE.rewards.filter((reward) => reward.kind !== 'skill');
/** Shrunk to fit a place, an object keeps at least this share of its size in the cabin. */
const SMALLEST_SHARE = 0.45;

describe('the objects of the hideout', () => {
	it('draws every item and every trophy of the catalogue, from its own drawing', () => {
		for (const reward of objects) {
			const art = DECORATION_ARTS[reward.artId];
			expect(art, reward.artId).toBeDefined();
			expect(art?.source).toBe(reward.kind);
			const source = reward.kind === 'item' ? ITEM_ARTS : TROPHY_ARTS;
			expect(source[reward.artId], reward.artId).toBeDefined();
		}
	});

	it('draws nothing that the catalogue does not have', () => {
		expect(Object.keys(DECORATION_ARTS).sort()).toEqual(objects.map((r) => r.artId).sort());
	});

	it('gives every object at least one place, where it hangs or stands as it is drawn', () => {
		for (const reward of objects) {
			const art = DECORATION_ARTS[reward.artId];
			const places = placesOf(HIDEOUT_RULES, reward);
			expect(places.length, reward.artId).toBeGreaterThan(0);
			for (const place of places) expect(PLACE_SPOTS[place]?.mount, place).toBe(art?.mount);
		}
	});

	it('keeps every object big enough to be recognised in each of its places', () => {
		for (const reward of objects) {
			const art = DECORATION_ARTS[reward.artId];
			if (!art) continue;
			for (const place of placesOf(HIDEOUT_RULES, reward)) {
				const spot = PLACE_SPOTS[place];
				if (!spot) continue;
				expect(fitScale(art, spot.room), `${reward.artId} at ${place}`).toBeGreaterThanOrEqual(
					art.scale * SMALLEST_SHARE
				);
			}
		}
	});

	it('ties a cord to the object only when it hangs from one', () => {
		for (const [artId, art] of Object.entries(DECORATION_ARTS)) {
			expect(art.ties !== undefined, artId).toBe(art.holder === 'cord');
			if (art.mount === 'hang') expect(HOLDER_HEIGHT[art.holder], artId).toBe(0);
		}
	});

	it('hangs an object below its hook and stands an object above the ground', () => {
		for (const [artId, art] of Object.entries(DECORATION_ARTS)) {
			const [, top, , height] = extentOf(art);
			if (art.mount === 'hang') expect(top, artId).toBeGreaterThanOrEqual(-art.frame[3] * 0.6);
			else expect(top + height, artId).toBeLessThanOrEqual(1);
			expect(placePoint(art, art.anchor)[1], artId).toBeLessThanOrEqual(art.drop ?? 0);
		}
	});
});

describe('the places of the hideout', () => {
	it('draws every place of the data, and no other', () => {
		expect(Object.keys(PLACE_SPOTS).sort()).toEqual([...HIDEOUT_RULES.places].sort());
	});

	it('keeps every place and its outline inside the drawing', () => {
		for (const [place, spot] of Object.entries(PLACE_SPOTS)) {
			const [x, y, width, height] = markOf(spot, 0);
			expect(x, place).toBeGreaterThanOrEqual(0);
			expect(y, place).toBeGreaterThanOrEqual(0);
			expect(x + width, place).toBeLessThanOrEqual(SCENE_WIDTH);
			expect(y + height, place).toBeLessThanOrEqual(SCENE_HEIGHT);
		}
	});
});
