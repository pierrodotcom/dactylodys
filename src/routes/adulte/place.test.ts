import { describe, expect, it } from 'vitest';
import { applyLessonResult } from '$lib/engine/progression/progress';
import { LAYOUT_IDS } from '$lib/keyboard/layout-ids';
import { createProfile, withOpenedWorld, withProgress } from '$lib/state/profile';
import type { Profile } from '$lib/state/types';
import { progressionFor } from '../jouer/content';
import { openedWorlds, worldsToOpen } from './place';

const found = progressionFor(LAYOUT_IDS[0]);
if (!found) throw new Error('no progression for the first layout');
const progression = found;
const WORLD_IDS = progression.worlds.map((world) => world.id);

function child(): Profile {
	return createProfile({ id: 'kid', name: 'Kid', now: 1, platform: 'pc' });
}

/** The child with every lesson of the first world passed. */
function pastFirstWorld(): Profile {
	const profile = child();
	const lessons = progression.worlds[0]?.lessons ?? [];
	const progress = lessons.reduce(
		(current, lesson, index) =>
			applyLessonResult(
				current,
				{
					lessonId: lesson.id,
					metrics: {
						elapsedMs: 1000,
						totalKeystrokes: 10,
						correctKeystrokes: 10,
						errorCount: 0,
						accuracy: 100,
						correctCharsPerMinute: 60,
						wordsPerMinute: 12,
						perChar: {}
					},
					evaluation: { stars: 3, unlocksNext: true },
					completedAt: index
				},
				progression.rules
			),
		profile.progress
	);
	return withProgress(profile, progress);
}

describe('worldsToOpen', () => {
	it('offers every world but the first to a new child', () => {
		expect(worldsToOpen(progression, child()).map((world) => world.id)).toEqual(WORLD_IDS.slice(1));
	});

	it('no longer offers a world opened by the adult, nor one the child reached', () => {
		const third = WORLD_IDS[2] as string;
		const opened = withOpenedWorld(pastFirstWorld(), third);
		expect(worldsToOpen(progression, opened).map((world) => world.id)).toEqual(
			WORLD_IDS.slice(1).filter((id) => id !== third && id !== WORLD_IDS[1])
		);
	});
});

describe('openedWorlds', () => {
	it('lists the opened worlds in their order and leaves out unknown ones', () => {
		let profile = withOpenedWorld(child(), WORLD_IDS[3] as string);
		profile = withOpenedWorld(profile, 'fr.world.unknown');
		profile = withOpenedWorld(profile, WORLD_IDS[1] as string);
		expect(openedWorlds(progression, profile).map((world) => world.id)).toEqual([
			WORLD_IDS[3],
			WORLD_IDS[1]
		]);
	});
});
