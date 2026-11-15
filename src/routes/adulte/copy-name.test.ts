import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { toGraphemes } from '$lib/engine/graphemes';
import { createProfile, MAX_NAME_LENGTH, normalizeName, sameNickname } from '$lib/state/profile';
import type { Profile } from '$lib/state/types';
import { distinctName, duplicateNicknames, nameCopies, type CopyNameFormat } from './copy-name';

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

function allDistinct(profiles: readonly Profile[]): boolean {
	return profiles.every((one, index) =>
		profiles.slice(index + 1).every((other) => !sameNickname(one.name, other.name))
	);
}

describe('nameCopies, nicknames borne twice', () => {
	it('gives its own nickname to a loaded profile whose nickname another profile of the device bears', () => {
		const saved = nameCopies(
			[{ profile: profile('b', 'lou'), copyOf: null }],
			[profile('a', 'Lou')],
			FORMAT
		);
		expect(saved.map((entry) => [entry.id, entry.name])).toEqual([['b', 'lou (2)']]);
	});

	it('keeps the nickname of a loaded profile that replaces the one of the device', () => {
		const saved = nameCopies(
			[{ profile: profile('a', 'Lou'), copyOf: null }],
			[profile('a', 'Lou')],
			FORMAT
		);
		expect(saved.map((entry) => entry.name)).toEqual(['Lou']);
	});

	it('gives distinct nicknames to two loaded profiles that bear the same one', () => {
		const saved = nameCopies(
			[
				{ profile: profile('a', 'Zoé'), copyOf: null },
				{ profile: profile('b', 'Zoe'), copyOf: null }
			],
			[],
			FORMAT
		);
		expect(saved.map((entry) => entry.name)).toEqual(['Zoé', 'Zoe (2)']);
	});

	it('never leaves two profiles of the device with the same nickname', () => {
		const names = fc.constantFrom('Lou', 'lou', 'Zoé', 'Zoe', 'Ali', 'Lou (2)');
		const ids = fc.constantFrom('a', 'b', 'c', 'd');
		const entries = fc.uniqueArray(fc.tuple(ids, names), {
			selector: ([id]) => id,
			maxLength: 4
		});
		const device = entries
			.map((list) => list.map(([id, name]) => profile(id, name)))
			.filter(allDistinct);
		fc.assert(
			fc.property(device, entries, (existing, file) => {
				const saved = nameCopies(
					file.map(([id, name]) => ({ profile: profile(id, name), copyOf: null })),
					existing,
					FORMAT
				);
				const savedIds = new Set(saved.map((entry) => entry.id));
				const after = [...existing.filter((entry) => !savedIds.has(entry.id)), ...saved];
				expect(allDistinct(after)).toBe(true);
				saved.forEach((entry) => expect(normalizeName(entry.name)).toBe(entry.name));
			})
		);
	});
});

describe('duplicateNicknames', () => {
	it('names once each nickname that several profiles bear, as the first of them bears it', () => {
		const profiles = [
			profile('a', 'Lou'),
			profile('b', 'Ali'),
			profile('c', 'lou'),
			profile('d', 'Zoé'),
			profile('e', 'Zoe'),
			profile('f', 'LOU')
		];
		expect(duplicateNicknames(profiles)).toEqual(['Lou', 'Zoé']);
	});

	it('names nothing when every profile has its own nickname', () => {
		expect(duplicateNicknames([profile('a', 'Lou'), profile('b', 'Lou 2')])).toEqual([]);
	});
});
