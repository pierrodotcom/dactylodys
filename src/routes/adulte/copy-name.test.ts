import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { toGraphemes } from '$lib/engine/graphemes';
import { createProfile, MAX_NAME_LENGTH, normalizeName } from '$lib/state/profile';
import { distinctName, nameCopies, type CopyNameFormat } from './copy-name';

const FORMAT: CopyNameFormat = (name, number) => `${name} (${number})`;

function profile(id: string, name: string) {
	return createProfile({ id, name, now: 1, platform: 'pc' });
}

describe('distinctName', () => {
	it('numbers the first copy 2', () => {
		expect(distinctName('Lou', ['Lou'], FORMAT)).toBe('Lou (2)');
	});

	it('takes the next free number, whatever the case of the names taken', () => {
		expect(distinctName('Lou', ['Lou', 'lou (2)', 'Lou (3)'], FORMAT)).toBe('Lou (4)');
	});

	it('shortens a long nickname so that the copy stays a valid one', () => {
		const long = 'A'.repeat(MAX_NAME_LENGTH);
		const copy = distinctName(long, [long], FORMAT);
		expect(normalizeName(copy)).toBe(copy);
		expect(copy.endsWith('(2)')).toBe(true);
	});

	it('always gives a valid nickname that no name taken bears', () => {
		const name = fc
			.string({
				unit: fc.constantFrom('a', 'B', 'é', ' ', '(', '2', ')'),
				minLength: 1,
				maxLength: 25
			})
			.map((text) => normalizeName(text))
			.filter((text): text is string => text !== null);
		fc.assert(
			fc.property(name, fc.array(name, { maxLength: 8 }), (original, others) => {
				const taken = [original, ...others];
				const copy = distinctName(original, taken, FORMAT);
				expect(normalizeName(copy)).toBe(copy);
				expect(toGraphemes(copy).length).toBeLessThanOrEqual(MAX_NAME_LENGTH);
				expect(taken.map((text) => text.toLocaleLowerCase())).not.toContain(
					copy.toLocaleLowerCase()
				);
			})
		);
	});
});

describe('nameCopies', () => {
	it('renames only the profiles kept beside another, each with its own number', () => {
		const existing = [profile('a', 'Lou'), profile('b', 'Ali')];
		const saved = nameCopies(
			[
				{ profile: profile('c', 'Lou'), copyOf: 'a' },
				{ profile: profile('d', 'Lou'), copyOf: 'a' },
				{ profile: profile('b', 'Ali'), copyOf: null }
			],
			existing,
			FORMAT
		);
		expect(saved.map((entry) => [entry.id, entry.name])).toEqual([
			['c', 'Lou (2)'],
			['d', 'Lou (3)'],
			['b', 'Ali']
		]);
	});
});
