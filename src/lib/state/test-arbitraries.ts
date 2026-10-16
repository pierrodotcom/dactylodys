import fc from 'fast-check';
import { toGhostRun } from '../engine/ghost/ghost';
import type { GhostRun } from '../engine/ghost/types';
import type { CharSample, ProgressState, StarCount } from '../engine/progression/types';
import {
	createProfile,
	markCalibrated,
	updateSettings,
	withCompanion,
	withEarnedRewards,
	withGhost,
	withHelpQuest,
	withLastGame,
	withProgress
} from './profile';
import type { CompanionChoice, HelpQuestRecord, Profile, Settings } from './types';

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

const charSampleArb: fc.Arbitrary<CharSample> = fc
	.record({ attempts: fc.integer({ min: 1, max: 200 }), errors: fc.nat({ max: 200 }) })
	.map(({ attempts, errors }) => ({ attempts, errors: Math.min(attempts, errors) }));

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
		handGuide: fc.constantFrom('auto', 'always', 'off')
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
		helpQuest: fc.option(helpQuestRecordArb, { nil: null })
	})
	.map(({ base, companion, games, ghosts, earned, helpQuest }) => {
		let profile = withCompanion(base, companion);
		for (const [worldId, gameId] of Object.entries(games)) {
			profile = withLastGame(profile, worldId, gameId);
		}
		for (const [lessonId, run] of Object.entries(ghosts)) {
			profile = withGhost(profile, lessonId, run);
		}
		profile = withEarnedRewards(profile, earned);
		return helpQuest === null ? profile : withHelpQuest(profile, helpQuest);
	});
