import { readFileSync } from 'node:fs';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { toGraphemes } from '../../src/lib/engine/graphemes';
import {
	parsePhraseBank,
	parseTextBank,
	parseWordBank
} from '../../src/lib/engine/progression/banks';
import {
	isDetour,
	learnedChars,
	lessonIds,
	lessonNumber,
	parseProgression,
	reachableChars
} from '../../src/lib/engine/progression/definition';
import { generateExercise } from '../../src/lib/engine/progression/exercise';
import { seededRng } from '../../src/lib/engine/progression/test-support';
import { isLessonPassed, isLessonUnlocked } from '../../src/lib/engine/progression/progress';
import type {
	LessonDefinition,
	ProgressionDefinition,
	ProgressState,
	StarCount
} from '../../src/lib/engine/progression/types';
import {
	ownedRewards,
	parseRewardCatalogue,
	unlockedRewards,
	withNewlyEarned
} from '../../src/lib/engine/rewards';
import { parseStory, storyAfterLesson, storySoFar } from '../../src/lib/engine/story';
import { migrateProfile } from '../../src/lib/state/migrations';
import { createProfile, parseProfile } from '../../src/lib/state/profile';
import { asVersion14 } from '../../src/lib/state/test-support';
import type { Profile } from '../../src/lib/state/types';
import {
	focusLessonId,
	followingLessonId,
	layoutMap,
	lessonStatus,
	nextLessonId
} from '../../src/routes/jouer/map';

/*
 * The order of the lessons changed (ADR-075, choice 1): capitals, the comma and the full stop
 * come right after « é ' », and the rare accents are detours. A child on the way in the former
 * order loses nothing: this is checked on the shipped content, for any combination of lessons.
 */

function readJson(path: string): unknown {
	return JSON.parse(readFileSync(path, 'utf8'));
}

const progression = parseProgression(readJson('content/fr/progression/azerty-decouverte.json'));
const catalogue = parseRewardCatalogue(readJson('content/fr/rewards/azerty-decouverte.json'));
const story = parseStory(readJson('content/fr/story/azerty-decouverte.json'));
const words = parseWordBank(readJson('content/fr/words/base.json'));
const phrases = parsePhraseBank(readJson('content/fr/phrases/base.json'));
const texts = parseTextBank(readJson('content/fr/texts/base.json'));
const SEEDS = 20;
const lessons = progression.worlds.flatMap((world) => world.lessons);
const way = lessons.filter((lesson) => !isDetour(lesson));

/**
 * The worlds as they followed one another in version 14 of the profile, every lesson on the way;
 * the grand tours came later (ADR-075, choice 3).
 */
const FORMER_WORLDS = [
	'fr.world.dinosaures',
	'fr.world.cuisine',
	'fr.world.animaux',
	'fr.world.espace',
	'fr.world.vehicules',
	'fr.world.poste'
];
const former: ProgressionDefinition = {
	...progression,
	worlds: FORMER_WORLDS.map((id) => {
		const world = progression.worlds.find((candidate) => candidate.id === id);
		if (world === undefined) throw new Error(`no world ${id}`);
		const onTheWay = world.lessons
			.filter((lesson) => lesson.tour === undefined)
			.map((lesson): LessonDefinition => {
				const copy: { -readonly [K in keyof LessonDefinition]: LessonDefinition[K] } = {
					...lesson
				};
				delete copy.optional;
				return copy;
			});
		return { ...world, lessons: onTheWay };
	})
};
const FORMER_IDS = lessonIds(former);
const TOUR_IDS = lessons.filter((lesson) => lesson.tour !== undefined).map((lesson) => lesson.id);

function passedIn(progress: ProgressState, lessonId: string): boolean {
	return isLessonPassed(progression.rules, progress, lessonId);
}

/** The rule of version 14: the first lesson, the first of an opened world, the one after a passed one. */
function wasOpen(progress: ProgressState, lessonId: string, opened: readonly string[]): boolean {
	const index = FORMER_IDS.indexOf(lessonId);
	if (index === 0) return true;
	if (
		former.worlds.some((world) => opened.includes(world.id) && world.lessons[0]?.id === lessonId)
	) {
		return true;
	}
	return passedIn(progress, FORMER_IDS[index - 1] as string) || passedIn(progress, lessonId);
}

