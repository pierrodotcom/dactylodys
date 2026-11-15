import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { GhostRun, PacePoint } from '$lib/engine/ghost/types';
import type { ProgressionRules } from '$lib/engine/progression/types';
import type { SessionMetrics } from '$lib/engine/types';
import type { GameOutcome } from '$lib/games/types';
import { createProfile, parseProfile, withGhost } from '$lib/state/profile';
import {
	evaluationOrNone,
	recordLessonOutcome,
	RESULT_RULES,
	resultActions,
	resultPlan,
	resultSentence,
	resultSteps,
	starsOrNone,
	type PlayFacts,
	type ResultPlan
} from './lesson-outcome';

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
			recent: [{ attempts: 10, errors: 0, latencyMs: 300 }]
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
				{ attempts: 10, errors: 0, latencyMs: 300 },
				{ attempts: 10, errors: 0, latencyMs: 300 }
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

describe('resultSteps', () => {
	it('shows each reward alone, then the question of the name, then the stars and what comes next', () => {
		expect(resultSteps(1, true)).toEqual([
			{ kind: 'reward', index: 0 },
			{ kind: 'name' },
			{ kind: 'result' }
		]);
		expect(resultSteps(2, false)).toEqual([
			{ kind: 'reward', index: 0 },
			{ kind: 'reward', index: 1 },
			{ kind: 'result' }
		]);
		expect(resultSteps(0, true)).toEqual([{ kind: 'name' }, { kind: 'result' }]);
	});

	it('adds no step when there is nothing to show', () => {
		expect(resultSteps(0, false)).toEqual([{ kind: 'result' }]);
	});

	it('always ends with the result, once, after everything that was won', () => {
		fc.assert(
			fc.property(fc.integer({ min: 0, max: 6 }), fc.boolean(), (rewards, askName) => {
				const steps = resultSteps(rewards, askName);
				expect(steps.at(-1)).toEqual({ kind: 'result' });
				expect(steps.filter((step) => step.kind === 'result')).toHaveLength(1);
				expect(steps.filter((step) => step.kind === 'reward')).toHaveLength(rewards);
				expect(steps.filter((step) => step.kind === 'name')).toHaveLength(askName ? 1 : 0);
				expect(steps).toHaveLength(rewards + (askName ? 1 : 0) + 1);
			})
		);
	});
});

const PASSED_PLAY: PlayFacts = {
	passed: true,
	close: false,
	hasOpenNext: true,
	suggestBreak: false,
	tameKeys: [],
	worldDone: false,
	race: null,
	almost: false,
	perfect: false
};

const FACTS = fc.record({
	passed: fc.boolean(),
	close: fc.boolean(),
	hasOpenNext: fc.boolean(),
	suggestBreak: fc.boolean(),
	tameKeys: fc.subarray(['v', 'b']),
	worldDone: fc.boolean(),
	race: fc.constantFrom(null, 'child' as const, 'ghost' as const),
	almost: fc.boolean(),
	perfect: fc.boolean()
});

