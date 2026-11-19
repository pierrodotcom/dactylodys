import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { findLesson, parseProgression } from '../engine/progression/definition';
import type { LessonDefinition, ProgressionDefinition } from '../engine/progression/types';
import type { StoryDefinition } from '../engine/story/types';
import { voiceKey } from './voice-key';
import {
	inRecordingOrder,
	parseVoiceOrigin,
	voiceLocale,
	voiceOrigin,
	voiceTexts
} from './voice-texts';

const shipped = parseProgression(
	JSON.parse(readFileSync('content/fr/progression/azerty-decouverte.json', 'utf8'))
);

/** A lesson said in one sentence, without short ones: only its intro matters here. */
const PLAIN = findLesson(shipped, 'fr.lesson.message-t-rex')!;

function lesson(id: string, intro: string): LessonDefinition {
	return { ...PLAIN, id, intro };
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
				openingArt: 'un-opening',
				ending: 'Fin un.',
				endingArt: 'un-ending',
				lessons: [
					{ lessonId: 'fr.lesson.a', line: 'Ligne A.', art: 'line-a' },
					{ lessonId: 'fr.lesson.b', line: 'Ligne B.', art: 'line-b' }
				]
			},
			{
				worldId: 'fr.world.deux',
				opening: 'Ouverture deux.',
				openingArt: 'deux-opening',
				ending: 'Fin deux.',
				endingArt: 'deux-ending',
				lessons: [{ lessonId: 'fr.lesson.c', line: 'Ligne C.', art: 'line-c' }]
			}
		]
	};
}

describe('voiceTexts', () => {
	it('adds the reminders of the games after the content, once each', () => {
		const reminder = { id: 'game.look-reminder', text: 'Regarde l’écran.' };
		const texts = voiceTexts(progression(), undefined, [reminder, reminder]);

		expect(texts.at(-1)).toEqual({
			key: voiceKey(reminder.text),
			text: reminder.text,
			origin: 'game.look-reminder#reminder'
		});
		expect(texts.filter((item) => item.text === reminder.text)).toHaveLength(1);
		expect(parseVoiceOrigin('game.look-reminder#reminder')).toEqual({
			id: 'game.look-reminder',
			kind: 'reminder'
		});
	});

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
				{
					worldId: 'fr.world.ailleurs',
					opening: 'Ailleurs.',
					openingArt: 'ailleurs',
					ending: 'Retour.',
					endingArt: 'retour',
					lessons: []
				}
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

	it('finds every sentence of the instructions of the shipped progression, once each', () => {
		const texts = voiceTexts(shipped);
		const lessons = shipped.worlds.flatMap((world) => world.lessons);
		const sentences = lessons.flatMap((item) => [
			item.intro,
			...Object.values(item.introByPlatform ?? {}),
			...(item.steps ?? []).map((step) => step.text)
		]);

		expect(texts.map((item) => item.text).sort()).toEqual([...new Set(sentences)].sort());
		expect(new Set(texts.map((item) => item.key)).size).toBe(texts.length);
	});
});