function starsFor(accuracy: number): StarCount {
	return progression.rules.starThresholds.filter((threshold) => accuracy >= threshold)
		.length as StarCount;
}

/** A progress of the former order: the best accuracy of each lesson played, by rank. */
function progressOf(accuracies: readonly (number | null)[]): ProgressState {
	const played = FORMER_IDS.flatMap((id, index) => {
		const accuracy = accuracies[index] ?? null;
		if (accuracy === null) return [];
		const lesson = {
			bestAccuracy: accuracy,
			stars: starsFor(accuracy),
			attempts: 1,
			lastPlayedAt: 1
		};
		return [[id, lesson] as const];
	});
	return { lessons: Object.fromEntries(played), chars: {} };
}

/** What version 14 had stored for this child: the progress, and the rewards earned in that order. */
function storedByVersion14(progress: ProgressState, opened: readonly string[]) {
	const created = createProfile({ id: 'p-1', name: 'Léa', now: 1, platform: 'pc' });
	const profile: Profile = {
		...created,
		progress,
		openedWorldIds: opened,
		earnedRewardIds: withNewlyEarned(catalogue, former, progress, [])
	};
	return JSON.parse(JSON.stringify(asVersion14(profile))) as unknown;
}

function isOpenNow(profile: Profile, lessonId: string): boolean {
	return isLessonUnlocked(
		progression,
		profile.progress,
		lessonId,
		profile.openedWorldIds,
		profile.keptOpenLessonIds
	);
}

const accuracyArb = fc.oneof(
	fc.constant(null),
	fc.double({ min: 0, max: 100, noNaN: true }),
	fc.constantFrom(79.9, 80, 90, 95, 100)
);
/** Any combination of lessons played, passed or not. */
const anyProgressArb = fc
	.array(accuracyArb, { minLength: FORMER_IDS.length, maxLength: FORMER_IDS.length })
	.map(progressOf);
/** A child who followed the former order: the first lessons passed, the next one maybe tried. */
const linearProgressArb = fc
	.record({
		passed: fc.integer({ min: 0, max: FORMER_IDS.length }),
		accuracy: fc.constantFrom(80, 86, 93, 100),
		next: fc.option(fc.double({ min: 0, max: 79, noNaN: true }), { nil: null })
	})
	.map(({ passed, accuracy, next }) =>
		progressOf(
			FORMER_IDS.map((_, index) => (index < passed ? accuracy : index === passed ? next : null))
		)
	);
const progressArb = fc.oneof(linearProgressArb, anyProgressArb);
const openedArb = fc.subarray(FORMER_WORLDS);

