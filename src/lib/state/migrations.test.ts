import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { lessonIds } from '../engine/progression/definition';
import { errorPolicyFor } from '../engine/progression/error-policy';
import { isLessonUnlocked } from '../engine/progression/progress';
import { loadShippedProgressions } from '../engine/progression/test-support';
import type { CharProgress, ProgressState, StarCount } from '../engine/progression/types';
import { migrateProfile, ProfileMigrationError, readProfile } from './migrations';
import {
	createProfile,
	markCalibrated,
	parseProfile,
	PROFILE_SCHEMA_VERSION,
	updateSettings,
	withCompanion,
	withGhost,
	withLastGame,
	withProgress
} from './profile';
import { firstVersionProfileArb, profileArb } from './test-arbitraries';
import {
	asVersion1,
	asVersion2,
	asVersion3,
	asVersion4,
	asVersion5,
	asVersion6,
	asVersion7,
	asVersion8,
	asVersion9,
	asVersion10,
	asVersion11,
	asVersion12,
	asVersion13,
	asVersion14,
	asVersion15,
	EMPTY_JOURNAL,
	withEmptyHideout,
	withKeyboardFade,
	withNothingKeptOpen,
	withRetryPolicy,
	withSensoryDefaults,
	withUnknownLatency,
	withUnmarkedSessions,
	withWorldPolicy,
	withYoungerAgeBand
} from './test-support';
import type { Profile } from './types';

type Json = Record<string, unknown>;

const toJson = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

/** The window of recent keystrokes when version 3 came out: what its migration step wrote. */
const WINDOW_AT_VERSION_3 = 30;

function playedProfile(): Profile {
	const created = createProfile({
		id: 'p-1',
		name: 'Léa',
		now: 1_700_000_000_000,
		platform: 'mac'
	});
	const tuned = updateSettings(markCalibrated(created), { soundEnabled: false, theme: 'dark' });
	return withProgress(tuned, {
		lessons: { 'fr.lesson.x': { bestAccuracy: 96.5, stars: 2, attempts: 3, lastPlayedAt: 5 } },
		chars: {
			f: { attempts: 20, errors: 2, recent: [{ attempts: 20, errors: 2, latencyMs: null }] }
		}
	});
}

/** Written by hand, not derived from the code: what version 1 really left on devices. */
const STORED_BY_VERSION_1 = {
	schemaVersion: 1,
	id: 'p-1',
	name: 'Léa',
	createdAt: 1_700_000_000_000,
	calibrated: true,
	settings: {
		layoutId: 'fr-fr-azerty-mac',
		fingeringProfileId: 'ten-fingers-iso',
		soundEnabled: false,
		theme: 'dark',
		motion: 'system',
		textScale: 'md',
		textSpacing: 'normal',
		showKeyboard: true
	},
	progress: {
		lessons: { 'fr.lesson.x': { bestAccuracy: 96.5, stars: 2, attempts: 3, lastPlayedAt: 5 } },
		chars: { f: { attempts: 20, errors: 2 } }
	}
};

/** Written by hand as well: what version 2 really left on devices. */
const STORED_BY_VERSION_2 = {
	schemaVersion: 2,
	id: 'p-2',
	name: 'Noé',
	createdAt: 1_750_000_000_000,
	calibrated: true,
	settings: {
		layoutId: 'fr-fr-azerty-pc',
		fingeringProfileId: 'ten-fingers-iso',
		soundEnabled: true,
		voiceEnabled: false,
		theme: 'light',
		motion: 'reduced',
		textScale: 'lg',
		textSpacing: 'wide',
		showKeyboard: false
	},
	progress: {
		lessons: {
			'fr.lesson.x': { bestAccuracy: 96.5, stars: 2, attempts: 3, lastPlayedAt: 5 },
			'fr.lesson.y': { bestAccuracy: 71, stars: 0, attempts: 1, lastPlayedAt: 9 }
		},
		chars: {
			f: { attempts: 20, errors: 2 },
			j: { attempts: 0, errors: 0 },
			e: { attempts: 100, errors: 7 },
			ù: { attempts: 90, errors: 89 },
			q: { attempts: 5, errors: 9 }
		}
	},
	companion: { name: 'Pixel', colorId: 'moss', wornItemIds: ['fr.reward.scarf'] },
	lastGameByWorld: { 'fr.world.x': 'rocket' },
	ghosts: {
		'fr.lesson.x': {
			recordedAt: 7,
			charCount: 12,
			activeMs: 3000,
			points: [
				{ correctChars: 5, activeMs: 1000 },
				{ correctChars: 12, activeMs: 3000 }
			]
		}
	}
};

function profileOfVersion2(): Profile {
	const created = createProfile({
		id: 'p-2',
		name: 'Noé',
		now: 1_750_000_000_000,
		platform: 'pc'
	});
	const tuned = updateSettings(markCalibrated(created), {
		voiceEnabled: false,
		theme: 'light',
		motion: 'reduced',
		textScale: 'lg',
		textSpacing: 'wide',
		showKeyboard: false
	});
	const played = withProgress(tuned, {
		lessons: STORED_BY_VERSION_2.progress.lessons as ProgressState['lessons'],
		chars: {
			f: { attempts: 20, errors: 2, recent: [{ attempts: 20, errors: 2, latencyMs: null }] },
			j: { attempts: 0, errors: 0, recent: [] },
			e: { attempts: 100, errors: 7, recent: [{ attempts: 30, errors: 2, latencyMs: null }] },
			ù: { attempts: 90, errors: 89, recent: [{ attempts: 30, errors: 30, latencyMs: null }] },
			q: { attempts: 5, errors: 9, recent: [{ attempts: 5, errors: 5, latencyMs: null }] }
		}
	});
	const dressed = withCompanion(played, STORED_BY_VERSION_2.companion);
	return withGhost(
		withLastGame(dressed, 'fr.world.x', 'rocket'),
		'fr.lesson.x',
		STORED_BY_VERSION_2.ghosts['fr.lesson.x']
	);
}

