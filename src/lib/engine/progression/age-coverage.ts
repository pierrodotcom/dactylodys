import { AGE_BANDS, lessonTexts, storyPhrases, usablePhrases, usableWords } from './banks';
import { learnedChars } from './definition';
import type {
	AgeBand,
	PhraseBank,
	ProgressionDefinition,
	TextBank,
	WordBank,
	WordLevel
} from './types';

/**
 * How many entries of the banks each lesson keeps, at least, for every age group (ADR-057,
 * proposal 15): data, never constants in the code. A lesson that has fewer than this for every
 * group together only has to keep what it has.
 */
export interface AgeCoverageRules {
	/** Words of the bank usable in a lesson whose mix asks for words. */
	readonly minWords: number;
	/** Phrases of the bank usable in a lesson whose mix asks for phrases. */
	readonly minPhrases: number;
	/** Story phrases of a lesson that has some. */
	readonly minStoryPhrases: number;
	/** Texts of a lesson that has some. */
	readonly minTexts: number;
}

/** The banks an exercise draws from, and the highest level it allows. */
export interface AgeCoverageBanks {
	readonly words?: WordBank;
	readonly phrases?: PhraseBank;
	readonly texts?: TextBank;
	readonly maxLevel?: WordLevel;
}

/** Entries of the banks a lesson can use for one age group, or for all of them (`ageBand` absent). */
export interface LessonEntryCounts {
	readonly words: number;
	readonly phrases: number;
	readonly storyPhrases: number;
	readonly texts: number;
}

const RULE_NAMES = ['minWords', 'minPhrases', 'minStoryPhrases', 'minTexts'] as const;

export function parseAgeCoverageRules(data: unknown): AgeCoverageRules {
	if (typeof data !== 'object' || data === null || Array.isArray(data)) {
		throw new Error('ageCoverage: expected an object');
	}
	const record = data as Record<string, unknown>;
	for (const name of Object.keys(record)) {
		if (name !== 'schemaVersion' && !(RULE_NAMES as readonly string[]).includes(name)) {
			throw new Error(`ageCoverage.${name}: unknown property`);
		}
	}
	if (record['schemaVersion'] !== 1) throw new Error('ageCoverage.schemaVersion: expected 1');
	const count = (name: (typeof RULE_NAMES)[number]): number => {
		const value = record[name];
		if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
			throw new Error(`ageCoverage.${name}: expected an integer of at least 1`);
		}
		return value;
	};
	return {
		minWords: count('minWords'),
		minPhrases: count('minPhrases'),
		minStoryPhrases: count('minStoryPhrases'),
		minTexts: count('minTexts')
	};
}

/** What a lesson can draw from the banks for this age group; absent: for every group together. */
export function lessonEntryCounts(
	progression: ProgressionDefinition,
	lessonId: string,
	banks: AgeCoverageBanks,
	ageBand?: AgeBand
): LessonEntryCounts {
	const learned = learnedChars(progression, lessonId);
	const options = { maxLevel: banks.maxLevel, ageBand };
	const level = banks.maxLevel ?? 3;
	return {
		words: banks.words === undefined ? 0 : usableWords(banks.words, learned, options).length,
		phrases:
			banks.phrases === undefined ? 0 : usablePhrases(banks.phrases, learned, options).length,
		storyPhrases:
			banks.phrases === undefined ? 0 : storyPhrases(banks.phrases, lessonId, ageBand).length,
		texts:
			banks.texts === undefined
				? 0
				: lessonTexts(banks.texts, lessonId, ageBand).filter((entry) => entry.level <= level).length
	};
}

/**
 * The lessons that lack entries for an age group: fewer than the rule asks, while every group
 * together has more. Empty when each lesson keeps enough for every group.
 */
export function ageCoverageIssues(
	progression: ProgressionDefinition,
	banks: AgeCoverageBanks,
	rules: AgeCoverageRules
): string[] {
	const issues: string[] = [];
	for (const world of progression.worlds) {
		for (const lesson of world.lessons) {
			const all = lessonEntryCounts(progression, lesson.id, banks);
			const needed: Record<keyof LessonEntryCounts, number> = {
				words: lesson.mix.words > 0 ? Math.min(rules.minWords, all.words) : 0,
				phrases: lesson.mix.phrases > 0 ? Math.min(rules.minPhrases, all.phrases) : 0,
				storyPhrases: Math.min(rules.minStoryPhrases, all.storyPhrases),
				texts: Math.min(rules.minTexts, all.texts)
			};
			for (const band of AGE_BANDS) {
				const counts = lessonEntryCounts(progression, lesson.id, banks, band);
				for (const kind of Object.keys(needed) as (keyof LessonEntryCounts)[]) {
					if (counts[kind] < needed[kind]) {
						issues.push(
							`${lesson.id}, ${band}: ${counts[kind]} ${kind} (at least ${needed[kind]})`
						);
					}
				}
			}
		}
	}
	return issues;
}
