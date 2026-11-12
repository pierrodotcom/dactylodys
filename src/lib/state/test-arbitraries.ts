import fc from 'fast-check';
import { toGhostRun } from '../engine/ghost/ghost';
import type { GhostRun } from '../engine/ghost/types';
import type { CharSample, ProgressState, StarCount } from '../engine/progression/types';
import {
	createProfile,
	markCalibrated,
	parseProfile,
	updateSettings,
	withCompanion,
	withEarnedRewards,
	withGhost,
	withHelpQuest,
	withLastGame,
	withProgress
} from './profile';
import type {
	CompanionChoice,
	HandwritingSample,
	HelpQuestRecord,
	Profile,
	SessionRecord,
	Settings
} from './types';

const NAME_UNITS = [
	'a',
	'B',
	'\u00e9',
	'e\u0301',
	' ',
	'\u65e5',
	'\u{1F600}',
	'\u{1F468}\u200D\u{1F469}'
];

export const nameArb = fc
	.string({ unit: fc.constantFrom(...NAME_UNITS), minLength: 1, maxLength: 20 })
	.filter((name) => name.trim() !== '');

const timestampArb = fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER });
const countArb = fc.nat({ max: 100_000 });
const starsArb = fc.constantFrom<StarCount>(0, 1, 2, 3);
const accuracyArb = fc.integer({ min: 0, max: 1000 }).map((tenths) => tenths / 10);
const identifierArb = fc.string({ minLength: 1, maxLength: 12 });

/* Quarters of a millisecond: not only whole numbers, and never `-0`, which JSON turns into `0`. */
const latencyArb = fc.option(
	fc.nat({ max: 20_000 }).map((quarters) => quarters / 4),
	{ nil: null }
);

const charSampleArb: fc.Arbitrary<CharSample> = fc
	.record({
		attempts: fc.integer({ min: 1, max: 200 }),
		errors: fc.nat({ max: 200 }),
		latencyMs: latencyArb
	})
	.map(({ attempts, errors, latencyMs }) => ({
		attempts,
		errors: Math.min(attempts, errors),
		latencyMs
	}));

export const progressArb: fc.Arbitrary<ProgressState> = fc.record({
	lessons: fc.dictionary(
		fc.string({ maxLength: 12 }),
		fc.record({
			bestAccuracy: accuracyArb,
			stars: starsArb,
			attempts: countArb,
			lastPlayedAt: timestampArb
		}),
		{ maxKeys: 5 }
	),
	chars: fc.dictionary(
		fc.string({ maxLength: 4 }),
		fc.record({
			attempts: countArb,
			errors: countArb,
			recent: fc.array(charSampleArb, { maxLength: 4 })
		}),
		{ maxKeys: 5 }
	)
});

export const settingsPatchArb: fc.Arbitrary<Partial<Settings>> = fc.record(
	{
		layoutId: fc.constantFrom('fr-fr-azerty-pc', 'fr-fr-azerty-mac'),
		fingeringProfileId: fc.constant('ten-fingers-iso'),
		soundEnabled: fc.boolean(),
		voiceEnabled: fc.boolean(),
		theme: fc.constantFrom('system', 'light', 'dark'),
		motion: fc.constantFrom('system', 'reduced', 'full'),
		textScale: fc.constantFrom('md', 'lg', 'xl'),
		textSpacing: fc.constantFrom('normal', 'wide', 'wider'),
		showKeyboard: fc.boolean(),
		handGuide: fc.constantFrom('auto', 'always', 'off'),
		errorPolicy: fc.constantFrom('retry', 'backspace'),
		keyboardFade: fc.boolean(),
		effects: fc.boolean(),
		ambience: fc.constantFrom('none', 'soft-noise'),
		ageBand: fc.constantFrom('8-9', '10-12')
	},
	{ requiredKeys: [] }
);

export const companionArb: fc.Arbitrary<CompanionChoice> = fc.record({
	name: fc.oneof(fc.constant(''), nameArb),
	colorId: fc.option(identifierArb, { nil: null }),
	wornItemIds: fc.uniqueArray(identifierArb, { maxLength: 4 })
});

export const ghostArb: fc.Arbitrary<GhostRun> = fc
	.record({
		recordedAt: timestampArb,
		steps: fc.array(
			fc.record({
				chars: fc.integer({ min: 1, max: 40 }),
				ms: fc.integer({ min: 1, max: 30_000 })
			}),
			{ minLength: 1, maxLength: 6 }
		)
	})
	.map(({ recordedAt, steps }) => {
		let correctChars = 0;
		let activeMs = 0;
		const points = steps.map((step) => {
			correctChars += step.chars;
			activeMs += step.ms;
			return { correctChars, activeMs };
		});
		return toGhostRun(points, recordedAt);
	})
	.filter((run): run is GhostRun => run !== null);