/** Written by hand as well: what version 4 really left on devices (no reward kept, no help quest). */
const STORED_BY_VERSION_4 = {
	schemaVersion: 4,
	id: 'p-4',
	name: 'Zoé',
	createdAt: 1_760_000_000_000,
	calibrated: true,
	settings: {
		layoutId: 'fr-fr-azerty-pc',
		fingeringProfileId: 'ten-fingers-iso',
		soundEnabled: true,
		voiceEnabled: true,
		theme: 'dark',
		motion: 'system',
		textScale: 'md',
		textSpacing: 'normal',
		showKeyboard: true,
		handGuide: 'always'
	},
	progress: {
		lessons: {
			'fr.lesson.x': { bestAccuracy: 96.5, stars: 2, attempts: 3, lastPlayedAt: 5 }
		},
		chars: { f: { attempts: 40, errors: 9, recent: [{ attempts: 30, errors: 6 }] } }
	},
	companion: { name: 'Biscotte', colorId: 'blue', wornItemIds: ['fr.reward.scarf'] },
	lastGameByWorld: { 'fr.world.x': 'rocket' },
	ghosts: {}
};

/** What the step to version 3 gives a character, computed apart from the code under test. */
function migratedChar({ attempts, errors }: Pick<CharProgress, 'attempts' | 'errors'>) {
	if (attempts === 0) return { attempts, errors, recent: [] };
	const kept = Math.min(attempts, WINDOW_AT_VERSION_3);
	const scaled = Math.min(kept, Math.round((errors * kept) / attempts));
	return { attempts, errors, recent: [{ attempts: kept, errors: scaled, latencyMs: null }] };
}

function migratedProgress(progress: ProgressState): ProgressState {
	return {
		lessons: progress.lessons,
		chars: Object.fromEntries(
			Object.entries(progress.chars).map(([char, stats]) => [char, migratedChar(stats)])
		)
	};
}

function reasonOf(data: unknown): unknown {
	try {
		migrateProfile(data);
	} catch (error) {
		if (error instanceof ProfileMigrationError) return error.reason;
		throw error;
	}
	return 'migrated';
}