describe('a profile of the former order, once migrated', () => {
	it('knows the former order by the same lessons, and the same worlds', () => {
		const taught = lessonIds(progression).filter((id) => !TOUR_IDS.includes(id));
		expect([...FORMER_IDS].sort()).toEqual(taught.sort());
		expect(FORMER_IDS.slice(11, 19)).toEqual([
			'fr.lesson.girafe-g-h',
			'fr.lesson.vache-v-b',
			'fr.lesson.yak-y-x',
			'fr.lesson.zebre-z-w',
			'fr.lesson.lune-accents-graves',
			'fr.lesson.comete-cedille-u-grave',
			'fr.lesson.grandes-majuscules',
			'fr.lesson.virgule-point'
		]);
	});

	it('loses neither a lesson, nor a star, nor a reward', () => {
		fc.assert(
			fc.property(progressArb, openedArb, (progress, opened) => {
				const stored = storedByVersion14(progress, opened) as { earnedRewardIds: string[] };
				const migrated = parseProfile(migrateProfile(stored));
				expect(migrated.progress).toEqual(progress);
				expect(migrated.earnedRewardIds).toEqual(stored.earnedRewardIds);
				expect(migrated.openedWorldIds).toEqual(opened);
				// What the child owns: nothing less than in the former order, whatever was kept.
				const before = ownedRewards(catalogue, former, progress, stored.earnedRewardIds);
				const after = ownedRewards(
					catalogue,
					progression,
					migrated.progress,
					migrated.earnedRewardIds
				);
				for (const id of before) expect(after.has(id), id).toBe(true);
				const computedBefore = unlockedRewards(catalogue, former, progress);
				const computedAfter = unlockedRewards(catalogue, progression, migrated.progress);
				for (const id of computedBefore) expect(computedAfter.has(id), id).toBe(true);
			})
		);
	});

	it('finds open every lesson that was open', () => {
		fc.assert(
			fc.property(progressArb, openedArb, (progress, opened) => {
				const migrated = parseProfile(migrateProfile(storedByVersion14(progress, opened)));
				for (const id of FORMER_IDS) {
					if (wasOpen(progress, id, opened)) expect(isOpenNow(migrated, id), id).toBe(true);
				}
			})
		);
	});

	it('always has a lesson to play until the way is finished, and is led to it', () => {
		fc.assert(
			fc.property(progressArb, openedArb, (progress, opened) => {
				const migrated = parseProfile(migrateProfile(storedByVersion14(progress, opened)));
				const left = way.filter((lesson) => !passedIn(progress, lesson.id));
				const focus = focusLessonId(
					progression,
					migrated.progress,
					migrated.openedWorldIds,
					migrated.keptOpenLessonIds
				);
				expect(focus).not.toBeNull();
				expect(way.some((lesson) => lesson.id === focus)).toBe(true);
				expect(isOpenNow(migrated, focus ?? '')).toBe(true);
				if (left.length === 0) return;
				expect(left.some((lesson) => isOpenNow(migrated, lesson.id))).toBe(true);
				expect(passedIn(progress, focus ?? '')).toBe(false);
			})
		);
	});

	it('keeps every moment of the story already won', () => {
		const keyOf = (moment: { kind: string; worldId: string; lessonId: string | null }) =>
			`${moment.kind} ${moment.worldId} ${moment.lessonId ?? ''}`;
		fc.assert(
			fc.property(progressArb, (progress) => {
				const before = storySoFar(story, former, progress).map(keyOf);
				const after = new Set(storySoFar(story, progression, progress).map(keyOf));
				for (const key of before) expect(after.has(key), key).toBe(true);
			})
		);
	});
});

