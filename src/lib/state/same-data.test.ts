import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { parseProfile, updateSettings, withAdultWords } from './profile';
import { isSameData } from './same-data';
import { profileArb } from './test-arbitraries';

describe('isSameData', () => {
	it('tells plain values apart', () => {
		expect(isSameData(1, 1)).toBe(true);
		expect(isSameData('a', 'a')).toBe(true);
		expect(isSameData(null, null)).toBe(true);
		expect(isSameData(1, '1')).toBe(false);
		expect(isSameData(0, null)).toBe(false);
		expect(isSameData(null, {})).toBe(false);
		expect(isSameData(true, 1)).toBe(false);
	});

	it('reads the content of lists in their order', () => {
		expect(isSameData([1, [2, 3]], [1, [2, 3]])).toBe(true);
		expect(isSameData([1, 2], [2, 1])).toBe(false);
		expect(isSameData([1, 2], [1, 2, 3])).toBe(false);
		expect(isSameData([], {})).toBe(false);
		expect(isSameData({ 0: 'a' }, ['a'])).toBe(false);
	});

	it('reads the content of records whatever the order of their keys', () => {
		expect(isSameData({ a: 1, b: { c: [2] } }, { b: { c: [2] }, a: 1 })).toBe(true);
		expect(isSameData({ a: 1 }, { a: 2 })).toBe(false);
		expect(isSameData({ a: 1 }, { a: 1, b: 2 })).toBe(false);
		expect(isSameData({ a: 1, b: 2 }, { a: 1, c: 2 })).toBe(false);
	});

	it('takes an absent key and an undefined one for the same, as JSON does', () => {
		expect(isSameData({ a: 1, b: undefined }, { a: 1 })).toBe(true);
		expect(isSameData({ a: 1 }, { b: undefined, a: 1 })).toBe(true);
		expect(isSameData({ a: undefined }, { a: null })).toBe(false);
	});

	it('finds a profile the same as its copy, and different once anything in it changed', () => {
		fc.assert(
			fc.property(profileArb, (profile) => {
				const copy = parseProfile(JSON.parse(JSON.stringify(profile)));
				expect(isSameData(profile, copy)).toBe(true);
				expect(isSameData(profile, { ...copy, calibrated: !copy.calibrated })).toBe(false);
				expect(isSameData(profile, withAdultWords(copy, [...copy.adultWords, 'mot']))).toBe(false);
				expect(
					isSameData(profile, updateSettings(copy, { soundEnabled: !copy.settings.soundEnabled }))
				).toBe(false);
			})
		);
	});
});
