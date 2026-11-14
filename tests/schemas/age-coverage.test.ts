import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ageCoverageIssues, parseAgeCoverageRules } from '$lib/engine/progression/age-coverage';
import {
	AGE_BANDS,
	parsePhraseBank,
	parseTextBank,
	parseWordBank
} from '$lib/engine/progression/banks';
import { lessonIds, parseProgression } from '$lib/engine/progression/definition';
import type { AgeBand } from '$lib/engine/progression/types';
import { wordLimits } from '$lib/engine/progression/word-limits';
import { PLAY_RULES } from '../../src/routes/jouer/play-rules';

/**
 * Content by age group (ADR-057, proposal 15): the marks of the banks never leave a lesson short
 * of words, phrases or texts for one of the groups.
 */

function readJson(path: string): unknown {
	return JSON.parse(readFileSync(path, 'utf8'));
}

const rules = parseAgeCoverageRules(readJson('content/common/age-coverage.json'));
const progression = parseProgression(readJson('content/fr/progression/azerty-decouverte.json'));
const banks = {
	words: parseWordBank(readJson('content/fr/words/base.json')),
	phrases: parsePhraseBank(readJson('content/fr/phrases/base.json')),
	texts: parseTextBank(readJson('content/fr/texts/base.json')),
	maxLevel: PLAY_RULES.maxWordLevel
};
/** As the game draws them: the level follows the world and the age group, short words first. */
const limited = {
	...banks,
	limits: (lessonId: string, ageBand: AgeBand) =>
		wordLimits(PLAY_RULES, progression, lessonId, ageBand)
};

describe('content by age group', () => {
	it('keeps enough words, phrases and texts in every lesson for every age group', () => {
		expect(ageCoverageIssues(progression, banks, rules)).toEqual([]);
	});

	it('still keeps enough of them at the level and the length of each lesson (audit P-16)', () => {
		expect(ageCoverageIssues(progression, limited, rules)).toEqual([]);
	});

	it('gives the youngest easier words for longer than the oldest, and never harder ones', () => {
		const ids = lessonIds(progression);
		const levels = (band: AgeBand) =>
			ids.map((id) => wordLimits(PLAY_RULES, progression, id, band).maxLevel);
		const young = levels('8-9');
		const old = levels('10-12');
		young.forEach((level, index) => expect(level).toBeLessThanOrEqual(old[index] ?? 0));
		expect(young.filter((level) => level === 1).length).toBeGreaterThan(
			old.filter((level) => level === 1).length
		);
		// 8-9: level 1 up to the end of the second world, level 3 from the fourth one.
		const worldOf = (id: string) =>
			progression.worlds.findIndex((world) => world.lessons.some((lesson) => lesson.id === id));
		ids.forEach((id, index) => {
			const world = worldOf(id);
			expect(young[index], id).toBe(world <= 1 ? 1 : world === 2 ? 2 : 3);
			expect(old[index], id).toBe(world === 0 ? 1 : world === 1 ? 2 : 3);
		});
	});

	it('keeps the words short before the twelfth lesson', () => {
		const ids = lessonIds(progression);
		ids.forEach((id, index) => {
			const { maxWordLength } = wordLimits(PLAY_RULES, progression, id, '8-9');
			expect(maxWordLength, id).toBe(index + 1 < 12 ? 7 : undefined);
		});
	});

	it.each(AGE_BANDS)('marks some words and phrases for the %s year olds only', (band) => {
		const only = (entry: { readonly ages?: readonly string[] }) =>
			entry.ages !== undefined && entry.ages.length === 1 && entry.ages[0] === band;
		expect(banks.words.words.some(only)).toBe(true);
		expect(banks.phrases.phrases.some(only)).toBe(true);
	});

	it('leaves the story phrases to every age group, like the rest of the story', () => {
		const marked = banks.phrases.phrases.filter(
			(phrase) => phrase.lessonId !== undefined && phrase.ages !== undefined
		);
		expect(marked.map((phrase) => phrase.text)).toEqual([]);
	});
});
