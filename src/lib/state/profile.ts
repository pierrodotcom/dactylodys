import { parseGhostRun } from '../engine/ghost/ghost';
import type { GhostRun } from '../engine/ghost/types';
import { toGraphemes } from '../engine/graphemes';
import { emptyProgress } from '../engine/progression/progress';
import type {
	CharProgress,
	CharSample,
	HandGuidePreference,
	LessonProgress,
	ProgressState,
	StarCount
} from '../engine/progression/types';
import {
	FINGERING_PROFILE_IDS,
	LAYOUT_IDS,
	type FingeringProfileId,
	type LayoutId
} from '../keyboard/layout-ids';
import type { LayoutPlatform } from '../keyboard/types';
import type {
	CompanionChoice,
	HelpQuestRecord,
	MotionPreference,
	Profile,
	Settings,
	TextScale,
	TextSpacing,
	ThemePreference
} from './types';

const DEFAULT_LAYOUT_BY_PLATFORM: Readonly<Record<LayoutPlatform, LayoutId>> = {
	pc: 'fr-fr-azerty-pc',
	mac: 'fr-fr-azerty-mac'
};
const DEFAULT_FINGERING_PROFILE_ID: FingeringProfileId = 'ten-fingers-iso';
const DEFAULT_SETTINGS_COMMON = {
	fingeringProfileId: DEFAULT_FINGERING_PROFILE_ID,
	soundEnabled: true,
	voiceEnabled: true,
	theme: 'system',
	motion: 'system',
	textScale: 'md',
	textSpacing: 'normal',
	showKeyboard: true,
	handGuide: 'auto'
} as const satisfies Omit<Settings, 'layoutId'>;

const THEMES = ['system', 'light', 'dark'] as const satisfies readonly ThemePreference[];
const MOTIONS = ['system', 'reduced', 'full'] as const satisfies readonly MotionPreference[];
const HAND_GUIDES = ['auto', 'always', 'off'] as const satisfies readonly HandGuidePreference[];
const TEXT_SCALES = ['md', 'lg', 'xl'] as const satisfies readonly TextScale[];
const TEXT_SPACINGS = ['normal', 'wide', 'wider'] as const satisfies readonly TextSpacing[];
const STAR_COUNTS = [0, 1, 2, 3] as const satisfies readonly StarCount[];

/** Version of the profiles this code writes; older ones go through `migrations.ts` first. */
export const PROFILE_SCHEMA_VERSION = 6;
/** Bounds of a nickname, in graphemes. */
export const MIN_NAME_LENGTH = 1;
export const MAX_NAME_LENGTH = 20;
const MAX_ACCURACY = 100;
const CONTROL_CHARACTER_PATTERN = /\p{Cc}/u;

const PROFILE_KEYS = [
	'schemaVersion',
	'id',
	'name',
	'createdAt',
	'calibrated',
	'settings',
	'progress',
	'companion',
	'lastGameByWorld',
	'ghosts',
	'earnedRewardIds',
	'helpQuest',
	'gamePlays'
] as const satisfies readonly (keyof Profile)[];
const SETTINGS_KEYS = [
	'layoutId',
	'fingeringProfileId',
	'soundEnabled',
	'voiceEnabled',
	'theme',
	'motion',
	'textScale',
	'textSpacing',
	'showKeyboard',
	'handGuide'
] as const satisfies readonly (keyof Settings)[];
const PROGRESS_KEYS = ['lessons', 'chars'] as const;
const LESSON_PROGRESS_KEYS = ['bestAccuracy', 'stars', 'attempts', 'lastPlayedAt'] as const;
const CHAR_PROGRESS_KEYS = [
	'attempts',
	'errors',
	'recent'
] as const satisfies readonly (keyof CharProgress)[];
const CHAR_SAMPLE_KEYS = ['attempts', 'errors'] as const satisfies readonly (keyof CharSample)[];
const COMPANION_KEYS = [
	'name',
	'colorId',
	'wornItemIds'
] as const satisfies readonly (keyof CompanionChoice)[];
const HELP_QUEST_KEYS = [
	'char',
	'lessonPlays'
] as const satisfies readonly (keyof HelpQuestRecord)[];
const UNNAMED = '';

export interface NewProfileInput {
	readonly id: string;
	readonly name: string;
	readonly now: number;
	readonly platform: LayoutPlatform;
}

export function defaultSettings(platform: LayoutPlatform): Settings {
	return { layoutId: DEFAULT_LAYOUT_BY_PLATFORM[platform], ...DEFAULT_SETTINGS_COMMON };
}

