import { readProfile } from './migrations';
import { localDay, parseProfile } from './profile';
import type { Profile } from './types';

/**
 * Technical identifier of a backup file, written in every file and never changed: it is not the
 * name of the app shown to people, which comes from the messages and may change.
 */
export const BACKUP_FORMAT_ID = 'dactylodys-backup';
/** Version of the backup files this code writes; a later one is refused, never half read. */
export const BACKUP_FORMAT_VERSION = 1;
export const BACKUP_FILE_EXTENSION = '.json';

const BACKUP_KEYS = ['format', 'formatVersion', 'exportedAt', 'profiles'] as const;
/* Forbidden in a file name on Windows or macOS, with the control characters. */
const FORBIDDEN_IN_FILE_NAME = /[<>:"/\\|?*\p{Cc}]+/gu;
const SPACES = /\s+/gu;
const EDGE_DOTS_AND_SPACES = /^[.\s]+|[.\s]+$/gu;
const NAME_SEPARATOR = '-';
const BYTE_ORDER_MARK = '\uFEFF';

export interface BackupFile {
	readonly format: typeof BACKUP_FORMAT_ID;
	readonly formatVersion: typeof BACKUP_FORMAT_VERSION;
	readonly exportedAt: number;
	readonly profiles: readonly Profile[];
}

function isTimestamp(value: unknown): value is number {
	return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The text of a backup file holding these profiles, for one child or for all of them. */
export function exportBackup(profiles: readonly Profile[], now: number): string {
	if (!isTimestamp(now)) throw new RangeError('now must be a non-negative integer');
	const ids = new Set(profiles.map((profile) => profile.id));
	if (ids.size !== profiles.length) throw new RangeError('two profiles have the same id');
	const file: BackupFile = {
		format: BACKUP_FORMAT_ID,
		formatVersion: BACKUP_FORMAT_VERSION,
		exportedAt: now,
		profiles: profiles.map((profile) => parseProfile(profile))
	};
	return JSON.stringify(file);
}

export interface BackupFileNameInput {
	/** Given by the screen, from the messages: usually the name of the app. */
	readonly prefix: string;
	/** The nickname of the child for a file of one child; `null` for a file of all of them. */
	readonly playerName: string | null;
	readonly exportedAt: number;
	/** See `SessionRecord.utcOffsetMinutes`: the date in the name is the local one. */
	readonly utcOffsetMinutes: number;
}

function cleanFileNamePart(part: string): string {
	return part
		.normalize('NFC')
		.replace(FORBIDDEN_IN_FILE_NAME, NAME_SEPARATOR)
		.replace(SPACES, ' ')
		.replace(EDGE_DOTS_AND_SPACES, '');
}

/**
 * A name proposed for the backup file, `<prefix>-<nickname>-<YYYY-MM-DD>.json`: the characters
 * Windows or macOS refuse become a dash, and no part starts or ends with a dot or a space.
 */
export function backupFileName(input: BackupFileNameInput): string {
	const day = localDay(input.exportedAt, input.utcOffsetMinutes);
	const parts = [input.prefix, input.playerName ?? '', day]
		.map(cleanFileNamePart)
		.filter((part) => part !== '');
	return `${parts.join(NAME_SEPARATOR)}${BACKUP_FILE_EXTENSION}`;
}

/**
 * Why a file cannot be loaded. `not-a-backup`: not a backup of this app; `newer-version`: written
 * by a more recent version of the app (the file or one of its profiles); `invalid`: a backup, but
 * damaged (cut short, edited by hand...).
 */
export type ImportRefusal = 'not-a-backup' | 'newer-version' | 'invalid';

/** A profile of the file whose `id` is that of a profile already on this device. */
export interface ImportConflict {
	readonly incoming: Profile;
	readonly existing: Profile;
}

export interface ImportReady {
	readonly ok: true;
	readonly exportedAt: number;
	/** Profiles that no profile of this device stands in the way of, in the order of the file. */
	readonly importable: readonly Profile[];
	/** Profiles for which the person chooses "replace" or "keep both", in the order of the file. */
	readonly conflicts: readonly ImportConflict[];
	/** Identifiers already used on this device, which a profile kept beside another must avoid. */
	readonly takenIds: readonly string[];
}

export type ImportPlan = ImportReady | { readonly ok: false; readonly reason: ImportRefusal };

function refuse(reason: ImportRefusal): ImportPlan {
	return { ok: false, reason };
}

function parseJson(text: string): { readonly ok: true; readonly data: unknown } | null {
	try {
		return { ok: true, data: JSON.parse(text) as unknown };
	} catch {
		return null;
	}
}

/**
 * What loading this file would do on a device holding `existing`: nothing is written here. Older
 * profiles are brought to the current version; a file holding anything this version cannot open
 * is refused as a whole.
 */
export function planImport(text: string, existing: readonly Profile[]): ImportPlan {
	const content = text.startsWith(BYTE_ORDER_MARK) ? text.slice(BYTE_ORDER_MARK.length) : text;
	const parsed = parseJson(content);
	// A file cut short is no longer JSON: it is still told apart from any other file by its format.
	if (parsed === null) {
		return refuse(content.includes(JSON.stringify(BACKUP_FORMAT_ID)) ? 'invalid' : 'not-a-backup');
	}
	const root = parsed.data;
	if (!isRecord(root) || root['format'] !== BACKUP_FORMAT_ID) return refuse('not-a-backup');
	const version = root['formatVersion'];
	if (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 1) {
		return refuse('invalid');
	}
	if (version > BACKUP_FORMAT_VERSION) return refuse('newer-version');
	const keys = Object.keys(root);
	if (keys.length !== BACKUP_KEYS.length || !BACKUP_KEYS.every((key) => keys.includes(key))) {
		return refuse('invalid');
	}
	const exportedAt = root['exportedAt'];
	const stored = root['profiles'];
	if (!isTimestamp(exportedAt) || !Array.isArray(stored)) return refuse('invalid');

	const readings = stored.map((data: unknown) => readProfile(data));
	const reasons = readings.flatMap((reading) => (reading.ok ? [] : [reading.unreadable.reason]));
	if (reasons.includes('newer-version')) return refuse('newer-version');
	if (reasons.length > 0) return refuse('invalid');
	const profiles = readings.flatMap((reading) => (reading.ok ? [reading.profile] : []));
	if (new Set(profiles.map((profile) => profile.id)).size !== profiles.length) {
		return refuse('invalid');
	}

	const present = new Map(existing.map((profile) => [profile.id, profile]));
	const importable: Profile[] = [];
	const conflicts: ImportConflict[] = [];
	for (const incoming of profiles) {
		const found = present.get(incoming.id);
		if (found === undefined) importable.push(incoming);
		else conflicts.push({ incoming, existing: found });
	}
	return { ok: true, exportedAt, importable, conflicts, takenIds: [...present.keys()] };
}

export type ConflictChoice = 'replace' | 'keep-both';

export interface ImportedProfile {
	readonly profile: Profile;
	/**
	 * For a profile kept beside the one already present: the `id` of that one. It still bears the
	 * same nickname, and the screen gives it another before saving it.
	 */
	readonly copyOf: string | null;
}

/**
 * The profiles to save once the person has chosen, for each conflict (by `id`), to replace the
 * profile present or to keep both. Throws a `RangeError` for a conflict left without a choice, or
 * when `makeId` gives an identifier already in use.
 */
export function applyImport(
	plan: ImportReady,
	choices: Readonly<Record<string, ConflictChoice>>,
	makeId: () => string
): readonly ImportedProfile[] {
	const taken = new Set([
		...plan.takenIds,
		...plan.importable.map((profile) => profile.id),
		...plan.conflicts.map((conflict) => conflict.incoming.id)
	]);
	const imported: ImportedProfile[] = plan.importable.map((profile) => ({
		profile,
		copyOf: null
	}));
	for (const { incoming } of plan.conflicts) {
		const choice = Object.hasOwn(choices, incoming.id) ? choices[incoming.id] : undefined;
		if (choice === 'replace') {
			imported.push({ profile: incoming, copyOf: null });
		} else if (choice === 'keep-both') {
			const id = makeId();
			if (id === '' || taken.has(id)) throw new RangeError(`makeId gave an id in use: "${id}"`);
			taken.add(id);
			imported.push({ profile: { ...incoming, id }, copyOf: incoming.id });
		} else {
			throw new RangeError(`no choice for the profile "${incoming.id}"`);
		}
	}
	return imported;
}
