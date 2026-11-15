import { describe, it } from 'vitest';
import { checkPlaysThatLast, entries, LESSON_TIMEOUT_MS, PLAYS } from './exercise-length.support';

/** The plays that last of the 10-12 year olds, in a file of their own so that both run at once. */
describe('exercises that grow with the pace, 10-12 years old', () => {
	it.each(
		entries.map(({ world, lesson }, index) => [lesson.id, index + 1, world, lesson] as const)
	)(
		`%s (lesson %i) over ${PLAYS} plays and three paces`,
		(_id, number, world, lesson) => {
			checkPlaysThatLast('10-12', world, lesson, number);
		},
		LESSON_TIMEOUT_MS
	);
});