/**
 * The nickname as it is kept (NFC, trimmed), or `null` when it breaks the rules: the only
 * definition, used by the screens to explain a refusal before a profile is created.
 */
export function normalizeName(name: string): string | null {
	const text = name.normalize('NFC').trim().normalize('NFC');
	const length = toGraphemes(text).length;
	const valid =
		length >= MIN_NAME_LENGTH && length <= MAX_NAME_LENGTH && !CONTROL_CHARACTER_PATTERN.test(text);
	return valid ? text : null;
}

function cleanName(name: string): string {
	const text = normalizeName(name);
	if (text === null) {
		throw new RangeError(
			`name must have ${MIN_NAME_LENGTH} to ${MAX_NAME_LENGTH} characters and no control character`
		);
	}
	return text;
}

function isTimestamp(value: unknown): value is number {
	return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export function createProfile(input: NewProfileInput): Profile {
	if (input.id === '') throw new RangeError('id must not be empty');
	if (!isTimestamp(input.now)) throw new RangeError('now must be a non-negative integer');
	return {
		schemaVersion: PROFILE_SCHEMA_VERSION,
		id: input.id,
		name: cleanName(input.name),
		createdAt: input.now,
		calibrated: false,
		settings: defaultSettings(input.platform),
		progress: emptyProgress(),
		companion: { name: UNNAMED, colorId: null, wornItemIds: [] },
		lastGameByWorld: {},
		ghosts: {},
		earnedRewardIds: [],
		helpQuest: null,
		gamePlays: {}
	};
}

export function renameProfile(profile: Profile, name: string): Profile {
	return { ...profile, name: cleanName(name) };
}

export function updateSettings(profile: Profile, patch: Partial<Settings>): Profile {
	const defined = Object.entries(patch).filter(([, value]) => value !== undefined);
	const settings = parseSettings(
		{ ...profile.settings, ...Object.fromEntries(defined) },
		'settings'
	);
	return { ...profile, settings };
}

export function withProgress(profile: Profile, progress: ProgressState): Profile {
	return { ...profile, progress };
}

export function markCalibrated(profile: Profile): Profile {
	return { ...profile, calibrated: true };
}

/** The name is cleaned like a nickname; a blank one means the companion is not named yet. */
export function withCompanion(profile: Profile, companion: CompanionChoice): Profile {
	const blank = companion.name.trim() === UNNAMED;
	const name = blank ? UNNAMED : cleanName(companion.name);
	return { ...profile, companion: parseCompanion({ ...companion, name }, 'companion') };
}

export function withLastGame(profile: Profile, worldId: string, gameId: string): Profile {
	if (gameId === '') throw new RangeError('gameId must not be empty');
	return { ...profile, lastGameByWorld: { ...profile.lastGameByWorld, [worldId]: gameId } };
}

/** Replaces the ghost of the lesson: only the last passed play is raced against. */
export function withGhost(profile: Profile, lessonId: string, run: GhostRun): Profile {
	return { ...profile, ghosts: { ...profile.ghosts, [lessonId]: parseGhostRun(run) } };
}

/** Adds the identifiers not yet kept, after the others: an earned reward is never removed (ADR-027). */
export function withEarnedRewards(profile: Profile, rewardIds: readonly string[]): Profile {
	const added = rewardIds.filter(
		(id, index) => !profile.earnedRewardIds.includes(id) && rewardIds.indexOf(id) === index
	);
	if (added.length === 0) return profile;
	return {
		...profile,
		earnedRewardIds: parseEarnedRewards([...profile.earnedRewardIds, ...added], 'earnedRewardIds')
	};
}

/** One more play finished with this mini-game. */
export function withGamePlayed(profile: Profile, gameId: string): Profile {
	const id = expectIdentifier(gameId, 'gameId');
	const played = Object.hasOwn(profile.gamePlays, id) ? (profile.gamePlays[id] ?? 0) : 0;
	return { ...profile, gamePlays: { ...profile.gamePlays, [id]: played + 1 } };
}

export function withHelpQuest(profile: Profile, record: HelpQuestRecord): Profile {
	return { ...profile, helpQuest: parseHelpQuest(record, 'helpQuest') };
}

function fail(path: string, message: string): never {
	throw new Error(`${path}: ${message}`);
}

function expectRecord(value: unknown, path: string): Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		fail(path, 'expected an object');
	}
	return value as Record<string, unknown>;
}