describe('migrateProfile', () => {
	it('brings a version 1 profile to the current version with nothing lost', () => {
		expect(parseProfile(migrateProfile(STORED_BY_VERSION_1))).toEqual(playedProfile());
	});

	it('gives a migrated profile a companion without a name, no chosen game, no ghost, and the voice on', () => {
		const migrated = parseProfile(migrateProfile(STORED_BY_VERSION_1));
		expect(migrated.schemaVersion).toBe(PROFILE_SCHEMA_VERSION);
		expect(migrated.companion).toEqual({ name: '', colorId: null, wornItemIds: [] });
		expect(migrated.lastGameByWorld).toEqual({});
		expect(migrated.ghosts).toEqual({});
		expect(migrated.settings.voiceEnabled).toBe(true);
		expect(migrated.settings.soundEnabled).toBe(false);
	});

	it('gives a migrated profile no earned reward and no help quest, from any older version', () => {
		for (const stored of [STORED_BY_VERSION_1, STORED_BY_VERSION_2, STORED_BY_VERSION_4]) {
			const migrated = parseProfile(migrateProfile(stored));
			expect(migrated.schemaVersion).toBe(PROFILE_SCHEMA_VERSION);
			expect(migrated.earnedRewardIds).toEqual([]);
			expect(migrated.helpQuest).toBeNull();
		}
	});

	it('brings a version 4 profile to the current version with nothing lost', () => {
		expect(parseProfile(migrateProfile(STORED_BY_VERSION_4))).toEqual({
			...STORED_BY_VERSION_4,
			schemaVersion: 16,
			keptOpenLessonIds: [],
			settings: {
				...STORED_BY_VERSION_4.settings,
				errorPolicy: 'world',
				sessionLength: 'normal',
				keyboardFade: true,
				effects: true,
				ambience: 'none',
				ageBand: '8-9'
			},
			progress: {
				...STORED_BY_VERSION_4.progress,
				chars: {
					f: { attempts: 40, errors: 9, recent: [{ attempts: 30, errors: 6, latencyMs: null }] }
				}
			},
			earnedRewardIds: [],
			helpQuest: null,
			gamePlays: {},
			...EMPTY_JOURNAL,
			hideout: {}
		});
	});

	it('brings a version 5 profile to the current version with no play counted yet', () => {
		const current = parseProfile(migrateProfile(STORED_BY_VERSION_4));
		const stored = { ...asVersion5(current), earnedRewardIds: ['fr.reward.a'] };
		expect(parseProfile(migrateProfile(stored))).toEqual({
			...current,
			earnedRewardIds: ['fr.reward.a'],
			gamePlays: {}
		});
	});

	it('keeps the rewards and the help quest of a record that already holds them', () => {
		const stored = {
			...STORED_BY_VERSION_4,
			earnedRewardIds: ['fr.reward.a'],
			helpQuest: { char: 'f', lessonPlays: 4 }
		};
		const migrated = parseProfile(migrateProfile(stored));
		expect(migrated.earnedRewardIds).toEqual(['fr.reward.a']);
		expect(migrated.helpQuest).toEqual({ char: 'f', lessonPlays: 4 });
	});

	it('brings a version 2 profile to the current version with nothing lost', () => {
		expect(parseProfile(migrateProfile(STORED_BY_VERSION_2))).toEqual(profileOfVersion2());
	});

	it.each<[string, number, number, { attempts: number; errors: number }[]]>([
		['is given no recent play when it was never typed', 0, 0, []],
		['keeps its totals as one recent play under the window', 29, 4, [{ attempts: 29, errors: 4 }]],
		['keeps its totals as one recent play at the window', 30, 30, [{ attempts: 30, errors: 30 }]],
		['is brought down to the window at the same rate', 300, 100, [{ attempts: 30, errors: 10 }]],
		['has its errors rounded to the nearest', 100, 8, [{ attempts: 30, errors: 2 }]],
		['has its errors rounded up above the half', 100, 9, [{ attempts: 30, errors: 3 }]],
		['has its errors rounded up at the half', 60, 1, [{ attempts: 30, errors: 1 }]],
		['loses a rare old error', 1000, 10, [{ attempts: 30, errors: 0 }]],
		['never has more errors than keystrokes', 4, 11, [{ attempts: 4, errors: 4 }]]
	])('a character of a version 2 profile %s', (_label, attempts, errors, recent) => {
		const stored = {
			...STORED_BY_VERSION_2,
			progress: { lessons: {}, chars: { f: { attempts, errors } } }
		};
		expect(parseProfile(migrateProfile(stored)).progress.chars['f']).toEqual({
			attempts,
			errors,
			recent: recent.map((sample) => ({ ...sample, latencyMs: null }))
		});
	});

	it('does not alter the record it is given', () => {
		for (const record of [STORED_BY_VERSION_1, STORED_BY_VERSION_2, STORED_BY_VERSION_4]) {
			const stored = structuredClone(record);
			migrateProfile(stored);
			expect(stored).toEqual(record);
		}
	});

	it('describes version 1 and version 2 the way the test support does', () => {
		expect(asVersion1(playedProfile())).toEqual(STORED_BY_VERSION_1);
		expect(asVersion2(profileOfVersion2())).toEqual(STORED_BY_VERSION_2);
		const profileOfVersion4 = parseProfile({
			...STORED_BY_VERSION_4,
			schemaVersion: 16,
			keptOpenLessonIds: [],
			settings: {
				...STORED_BY_VERSION_4.settings,
				errorPolicy: 'world',
				sessionLength: 'normal',
				keyboardFade: true,
				effects: true,
				ambience: 'none',
				ageBand: '8-9'
			},
			progress: {
				...STORED_BY_VERSION_4.progress,
				chars: {
					f: { attempts: 40, errors: 9, recent: [{ attempts: 30, errors: 6, latencyMs: 250 }] }
				}
			},
			earnedRewardIds: [],
			helpQuest: null,
			gamePlays: {},
			...EMPTY_JOURNAL,
			hideout: {}
		});
		expect(asVersion4(profileOfVersion4)).toEqual(STORED_BY_VERSION_4);
		const withoutHideout: Record<string, unknown> = { ...profileOfVersion4 };
		delete withoutHideout['hideout'];
		delete withoutHideout['keptOpenLessonIds'];
		expect(asVersion7(profileOfVersion4)).toEqual({
			...withoutHideout,
			settings: STORED_BY_VERSION_4.settings,
			schemaVersion: 7,
			progress: STORED_BY_VERSION_4.progress
		});
	});

	it('keeps the id, the name, the date, the settings, the lessons and the totals of any version 1 profile', () => {
		fc.assert(
			fc.property(firstVersionProfileArb, (profile) => {
				const migrated = parseProfile(migrateProfile(toJson(asVersion1(profile))));
				expect(migrated.id).toBe(profile.id);
				expect(migrated.name).toBe(profile.name);
				expect(migrated.createdAt).toBe(profile.createdAt);
				expect(migrated.calibrated).toBe(profile.calibrated);
				expect(migrated.progress).toEqual(migratedProgress(profile.progress));
				expect(migrated.settings).toEqual({
					...profile.settings,
					voiceEnabled: true,
					handGuide: 'auto',
					errorPolicy: 'world',
					sessionLength: 'normal',
					keyboardFade: true,
					effects: true,
					ambience: 'none',
					ageBand: '8-9'
				});
			})
		);
	});

	it('changes nothing but the recent plays of any version 2 profile', () => {
		fc.assert(
			fc.property(profileArb, (profile) => {
				const migrated = parseProfile(migrateProfile(toJson(asVersion2(profile))));
				expect(migrated).toEqual({
					...profile,
					settings: {
						...profile.settings,
						handGuide: 'auto',
						errorPolicy: 'world',
						sessionLength: 'normal',
						keyboardFade: true,
						effects: true,
						ambience: 'none',
						ageBand: '8-9'
					},
					progress: migratedProgress(profile.progress),
					earnedRewardIds: [],
					helpQuest: null,
					...EMPTY_JOURNAL,
					hideout: {},
					keptOpenLessonIds: []
				});
				for (const [char, stats] of Object.entries(migrated.progress.chars)) {
					expect(stats.recent.length).toBeLessThanOrEqual(1);
					const kept = stats.recent[0];
					if (kept === undefined) continue;
					const before = profile.progress.chars[char] as CharProgress;
					expect(kept.attempts).toBe(Math.min(before.attempts, WINDOW_AT_VERSION_3));
					const bounded = Math.min(before.errors, before.attempts);
					const exact = (bounded * kept.attempts) / before.attempts;
					expect(Math.abs(kept.errors - exact)).toBeLessThanOrEqual(0.5);
				}
			})
		);
	});

	it('changes nothing but the hand guide of any version 3 profile, which follows the lessons', () => {
		fc.assert(
			fc.property(profileArb, (profile) => {
				const migrated = parseProfile(migrateProfile(toJson(asVersion3(profile))));
				expect(migrated).toEqual({
					...withUnknownLatency(profile),
					settings: {
						...profile.settings,
						handGuide: 'auto',
						errorPolicy: 'world',
						sessionLength: 'normal',
						keyboardFade: true,
						effects: true,
						ambience: 'none',
						ageBand: '8-9'
					},
					earnedRewardIds: [],
					helpQuest: null,
					...EMPTY_JOURNAL,
					hideout: {},
					keptOpenLessonIds: []
				});
			})
		);
	});

	it('changes nothing but the rewards kept and the help quest of any version 4 profile', () => {
		fc.assert(
			fc.property(profileArb, (profile) => {
				const migrated = parseProfile(migrateProfile(toJson(asVersion4(profile))));
				expect(migrated).toEqual({
					...withRetryPolicy(withUnknownLatency(profile)),
					earnedRewardIds: [],
					helpQuest: null,
					...EMPTY_JOURNAL,
					hideout: {},
					keptOpenLessonIds: []
				});
			})
		);
	});

	it('changes nothing but the plays of each game and the journal of any version 5 profile', () => {
		fc.assert(
			fc.property(profileArb, (profile) => {
				const migrated = parseProfile(migrateProfile(toJson(asVersion5(profile))));
				expect(migrated).toEqual({
					...withRetryPolicy(withUnknownLatency(profile)),
					gamePlays: {},
					...EMPTY_JOURNAL
				});
			})
		);
	});

	it('changes nothing but the journal of any version 6 profile, which starts empty', () => {
		fc.assert(
			fc.property(profileArb, (profile) => {
				const migrated = parseProfile(migrateProfile(toJson(asVersion6(profile))));
				expect(migrated).toEqual({
					...withRetryPolicy(withUnknownLatency(profile)),
					...EMPTY_JOURNAL
				});
			})
		);
	});

	it('does not rebuild the days played of a version 6 profile from the last play of its lessons', () => {
		const current = parseProfile(migrateProfile(STORED_BY_VERSION_2));
		expect(Object.keys(current.progress.lessons).length).toBeGreaterThan(0);
		const migrated = parseProfile(migrateProfile(asVersion6(current)));
		expect(migrated.practiceDays).toEqual([]);
		expect(migrated.sessions).toEqual([]);
		expect(migrated.progress).toEqual(current.progress);
	});

	it('keeps the journal of a version 6 record that already holds it', () => {
		const stored = {
			...asVersion6(parseProfile(migrateProfile(STORED_BY_VERSION_4))),
			practiceDays: ['2026-11-03'],
			openedWorldIds: ['fr.world.x']
		};
		const migrated = parseProfile(migrateProfile(stored));
		expect(migrated.practiceDays).toEqual(['2026-11-03']);
		expect(migrated.openedWorldIds).toEqual(['fr.world.x']);
	});

	it('brings any version 1 profile to the current version, with nothing earned yet', () => {
		fc.assert(
			fc.property(firstVersionProfileArb, (profile) => {
				const migrated = parseProfile(migrateProfile(toJson(asVersion1(profile))));
				expect(migrated.schemaVersion).toBe(PROFILE_SCHEMA_VERSION);
				expect(migrated.earnedRewardIds).toEqual([]);
				expect(migrated.helpQuest).toBeNull();
				expect(migrated.companion).toEqual({ name: '', colorId: null, wornItemIds: [] });
			})
		);
	});

	it('says that no play of a version 7 profile kept its time, and changes nothing else', () => {
		fc.assert(
			fc.property(profileArb, (profile) => {
				const migrated = parseProfile(migrateProfile(toJson(asVersion7(profile))));
				expect(migrated).toEqual(withRetryPolicy(withUnknownLatency(profile)));
			})
		);
	});

	it('lets the worlds decide for the mistakes in any version 8 profile, and changes nothing else', () => {
		fc.assert(
			fc.property(profileArb, (profile) => {
				const migrated = parseProfile(migrateProfile(toJson(asVersion8(profile))));
				expect(migrated).toEqual(withRetryPolicy(profile));
				expect(migrated.settings.errorPolicy).toBe('world');
				expect(migrated.settings.keyboardFade).toBe(true);
			})
		);
	});

	it('fades the known keys in any version 9 profile, and changes nothing else', () => {
		fc.assert(
			fc.property(profileArb, (profile) => {
				const migrated = parseProfile(migrateProfile(toJson(asVersion9(profile))));
				expect(migrated).toEqual(withKeyboardFade(profile));
				expect(migrated.settings.keyboardFade).toBe(true);
			})
		);
	});

	it('keeps the effects and adds no background sound to any version 10 profile, and changes nothing else', () => {
		fc.assert(
			fc.property(profileArb, (profile) => {
				const migrated = parseProfile(migrateProfile(toJson(asVersion10(profile))));
				expect(migrated).toEqual(withSensoryDefaults(profile));
				expect(migrated.schemaVersion).toBe(16);
				expect(migrated.settings.effects).toBe(true);
				expect(migrated.settings.ambience).toBe('none');
			})
		);
	});

	it('gives the words of the 8-9 year olds to any version 11 profile, and changes nothing else', () => {
		fc.assert(
			fc.property(profileArb, (profile) => {
				const migrated = parseProfile(migrateProfile(toJson(asVersion11(profile))));
				expect(migrated).toEqual(withYoungerAgeBand(profile));
				expect(migrated.schemaVersion).toBe(16);
				expect(migrated.settings.ageBand).toBe('8-9');
			})
		);
	});

	it('gives an empty hideout to any version 12 profile, and changes nothing else', () => {
		fc.assert(
			fc.property(profileArb, (profile) => {
				const migrated = parseProfile(migrateProfile(toJson(asVersion12(profile))));
				expect(migrated).toEqual(withEmptyHideout(profile));
				expect(migrated.schemaVersion).toBe(16);
				expect(migrated.hideout).toEqual({});
			})
		);
	});

	it('keeps the journal of any version 13 profile as it was, no play saying how it was measured', () => {
		fc.assert(
			fc.property(profileArb, (profile) => {
				const migrated = parseProfile(migrateProfile(toJson(asVersion13(profile))));
				expect(migrated).toEqual(withUnmarkedSessions(profile));
				expect(migrated.schemaVersion).toBe(16);
				expect(migrated.sessions.every((session) => !Object.hasOwn(session, 'speedRule'))).toBe(
					true
				);
			})
		);
	});

	it('keeps the speed of the plays of a version 13 profile, to the last digit', () => {
		const current = parseProfile(migrateProfile(STORED_BY_VERSION_4));
		const session = {
			lessonId: 'fr.lesson.x',
			gameId: 'rocket',
			finishedAt: 1_793_800_000_000,
			utcOffsetMinutes: 60,
			durationMs: 16_000,
			totalKeystrokes: 20,
			correctKeystrokes: 20,
			errorCount: 0,
			accuracy: 100,
			correctCharsPerMinute: 75.123_456_789,
			stars: 3,
			passed: true
		};
		const stored = { ...asVersion13(current), sessions: [session] };
		expect(parseProfile(migrateProfile(stored)).sessions).toEqual([session]);
	});

	it('keeps the hideout of a version 12 record that already holds it', () => {
		const current = parseProfile(migrateProfile(STORED_BY_VERSION_4));
		const stored = { ...asVersion12(current), hideout: { shelf: 'fr.reward.crown' } };
		const migrated = parseProfile(migrateProfile(stored));
		expect(migrated.hideout).toEqual({ shelf: 'fr.reward.crown' });
	});

	it('keeps the age group of a version 11 record that already holds it', () => {
		const current = parseProfile(migrateProfile(STORED_BY_VERSION_4));
		const stored = asVersion11(current);
		const settings = { ...(stored['settings'] as Json), ageBand: '10-12' };
		const migrated = parseProfile(migrateProfile({ ...stored, settings }));
		expect(migrated.schemaVersion).toBe(16);
		expect(migrated.settings.ageBand).toBe('10-12');
	});

	it('keeps the sensory choices of a version 10 record that already holds them', () => {
		const current = parseProfile(migrateProfile(STORED_BY_VERSION_4));
		const stored = asVersion10(current);
		const settings = { ...(stored['settings'] as Json), effects: false, ambience: 'soft-noise' };
		const migrated = parseProfile(migrateProfile({ ...stored, settings }));
		expect(migrated.schemaVersion).toBe(16);
		expect(migrated.settings.effects).toBe(false);
		expect(migrated.settings.ambience).toBe('soft-noise');
	});

	it('keeps the choice of the fading keys of a version 9 record that already holds it', () => {
		const current = parseProfile(migrateProfile(STORED_BY_VERSION_4));
		const stored = asVersion9(current);
		const settings = { ...(stored['settings'] as Json), keyboardFade: false };
		const migrated = parseProfile(migrateProfile({ ...stored, settings }));
		expect(migrated.schemaVersion).toBe(16);
		expect(migrated.settings.keyboardFade).toBe(false);
	});

	it('keeps the choice of Backspace of a version 8 record that already holds it', () => {
		const current = parseProfile(migrateProfile(STORED_BY_VERSION_4));
		const stored = asVersion8(current);
		const settings = { ...(stored['settings'] as Json), errorPolicy: 'backspace' };
		const migrated = parseProfile(migrateProfile({ ...stored, settings }));
		expect(migrated.schemaVersion).toBe(16);
		expect(migrated.settings.errorPolicy).toBe('backspace');
	});

	it('gives a time of null to every recent play of a version 7 record', () => {
		const stored = {
			...asVersion7(parseProfile(migrateProfile(STORED_BY_VERSION_4))),
			progress: {
				lessons: {},
				chars: {
					f: {
						attempts: 50,
						errors: 6,
						recent: [
							{ attempts: 30, errors: 6 },
							{ attempts: 20, errors: 0 }
						]
					},
					j: { attempts: 0, errors: 0, recent: [] }
				}
			}
		};
		const migrated = parseProfile(migrateProfile(stored));
		expect(migrated.schemaVersion).toBe(16);
		expect(migrated.progress.chars).toEqual({
			f: {
				attempts: 50,
				errors: 6,
				recent: [
					{ attempts: 30, errors: 6, latencyMs: null },
					{ attempts: 20, errors: 0, latencyMs: null }
				]
			},
			j: { attempts: 0, errors: 0, recent: [] }
		});
	});

	it('passes on a damaged version 7 progress for the parser to refuse', () => {
		const current = parseProfile(migrateProfile(STORED_BY_VERSION_4));
		for (const progress of [
			null,
			{ lessons: {}, chars: null },
			{ lessons: {}, chars: { f: 3 } },
			{ lessons: {}, chars: { f: { attempts: 1, errors: 0, recent: 'x' } } },
			{ lessons: {}, chars: { f: { attempts: 1, errors: 0, recent: [7] } } }
		]) {
			const stored = { ...asVersion7(current), progress };
			expect(readProfile(stored).ok).toBe(false);
		}
	});

	it('leaves a profile of the current version as it is', () => {
		fc.assert(
			fc.property(profileArb, (profile) => {
				const data = toJson(profile);
				expect(migrateProfile(data)).toBe(data);
				expect(parseProfile(migrateProfile(data))).toEqual(profile);
			})
		);
	});

	it('changes nothing when applied twice', () => {
		fc.assert(
			fc.property(profileArb, (profile) => {
				for (const stored of [
					asVersion1(profile),
					asVersion2(profile),
					asVersion3(profile),
					asVersion4(profile),
					asVersion5(profile),
					asVersion6(profile),
					asVersion7(profile),
					asVersion8(profile),
					asVersion9(profile),
					asVersion10(profile),
					asVersion11(profile),
					asVersion12(profile),
					asVersion13(profile),
					asVersion14(profile)
				]) {
					const once = migrateProfile(toJson(stored));
					expect(migrateProfile(once)).toEqual(once);
				}
			})
		);
	});

	it('does not make valid a version 1 record that carries something unknown', () => {
		const withExtra = { ...STORED_BY_VERSION_1, coins: 12 };
		const withBadCompanion = { ...STORED_BY_VERSION_1, companion: 'Pixel' };
		const withBadSetting = {
			...STORED_BY_VERSION_1,
			settings: { ...STORED_BY_VERSION_1.settings, voiceEnabled: 'loud' }
		};
		for (const data of [withExtra, withBadCompanion, withBadSetting]) {
			expect(() => parseProfile(migrateProfile(data))).toThrow();
		}
	});

	it('does not make valid a version 4 record that carries something unknown or damaged', () => {
		const damaged = [
			{ ...STORED_BY_VERSION_4, coins: 12 },
			{ ...STORED_BY_VERSION_4, earnedRewardIds: ['a', 'a'] },
			{ ...STORED_BY_VERSION_4, earnedRewardIds: 'a' },
			{ ...STORED_BY_VERSION_4, helpQuest: { char: 'f' } },
			{ ...STORED_BY_VERSION_4, helpQuest: { char: 'f', lessonPlays: 1, at: 2 } },
			{ ...STORED_BY_VERSION_4, helpQuest: 'f' }
		];
		for (const data of damaged) expect(() => parseProfile(migrateProfile(data))).toThrow();
	});

	it('does not make valid a version 2 record whose characters carry something unknown or damaged', () => {
		const withChars = (chars: unknown) => ({
			...STORED_BY_VERSION_2,
			progress: { ...STORED_BY_VERSION_2.progress, chars }
		});
		expect(() =>
			parseProfile(migrateProfile(withChars({ f: { attempts: 3, errors: 0, streak: 4 } })))
		).toThrow(/chars\.f\.streak/);
		expect(() =>
			parseProfile(migrateProfile(withChars({ f: { attempts: 3, errors: 0, recent: 'none' } })))
		).toThrow(/chars\.f\.recent/);
		expect(() =>
			parseProfile(migrateProfile(withChars({ f: { attempts: '3', errors: 0 } })))
		).toThrow(/chars\.f\.attempts/);
		expect(() =>
			parseProfile(migrateProfile(withChars({ f: { attempts: 3.5, errors: 1 } })))
		).toThrow(/chars\.f\.attempts/);
		expect(() => parseProfile(migrateProfile(withChars({ f: { attempts: 3 } })))).toThrow(
			/chars\.f\.errors/
		);
		expect(() => parseProfile(migrateProfile(withChars({ f: 12 })))).toThrow(/chars\.f/);
		expect(() => parseProfile(migrateProfile(withChars(['f'])))).toThrow(/progress\.chars/);
	});

	it('passes on damaged settings and damaged progress for the parser to refuse', () => {
		const data = { ...STORED_BY_VERSION_1, settings: 'none' };
		expect(() => parseProfile(migrateProfile(data))).toThrow(/profile\.settings/);
		for (const stored of [STORED_BY_VERSION_1, STORED_BY_VERSION_2]) {
			expect(() => parseProfile(migrateProfile({ ...stored, progress: 'none' }))).toThrow(
				/profile\.progress/
			);
			expect(() => parseProfile(migrateProfile({ ...stored, progress: { lessons: {} } }))).toThrow(
				/progress\.chars/
			);
		}
	});

	it('says that a profile of a later version is too recent', () => {
		expect(reasonOf({ ...STORED_BY_VERSION_1, schemaVersion: PROFILE_SCHEMA_VERSION + 1 })).toBe(
			'newer-version'
		);
		expect(reasonOf({ schemaVersion: 40 })).toBe('newer-version');
	});

	it.each<[string, unknown]>([
		['null', null],
		['a string', 'profile'],
		['a list', [STORED_BY_VERSION_1]],
		['no version', { id: 'a' }],
		['version zero', { ...STORED_BY_VERSION_1, schemaVersion: 0 }],
		['a negative version', { ...STORED_BY_VERSION_1, schemaVersion: -2 }],
		['a fractional version', { ...STORED_BY_VERSION_1, schemaVersion: 1.5 }],
		['a version as text', { ...STORED_BY_VERSION_1, schemaVersion: '1' }],
		['an endless version', { ...STORED_BY_VERSION_1, schemaVersion: Number.POSITIVE_INFINITY }]
	])('says that %s is invalid', (_label, data) => {
		expect(reasonOf(data)).toBe('invalid');
	});

	it('never fails in another way, whatever it is given', () => {
		fc.assert(
			fc.property(fc.anything(), (data) => {
				expect(['migrated', 'newer-version', 'invalid']).toContain(reasonOf(data));
			})
		);
	});

	it('never fails in another way, whatever a record of a known version holds', () => {
		fc.assert(
			fc.property(
				fc.constantFrom(1, 2),
				fc.anything(),
				fc.anything(),
				(version, progress, chars) => {
					expect(reasonOf({ schemaVersion: version, progress })).toBe('migrated');
					expect(reasonOf({ schemaVersion: version, progress: { chars } })).toBe('migrated');
					expect(reasonOf({ schemaVersion: version, progress: { chars: { f: chars } } })).toBe(
						'migrated'
					);
				}
			)
		);
	});
});

