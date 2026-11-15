import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { toGraphemes } from '../graphemes';
import { generateHelpExercise } from '../rewards/help-exercise';
import type { HelpQuestRules } from '../rewards/types';
import { lessonEntryCounts } from './age-coverage';
import {
	parsePhraseBank,
	parseTextBank,
	parseWordBank,
	typableTexts,
	validateTexts
} from './banks';
import { learnedChars, parseProgression } from './definition';
import { generateExercise } from './exercise';
import { emptyProgress } from './progress';
import { seededRng } from './test-support';
import type { ProgressState } from './types';

/*
 * A detour (ADR-075) brings characters that nothing on the way counts on: an exercise asks them
 * only of the child who passed the detour.
 */

const BEFORE = 'fr.lesson.before';
const DETOUR = 'fr.lesson.detour';
const AFTER = 'fr.lesson.after';

function lesson(id: string, newChars: string[], extra: Record<string, unknown> = {}) {
	return {
		id,
		title: id,
		intro: 'Intro.',
		newChars,
		words: [],
		mix: { drills: 0, words: 1, phrases: 1 },
		unlocks: [],
		groupCount: 6,
		targetLength: 30,
		groupLength: [3, 5],
		...extra
	};
}

const PROGRESSION = parseProgression({
	schemaVersion: 1,
	id: 'fr.progression.detours',
	locale: 'fr-FR',
	layoutIds: ['fr-fr-azerty-pc'],
	rules: {
		unlockAccuracy: 80,
		starThresholds: [80, 90, 97],
		newCharWeight: 0.6,
		weakCharBoost: 0,
		themeBoost: 0,
		newCharMinCount: 0,
		recentCharWindow: 30
	},
	worlds: [
		{
			id: 'fr.world.one',
			title: 'One',
			themeId: 'general',
			gameIds: ['hatching'],
			lessons: [
				lesson('fr.lesson.first', ['l', 'e', 't']),
				lesson(BEFORE, ['s', 'u', 'r', ' ']),
				lesson(DETOUR, ['î', 'û'], { optional: true })
			]
		},
		{
			id: 'fr.world.two',
			title: 'Two',
			themeId: 'general',
			gameIds: ['hatching'],
			lessons: [lesson(AFTER, ['\n'])]
		}
	]
});

const WORDS = parseWordBank({
	schemaVersion: 1,
	id: 'fr.words.detours',
	locale: 'fr-FR',
	sources: [{ name: 'Test', url: 'https://example.org', license: 'CC0' }],
	themes: [{ id: 'general', title: 'General' }],
	words: ['les', 'rue', 'tu', 'sel', 'île', 'sûr'].map((text) => ({
		text,
		themes: ['general'],
		level: 1,
		review: 'agent'
	}))
});

const PHRASES = parsePhraseBank({
	schemaVersion: 1,
	id: 'fr.phrases.detours',
	locale: 'fr-FR',
	phrases: ['tu es sur le sel', 'tu es sûr de tes rues'].map((text) => ({
		text,
		themes: [],
		level: 1,
		review: 'agent'
	}))
});

const TEXTS = parseTextBank({
	schemaVersion: 1,
	id: 'fr.texts.detours',
	locale: 'fr-FR',
	texts: [
		{
			id: 'fr.text.plain',
			lessonId: AFTER,
			lines: ['les rues', 'tu es'],
			level: 1,
			review: 'agent'
		},
		{
			id: 'fr.text.rare',
			lessonId: AFTER,
			lines: ['sur les îles', 'tu es sûr'],
			level: 1,
			review: 'agent'
		}
	]
});

const RARE = ['î', 'û'];

function passedLessons(...ids: string[]): ProgressState {
	const passed = { bestAccuracy: 90, stars: 2, attempts: 1, lastPlayedAt: 0 } as const;
	return { ...emptyProgress(), lessons: Object.fromEntries(ids.map((id) => [id, passed])) };
}

function typedIn(lessonId: string, progress: ProgressState | undefined, seed: number): string {
	const context = { words: WORDS, phrases: PHRASES, texts: TEXTS, progress };
	return generateExercise(PROGRESSION, lessonId, seededRng(seed), context).groups.join(' ');
}