function expectExactKeys(record: Record<string, unknown>, keys: readonly string[], path: string) {
	for (const name of Object.keys(record)) {
		if (!keys.includes(name)) fail(`${path}.${name}`, 'unknown property');
	}
	for (const name of keys) {
		if (!Object.hasOwn(record, name)) fail(`${path}.${name}`, 'missing property');
	}
}

function expectBoolean(value: unknown, path: string): boolean {
	if (typeof value !== 'boolean') fail(path, 'expected a boolean');
	return value;
}

function expectOneOf<T extends string>(value: unknown, allowed: readonly T[], path: string): T {
	const found = allowed.find((candidate) => candidate === value);
	if (found === undefined) fail(path, `expected one of ${allowed.join(', ')}`);
	return found;
}

function expectCount(value: unknown, path: string): number {
	if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
		fail(path, 'expected a non-negative integer');
	}
	return value;
}

function expectIdentifier(value: unknown, path: string): string {
	if (typeof value !== 'string' || value === '') fail(path, 'expected a non-empty string');
	return value;
}

function parseSettings(data: unknown, path: string): Settings {
	const record = expectRecord(data, path);
	expectExactKeys(record, SETTINGS_KEYS, path);
	return {
		layoutId: expectOneOf(record['layoutId'], LAYOUT_IDS, `${path}.layoutId`),
		fingeringProfileId: expectOneOf(
			record['fingeringProfileId'],
			FINGERING_PROFILE_IDS,
			`${path}.fingeringProfileId`
		),
		soundEnabled: expectBoolean(record['soundEnabled'], `${path}.soundEnabled`),
		voiceEnabled: expectBoolean(record['voiceEnabled'], `${path}.voiceEnabled`),
		theme: expectOneOf(record['theme'], THEMES, `${path}.theme`),
		motion: expectOneOf(record['motion'], MOTIONS, `${path}.motion`),
		textScale: expectOneOf(record['textScale'], TEXT_SCALES, `${path}.textScale`),
		textSpacing: expectOneOf(record['textSpacing'], TEXT_SPACINGS, `${path}.textSpacing`),
		showKeyboard: expectBoolean(record['showKeyboard'], `${path}.showKeyboard`),
		handGuide: expectOneOf(record['handGuide'], HAND_GUIDES, `${path}.handGuide`)
	};
}

function parseLessonProgress(data: unknown, path: string): LessonProgress {
	const record = expectRecord(data, path);
	expectExactKeys(record, LESSON_PROGRESS_KEYS, path);
	const bestAccuracy = record['bestAccuracy'];
	if (
		typeof bestAccuracy !== 'number' ||
		!Number.isFinite(bestAccuracy) ||
		bestAccuracy < 0 ||
		bestAccuracy > MAX_ACCURACY
	) {
		fail(`${path}.bestAccuracy`, `expected a number from 0 to ${MAX_ACCURACY}`);
	}
	const lastPlayedAt = record['lastPlayedAt'];
	if (!isTimestamp(lastPlayedAt)) fail(`${path}.lastPlayedAt`, 'expected a timestamp');
	const stars = STAR_COUNTS.find((count) => count === record['stars']);
	if (stars === undefined) fail(`${path}.stars`, `expected one of ${STAR_COUNTS.join(', ')}`);
	return {
		bestAccuracy,
		stars,
		attempts: expectCount(record['attempts'], `${path}.attempts`),
		lastPlayedAt
	};
}

function parseCharSample(data: unknown, path: string): CharSample {
	const record = expectRecord(data, path);
	expectExactKeys(record, CHAR_SAMPLE_KEYS, path);
	const attempts = expectCount(record['attempts'], `${path}.attempts`);
	if (attempts < 1) fail(`${path}.attempts`, 'expected at least 1');
	const errors = expectCount(record['errors'], `${path}.errors`);
	if (errors > attempts) fail(`${path}.errors`, `expected at most ${attempts}`);
	return { attempts, errors };
}

function parseCharProgress(data: unknown, path: string): CharProgress {
	const record = expectRecord(data, path);
	expectExactKeys(record, CHAR_PROGRESS_KEYS, path);
	const recent = record['recent'];
	if (!Array.isArray(recent)) fail(`${path}.recent`, 'expected an array');
	return {
		attempts: expectCount(record['attempts'], `${path}.attempts`),
		errors: expectCount(record['errors'], `${path}.errors`),
		recent: recent.map((sample: unknown, index) =>
			parseCharSample(sample, `${path}.recent[${index}]`)
		)
	};
}

function parseRecordOf<T>(
	data: unknown,
	path: string,
	parseEntry: (value: unknown, entryPath: string) => T
): Record<string, T> {
	const record = expectRecord(data, path);
	return Object.fromEntries(
		Object.entries(record).map(([key, value]) => [key, parseEntry(value, `${path}.${key}`)])
	);
}