describe('readProfile', () => {
	it('opens a profile of the current version', () => {
		const profile = playedProfile();
		expect(readProfile(toJson(profile))).toEqual({ ok: true, profile });
	});

	it('opens a version 1 profile as a profile of the current version', () => {
		expect(readProfile(STORED_BY_VERSION_1)).toEqual({ ok: true, profile: playedProfile() });
	});

	it('opens a version 2 profile as a profile of the current version', () => {
		expect(readProfile(STORED_BY_VERSION_2)).toEqual({ ok: true, profile: profileOfVersion2() });
	});

	it('reports a profile of a later version with its id and its name', () => {
		const data = {
			...(toJson(playedProfile()) as Json),
			schemaVersion: PROFILE_SCHEMA_VERSION + 1,
			badges: ['a']
		};
		expect(readProfile(data)).toEqual({
			ok: false,
			unreadable: { id: 'p-1', name: 'Léa', reason: 'newer-version' }
		});
	});

	it('reports a damaged profile with what can still be read of it', () => {
		expect(readProfile({ ...STORED_BY_VERSION_1, settings: {} })).toEqual({
			ok: false,
			unreadable: { id: 'p-1', name: 'Léa', reason: 'invalid' }
		});
		expect(readProfile({ id: 'broken', name: 42 })).toEqual({
			ok: false,
			unreadable: { id: 'broken', name: null, reason: 'invalid' }
		});
		expect(readProfile({ schemaVersion: 1, id: '', name: '' })).toEqual({
			ok: false,
			unreadable: { id: null, name: null, reason: 'invalid' }
		});
	});

	it('reports what is not even an object', () => {
		for (const data of [null, undefined, 'profile', 12, []]) {
			expect(readProfile(data)).toEqual({
				ok: false,
				unreadable: { id: null, name: null, reason: 'invalid' }
			});
		}
	});

	it('never throws, whatever it is given', () => {
		fc.assert(
			fc.property(fc.anything(), (data) => {
				expect(readProfile(data).ok).toBe(false);
			})
		);
	});
});