describe('a child stopped at the former lesson 14 (y x passed, z w to play)', () => {
	const progress = progressOf(FORMER_IDS.map((_, index) => (index < 14 ? 92 : null)));
	const profile = parseProfile(migrateProfile(storedByVersion14(progress, [])));
	const layout = layoutMap(
		progression,
		profile.progress,
		profile.openedWorldIds,
		profile.keptOpenLessonIds
	);
	const onMap = layout.worlds.flatMap((world) => world.lessons);
	const statusOf = (slug: string) =>
		onMap.find((lesson) => lesson.id === `fr.lesson.${slug}`)?.status;

	it('finds its fourteen lessons done, with their stars', () => {
		const done = onMap.filter((lesson) => lesson.status === 'done');
		expect(done.map((lesson) => lesson.id).sort()).toEqual(FORMER_IDS.slice(0, 14).sort());
		expect(done.every((lesson) => lesson.stars === 2)).toBe(true);
	});

	it('finds open the lesson it was about to play, and the four that now come before it', () => {
		expect(profile.keptOpenLessonIds).toEqual(['fr.lesson.zebre-z-w']);
		for (const slug of [
			'lune-accents-graves',
			'comete-cedille-u-grave',
			'grandes-majuscules',
			'virgule-point',
			'zebre-z-w'
		]) {
			expect(statusOf(slug), slug).toBe('current');
		}
		expect(statusOf('klaxon-question-exclamation')).toBe('locked');
	});

	it('is led to the first of them, in the world of the stars, then on from lesson to lesson', () => {
		expect(layout.focusId).toBe('fr.lesson.lune-accents-graves');
		expect(layout.worlds.find((world) => world.current)?.id).toBe('fr.world.espace');
		expect(lessonNumber(progression, layout.focusId ?? '')).toBe(12);
		expect(nextLessonId(progression, 'fr.lesson.lune-accents-graves')).toBe(
			'fr.lesson.comete-cedille-u-grave'
		);
	});

	it('has nothing to play again: passing z w alone opens what follows', () => {
		const after = {
			...progress,
			lessons: {
				...progress.lessons,
				'fr.lesson.zebre-z-w': { bestAccuracy: 85, stars: 1 as const, attempts: 1, lastPlayedAt: 2 }
			}
		};
		expect(lessonStatus(progression, after, 'fr.lesson.klaxon-question-exclamation', [], [])).toBe(
			'current'
		);
		// The map still proposes the lessons that came before since, and so does "next lesson".
		expect(focusLessonId(progression, after, [], [])).toBe('fr.lesson.lune-accents-graves');
		expect(followingLessonId(progression, after, 'fr.lesson.zebre-z-w', [])).toBe(
			'fr.lesson.lune-accents-graves'
		);
	});

	it('goes through the stars from one "next lesson" to the other, then on to the circuit', () => {
		const passing = (ids: readonly string[]): ProgressState => ({
			...progress,
			lessons: {
				...progress.lessons,
				...Object.fromEntries(
					ids.map((id) => [
						id,
						{ bestAccuracy: 85, stars: 1 as const, attempts: 1, lastPlayedAt: 2 }
					])
				)
			}
		});
		const starIds = [
			'fr.lesson.lune-accents-graves',
			'fr.lesson.comete-cedille-u-grave',
			'fr.lesson.grandes-majuscules',
			'fr.lesson.virgule-point'
		];
		starIds.slice(0, -1).forEach((id, index) => {
			const sofar = passing(starIds.slice(0, index + 1));
			expect(followingLessonId(progression, sofar, id, [], profile.keptOpenLessonIds)).toBe(
				starIds[index + 1]
			);
		});
		// After the comma, the lesson that follows is one of the zoo, passed long ago; the map then
		// proposes the one that was waiting.
		const stars = passing(starIds);
		expect(focusLessonId(progression, stars, [], profile.keptOpenLessonIds)).toBe(
			'fr.lesson.zebre-z-w'
		);
		const all = passing([...starIds, 'fr.lesson.zebre-z-w']);
		expect(followingLessonId(progression, all, 'fr.lesson.zebre-z-w', [])).toBe(
			'fr.lesson.klaxon-question-exclamation'
		);
	});

	it('keeps its rewards and the page of the zoo of its notebook', () => {
		const owned = ownedRewards(catalogue, progression, profile.progress, profile.earnedRewardIds);
		for (const slug of ['giraffe-bow-tie', 'ball-shoes', 'yak-beanie', 'juggle', 'roar']) {
			expect(owned.has(`fr.reward.${slug}`), slug).toBe(true);
		}
		const told = storySoFar(story, progression, profile.progress);
		expect(told.filter((moment) => moment.worldId === 'fr.world.animaux')).toHaveLength(4);
		expect(told.some((moment) => moment.worldId === 'fr.world.espace')).toBe(false);
	});
});

