import { AGE_BANDS } from './banks';
import { lessonIds } from './definition';
import type { AgeBand, ProgressionDefinition, WordLevel } from './types';

/**
 * How hard the words and phrases of the banks may be, by age group and by how far the child is:
 * data, never constants in the code.
 */
export interface WordLimitRules {
	/** Highest level ever allowed, and the one of a child whose age group has no steps. */
	readonly maxWordLevel: WordLevel;
	/**
	 * For an age group, the highest level in each world of the progression, in their order; the
	 * last one holds for the worlds after it. Absent for a group: `maxWordLevel` everywhere.
	 */
	readonly wordLevels?: Readonly<Partial<Record<AgeBand, readonly WordLevel[]>>>;
	/** Short words only at the beginning. Absent: no limit of length. */
	readonly shortWords?: ShortWordRules;
}

export interface ShortWordRules {
	/** Number of the first lesson (counted from 1) whose words are no longer limited. */
	readonly beforeLesson: number;
	/** Most graphemes of a word in the lessons before it. */
	readonly maxLength: number;
}

/** What an exercise of one lesson may take from the banks. */
export interface WordLimits {
	readonly maxLevel: WordLevel;
	/** Absent: no limit. */
	readonly maxWordLength?: number;
}

const LEVELS: readonly WordLevel[] = [1, 2, 3];

function fail(path: string, message: string): never {
	throw new Error(`${path}: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseLevel(value: unknown, path: string): WordLevel {
	const level = LEVELS.find((candidate) => candidate === value);
	if (level === undefined) fail(path, `expected one of ${LEVELS.join(', ')}`);
	return level;
}

function parsePositiveInteger(value: unknown, path: string): number {
	if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
		fail(path, 'expected an integer of at least 1');
	}
	return value;
}

/** Reads `maxWordLevel`, `wordLevels` and `shortWords` of the rules of play; `path` names them. */
export function parseWordLimitRules(data: Record<string, unknown>, path: string): WordLimitRules {
	const maxWordLevel = parseLevel(data['maxWordLevel'], `${path}.maxWordLevel`);

	let wordLevels: Partial<Record<AgeBand, WordLevel[]>> | undefined;
	const rawLevels = data['wordLevels'];
	if (rawLevels !== undefined) {
		if (!isRecord(rawLevels)) fail(`${path}.wordLevels`, 'expected an object');
		wordLevels = {};
		for (const [name, raw] of Object.entries(rawLevels)) {
			const here = `${path}.wordLevels.${name}`;
			const band = AGE_BANDS.find((candidate) => candidate === name);
			if (band === undefined) fail(here, `expected one of ${AGE_BANDS.join(', ')}`);
			if (!Array.isArray(raw) || raw.length === 0) fail(here, 'expected a non-empty array');
			const steps = (raw as unknown[]).map((level, index) => {
				const step = parseLevel(level, `${here}[${index}]`);
				if (step > maxWordLevel) fail(`${here}[${index}]`, `expected at most ${maxWordLevel}`);
				return step;
			});
			steps.forEach((step, index) => {
				const previous = steps[index - 1];
				if (previous !== undefined && step < previous) {
					fail(`${here}[${index}]`, 'expected levels that never go down');
				}
			});
			wordLevels[band] = steps;
		}
	}

	let shortWords: ShortWordRules | undefined;
	const rawShort = data['shortWords'];
	if (rawShort !== undefined) {
		if (!isRecord(rawShort)) fail(`${path}.shortWords`, 'expected an object');
		for (const name of Object.keys(rawShort)) {
			if (name !== 'beforeLesson' && name !== 'maxLength') {
				fail(`${path}.shortWords.${name}`, 'unknown property');
			}
		}
		shortWords = {
			beforeLesson: parsePositiveInteger(
				rawShort['beforeLesson'],
				`${path}.shortWords.beforeLesson`
			),
			maxLength: parsePositiveInteger(rawShort['maxLength'], `${path}.shortWords.maxLength`)
		};
	}

	return {
		maxWordLevel,
		...(wordLevels === undefined ? {} : { wordLevels }),
		...(shortWords === undefined ? {} : { shortWords })
	};
}

/**
 * The level and the length of the words of a lesson for a child of this age group: the level
 * follows the world of the lesson, the length its number. Without an age group, or for a lesson
 * the progression does not have, only the ceiling `maxWordLevel` holds.
 */
export function wordLimits(
	rules: WordLimitRules,
	progression: ProgressionDefinition,
	lessonId: string,
	ageBand?: AgeBand
): WordLimits {
	const worldIndex = progression.worlds.findIndex((world) =>
		world.lessons.some((lesson) => lesson.id === lessonId)
	);
	const steps = ageBand === undefined ? undefined : rules.wordLevels?.[ageBand];
	const maxLevel =
		steps === undefined || steps.length === 0 || worldIndex < 0
			? rules.maxWordLevel
			: (steps[Math.min(worldIndex, steps.length - 1)] ?? rules.maxWordLevel);
	const number = lessonIds(progression).indexOf(lessonId) + 1;
	const { shortWords } = rules;
	return shortWords !== undefined && number >= 1 && number < shortWords.beforeLesson
		? { maxLevel, maxWordLength: shortWords.maxLength }
		: { maxLevel };
}
