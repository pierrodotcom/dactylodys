import { describe, expect, it } from 'vitest';
import { dishHash, dishName, templateIndex, type DishTemplate } from './dish';

const TEMPLATES: readonly DishTemplate[] = [
	({ first, last }) => `A ${first} ${last}`,
	({ first, last }) => `B ${first} ${last}`,
	({ first, last }) => `C ${first} ${last}`,
	({ first, last }) => `D ${first} ${last}`
];

describe('dishName', () => {
	it('gives the same dish for the same exercise, every time', () => {
		const groups = ['fj', 'jf', 'dk'];

		expect(dishName(groups, TEMPLATES)).toBe(dishName([...groups], TEMPLATES));
	});

	it('is built from the first and the last group typed', () => {
		const name = dishName(['fj', 'jf', 'dk'], TEMPLATES);

		expect(name).toContain('fj');
		expect(name).toContain('dk');
		expect(name).not.toContain('jf');
	});

	it('does not depend on the groups in the middle', () => {
		expect(dishName(['fj', 'a', 'dk'], TEMPLATES)).toBe(
			dishName(['fj', 'b', 'c', 'dk'], TEMPLATES)
		);
	});

	it('depends on the order of the first and the last group', () => {
		expect(dishName(['fj', 'dk'], TEMPLATES)).not.toBe(dishName(['dk', 'fj'], TEMPLATES));
	});

	it('names a dish from a single group, with that group twice', () => {
		expect(dishName(['fj'], TEMPLATES)).toMatch(/fj fj$/);
	});

	it('tidies the spaces of a phrase', () => {
		expect(dishName(['  le   chat  '], TEMPLATES)).toMatch(/le chat le chat$/);
	});

	it('can use every template, for different exercises', () => {
		const used = new Set<string>();
		const letters = 'abcdefghijklmnopqrstuvwxyz';
		for (const first of letters) {
			for (const last of letters) used.add(dishName([first, last], TEMPLATES).charAt(0));
		}

		expect([...used].sort()).toEqual(['A', 'B', 'C', 'D']);
	});

	it('refuses to name a dish without a template', () => {
		expect(() => dishName(['fj'], [])).toThrow(RangeError);
	});
});

describe('templateIndex', () => {
	it('stays within the templates', () => {
		for (const first of ['fj', 'é', 'Je lis un livre.', '']) {
			const index = templateIndex(first, 'jf', 8);
			expect(index).toBeGreaterThanOrEqual(0);
			expect(index).toBeLessThan(8);
		}
	});

	it('does not confuse two different splits of the same letters', () => {
		expect(dishHash('ab', 'c')).not.toBe(dishHash('a', 'bc'));
	});

	it('always gives the same answer for the same groups', () => {
		expect(templateIndex('fj', 'dk', 8)).toBe(templateIndex('fj', 'dk', 8));
		expect(dishHash('fj', 'dk')).toBe(dishHash('fj', 'dk'));
	});
});