describe('exercises and detours', () => {
	it('never asks what a detour brings of a child who did not pass it', () => {
		fc.assert(
			fc.property(fc.integer({ min: 0, max: 5000 }), (seed) => {
				for (const progress of [
					undefined,
					emptyProgress(),
					passedLessons('fr.lesson.first', BEFORE)
				]) {
					const typed = toGraphemes(typedIn(AFTER, progress, seed));
					expect(typed.filter((char) => RARE.includes(char))).toEqual([]);
				}
			})
		);
	});

	it('asks what a detour brought of the child who passed it, in the lessons after it', () => {
		const progress = passedLessons('fr.lesson.first', BEFORE, DETOUR);
		const typed = Array.from({ length: 40 }, (_, seed) => typedIn(AFTER, progress, seed)).join(' ');
		expect(typed).toContain('î');
		expect(typed).toContain('û');
		const known = new Set([...learnedChars(PROGRESSION, AFTER), ...RARE]);
		expect(toGraphemes(typed).filter((char) => !known.has(char))).toEqual([]);
	});

	it('does not ask it in a lesson that comes before the detour', () => {
		const progress = passedLessons('fr.lesson.first', BEFORE, DETOUR);
		const typed = Array.from({ length: 40 }, (_, seed) => typedIn(BEFORE, progress, seed)).join(
			' '
		);
		expect(toGraphemes(typed).filter((char) => RARE.includes(char))).toEqual([]);
	});

	it('asks it in the detour itself, passed or not', () => {
		const typed = Array.from({ length: 40 }, (_, seed) => typedIn(DETOUR, undefined, seed)).join(
			' '
		);
		expect(typed).toMatch(/[îû]/u);
	});

	it('ends a lesson with the texts the child can type: one more after the detour', () => {
		const ending = (progress: ProgressState, plays: number) => {
			const lessons = {
				...progress.lessons,
				[AFTER]: { bestAccuracy: 90, stars: 2, attempts: plays, lastPlayedAt: 0 } as const
			};
			const exercise = generateExercise(PROGRESSION, AFTER, seededRng(plays), {
				texts: TEXTS,
				progress: plays === 0 ? progress : { ...progress, lessons }
			});
			return exercise.groups.join('').includes('île') ? 'rare' : 'plain';
		};
		const without = passedLessons('fr.lesson.first', BEFORE);
		expect([0, 1, 2, 3].map((plays) => ending(without, plays))).toEqual(Array(4).fill('plain'));
		const withDetour = passedLessons('fr.lesson.first', BEFORE, DETOUR);
		expect([0, 1, 2, 3].map((plays) => ending(withDetour, plays))).toEqual([
			'plain',
			'rare',
			'plain',
			'rare'
		]);
	});
});

describe('banks and detours', () => {
	it('accepts a text written with what a detour before its lesson brings', () => {
		expect(validateTexts(TEXTS, PROGRESSION)).toEqual([]);
	});

	it('refuses a text written with a character no child knows at its lesson', () => {
		const bank = parseTextBank({
			schemaVersion: 1,
			id: 'fr.texts.unknown',
			locale: 'fr-FR',
			texts: [
				{
					id: 'fr.text.x',
					lessonId: AFTER,
					lines: ['le zèbre', 'tu es'],
					level: 1,
					review: 'agent'
				}
			]
		});
		expect(validateTexts(bank, PROGRESSION)).toHaveLength(1);
	});

	it('tells the texts every child can type from those that need a detour', () => {
		const forAll = typableTexts(TEXTS.texts, learnedChars(PROGRESSION, AFTER));
		expect(forAll.map((entry) => entry.id)).toEqual(['fr.text.plain']);
		expect(typableTexts(TEXTS.texts, [...learnedChars(PROGRESSION, AFTER), ...RARE])).toEqual(
			TEXTS.texts
		);
		expect(typableTexts(TEXTS.texts, [])).toEqual([]);
	});

	it('counts for a lesson the texts every child can be given only', () => {
		expect(lessonEntryCounts(PROGRESSION, AFTER, { texts: TEXTS }).texts).toBe(1);
	});
});

describe('help quest and detours', () => {
	const rules: HelpQuestRules = {
		schemaVersion: 1,
		minRecentAttempts: 5,
		maxErrorRate: 0.2,
		targetLength: 12,
		minCharCount: 3
	};
	const quest = { char: 'î', lessonId: DETOUR };

	it('helps on a key of a detour wherever the child who passed it is now', () => {
		const progress = passedLessons('fr.lesson.first', BEFORE, DETOUR, AFTER);
		const exercise = generateHelpExercise(PROGRESSION, quest, rules, seededRng(3), {
			words: WORDS,
			progress
		});
		const typed = exercise.groups.join('');
		expect(toGraphemes(typed).filter((char) => char === 'î').length).toBeGreaterThanOrEqual(3);
	});
});