describe('resultPlan', () => {
	it('proposes the next lesson once the new keys are tamed', () => {
		expect(resultPlan(PASSED_PLAY)).toEqual({ primary: 'next', tame: [], retry: null });
	});

	it('proposes one more play to tame the new keys, with the next lesson still there', () => {
		const plan = resultPlan({ ...PASSED_PLAY, tameKeys: ['v', 'b'] });

		expect(plan).toEqual({ primary: 'replay', tame: ['v', 'b'], retry: null });
		expect(resultActions(plan, PASSED_PLAY)).toEqual(['replay', 'next']);
	});

	it('never proposes to tame keys after a play under the threshold', () => {
		const plan = resultPlan({ ...PASSED_PLAY, passed: false, hasOpenNext: false, tameKeys: ['v'] });

		expect(plan).toEqual({ primary: 'replay', tame: [], retry: 'far' });
	});

	it('lets the break proposed come first, the other ways still there', () => {
		const facts = { ...PASSED_PLAY, suggestBreak: true, tameKeys: ['v'] };
		const plan = resultPlan(facts);

		expect(plan).toEqual({ primary: 'break', tame: [], retry: null });
		expect(resultActions(plan, facts)).toEqual(['break', 'next', 'replay']);
	});

	it('says how close a play under the threshold came, when the next lesson stays closed', () => {
		const failed = { ...PASSED_PLAY, passed: false, hasOpenNext: false };

		expect(resultPlan({ ...failed, close: true }).retry).toBe('close');
		expect(resultPlan(failed).retry).toBe('far');
		// A lesson passed before: the next one is open, nothing to say of the threshold.
		expect(resultPlan({ ...failed, hasOpenNext: true }).retry).toBeNull();
	});

	it('never locks anything: the next lesson is offered whenever it is open, and the replay always', () => {
		fc.assert(
			fc.property(FACTS, (facts) => {
				const plan = resultPlan(facts);
				const actions = resultActions(plan, facts);
				expect(actions[0]).toBe(plan.primary);
				expect(new Set(actions).size).toBe(actions.length);
				expect(actions.includes('next')).toBe(facts.hasOpenNext);
				expect(actions.includes('replay')).toBe(true);
				expect(actions.includes('break')).toBe(facts.suggestBreak);
			})
		);
	});

	it('names keys to tame only after a play that opened the next lesson, and only those given', () => {
		fc.assert(
			fc.property(FACTS, (facts) => {
				const plan = resultPlan(facts);
				if (plan.tame.length > 0) {
					expect(facts.passed).toBe(true);
					expect(facts.suggestBreak).toBe(false);
					expect(plan.tame).toEqual(facts.tameKeys);
					expect(plan.primary).toBe('replay');
				}
				if (!facts.passed) expect(plan.tame).toEqual([]);
				expect(plan.retry !== null).toBe(!facts.passed && !facts.hasOpenNext);
			})
		);
	});
});

describe('resultSentence', () => {
	const plan = (facts: PlayFacts): ResultPlan => resultPlan(facts);

	it('says one sentence: how close a play under the threshold came first', () => {
		const failed = { ...PASSED_PLAY, passed: false, hasOpenNext: false, almost: true };

		expect(resultSentence(plan({ ...failed, close: true }), failed)).toBe('retry-close');
		expect(resultSentence(plan(failed), { ...failed, worldDone: true })).toBe('retry-far');
	});

	it('then the end of the worlds, the race, the star nearly won, a play without a mistake', () => {
		const passedPlan = plan(PASSED_PLAY);
		const all = { ...PASSED_PLAY, worldDone: true, race: 'child' as const, almost: true };

		expect(resultSentence(passedPlan, all)).toBe('world-done');
		expect(resultSentence(passedPlan, { ...all, worldDone: false })).toBe('race-child');
		expect(resultSentence(passedPlan, { ...PASSED_PLAY, race: 'ghost' })).toBe('race-ghost');
		expect(resultSentence(passedPlan, { ...PASSED_PLAY, almost: true })).toBe('almost');
		expect(resultSentence(passedPlan, { ...PASSED_PLAY, perfect: true })).toBe('perfect');
		expect(resultSentence(passedPlan, PASSED_PLAY)).toBe('note');
	});
});

describe('RESULT_RULES', () => {
	it('are read from the rules of the result shipped with the game', () => {
		expect(RESULT_RULES.consolidation.maxKeys).toBeGreaterThanOrEqual(1);
		expect(RESULT_RULES.support.afterFailedPlays).toBeGreaterThanOrEqual(1);
	});
});

describe('starsOrNone', () => {
	it('gives the stars of the play, as its recording would', () => {
		expect(starsOrNone(RULES, outcome(95).metrics)).toBe(2);
		expect(starsOrNone(RULES, outcome(100).metrics)).toBe(3);
		expect(starsOrNone(RULES, outcome(60).metrics)).toBe(0);
	});

	it('gives none, without failing, when the stars cannot be told', () => {
		const broken = { ...RULES, starThresholds: null } as unknown as ProgressionRules;
		expect(starsOrNone(broken, outcome(95).metrics)).toBe(0);
		expect(evaluationOrNone(broken, outcome(95).metrics)).toEqual({
			stars: 0,
			unlocksNext: false
		});
	});

	it('says whether the play opened the next lesson, as its recording would', () => {
		expect(evaluationOrNone(RULES, outcome(95).metrics)).toEqual({ stars: 2, unlocksNext: true });
		expect(evaluationOrNone(RULES, outcome(60).metrics)).toEqual({ stars: 0, unlocksNext: false });
	});
});
