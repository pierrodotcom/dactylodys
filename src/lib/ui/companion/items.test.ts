import { describe, expect, it } from 'vitest';
import catalogueData from '../../../../content/fr/rewards/azerty-decouverte.json';
import { parseRewardCatalogue } from '$lib/engine/rewards/catalogue';
import { ITEM_ARTS, ITEM_SLOTS, TRICK_ARMS, TRICKS, TROPHY_ARTS, wornBySlot } from './items';

const catalogue = parseRewardCatalogue(catalogueData);
const ofKind = (kind: string) => catalogue.rewards.filter((reward) => reward.kind === kind);

describe('drawings of the catalogue', () => {
	it('draws every item, in the slot the catalogue gives it', () => {
		const items = ofKind('item');
		expect(items.map((item) => [item.artId, ITEM_ARTS[item.artId]?.slot])).toEqual(
			items.map((item) => [item.artId, item.slot])
		);
	});

	it('draws nothing that the catalogue does not have', () => {
		expect(Object.keys(ITEM_ARTS).sort()).toEqual(
			ofKind('item')
				.map((item) => item.artId)
				.sort()
		);
		expect(Object.keys(TROPHY_ARTS).sort()).toEqual(
			ofKind('trophy')
				.map((trophy) => trophy.artId)
				.sort()
		);
	});

	it('plays every trick of the catalogue', () => {
		expect([...TRICKS].sort()).toEqual(
			ofKind('skill')
				.map((skill) => skill.artId)
				.sort()
		);
		for (const trick of Object.keys(TRICK_ARMS)) expect(TRICKS).toContain(trick);
	});

	it('gives every item a frame that is not empty', () => {
		for (const art of Object.values(ITEM_ARTS)) {
			expect(art.frame[2]).toBeGreaterThan(0);
			expect(art.frame[3]).toBeGreaterThan(0);
		}
	});
});

describe('wornBySlot', () => {
	it('keeps one item per slot, the first one given', () => {
		expect(wornBySlot(['crown', 'chef-hat', 'springs'])).toEqual({
			head: 'crown',
			feet: 'springs'
		});
	});

	it('leaves out drawings it does not know', () => {
		expect(wornBySlot(['no-such-item', 'magnifier'])).toEqual({ hand: 'magnifier' });
	});

	it('lists the slots in drawing order, the back first and the hand last', () => {
		expect(ITEM_SLOTS).toEqual(['back', 'body', 'neck', 'feet', 'face', 'head', 'hand']);
	});
});
