import { describe, expect, it } from 'vitest';
import { buildCharIndex } from '$lib/keyboard/layout';
import { loadLayout } from '$lib/keyboard/registry';
import { toGraphemes } from '$lib/engine/graphemes';
import { SAMPLE_EXERCISE, parseSample } from './sample';

describe('the sample exercise', () => {
	it('has several fixed groups, the first and the last one different', () => {
		const { groups } = SAMPLE_EXERCISE;

		expect(groups.length).toBeGreaterThanOrEqual(3);
		expect(groups[0]).not.toBe(groups[groups.length - 1]);
	});

	it('can be typed on the default layout', async () => {
		const index = buildCharIndex(await loadLayout('fr-fr-azerty-pc'));

		for (const group of SAMPLE_EXERCISE.groups) {
			for (const char of toGraphemes(group)) expect(index.has(char)).toBe(true);
		}
	});
});

describe('parseSample', () => {
	it.each([
		['not an object', 'text'],
		['a wrong version', { schemaVersion: 2, lessonId: 'a', groups: ['f'] }],
		['no lesson', { schemaVersion: 1, groups: ['f'] }],
		['no group', { schemaVersion: 1, lessonId: 'a', groups: [] }],
		['an empty group', { schemaVersion: 1, lessonId: 'a', groups: ['f', ''] }],
		['a group that is not a text', { schemaVersion: 1, lessonId: 'a', groups: [1] }]
	])('rejects %s', (_name, data) => {
		expect(() => parseSample(data)).toThrow();
	});

	it('accepts a valid sample', () => {
		expect(parseSample({ schemaVersion: 1, lessonId: 'a', groups: ['f', 'j'] })).toEqual({
			lessonId: 'a',
			groups: ['f', 'j']
		});
	});
});