export const earnedRewardsArb: fc.Arbitrary<string[]> = fc.uniqueArray(identifierArb, {
	maxLength: 6
});

export const helpQuestRecordArb: fc.Arbitrary<HelpQuestRecord> = fc.record({
	char: identifierArb,
	lessonPlays: countArb
});

const MS_PER_DAY = 86_400_000;
/** Instants the calendar of a device can show, up to the year 2200. */
export const realisticInstantArb = fc.integer({ min: 0, max: 7_258_118_400_000 });
export const utcOffsetArb = fc.integer({ min: -14 * 60, max: 14 * 60 });

export const sessionRecordArb: fc.Arbitrary<SessionRecord> = fc
	.record({
		lessonId: identifierArb,
		gameId: identifierArb,
		finishedAt: realisticInstantArb,
		utcOffsetMinutes: utcOffsetArb,
		durationMs: fc.nat({ max: 600_000 }),
		totalKeystrokes: fc.nat({ max: 500 }),
		correctShare: fc.double({ min: 0, max: 1, noNaN: true }),
		correctCharsPerMinute: fc.double({ min: 0, max: 1000, noNaN: true }),
		stars: starsArb,
		passed: fc.boolean()
	})
	.map(({ correctShare, totalKeystrokes, ...rest }) => {
		const correctKeystrokes = Math.floor(correctShare * totalKeystrokes);
		return {
			...rest,
			totalKeystrokes,
			correctKeystrokes,
			errorCount: totalKeystrokes - correctKeystrokes,
			accuracy: totalKeystrokes === 0 ? 100 : (100 * correctKeystrokes) / totalKeystrokes
		};
	});

/** Sorted days, each once, as `YYYY-MM-DD`. */
export const practiceDaysArb: fc.Arbitrary<string[]> = fc
	.uniqueArray(fc.nat({ max: 80_000 }), { maxLength: 8 })
	.map((days) =>
		[...days]
			.sort((a, b) => a - b)
			.map((day) => new Date(day * MS_PER_DAY).toISOString().slice(0, 10))
	);

const handwritingSampleArb: fc.Arbitrary<HandwritingSample> = fc.record({
	measuredAt: timestampArb,
	wordsPerMinute: fc.double({ min: 0.5, max: 60, noNaN: true })
});

/** A profile that holds nothing of what version 2 added. */
export const firstVersionProfileArb: fc.Arbitrary<Profile> = fc
	.record({
		id: fc.string({ minLength: 1, maxLength: 36 }),
		name: nameArb,
		now: timestampArb,
		platform: fc.constantFrom('pc', 'mac'),
		patch: settingsPatchArb,
		progress: progressArb,
		calibrated: fc.boolean()
	})
	.map(({ id, name, now, platform, patch, progress, calibrated }) => {
		const profile = withProgress(
			updateSettings(createProfile({ id, name, now, platform }), patch),
			progress
		);
		return calibrated ? markCalibrated(profile) : profile;
	});

export const profileArb: fc.Arbitrary<Profile> = fc
	.record({
		base: firstVersionProfileArb,
		companion: companionArb,
		games: fc.dictionary(fc.string({ maxLength: 12 }), identifierArb, { maxKeys: 3 }),
		ghosts: fc.dictionary(fc.string({ maxLength: 12 }), ghostArb, { maxKeys: 3 }),
		earned: earnedRewardsArb,
		helpQuest: fc.option(helpQuestRecordArb, { nil: null }),
		journal: fc.record({
			sessions: fc.array(sessionRecordArb, { maxLength: 4 }),
			practiceDays: practiceDaysArb,
			handwritingSamples: fc.array(handwritingSampleArb, { maxLength: 3 }),
			adultWords: fc.array(identifierArb, { maxLength: 4 }),
			openedWorldIds: fc.uniqueArray(identifierArb, { maxLength: 3 })
		})
	})
	.map(({ base, companion, games, ghosts, earned, helpQuest, journal }) => {
		let profile = withCompanion(base, companion);
		for (const [worldId, gameId] of Object.entries(games)) {
			profile = withLastGame(profile, worldId, gameId);
		}
		for (const [lessonId, run] of Object.entries(ghosts)) {
			profile = withGhost(profile, lessonId, run);
		}
		profile = withEarnedRewards(profile, earned);
		profile = helpQuest === null ? profile : withHelpQuest(profile, helpQuest);
		return parseProfile({ ...profile, ...journal });
	});
