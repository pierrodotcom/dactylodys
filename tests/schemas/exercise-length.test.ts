import { describe, expect, it } from 'vitest';
import { toGraphemes } from '../../src/lib/engine/graphemes';
import { toGhostRun } from '../../src/lib/engine/ghost/ghost';
import {
	ghostFinishMs,
	ghostShare,
	raceWinner,
	slowGhostRun
} from '../../src/lib/engine/ghost/race';
import type { PacePoint } from '../../src/lib/engine/ghost/types';
import { generateExercise } from '../../src/lib/engine/progression/exercise';
import { pacedTargetLength } from '../../src/lib/engine/progression/pace';
import { seededRng } from '../../src/lib/engine/progression/test-support';
import { exerciseCharCount } from '../../src/lib/games/shared/race';
import { PLAY_RULES } from '../../src/routes/jouer/play-rules';
import {
	checkPlaysThatLast,
	contextOf,
	entries,
	firstWhole,
	LESSON_TIMEOUT_MS,
	maxGroups,
	PACES,
	PLAYS,
	progression,
	rules,
	steady
} from './exercise-length.support';

/** The pace the ghost recorded, in correct characters per minute. */
const RECORDED_PACE = 40;
const MS_PER_MINUTE = 60_000;
/** Seeds of each lesson on which the ghost races a longer play. */
const GHOST_SEEDS = 5;

describe('the rules of plays that last', () => {
	it('aims at about two minutes of typing, 150 characters at most, on the last five plays', () => {
		expect(rules.targetMinutes).toBe(2);
		expect(rules.maxTargetLength).toBe(150);
		expect(rules.paceRecentPlays).toBe(5);
		expect(rules.paceMinPlays).toBe(3);
		expect(rules.wholePhraseMinCount).toBe(1);
		expect(maxGroups).toBeGreaterThanOrEqual(8);
		expect(firstWhole).toBeGreaterThan(0);
	});

	it('aims higher for a faster child, lesson by lesson, and never under the lesson', () => {
		for (const { lesson } of entries) {
			const aims = Object.values(PACES).map((pace) =>
				pacedTargetLength(rules, lesson, steady(pace))
			);
			expect(aims).toEqual([...aims].sort((a, b) => a - b));
			expect(aims[0]).toBeGreaterThanOrEqual(lesson.targetLength);
			expect(aims.at(-1)).toBeLessThanOrEqual(rules.maxTargetLength ?? 0);
		}
	});
});

describe('the ghost of a shorter play', () => {
	/** A run recorded at a steady pace over these groups, one point per group (`pacePoints`). */
	function recordedOver(groups: readonly string[]) {
		let correctChars = 0;
		const points: PacePoint[] = groups.map((group) => {
			correctChars += toGraphemes(group).length;
			return { correctChars, activeMs: (correctChars * MS_PER_MINUTE) / RECORDED_PACE };
		});
		const run = toGhostRun(points, 0);
		if (run === null) throw new Error('no run recorded');
		return slowGhostRun(run, PLAY_RULES.ghostPaceFactor);
	}

	it('races a play that grew at the pace it recorded, in characters per millisecond', () => {
		let raced = 0;
		for (const { world, lesson } of entries) {
			for (let seed = 0; seed < GHOST_SEEDS; seed++) {
				const draw = (paces?: readonly number[]) =>
					generateExercise(
						progression,
						lesson.id,
						seededRng(seed),
						contextOf(world, lesson, '8-9', seed, paces)
					);
				const short = draw().groups;
				const long = draw(steady(PACES.fast)).groups;
				const shortChars = exerciseCharCount(short);
				const longChars = exerciseCharCount(long);
				if (longChars === shortChars) continue;
				raced += 1;
				const ghost = recordedOver(short);
				const childMs = (longChars * MS_PER_MINUTE) / RECORDED_PACE;

				// The ghost takes as much longer as the play is longer: the same characters per
				// millisecond, slowed down as the rules say.
				const finish = ghostFinishMs(ghost, longChars, 1);
				expect(finish).toBeCloseTo(childMs / PLAY_RULES.ghostPaceFactor, -1);
				expect(finish / longChars).toBeCloseTo(ghostFinishMs(ghost, shortChars, 1) / shortChars, 6);
				// Half way through its time, it is half way through the longer play.
				expect(ghostShare(ghost, finish / 2, longChars, 1)).toBeCloseTo(0.5, 2);
				// A child who keeps the pace of the ghost arrives first; a child slower than it does not.
				expect(raceWinner(ghost, childMs, longChars, 1)).toBe('child');
				expect(raceWinner(ghost, finish * 1.05, longChars, 1)).toBe('ghost');
			}
		}
		expect(raced).toBeGreaterThan(0);
	});
});

describe('exercises that grow with the pace, 8-9 years old', () => {
	it.each(
		entries.map(({ world, lesson }, index) => [lesson.id, index + 1, world, lesson] as const)
	)(
		`%s (lesson %i) over ${PLAYS} plays and three paces`,
		(_id, number, world, lesson) => {
			checkPlaysThatLast('8-9', world, lesson, number);
		},
		LESSON_TIMEOUT_MS
	);
});
