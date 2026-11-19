import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * The names of the rewards give no gender to the child who wears them (audit C-17, principle 7 of
 * the project): « de chef », « d'artiste », « pour explorer », never « d'explorateur » nor « du roi ».
 */
const REWARDS = 'content/fr/rewards/azerty-decouverte.json';
/** A noun of a person that has a masculine and a feminine form. */
const GENDERED =
	/(?<!\p{L})(\p{L}+(?:teur|trice)s?|rois?|reines?|princes?|princesses?|chevaliers?)(?!\p{L})/iu;

const catalogue = JSON.parse(readFileSync(REWARDS, 'utf8')) as {
	rewards: { id: string; title: string }[];
};

describe('the names of the rewards', () => {
	it('name things, never a man or a woman who would wear them', () => {
		expect(GENDERED.test("La loupe d'explorateur")).toBe(true);
		expect(GENDERED.test('La couronne du roi des dinos')).toBe(true);
		const gendered = catalogue.rewards.filter((reward) => GENDERED.test(reward.title));

		expect(gendered.map((reward) => reward.title)).toEqual([]);
	});
});