describe('version 15: the lessons changed order (ADR-075)', () => {
	const base = parseProfile(migrateProfile(STORED_BY_VERSION_4));
	const played = (bestAccuracy: number) => ({
		bestAccuracy,
		stars: 1,
		attempts: 2,
		lastPlayedAt: 7
	});

	/** A record of version 14 that played these lessons, with the best accuracy of each. */
	function storedWith(lessons: Record<string, number>): Json {
		const progress = {
			lessons: Object.fromEntries(
				Object.entries(lessons).map(([id, accuracy]) => [id, played(accuracy)])
			),
			chars: {}
		};
		return { ...asVersion14(base), progress };
	}

	it('keeps no lesson open for a child who passed none', () => {
		const migrated = parseProfile(migrateProfile(asVersion14(base)));
		expect(migrated.schemaVersion).toBe(16);
		expect(migrated.keptOpenLessonIds).toEqual([]);
		expect(parseProfile(migrateProfile(storedWith({}))).keptOpenLessonIds).toEqual([]);
	});

	it('keeps open the lesson that followed the last passed one in the order of version 14', () => {
		// After « é ' » came « g h »: capitals and the full stop now stand between them.
		const stored = storedWith({ 'fr.lesson.epices-accent-apostrophe': 92 });
		expect(parseProfile(migrateProfile(stored)).keptOpenLessonIds).toEqual([
			'fr.lesson.girafe-g-h'
		]);
		// After the comma came « ? ! »: the lessons of the zoo now stand between them.
		const further = storedWith({ 'fr.lesson.virgule-point': 85 });
		expect(parseProfile(migrateProfile(further)).keptOpenLessonIds).toEqual([
			'fr.lesson.klaxon-question-exclamation'
		]);
	});

	it('keeps open every lesson that followed a passed one, in the order of version 14', () => {
		const stored = storedWith({
			'fr.lesson.oeufs-f-j': 100,
			'fr.lesson.zebre-z-w': 81,
			'fr.lesson.lune-accents-graves': 60,
			'fr.lesson.trema': 99
		});
		expect(parseProfile(migrateProfile(stored)).keptOpenLessonIds).toEqual([
			'fr.lesson.saut-espace',
			'fr.lesson.lune-accents-graves',
			'fr.lesson.liste-pique-nique'
		]);
	});

	it('counts a lesson as passed from 80 on, as version 14 did, and not below', () => {
		const at = (accuracy: number) =>
			parseProfile(migrateProfile(storedWith({ 'fr.lesson.oeufs-f-j': accuracy })))
				.keptOpenLessonIds;
		expect(at(79.99)).toEqual([]);
		expect(at(80)).toEqual(['fr.lesson.saut-espace']);
		expect(at(80 - 1e-12)).toEqual(['fr.lesson.saut-espace']);
	});

	it('keeps nothing open after the last lesson, nor for lessons it does not know', () => {
		const stored = storedWith({ 'fr.lesson.reparer-message': 100, 'fr.lesson.unknown': 100 });
		expect(parseProfile(migrateProfile(stored)).keptOpenLessonIds).toEqual([]);
	});

	it('touches neither the lessons, nor the stars, nor the rewards', () => {
		const earned = ['fr.reward.chili-nose', 'fr.reward.crown'];
		const stored: Json = {
			...storedWith({ 'fr.lesson.epices-accent-apostrophe': 92, 'fr.lesson.girafe-g-h': 40 }),
			earnedRewardIds: earned
		};
		const migrated = parseProfile(migrateProfile(stored));
		expect(migrated.progress).toEqual(stored['progress']);
		expect(migrated.earnedRewardIds).toEqual(earned);
		expect(migrated).toEqual({
			...base,
			progress: stored['progress'],
			earnedRewardIds: earned,
			keptOpenLessonIds: ['fr.lesson.girafe-g-h']
		});
	});

	it('keeps the lessons kept open of a record that already holds them', () => {
		const stored = {
			...storedWith({ 'fr.lesson.oeufs-f-j': 100 }),
			keptOpenLessonIds: ['fr.lesson.x']
		};
		expect(parseProfile(migrateProfile(stored)).keptOpenLessonIds).toEqual(['fr.lesson.x']);
	});

	it('passes on damaged lessons for the parser to refuse', () => {
		for (const lessons of [null, 3, { 'fr.lesson.oeufs-f-j': 'passed' }]) {
			const stored = { ...asVersion14(base), progress: { lessons, chars: {} } };
			expect(readProfile(stored).ok).toBe(false);
		}
	});

	it('changes nothing but the lessons kept open of any version 14 profile', () => {
		fc.assert(
			fc.property(profileArb, (profile) => {
				const migrated = parseProfile(migrateProfile(toJson(asVersion14(profile))));
				expect(migrated).toEqual(withNothingKeptOpen(profile));
			})
		);
	});
});