describe('the detours of the rare accents', () => {
	const passedLessons = (ids: readonly string[], accuracy = 92): ProgressState => ({
		lessons: Object.fromEntries(
			ids.map((id) => [
				id,
				{ bestAccuracy: accuracy, stars: starsFor(accuracy), attempts: 1, lastPlayedAt: 1 }
			])
		),
		chars: {}
	});
	const vehicles = progression.worlds.find((world) => world.id === 'fr.world.vehicules');
	const upToHat = lessonIds(progression).slice(
		0,
		lessonIds(progression).indexOf('fr.lesson.chapeau-circonflexe') + 1
	);

	it('opens the last world without them, and the first detour beside it', () => {
		const progress = passedLessons(upToHat);
		expect(lessonStatus(progression, progress, 'fr.lesson.liste-pique-nique', [])).toBe('current');
		expect(lessonStatus(progression, progress, 'fr.lesson.casque-circonflexe', [])).toBe('current');
		expect(lessonStatus(progression, progress, 'fr.lesson.trema', [])).toBe('locked');
		expect(focusLessonId(progression, progress, [])).toBe('fr.lesson.liste-pique-nique');
		expect(nextLessonId(progression, 'fr.lesson.chapeau-circonflexe')).toBe(
			'fr.lesson.liste-pique-nique'
		);
	});

	it('ends the world of vehicles without them: its story, its trick and its medal', () => {
		const before = passedLessons(upToHat.slice(0, -1));
		const after = passedLessons(upToHat);
		const told = storyAfterLesson(
			story,
			progression,
			before,
			after,
			'fr.lesson.chapeau-circonflexe'
		);
		expect(told.map((moment) => moment.kind)).toEqual(['line', 'ending']);
		expect(told[1]?.worldId).toBe(vehicles?.id);
		const owned = unlockedRewards(catalogue, progression, after);
		expect(owned.has('fr.reward.cartwheel')).toBe(true);
		expect(owned.has('fr.reward.medal-racing')).toBe(true);
		expect(owned.has('fr.reward.pilot-scarf')).toBe(false);
	});

	it('still gives their own rewards and their line of the story to the child who plays them', () => {
		const before = passedLessons(upToHat);
		const after = passedLessons([...upToHat, 'fr.lesson.casque-circonflexe', 'fr.lesson.trema']);
		const owned = unlockedRewards(catalogue, progression, after);
		expect(owned.has('fr.reward.pilot-scarf')).toBe(true);
		expect(owned.has('fr.reward.roller-skates')).toBe(true);
		const first = passedLessons([...upToHat, 'fr.lesson.casque-circonflexe']);
		expect(
			storyAfterLesson(story, progression, before, first, 'fr.lesson.casque-circonflexe').map(
				(moment) => moment.kind
			)
		).toEqual(['line']);
		expect(nextLessonId(progression, 'fr.lesson.casque-circonflexe')).toBe('fr.lesson.trema');
		expect(nextLessonId(progression, 'fr.lesson.trema')).toBe('fr.lesson.liste-pique-nique');
	});

	it('asks no trophy of mastery for a rare accent', () => {
		const rare = new Set(lessons.filter(isDetour).flatMap((lesson) => lesson.newChars));
		for (const reward of catalogue.rewards) {
			if (reward.condition.kind !== 'chars-mastered') continue;
			expect(
				reward.condition.chars.filter((char) => rare.has(char)),
				reward.id
			).toEqual([]);
		}
	});
});

describe('what the detours bring, in the lessons after them', () => {
	const rare = lessons.filter(isDetour).flatMap((lesson) => lesson.newChars);
	const after = lessons.slice(lessons.findLastIndex(isDetour) + 1);
	const passed = { bestAccuracy: 90, stars: 2 as const, attempts: 1, lastPlayedAt: 1 };
	const withDetours: ProgressState = {
		lessons: Object.fromEntries(lessons.filter(isDetour).map((lesson) => [lesson.id, passed])),
		chars: {}
	};
	const typedIn = (lesson: LessonDefinition, progress: ProgressState, seed: number) => {
		const world = progression.worlds.find((item) => item.lessons.includes(lesson));
		const context = { words, phrases, texts, progress, themeId: world?.themeId };
		const exercise = generateExercise(progression, lesson.id, seededRng(seed), context);
		return toGraphemes(exercise.groups.join(''));
	};

	it.each(after.map((lesson) => [lesson.id, lesson] as const))(
		`%s never asks a rare accent of a child who took no detour, over ${SEEDS} seeds`,
		(_id, lesson) => {
			const known = new Set(learnedChars(progression, lesson.id));
			for (let seed = 1; seed <= SEEDS; seed++) {
				const typed = typedIn(lesson, { lessons: {}, chars: {} }, seed);
				expect(typed.filter((char) => !known.has(char))).toEqual([]);
				expect(typed.filter((char) => rare.includes(char))).toEqual([]);
			}
		}
	);

	it.each(after.map((lesson) => [lesson.id, lesson] as const))(
		`%s keeps to what the child who passed the detours knows, over ${SEEDS} seeds`,
		(_id, lesson) => {
			const known = new Set(reachableChars(progression, lesson.id));
			for (let seed = 1; seed <= SEEDS; seed++) {
				const typed = typedIn(lesson, withDetours, seed);
				expect(typed.filter((char) => !known.has(char))).toEqual([]);
			}
		}
	);

	it('gives the rare accents back to the child who learned them: they are typed again', () => {
		const typed = after.flatMap((lesson) =>
			Array.from({ length: SEEDS }, (_, seed) => typedIn(lesson, withDetours, seed + 1)).flat()
		);
		expect(typed.some((char) => rare.includes(char))).toBe(true);
	});
});