describe('voiceTexts and the instruction said in short sentences (audit P-13)', () => {
	function stepped(): ProgressionDefinition {
		const base = progression();
		const [first, second] = base.worlds[0]!.lessons;
		return {
			...base,
			worlds: [
				{
					...base.worlds[0]!,
					lessons: [
						{
							...first!,
							introByPlatform: { mac: 'Intro A, Mac.' },
							steps: [
								{ char: 'f', text: 'F est à gauche.' },
								{ char: 'j', text: 'J est à droite.' }
							]
						},
						second!
					]
				},
				base.worlds[1]!
			]
		};
	}

	it('lists the short sentences of a lesson first, then its whole instruction as a fallback', () => {
		const texts = voiceTexts(stepped());

		expect(texts.slice(0, 5)).toEqual([
			{ key: voiceKey('F est à gauche.'), text: 'F est à gauche.', origin: 'fr.lesson.a#step' },
			{ key: voiceKey('J est à droite.'), text: 'J est à droite.', origin: 'fr.lesson.a#step' },
			{ key: voiceKey('Intro A.'), text: 'Intro A.', origin: 'fr.lesson.a#intro', fallback: true },
			{
				key: voiceKey('Intro A, Mac.'),
				text: 'Intro A, Mac.',
				origin: 'fr.lesson.a#intro-mac',
				fallback: true
			},
			{ key: voiceKey('Intro B.'), text: 'Intro B.', origin: 'fr.lesson.b#intro' }
		]);
	});

	it('lists the instruction of a platform of a lesson without short sentences as needed', () => {
		const base = progression();
		const lessons = base.worlds[0]!.lessons;
		const withMac: ProgressionDefinition = {
			...base,
			worlds: [
				{ ...base.worlds[0]!, lessons: [{ ...lessons[0]!, introByPlatform: { mac: 'Mac A.' } }] }
			]
		};

		expect(voiceTexts(withMac)).toEqual([
			{ key: voiceKey('Intro A.'), text: 'Intro A.', origin: 'fr.lesson.a#intro' },
			{ key: voiceKey('Mac A.'), text: 'Mac A.', origin: 'fr.lesson.a#intro-mac' }
		]);
		expect(parseVoiceOrigin('fr.lesson.a#intro-mac')).toEqual({
			id: 'fr.lesson.a',
			kind: 'intro-mac'
		});
	});

	it('records the whole instructions told in short sentences last, after the messages', () => {
		const texts = inRecordingOrder(
			voiceTexts(stepped(), story(), [], [{ id: 'game.dialogue', text: 'Floup ?' }])
		);
		const fallbacks = texts.filter((item) => item.fallback === true);

		expect(fallbacks.map((item) => item.text)).toEqual(['Intro A.', 'Intro A, Mac.']);
		expect(texts.slice(-2)).toEqual(fallbacks);
		expect(texts.at(-3)?.origin).toBe('game.dialogue#message');
	});
});

describe('voiceTexts and the messages of the interface (audit P-12)', () => {
	it('lists them after the reminders, once each, said where their place says', () => {
		const reminder = { id: 'game.look-reminder', text: 'Regarde.' };
		const asked = { id: 'game.dialogue', text: 'Que dit une chaussette ?' };
		const texts = voiceTexts(progression(), undefined, [reminder], [asked, asked]);

		expect(texts.slice(-2)).toEqual([
			{ key: voiceKey('Regarde.'), text: 'Regarde.', origin: 'game.look-reminder#reminder' },
			{
				key: voiceKey(asked.text),
				text: asked.text,
				origin: 'game.dialogue#message'
			}
		]);
		expect(parseVoiceOrigin('game.dialogue#message')).toEqual({
			id: 'game.dialogue',
			kind: 'message'
		});
	});

	it('records them after the lines of the story, in the order given', () => {
		const texts = inRecordingOrder(
			voiceTexts(
				progression(),
				story(),
				[],
				[
					{ id: 'play.result', text: 'Bien essayé !' },
					{ id: 'game.dialogue', text: 'Floup ?' }
				]
			)
		);
		const kinds = texts.map((item) => parseVoiceOrigin(item.origin)?.kind);

		expect(kinds.lastIndexOf('line')).toBeLessThan(kinds.indexOf('message'));
		expect(texts.slice(-2).map((item) => item.text)).toEqual(['Bien essayé !', 'Floup ?']);
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

describe('voiceLocale', () => {
	it('is the language of the content, the folder its voice is published in', () => {
		expect(shipped.locale).toBe('fr-FR');
		expect(voiceLocale(shipped)).toBe('fr');
	});
});

describe('inRecordingOrder', () => {
	it('puts the openings and endings first, the lines of the lessons last, each in course order', () => {
		const texts = inRecordingOrder(
			voiceTexts(progression(), story(), [{ id: 'game.look-reminder', text: 'Regarde.' }])
		);
		const kinds = texts.map((item) => parseVoiceOrigin(item.origin)?.kind);
		const firstOther = kinds.findIndex((kind) => kind !== 'opening' && kind !== 'ending');
		const firstLine = kinds.indexOf('line');
		expect(kinds.slice(0, firstOther).sort()).toEqual(['ending', 'ending', 'opening', 'opening']);
		expect(kinds.slice(firstLine).every((kind) => kind === 'line')).toBe(true);
		expect(texts.slice(0, 4).map((item) => item.text)).toEqual([
			'Ouverture un.',
			'Fin un.',
			'Ouverture deux.',
			'Fin deux.'
		]);
		expect(new Set(texts).size).toBe(voiceTexts(progression(), story()).length + 1);
	});
});
