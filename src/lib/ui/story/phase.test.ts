import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { STORY_ART_GROUPS, type StoryArtGroup } from './art-ids';
import { isMotionReduced, storyPhases } from './phase';

const DRAWING_FILES: Readonly<Record<StoryArtGroup, string>> = {
	dinosaurs: 'DinosaursArt.svelte',
	kitchen: 'KitchenArt.svelte',
	zoo: 'ZooArt.svelte',
	space: 'SpaceArt.svelte',
	circuit: 'CircuitArt.svelte',
	post: 'PostArt.svelte'
};

function rootWith(motion: string | null) {
	return { getAttribute: (name: string) => (name === 'data-motion' ? motion : null) };
}

/** The markup of one picture: from its `art === '…'` branch to the next one. */
function branchOf(source: string, art: string): string {
	const start = source.indexOf(`art === '${art}'`);
	if (start < 0) throw new Error(`No drawing for ${art}`);
	const next = source.indexOf("{:else if art === '", start + 1);
	const end = next < 0 ? source.indexOf('{/if}\n\n<style>', start) : next;
	return source.slice(start, end);
}

describe('storyPhases', () => {
	it('shows before then after on the screen of the story', () => {
		expect(storyPhases('large', false)).toEqual(['before', 'after']);
	});

	it('shows after alone, still, in the story so far', () => {
		expect(storyPhases('small', false)).toEqual(['after']);
	});

	it('shows after at once in calm motion', () => {
		expect(storyPhases('large', true)).toEqual(['after']);
		expect(storyPhases('small', true)).toEqual(['after']);
	});
});

describe('isMotionReduced', () => {
	it('follows the system when the child chose nothing', () => {
		expect(isMotionReduced(rootWith(null), true)).toBe(true);
		expect(isMotionReduced(rootWith(null), false)).toBe(false);
	});

	it('lets the setting of the child win over the system', () => {
		expect(isMotionReduced(rootWith('reduced'), false)).toBe(true);
		expect(isMotionReduced(rootWith('full'), true)).toBe(false);
	});
});

describe('the two states of every story picture', () => {
	for (const [group, arts] of Object.entries(STORY_ART_GROUPS) as [
		StoryArtGroup,
		readonly string[]
	][]) {
		const source = readFileSync(new URL(`./art/${DRAWING_FILES[group]}`, import.meta.url), 'utf8');
		for (const art of arts) {
			// The drawn result is compared in e2e/story.spec.ts; here, each picture has its own change.
			it(`draws something that changes between before and after in ${art}`, () => {
				if (group === 'post') {
					// The last world adds its paper, in the after only, to a picture of an earlier world.
					expect(source).toContain(`'${art}': {`);
					expect(source).toContain('{#if after}');
					return;
				}
				expect(branchOf(source, art)).toMatch(/\bafter\b/);
			});
		}
	}
});
