import { describe, expect, it } from 'vitest';
import { validateStory } from '$lib/engine/story';
import { STORY_ART_IDS } from '$lib/ui/story/art-ids';
import { progressionFor } from './content';
import { STORY, storyFor, wholeStory } from './story';

const progression = progressionFor('fr-fr-azerty-pc');

describe('the shipped story', () => {
	it('follows the shipped progression, every world and every lesson', () => {
		expect(progression).toBeDefined();
		if (!progression) return;
		expect(storyFor(progression)).toBe(STORY);
		expect(validateStory(STORY, progression)).toEqual([]);
	});

	it('tells 34 moments: an opening and an ending per world, a line per lesson', () => {
		expect(wholeStory(STORY)).toHaveLength(34);
	});

	it('has a drawing for every picture it names, and no drawing it does not name', () => {
		const named = wholeStory(STORY).map((moment) => moment.art);
		expect(new Set(named).size).toBe(named.length);
		expect([...named].sort()).toEqual([...STORY_ART_IDS].sort());
	});
});