describe('version 16: the worlds decide for the mistakes, the adult sets the session (ADR-075)', () => {
	const base = parseProfile(migrateProfile(STORED_BY_VERSION_4));

	/** The record version 15 stored for `base`, with this choice of the adult for the mistakes. */
	function storedWith(errorPolicy: unknown): Json {
		const stored = asVersion15(base);
		return { ...stored, settings: { ...(stored['settings'] as Json), errorPolicy } };
	}

	it('describes version 15 without the length of a session, with its two choices', () => {
		const stored = asVersion15(base);
		expect(stored['schemaVersion']).toBe(15);
		expect(stored['settings']).not.toHaveProperty('sessionLength');
		expect((stored['settings'] as Json)['errorPolicy']).toBe('retry');
		expect(
			(asVersion15(updateSettings(base, { errorPolicy: 'backspace' }))['settings'] as Json)[
				'errorPolicy'
			]
		).toBe('backspace');
	});

	it('lets the worlds decide where the game waited for the right key', () => {
		const migrated = parseProfile(migrateProfile(storedWith('retry')));
		expect(migrated.schemaVersion).toBe(16);
		expect(migrated.settings.errorPolicy).toBe('world');
	});

	it('keeps Backspace where the adult had chosen it: it now holds in every world', () => {
		const migrated = parseProfile(migrateProfile(storedWith('backspace')));
		expect(migrated.settings.errorPolicy).toBe('backspace');
	});

	it('gives a session its usual length', () => {
		expect(parseProfile(migrateProfile(storedWith('retry'))).settings.sessionLength).toBe('normal');
	});

	it('keeps the length of a session of a record that already holds it', () => {
		const stored = storedWith('retry');
		const settings = { ...(stored['settings'] as Json), sessionLength: 'long' };
		const migrated = parseProfile(migrateProfile({ ...stored, settings }));
		expect(migrated.settings.sessionLength).toBe('long');
	});

	it('passes on a damaged choice for the parser to refuse', () => {
		for (const odd of ['always', 3, null]) {
			expect(readProfile(storedWith(odd)).ok).toBe(false);
		}
		const stored = asVersion15(base);
		const settings: Record<string, unknown> = { ...(stored['settings'] as Json) };
		delete settings['errorPolicy'];
		expect(readProfile({ ...stored, settings }).ok).toBe(false);
		expect(readProfile({ ...stored, settings: 'none' }).ok).toBe(false);
	});

	it('touches nothing else: lessons, stars, rewards, journal and lessons kept open stay', () => {
		fc.assert(
			fc.property(profileArb, (profile) => {
				const migrated = parseProfile(migrateProfile(toJson(asVersion15(profile))));
				expect(migrated).toEqual(withWorldPolicy(profile));
				expect(migrated.progress).toEqual(profile.progress);
				expect(migrated.keptOpenLessonIds).toEqual(profile.keptOpenLessonIds);
			})
		);
	});

	it('gives the same profile from a backup of version 15 read again', () => {
		fc.assert(
			fc.property(profileArb, (profile) => {
				const once = parseProfile(migrateProfile(toJson(asVersion15(profile))));
				expect(parseProfile(migrateProfile(toJson(once)))).toEqual(once);
			})
		);
	});
});

