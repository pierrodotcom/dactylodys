import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseProgression } from '../engine/progression/definition';
import type { ProgressionDefinition } from '../engine/progression/types';
import type { StoryDefinition } from '../engine/story/types';
import { voiceKey } from './voice-key';
import { parseVoiceOrigin, voiceOrigin, voiceTexts } from './voice-texts';

const shipped = parseProgression(
	JSON.parse(readFileSync('content/fr/progression/azerty-decouverte.json', 'utf8'))
);

function lesson(id: string, intro: string) {
	return { ...shipped.worlds[0]!.lessons[0]!, id, intro };
}

/** Two worlds of two and one lessons; only what `voiceTexts` reads matters. */
function progression(): ProgressionDefinition {
	const world = shipped.worlds[0]!;
	return {
		...shipped,
		worlds: [
			{
				...world,
				id: 'fr.world.un',
				lessons: [lesson('fr.lesson.a', 'Intro A.'), lesson('fr.lesson.b', 'Intro B.')]
			},
			{ ...world, id: 'fr.world.deux', lessons: [lesson('fr.lesson.c', 'Intro C.')] }
		]
	};
}

function story(): StoryDefinition {
	return {
		schemaVersion: 1,
		id: 'fr.story.test',
		locale: 'fr',
		progressionId: shipped.id,
		worlds: [
			{
				worldId: 'fr.world.un',
				opening: 'Ouverture un.',
				ending: 'Fin un.',
				lessons: [
					{ lessonId: 'fr.lesson.a', line: 'Ligne A.' },
					{ lessonId: 'fr.lesson.b', line: 'Ligne B.' }
				]
			},
			{
				worldId: 'fr.world.deux',
				opening: 'Ouverture deux.',
				ending: 'Fin deux.',
				lessons: [{ lessonId: 'fr.lesson.c', line: 'Ligne C.' }]
			}
		]
	};
}

describe('voiceTexts', () => {
	it('lists the introduction of every lesson, in the order of the course', () => {
		const texts = voiceTexts(progression());

		expect(texts.map((item) => item.text)).toEqual(['Intro A.', 'Intro B.', 'Intro C.']);
		expect(texts.map((item) => item.origin)).toEqual([
			'fr.lesson.a#intro',
			'fr.lesson.b#intro',
			'fr.lesson.c#intro'
		]);
	});

	it('gives each text the key of the voice', () => {
		for (const item of voiceTexts(progression(), story())) {
			expect(item.key).toBe(voiceKey(item.text));
		}
	});

	it('weaves the story into the course: opening, then each lesson and its line, then ending', () => {
		const texts = voiceTexts(progression(), story());

		expect(texts.map((item) => item.text)).toEqual([
			'Ouverture un.',
			'Intro A.',
			'Ligne A.',
			'Intro B.',
			'Ligne B.',
			'Fin un.',
			'Ouverture deux.',
			'Intro C.',
			'Ligne C.',
			'Fin deux.'
		]);
		expect(texts.map((item) => item.origin)).toEqual([
			'fr.world.un#opening',
			'fr.lesson.a#intro',
			'fr.lesson.a#line',
			'fr.lesson.b#intro',
			'fr.lesson.b#line',
			'fr.world.un#ending',
			'fr.world.deux#opening',
			'fr.lesson.c#intro',
			'fr.lesson.c#line',
			'fr.world.deux#ending'
		]);
	});

	it('keeps a text said twice only once, where it first comes', () => {
		const repeated = progression();
		const twice = {
			...repeated,
			worlds: repeated.worlds.map((world) => ({
				...world,
				lessons: world.lessons.map((item) => ({ ...item, intro: 'Toujours pareil.' }))
			}))
		};

		expect(voiceTexts(twice)).toEqual([
			{ key: voiceKey('Toujours pareil.'), text: 'Toujours pareil.', origin: 'fr.lesson.a#intro' }
		]);
	});

	it('still lists the texts of a story that the progression does not follow', () => {
		const base = story();
		const stray: StoryDefinition = {
			...base,
			worlds: [
				...base.worlds,
				{ worldId: 'fr.world.ailleurs', opening: 'Ailleurs.', ending: 'Retour.', lessons: [] }
			]
		};

		const texts = voiceTexts(progression(), stray).map((item) => item.text);

		expect(texts.slice(-2)).toEqual(['Ailleurs.', 'Retour.']);
		expect(new Set(texts).size).toBe(texts.length);
	});

	it('leaves out a text with nothing to say', () => {
		const blank = progression();
		const texts = voiceTexts({
			...blank,
			worlds: [{ ...blank.worlds[0]!, lessons: [lesson('fr.lesson.a', '   ')] }]
		});

		expect(texts).toEqual([]);
	});

	it('finds one text per lesson of the shipped progression, without two identical keys', () => {
		const texts = voiceTexts(shipped);
		const lessonCount = shipped.worlds.reduce((total, world) => total + world.lessons.length, 0);

		expect(texts).toHaveLength(lessonCount);
		expect(new Set(texts.map((item) => item.key)).size).toBe(lessonCount);
	});
});

describe('voice origin', () => {
	it('reads back what it wrote', () => {
		expect(parseVoiceOrigin(voiceOrigin('fr.lesson.a', 'intro'))).toEqual({
			id: 'fr.lesson.a',
			kind: 'intro'
		});
	});

	it('gives null for anything else', () => {
		expect(parseVoiceOrigin('fr.lesson.a')).toBeNull();
		expect(parseVoiceOrigin('fr.lesson.a#song')).toBeNull();
		expect(parseVoiceOrigin('#intro')).toBeNull();
	});
});
