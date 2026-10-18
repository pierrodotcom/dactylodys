import { describe, expect, it } from 'vitest';
import catalogueData from '../../../../content/fr/rewards/azerty-decouverte.json';
import { parseRewardCatalogue } from '$lib/engine/rewards/catalogue';
import {
	ITEM_ARTS,
	ITEM_SLOTS,
	TRICK_ARMS,
	TRICKS,
	TROPHY_ARTS,
	trophyKeys,
	wornBySlot
} from './items';

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

describe('trophyKeys', () => {
	const rows = ['keys-home-row', 'keys-top-row', 'keys-bottom-row'].map((artId) =>
		catalogue.rewards.find((reward) => reward.artId === artId)
	);

	it('shows the first keys of each row, in capitals, read from the catalogue', () => {
		for (const row of rows) {
			if (!row || row.condition.kind !== 'chars-mastered') throw new Error('missing row');
			expect(trophyKeys(row)).toEqual(
				row.condition.chars.slice(0, 3).map((char) => char.toLocaleUpperCase(catalogue.locale))
			);
		}
	});

	it('gives the three rows different keys', () => {
		const shown = rows.map((row) => (row ? trophyKeys(row).join('') : ''));
		expect(new Set(shown).size).toBe(3);
	});

	it('keeps accents and punctuation as they are typed', () => {
		for (const artId of ['keys-accents', 'keys-punctuation']) {
			const reward = catalogue.rewards.find((candidate) => candidate.artId === artId);
			if (!reward || reward.condition.kind !== 'chars-mastered') throw new Error('missing signs');
			expect(trophyKeys(reward)).toEqual(reward.condition.chars.slice(0, 3));
		}
	});

	it('shows no key for a reward that is not about keys', () => {
		for (const reward of catalogue.rewards.filter(
			(candidate) => candidate.condition.kind !== 'chars-mastered'
		)) {
			expect(trophyKeys(reward)).toEqual([]);
		}
	});
});
