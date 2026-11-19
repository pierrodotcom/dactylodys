import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ERASE_CHAR, parseProgression } from './definition';
import { clone } from './test-support';

/*
 * The instruction of a lesson said one short sentence at a time, each with the key the hand shows
 * (audit P-13): what the parser accepts. What the shipped sentences say (length, no finger named) is
 * checked with the content, in `tests/schemas/progression.test.ts`.
 */

type Raw = {
	[key: string]: unknown;
	rules: Record<string, unknown>;
	worlds: { [key: string]: unknown; lessons: Record<string, unknown>[] }[];
};

function lesson(id: string, newChars: string[], extra: Record<string, unknown> = {}) {
	return {
		id,
		title: id,
		intro: `Intro ${id}.`,
		newChars,
		words: [],
		mix: { drills: 1, words: 0, phrases: 0 },
		unlocks: [],
		groupCount: 5,
		targetLength: 20,
		groupLength: [2, 4],
		...extra
	};
}

/** f and j, then the space, then capitals, then a lesson of repairs. */
const BASE: Raw = {
	schemaVersion: 1,
	id: 'fr.progression.test',
	locale: 'fr-FR',
	layoutIds: ['fr-fr-azerty-pc'],
	rules: {
		unlockAccuracy: 80,
		starThresholds: [80, 90, 97],
		newCharWeight: 0.6,
		weakCharBoost: 2,
		themeBoost: 2,
		newCharMinCount: 0,
		recentCharWindow: 30
	},
	worlds: [
		{
			id: 'fr.world.one',
			title: 'One',
			themeId: 'dinos',
			gameIds: ['hatching'],
			lessons: [
				lesson('fr.lesson.a', ['f', 'j']),
				lesson('fr.lesson.b', [' '], { groupLength: [3, 5] }),
				lesson('fr.lesson.c', [], { unlocks: ['uppercase'] }),
				lesson('fr.lesson.d', [], { repair: { share: 0.5, maxPending: 1 } })
			]
		}
	]
};

const A = 0;
const SPACE_LESSON = 1;
const CAPITALS = 2;
const REPAIRS = 3;

function withSteps(index: number, steps: unknown): Raw {
	const raw = clone(BASE);
	(raw.worlds[0]!.lessons[index] as Record<string, unknown>)['steps'] = steps;
	return raw;
}

function stepsOf(raw: Raw, index: number) {
	return parseProgression(raw).worlds[0]?.lessons[index]?.steps;
}

describe('steps of a lesson', () => {
	it('are absent unless the lesson says them', () => {
		expect(parseProgression(clone(BASE)).worlds[0]?.lessons[A]).not.toHaveProperty('steps');
	});

	it('keep each sentence with the key it goes with, in the order they are said', () => {
		const steps = [
			{ char: 'j', text: 'J est à droite.' },
			{ char: 'f', text: 'F est à gauche.' },
			{ char: 'f', text: 'Sens son petit trait.' }
		];
		expect(stepsOf(withSteps(A, steps), A)).toEqual(steps);
	});

	it('name the space by the character it types', () => {
		const steps = [{ char: ' ', text: "L'espace est la grande barre." }];
		expect(stepsOf(withSteps(SPACE_LESSON, steps), SPACE_LESSON)).toEqual(steps);
	});

	it('show a capital in the lesson that unlocks capitals, never in another one', () => {
		const steps = [
			{ char: 'F', text: 'Majuscule : Maj de l’autre côté.' },
			{ char: 'J', text: 'Pour J, Maj de gauche.' }
		];
		expect(stepsOf(withSteps(CAPITALS, steps), CAPITALS)).toEqual(steps);
		expect(() => parseProgression(withSteps(A, [{ char: 'F', text: 'F.' }]))).toThrow(
			/lessons\[0\]\.steps\[0\]\.char: expected a key of the lesson/
		);
	});

	it('show the key that erases in a lesson of repairs, and only there', () => {
		const steps = [{ char: ERASE_CHAR, text: 'Retour arrière efface la faute.' }];
		expect(stepsOf(withSteps(REPAIRS, steps), REPAIRS)).toEqual(steps);
		expect(() => parseProgression(withSteps(A, steps))).toThrow(
			/lessons\[0\]\.steps\[0\]\.char: expected a key of the lesson/
		);
	});

	it.each([
		['no sentence at all', [], /lessons\[0\]\.steps: expected at least one sentence/],
		[
			'a single sentence instead of a list',
			'F est à gauche.',
			/lessons\[0\]\.steps: expected an array/
		],
		[
			'a key learned in an earlier lesson',
			[{ char: 'f', text: 'F.' }],
			/lessons\[1\]\.steps\[0\]\.char: expected a key of the lesson: " "/,
			SPACE_LESSON
		],
		['a key no lesson brings', [{ char: 'q', text: 'Q.' }], /steps\[0\]\.char/],
		['two keys in one sentence', [{ char: 'fj', text: 'F et J.' }], /steps\[0\]\.char/],
		['no key', [{ text: 'F est à gauche.' }], /steps\[0\]\.char/],
		['no sentence', [{ char: 'f' }], /steps\[0\]\.text: expected a non-empty string/],
		['an empty sentence', [{ char: 'f', text: '  ' }], /steps\[0\]\.text/],
		[
			'an unknown property',
			[{ char: 'f', text: 'F.', finger: 'index' }],
			/steps\[0\]\.finger: unknown property/
		],
		[
			'the same sentence twice',
			[
				{ char: 'f', text: 'Pose-toi.' },
				{ char: 'j', text: 'Pose-toi.' }
			],
			/steps\[1\]\.text: duplicate sentence/
		]
	])('refuse %s', (_name, steps, error, index = A) => {
		expect(() => parseProgression(withSteps(index, steps))).toThrow(error);
	});

	it('are refused in a lesson that shows no key', () => {
		const raw = clone(BASE);
		raw.worlds[0]!.lessons.push(lesson('fr.lesson.e', [], { steps: [{ char: 'f', text: 'F.' }] }));
		expect(() => parseProgression(raw)).toThrow(
			/lessons\[4\]\.steps: a lesson that shows no key has no sentence/
		);
	});

	it('are accepted exactly when every key they show is one of the lesson', () => {
		const ofLesson = ['f', 'j'];
		const others = ['d', 'k', ' ', 'F', ERASE_CHAR, '\n'];
		fc.assert(
			fc.property(
				fc.array(fc.constantFrom(...ofLesson, ...others), { minLength: 1, maxLength: 6 }),
				(chars) => {
					const steps = chars.map((char, index) => ({ char, text: `Phrase ${index}.` }));
					const raw = withSteps(A, steps);
					if (chars.every((char) => ofLesson.includes(char))) {
						expect(stepsOf(raw, A)).toEqual(steps);
					} else {
						expect(() => parseProgression(raw)).toThrow(/steps\[\d+\]\.char/);
					}
				}
			)
		);
	});
});
