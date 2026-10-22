import { describe, expect, it } from 'vitest';
import type { GhostRun } from '$lib/engine/ghost/types';
import type { ProgressionRules } from '$lib/engine/progression/types';
import { createProfile, withGhost, withProgress } from '$lib/state/profile';
import type { Profile } from '$lib/state/types';
import { ghostGreetingFor, raceGhostFor } from './race';

const RULES: ProgressionRules = {
	unlockAccuracy: 80,
	starThresholds: [80, 90, 97],
	newCharWeight: 0.5,
	weakCharBoost: 0,
	themeBoost: 0,
	newCharMinCount: 0,
	recentCharWindow: 30
};
const LESSON = 'fr.lesson.a';
const RUN: GhostRun = {
	recordedAt: 5,
	charCount: 8,
	activeMs: 4000,
	points: [
		{ correctChars: 4, activeMs: 1800 },
		{ correctChars: 8, activeMs: 4000 }
	]
};

function played(bestAccuracy: number, attempts = 1): Profile {
	const profile = createProfile({ id: 'p', name: 'Mini', now: 0, platform: 'pc' });
	return withProgress(profile, {
		...profile.progress,
		lessons: { [LESSON]: { bestAccuracy, stars: 1, attempts, lastPlayedAt: 1 } }
	});
}

describe('raceGhostFor', () => {
	it('offers the kept pace of a passed lesson, slowed down', () => {
		expect(raceGhostFor(withGhost(played(90), LESSON, RUN), RULES, LESSON, 0.8)).toEqual({
			...RUN,
			activeMs: 5000,
			points: [
				{ correctChars: 4, activeMs: 2250 },
				{ correctChars: 8, activeMs: 5000 }
			]
		});
	});

	it('offers nothing for a lesson not passed or without a kept pace', () => {
		expect(raceGhostFor(withGhost(played(60), LESSON, RUN), RULES, LESSON, 0.8)).toBeNull();
		expect(raceGhostFor(played(90), RULES, LESSON, 0.8)).toBeNull();
		expect(raceGhostFor(withGhost(played(90), LESSON, RUN), RULES, 'toString', 0.8)).toBeNull();
	});
});

describe('ghostGreetingFor', () => {
	it('follows the plays of the lesson', () => {
		expect(ghostGreetingFor(played(90, 3), LESSON)).toBe(3);
		expect(ghostGreetingFor(played(90, 3), 'fr.lesson.other')).toBe(0);
	});
});
