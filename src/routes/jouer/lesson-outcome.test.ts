import { describe, expect, it } from 'vitest';
import type { GhostRun, PacePoint } from '$lib/engine/ghost/types';
import type { ProgressionRules } from '$lib/engine/progression/types';
import type { SessionMetrics } from '$lib/engine/types';
import type { GameOutcome } from '$lib/games/types';
import { createProfile, parseProfile, withGhost } from '$lib/state/profile';
import { recordLessonOutcome } from './lesson-outcome';

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
const OTHER_LESSON = 'fr.lesson.b';
const NOW = 1_700_000_000_000;
const PACE: readonly PacePoint[] = [
	{ correctChars: 4, activeMs: 1200.4 },
	{ correctChars: 10, activeMs: 3000 }
];
const EARLIER_RUN: GhostRun = {
	recordedAt: 5,
	charCount: 8,
	activeMs: 4000,
	points: [{ correctChars: 8, activeMs: 4000 }]
};

function outcome(accuracy: number, pace: readonly PacePoint[] = PACE): GameOutcome {
	const metrics: SessionMetrics = {
		elapsedMs: 3000,
		totalKeystrokes: 10,
		correctKeystrokes: 10,
		errorCount: 0,
		accuracy,
		correctCharsPerMinute: 200,
		wordsPerMinute: 40,
		perChar: { f: { attempts: 10, errors: 0, meanLatencyMs: 300 } }
	};
	return { metrics, pace };
}

function newProfile() {
	return createProfile({ id: 'p', name: 'Mini', now: 0, platform: 'pc' });
}

describe('recordLessonOutcome', () => {
	it('adds the play to the progress and says how it went', () => {
		const recorded = recordLessonOutcome(newProfile(), RULES, LESSON, outcome(95), NOW);

		expect(recorded.evaluation).toEqual({ stars: 2, unlocksNext: true });
		expect(recorded.profile.progress.lessons[LESSON]).toEqual({
			bestAccuracy: 95,
			stars: 2,
			attempts: 1,
			lastPlayedAt: NOW
		});
		expect(recorded.profile.progress.chars['f']).toEqual({
			attempts: 10,
			errors: 0,
			recent: [{ attempts: 10, errors: 0 }]
		});
	});

	it('forgets the oldest plays of a character with the window of the rules it is given', () => {
		const narrow: ProgressionRules = { ...RULES, recentCharWindow: 15 };
		let profile = newProfile();
		for (let play = 0; play < 3; play++) {
			profile = recordLessonOutcome(profile, narrow, LESSON, outcome(95), NOW + play).profile;
		}

		expect(profile.progress.chars['f']).toEqual({
			attempts: 30,
			errors: 0,
			recent: [
				{ attempts: 10, errors: 0 },
				{ attempts: 10, errors: 0 }
			]
		});
	});

	it('keeps the pace of a passed lesson to race against next time', () => {
		const { profile } = recordLessonOutcome(newProfile(), RULES, LESSON, outcome(95), NOW);

		expect(profile.ghosts).toEqual({
			[LESSON]: {
				recordedAt: NOW,
				charCount: 10,
				activeMs: 3000,
				points: [
					{ correctChars: 4, activeMs: 1200 },
					{ correctChars: 10, activeMs: 3000 }
				]
			}
		});
	});

	it('replaces the pace kept from an earlier play of the lesson', () => {
		const before = withGhost(
			withGhost(newProfile(), LESSON, EARLIER_RUN),
			OTHER_LESSON,
			EARLIER_RUN
		);

		const { profile } = recordLessonOutcome(before, RULES, LESSON, outcome(95), NOW);

		expect(profile.ghosts[LESSON]?.recordedAt).toBe(NOW);
		expect(profile.ghosts[OTHER_LESSON]).toEqual(EARLIER_RUN);
	});

	it('keeps no pace of a lesson that is not passed, and does not lose the earlier one', () => {
		const first = recordLessonOutcome(newProfile(), RULES, LESSON, outcome(60), NOW);
		expect(first.evaluation.unlocksNext).toBe(false);
		expect(first.profile.ghosts).toEqual({});

		const before = withGhost(newProfile(), LESSON, EARLIER_RUN);
		const second = recordLessonOutcome(before, RULES, LESSON, outcome(60), NOW);
		expect(second.profile.ghosts).toEqual({ [LESSON]: EARLIER_RUN });
		expect(second.profile.progress.lessons[LESSON]?.attempts).toBe(1);
	});

	it.each<[string, readonly PacePoint[]]>([
		['no pace', []],
		['a pace without time', [{ correctChars: 10, activeMs: 0 }]],
		['a pace that makes no sense', [{ correctChars: Number.NaN, activeMs: 100 }]]
	])('still records the progress of a passed lesson that comes with %s', (_label, pace) => {
		const before = withGhost(newProfile(), LESSON, EARLIER_RUN);

		const { profile } = recordLessonOutcome(before, RULES, LESSON, outcome(100, pace), NOW);

		expect(profile.progress.lessons[LESSON]?.stars).toBe(3);
		expect(profile.ghosts).toEqual({ [LESSON]: EARLIER_RUN });
	});

	it('gives a profile that can be stored, and leaves the one it was given alone', () => {
		const before = newProfile();
		const snapshot = structuredClone(before);

		const { profile } = recordLessonOutcome(before, RULES, LESSON, outcome(95), NOW);

		expect(parseProfile(JSON.parse(JSON.stringify(profile)))).toEqual(profile);
		expect(before).toEqual(snapshot);
	});
});