describe('version 16: the children on their way lose nothing (ADR-081)', () => {
	const [shipped] = loadShippedProgressions();
	if (!shipped) throw new Error('no shipped progression');
	const { progression } = shipped;
	const ids = lessonIds(progression);
	const erasing = new Set(
		progression.worlds
			.filter((world) => world.errorPolicy === 'backspace')
			.flatMap((world) => world.lessons.map((lesson) => lesson.id))
	);
	/** A profile of version 15 on its way: some lessons played, worlds opened, lessons kept open. */
	const onTheWayArb = fc
		.record({
			profile: profileArb,
			played: fc.dictionary(fc.constantFrom(...ids), fc.integer({ min: 0, max: 100 }), {
				maxKeys: 12
			}),
			opened: fc.uniqueArray(fc.constantFrom(...progression.worlds.map((world) => world.id)), {
				maxLength: 2
			}),
			kept: fc.uniqueArray(fc.constantFrom(...ids), { maxLength: 3 }),
			erasing: fc.boolean()
		})
		.map(({ profile, played, opened, kept, erasing: chose }) => {
			const lessons = Object.fromEntries(
				Object.entries(played).map(([id, bestAccuracy]) => [
					id,
					{ bestAccuracy, stars: 0 as StarCount, attempts: 1, lastPlayedAt: 0 }
				])
			);
			const child: Profile = {
				...profile,
				progress: { ...profile.progress, lessons },
				openedWorldIds: opened,
				keptOpenLessonIds: kept
			};
			return updateSettings(child, { errorPolicy: chose ? 'backspace' : 'retry' });
		});

	it('opens the same lessons after the migration, and erases in the worlds of texts only', () => {
		fc.assert(
			fc.property(onTheWayArb, (child) => {
				const migrated = parseProfile(migrateProfile(toJson(asVersion15(child))));
				for (const id of ids) {
					expect(
						isLessonUnlocked(
							progression,
							migrated.progress,
							id,
							migrated.openedWorldIds,
							migrated.keptOpenLessonIds
						)
					).toBe(
						isLessonUnlocked(
							progression,
							child.progress,
							id,
							child.openedWorldIds,
							child.keptOpenLessonIds
						)
					);
					// The adult who chose Backspace keeps it everywhere; a child who waited for the right
					// key now erases in the worlds that ask for it, and only there.
					const before = child.settings.errorPolicy === 'backspace' ? 'backspace' : 'retry';
					const after = errorPolicyFor(migrated.settings.errorPolicy, progression, id);
					expect(after).toBe(before === 'backspace' || erasing.has(id) ? 'backspace' : 'retry');
				}
			}),
			{ numRuns: 60 }
		);
	});
});