function parseProgress(data: unknown, path: string): ProgressState {
	const record = expectRecord(data, path);
	expectExactKeys(record, PROGRESS_KEYS, path);
	return {
		lessons: parseRecordOf(record['lessons'], `${path}.lessons`, parseLessonProgress),
		chars: parseRecordOf(record['chars'], `${path}.chars`, parseCharProgress)
	};
}

function parseCompanion(data: unknown, path: string): CompanionChoice {
	const record = expectRecord(data, path);
	expectExactKeys(record, COMPANION_KEYS, path);
	const name = record['name'];
	if (typeof name !== 'string' || (name !== UNNAMED && normalizeName(name) !== name)) {
		fail(
			`${path}.name`,
			`expected nothing or a trimmed NFC name of ${MIN_NAME_LENGTH} to ${MAX_NAME_LENGTH} characters`
		);
	}
	const colorId = record['colorId'];
	const rawItems = record['wornItemIds'];
	if (!Array.isArray(rawItems)) fail(`${path}.wornItemIds`, 'expected an array');
	const wornItemIds: string[] = [];
	rawItems.forEach((raw: unknown, index) => {
		const itemPath = `${path}.wornItemIds[${index}]`;
		const itemId = expectIdentifier(raw, itemPath);
		if (wornItemIds.includes(itemId)) fail(itemPath, `duplicate item "${itemId}"`);
		wornItemIds.push(itemId);
	});
	return {
		name,
		colorId: colorId === null ? null : expectIdentifier(colorId, `${path}.colorId`),
		wornItemIds
	};
}

function parseEarnedRewards(data: unknown, path: string): string[] {
	if (!Array.isArray(data)) fail(path, 'expected an array');
	const ids: string[] = [];
	data.forEach((raw: unknown, index) => {
		const id = expectIdentifier(raw, `${path}[${index}]`);
		if (ids.includes(id)) fail(`${path}[${index}]`, `duplicate reward "${id}"`);
		ids.push(id);
	});
	return ids;
}

function parseHelpQuest(data: unknown, path: string): HelpQuestRecord | null {
	if (data === null) return null;
	const record = expectRecord(data, path);
	expectExactKeys(record, HELP_QUEST_KEYS, path);
	return {
		char: expectIdentifier(record['char'], `${path}.char`),
		lessonPlays: expectCount(record['lessonPlays'], `${path}.lessonPlays`)
	};
}

/** Strict, and only for the current version: stored data goes through `readProfile` instead. */
export function parseProfile(data: unknown): Profile {
	const root = expectRecord(data, 'profile');
	expectExactKeys(root, PROFILE_KEYS, 'profile');
	if (root['schemaVersion'] !== PROFILE_SCHEMA_VERSION) {
		fail('profile.schemaVersion', `expected ${PROFILE_SCHEMA_VERSION}`);
	}
	const id = root['id'];
	if (typeof id !== 'string' || id === '') fail('profile.id', 'expected a non-empty string');
	const name = root['name'];
	if (typeof name !== 'string') fail('profile.name', 'expected a string');
	if (normalizeName(name) !== name) {
		fail(
			'profile.name',
			`expected a trimmed NFC name of ${MIN_NAME_LENGTH} to ${MAX_NAME_LENGTH} characters`
		);
	}
	const createdAt = root['createdAt'];
	if (!isTimestamp(createdAt)) fail('profile.createdAt', 'expected a timestamp');
	return {
		schemaVersion: PROFILE_SCHEMA_VERSION,
		id,
		name,
		createdAt,
		calibrated: expectBoolean(root['calibrated'], 'profile.calibrated'),
		settings: parseSettings(root['settings'], 'profile.settings'),
		progress: parseProgress(root['progress'], 'profile.progress'),
		companion: parseCompanion(root['companion'], 'profile.companion'),
		lastGameByWorld: parseRecordOf(
			root['lastGameByWorld'],
			'profile.lastGameByWorld',
			expectIdentifier
		),
		ghosts: parseRecordOf(root['ghosts'], 'profile.ghosts', parseGhostRun),
		earnedRewardIds: parseEarnedRewards(root['earnedRewardIds'], 'profile.earnedRewardIds'),
		helpQuest: parseHelpQuest(root['helpQuest'], 'profile.helpQuest'),
		gamePlays: parseRecordOf(root['gamePlays'], 'profile.gamePlays', expectCount)
	};
}
