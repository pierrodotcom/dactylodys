import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { withStoryPhrases } from '../../tools/content/lib/story-phrases.js';

const PHRASES_FILE = 'content/fr/phrases/base.json';

const generated = [
	{ text: 'je lis', themes: [], level: 1, review: 'human' },
	{ text: 'il file', themes: [], level: 1, review: 'agent' }
];
const story = {
	text: 'il entre et sent le dessert',
	themes: ['cuisine'],
	level: 1,
	review: 'human',
	lessonId: 'fr.lesson.tartine-t-n'
};

describe('withStoryPhrases', () => {
	it('keeps the story phrases of the previous bank as they are, after the generated ones', () => {
		const previous = { phrases: [{ text: 'une vieille phrase' }, story] };
		expect(withStoryPhrases(generated, previous)).toEqual([...generated, story]);
	});

	it('gives the generated phrases alone without a previous bank', () => {
		expect(withStoryPhrases(generated, undefined)).toEqual(generated);
	});

	it('refuses a story phrase that phrases.fr.txt also holds', () => {
		const previous = { phrases: [{ ...story, text: 'je lis' }] };
		expect(() => withStoryPhrases(generated, previous)).toThrow(/je lis/);
	});

	it('keeps every story phrase of the shipped bank', () => {
		const shipped = JSON.parse(readFileSync(PHRASES_FILE, 'utf8')) as {
			phrases: { text: string; lessonId?: string }[];
		};
		const stories = shipped.phrases.filter((phrase) => phrase.lessonId !== undefined);
		expect(stories.length).toBeGreaterThan(0);
		expect(withStoryPhrases([], shipped)).toEqual(stories);
	});
});
