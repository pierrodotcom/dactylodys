import { describe, expect, it } from 'vitest';
import { generateExercise } from '../../src/lib/engine/progression/exercise';
import { aidedContext } from '../../src/lib/engine/progression/support';
import { seededRng } from '../../src/lib/engine/progression/test-support';
import type { AgeBand } from '../../src/lib/engine/progression/types';
import { RESULT_RULES } from '../../src/routes/jouer/lesson-outcome';
import { contextOf, entries, PACES, progression, steady } from './exercise-length.support';

/**
 * An aided play (audit P-11), over the shipped content: the simplest words, never longer than the
 * lesson whatever the pace of the child, and a lesson of texts still ends with a text.
 */

const SEEDS = 10;
const AGE_BANDS: readonly AgeBand[] = ['8-9', '10-12'];
const LINE_BREAK = String.fromCharCode(10);
const { support } = RESULT_RULES;

describe('an aided play of each lesson', () => {
	it.each(entries.map(({ world, lesson }) => [lesson.id, world, lesson] as const))(
		'%s keeps the length of the lesson and its text',
		(_id, world, lesson) => {
			for (const ageBand of AGE_BANDS) {
				for (let seed = 0; seed < SEEDS; seed++) {
					const draw = (paces?: readonly number[]) =>
						generateExercise(
							progression,
							lesson.id,
							seededRng(seed),
							aidedContext(contextOf(world, lesson, ageBand, seed, paces), support)
						);
					const aided = draw(steady(PACES.fast));
					const plain = generateExercise(
						progression,
						lesson.id,
						seededRng(seed),
						contextOf(world, lesson, ageBand, seed)
					);
					const told = `${ageBand} #${seed}: ${aided.groups.join(' | ')}`;

					// The pace of a fast child is not read: the exercise of a beginner, never one that grew.
					expect(aided, told).toEqual(draw());
					// A lesson of texts keeps its text: the simplest level has one for every child.
					const hasText = (groups: readonly string[]) =>
						groups.some((group) => group.includes(LINE_BREAK));
					if (hasText(plain.groups)) expect(hasText(aided.groups), told).toBe(true);
				}
			}
		}
	);
});
