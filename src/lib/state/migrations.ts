import { parseProfile, PROFILE_SCHEMA_VERSION } from './profile';
import type { Profile, UnreadableProfile } from './types';

type StoredRecord = Readonly<Record<string, unknown>>;
type Migration = (record: StoredRecord) => StoredRecord;
type UnreadableReason = UnreadableProfile['reason'];

const FIRST_SCHEMA_VERSION = 1;

/** Stored data that no chain of migrations can bring to the current version. */
export class ProfileMigrationError extends Error {
	readonly reason: UnreadableReason;

	constructor(reason: UnreadableReason, message: string) {
		super(message);
		this.name = 'ProfileMigrationError';
		this.reason = reason;
	}
}

export type ProfileReading =
	| { readonly ok: true; readonly profile: Profile }
	| { readonly ok: false; readonly unreadable: UnreadableProfile };

function isRecord(value: unknown): value is StoredRecord {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/*
 * A step writes its defaults as literals and never reads those of the current code: what a
 * version 1 profile becomes must not change when the defaults of a later version do.
 * What the record already holds is kept, so that an unknown property stays a reason to refuse it.
 */
function toVersion2(record: StoredRecord): StoredRecord {
	const settings = record['settings'];
	return {
		companion: { name: '', colorId: null, wornItemIds: [] },
		lastGameByWorld: {},
		ghosts: {},
		...record,
		settings: isRecord(settings) ? { voiceEnabled: true, ...settings } : settings,
		schemaVersion: 2
	};
}

function isCount(value: unknown): value is number {
	return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

/*
 * A character starts with one recent play made of its lifetime totals, brought down to the 30
 * keystrokes the window of recent results covered when version 3 came out, at the same error rate.
 */
function firstRecentPlays(totals: StoredRecord): unknown[] {
	const attempts = totals['attempts'];
	const errors = totals['errors'];
	if (!isCount(attempts) || !isCount(errors) || attempts === 0) return [];
	const kept = Math.min(attempts, 30);
	return [{ attempts: kept, errors: Math.min(kept, Math.round((errors * kept) / attempts)) }];
}

function toVersion3(record: StoredRecord): StoredRecord {
	const progress = record['progress'];
	const chars = isRecord(progress) ? progress['chars'] : undefined;
	if (!isRecord(progress) || !isRecord(chars)) return { ...record, schemaVersion: 3 };
	const withRecentPlays = Object.entries(chars).map(([char, totals]) => [
		char,
		isRecord(totals) ? { recent: firstRecentPlays(totals), ...totals } : totals
	]);
	return {
		...record,
		progress: { ...progress, chars: Object.fromEntries(withRecentPlays) },
		schemaVersion: 3
	};
}

function toVersion4(record: StoredRecord): StoredRecord {
	const settings = record['settings'];
	return {
		...record,
		settings: isRecord(settings) ? { handGuide: 'auto', ...settings } : settings,
		schemaVersion: 4
	};
}

/* Version 5 (ADR-027, ADR-037): nothing earned is kept yet; the route adds what the progress has unlocked. */
function toVersion5(record: StoredRecord): StoredRecord {
	return { earnedRewardIds: [], helpQuest: null, ...record, schemaVersion: 5 };
}

/* Version 6 (ADR-049): no play is counted yet; the next drawing starts from where the lesson puts it. */
function toVersion6(record: StoredRecord): StoredRecord {
	return { gamePlays: {}, ...record, schemaVersion: 6 };
}

/*
 * Version 7 (ADR-054): the journal starts empty. The days played are not rebuilt from
 * `lastPlayedAt`: it keeps only the last play of each lesson, without the time zone of the device
 * then, so the days would be partial and some on the wrong date; the count starts with version 7.
 */
function toVersion7(record: StoredRecord): StoredRecord {
	return {
		sessions: [],
		practiceDays: [],
		handwritingSamples: [],
		adultWords: [],
		openedWorldIds: [],
		...record,
		schemaVersion: 7
	};
}

/*
 * Version 8: the time before the right keystrokes of a play was not kept until then; every sample
 * already stored says it is unknown.
 */
function withUnknownLatency(totals: unknown): unknown {
	if (!isRecord(totals)) return totals;
	const recent = totals['recent'];
	if (!Array.isArray(recent)) return totals;
	return {
		...totals,
		recent: recent.map((sample: unknown) =>
			isRecord(sample) ? { latencyMs: null, ...sample } : sample
		)
	};
}

function toVersion8(record: StoredRecord): StoredRecord {
	const progress = record['progress'];
	const chars = isRecord(progress) ? progress['chars'] : undefined;
	if (!isRecord(progress) || !isRecord(chars)) return { ...record, schemaVersion: 8 };
	const withLatency = Object.entries(chars).map(([char, totals]) => [
		char,
		withUnknownLatency(totals)
	]);
	return {
		...record,
		progress: { ...progress, chars: Object.fromEntries(withLatency) },
		schemaVersion: 8
	};
}

/* Version 9 (ADR-057): Backspace stays off, as before; only the adult turns it on. */
function toVersion9(record: StoredRecord): StoredRecord {
	const settings = record['settings'];
	return {
		...record,
		settings: isRecord(settings) ? { errorPolicy: 'retry', ...settings } : settings,
		schemaVersion: 9
	};
}

/* Version 10 (ADR-057): the keys the child knows well fade, unless the adult turns it off. */
function toVersion10(record: StoredRecord): StoredRecord {
	const settings = record['settings'];
	return {
		...record,
		settings: isRecord(settings) ? { keyboardFade: true, ...settings } : settings,
		schemaVersion: 10
	};
}

/* Version 11 (ADR-057): the light effects stay on and there is no background sound, as before. */
function toVersion11(record: StoredRecord): StoredRecord {
	const settings = record['settings'];
	return {
		...record,
		settings: isRecord(settings) ? { effects: true, ambience: 'none', ...settings } : settings,
		schemaVersion: 11
	};
}

/* Version 12 (ADR-057, proposal 15): the words of the 8-9 year olds, as before. */
function toVersion12(record: StoredRecord): StoredRecord {
	const settings = record['settings'];
	return {
		...record,
		settings: isRecord(settings) ? { ageBand: '8-9', ...settings } : settings,
		schemaVersion: 12
	};
}

/* Version 13 (ADR-057, proposal 18): the hideout is empty, nothing is put in it yet. */
function toVersion13(record: StoredRecord): StoredRecord {
	return { hideout: {}, ...record, schemaVersion: 13 };
}

/** Keyed by the version a step starts from; each step leads to the version just after. */
const MIGRATIONS: ReadonlyMap<number, Migration> = new Map([
	[FIRST_SCHEMA_VERSION, toVersion2],
	[2, toVersion3],
	[3, toVersion4],
	[4, toVersion5],
	[5, toVersion6],
	[6, toVersion7],
	[7, toVersion8],
	[8, toVersion9],
	[9, toVersion10],
	[10, toVersion11],
	[11, toVersion12],
	[12, toVersion13]
]);

function versionOf(record: StoredRecord): number {
	const version = record['schemaVersion'];
	if (
		typeof version !== 'number' ||
		!Number.isSafeInteger(version) ||
		version < FIRST_SCHEMA_VERSION
	) {
		throw new ProfileMigrationError('invalid', 'profile.schemaVersion: expected a version number');
	}
	if (version > PROFILE_SCHEMA_VERSION) {
		throw new ProfileMigrationError(
			'newer-version',
			`profile.schemaVersion: ${version} is more recent than ${PROFILE_SCHEMA_VERSION}`
		);
	}
	return version;
}

/**
 * Brings stored data to the current version, one version at a time, without validating it:
 * `parseProfile` does that afterwards. Data already at the current version is returned as it is.
 * Throws a `ProfileMigrationError` for what is not a profile of a version this code knows.
 */
export function migrateProfile(data: unknown): unknown {
	if (!isRecord(data)) throw new ProfileMigrationError('invalid', 'profile: expected an object');
	let record = data;
	for (let version = versionOf(record); version < PROFILE_SCHEMA_VERSION; version++) {
		const step = MIGRATIONS.get(version);
		if (!step) {
			throw new ProfileMigrationError(
				'invalid',
				`profile.schemaVersion: no way up from ${version}`
			);
		}
		record = step(record);
	}
	return record;
}

function readText(data: unknown, key: string): string | null {
	if (!isRecord(data)) return null;
	const value = data[key];
	return typeof value === 'string' && value !== '' ? value : null;
}

/** Opens stored data of any known version; what cannot be opened is described, never thrown away. */
export function readProfile(data: unknown): ProfileReading {
	try {
		return { ok: true, profile: parseProfile(migrateProfile(data)) };
	} catch (error) {
		const reason = error instanceof ProfileMigrationError ? error.reason : 'invalid';
		return {
			ok: false,
			unreadable: { id: readText(data, 'id'), name: readText(data, 'name'), reason }
		};
	}
}
