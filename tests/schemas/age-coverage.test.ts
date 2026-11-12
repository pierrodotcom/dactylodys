import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ageCoverageIssues, parseAgeCoverageRules } from '$lib/engine/progression/age-coverage';
import {
	AGE_BANDS,
	parsePhraseBank,
	parseTextBank,
	parseWordBank
} from '$lib/engine/progression/banks';
import { parseProgression } from '$lib/engine/progression/definition';
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

describe('content by age group', () => {
	it('keeps enough words, phrases and texts in every lesson for every age group', () => {
		expect(ageCoverageIssues(progression, banks, rules)).toEqual([]);
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
