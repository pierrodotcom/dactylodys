import { toGraphemes } from '../graphemes';
import type {
	ExerciseMix,
	LessonDefinition,
	LessonUnlock,
	ProgressionDefinition,
	ProgressionRules,
	WorldDefinition
} from './types';

const SPACE = ' ';
const SLUG = '[a-z0-9]+(?:-[a-z0-9]+)*';
const SLUG_PATTERN = new RegExp(`^${SLUG}$`);
const LAYOUT_ID_PATTERN = /^[a-z]{2,3}-[a-z]{2}-[a-z0-9]+-[a-z]+$/;
const CONTROL_PATTERN = /\p{Cc}/u;
const PLAIN_LETTER_PATTERN = /^[a-z]$/;
const MAX_PERCENT = 100;
const MIN_SPACE_GROUP_LENGTH = 3;
const MAX_IDENTICAL_IN_A_ROW = 2;
const KNOWN_UNLOCKS: readonly LessonUnlock[] = ['uppercase'];
const MIX_KEYS = ['drills', 'words', 'phrases'] as const;

interface Introduced {
	readonly chars: Set<string>;
	uppercase: boolean;
}

function fail(path: string, message: string): never {
	throw new Error(`${path}: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function expectRecord(value: unknown, path: string): Record<string, unknown> {
	if (!isRecord(value)) fail(path, 'expected an object');
	return value;
}

function expectArray(value: unknown, path: string): unknown[] {
	if (!Array.isArray(value)) fail(path, 'expected an array');
	return value as unknown[];
}

function expectString(value: unknown, path: string): string {
	if (typeof value !== 'string' || value.trim() === '') fail(path, 'expected a non-empty string');
	return value;
}

function expectNumber(value: unknown, path: string): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) fail(path, 'expected a finite number');
	return value;
}

function expectPercent(value: unknown, path: string): number {
	const number = expectNumber(value, path);
	if (number < 0 || number > MAX_PERCENT)
		fail(path, `expected a number between 0 and ${MAX_PERCENT}`);
	return number;
}

function expectNonNegative(value: unknown, path: string): number {
	const number = expectNumber(value, path);
	if (number < 0) fail(path, 'expected a number of at least 0');
	return number;
}

function expectInteger(value: unknown, path: string): number {
	const number = expectNumber(value, path);
	if (!Number.isInteger(number)) fail(path, 'expected an integer');
	return number;
}

function rejectUnknown(record: Record<string, unknown>, allowed: readonly string[], path: string) {
	for (const name of Object.keys(record)) {
		if (!allowed.includes(name)) fail(`${path}.${name}`, 'unknown property');
	}
}

function expectId(value: unknown, type: string, language: string | null, path: string): string {
	const id = expectString(value, path);
	const match = new RegExp(`^([a-z]{2,3})\\.${type}\\.${SLUG}$`).exec(id);
	if (match === null) fail(path, `expected <language>.${type}.<slug>`);
	if (language !== null && match[1] !== language) {
		fail(path, `expected the language prefix "${language}"`);
	}
	return id;
}

function expectSlug(value: unknown, path: string): string {
	const slug = expectString(value, path);
	if (!SLUG_PATTERN.test(slug)) fail(path, 'expected lowercase words separated by hyphens');
	return slug;
}

function expectGrapheme(value: unknown, path: string): string {
	if (typeof value !== 'string' || value === '') fail(path, 'expected a non-empty string');
	const text = value.normalize('NFC');
	if (toGraphemes(text).length !== 1) fail(path, 'expected exactly one character');
	if (CONTROL_PATTERN.test(text)) fail(path, 'expected a printable character');
	return text;
}

function capitalsOf(chars: Iterable<string>): string[] {
	const capitals = new Set<string>();
	for (const char of chars) {
		if (PLAIN_LETTER_PATTERN.test(char)) capitals.add(char.toUpperCase());
	}
	return [...capitals];
}

function knownChars(introduced: Introduced): Set<string> {
	const known = new Set(introduced.chars);
	if (introduced.uppercase) for (const capital of capitalsOf(known)) known.add(capital);
	return known;
}

function parseRules(value: unknown, path: string): ProgressionRules {
	const record = expectRecord(value, path);
	rejectUnknown(
		record,
		[
			'unlockAccuracy',
			'starThresholds',
			'newCharWeight',
			'weakCharBoost',
			'themeBoost',
			'newCharMinCount'
		],
		path
	);
	const unlockAccuracy = expectPercent(record['unlockAccuracy'], `${path}.unlockAccuracy`);
	const rawThresholds = expectArray(record['starThresholds'], `${path}.starThresholds`);
	if (rawThresholds.length !== 3) fail(`${path}.starThresholds`, 'expected exactly 3 thresholds');
	const thresholds = rawThresholds.map((threshold, i) =>
		expectPercent(threshold, `${path}.starThresholds[${i}]`)
	);
	thresholds.forEach((threshold, i) => {
		const previous = thresholds[i - 1];
		if (previous !== undefined && threshold <= previous) {
			fail(`${path}.starThresholds[${i}]`, 'expected thresholds in strictly ascending order');
		}
	});
	const newCharWeight = expectNumber(record['newCharWeight'], `${path}.newCharWeight`);
	if (newCharWeight < 0 || newCharWeight > 1) {
		fail(`${path}.newCharWeight`, 'expected a number between 0 and 1');
	}
	const newCharMinCount = expectInteger(record['newCharMinCount'], `${path}.newCharMinCount`);
	if (newCharMinCount < 0) fail(`${path}.newCharMinCount`, 'expected an integer of at least 0');
	return {
		unlockAccuracy,
		starThresholds: [thresholds[0] ?? 0, thresholds[1] ?? 0, thresholds[2] ?? 0],
		newCharWeight,
		weakCharBoost: expectNonNegative(record['weakCharBoost'], `${path}.weakCharBoost`),
		themeBoost: expectNonNegative(record['themeBoost'], `${path}.themeBoost`),
		newCharMinCount
	};
}

function parseMix(value: unknown, path: string): ExerciseMix {
	const record = expectRecord(value, path);
	rejectUnknown(record, MIX_KEYS, path);
	const [drills, words, phrases] = MIX_KEYS.map((key) =>
		expectNonNegative(record[key], `${path}.${key}`)
	) as [number, number, number];
	if (drills + words + phrases <= 0) fail(path, 'expected at least one positive weight');
	return { drills, words, phrases };
}

function parseUnlocks(value: unknown, path: string): LessonUnlock[] {
	const unlocks: LessonUnlock[] = [];
	expectArray(value, path).forEach((raw, i) => {
		const unlock = KNOWN_UNLOCKS.find((known) => known === raw);
		if (unlock === undefined) fail(`${path}[${i}]`, `expected one of: ${KNOWN_UNLOCKS.join(', ')}`);
		if (unlocks.includes(unlock)) fail(`${path}[${i}]`, `duplicate unlock "${unlock}"`);
		unlocks.push(unlock);
	});
	return unlocks;
}

function parseWord(value: unknown, known: ReadonlySet<string>, path: string): string {
	const word = expectString(value, path).normalize('NFC');
	const graphemes = toGraphemes(word);
	if (word.startsWith(SPACE) || word.endsWith(SPACE)) {
		fail(path, 'a word must not start or end with a space');
	}
	graphemes.forEach((grapheme, i) => {
		if (CONTROL_PATTERN.test(grapheme)) fail(path, 'a word must only contain printable characters');
		if (!known.has(grapheme)) fail(path, `character "${grapheme}" is not learned at this stage`);
		if (grapheme === SPACE && graphemes[i - 1] === SPACE) {
			fail(path, 'a word must not contain two spaces in a row');
		}
		if (
			i >= MAX_IDENTICAL_IN_A_ROW &&
			graphemes.slice(i - MAX_IDENTICAL_IN_A_ROW, i).every((g) => g === grapheme)
		) {
			fail(path, `character "${grapheme}" appears three times in a row`);
		}
	});
	return word;
}

/**
 * A warm-up group holds once each new character still below the minimum, so the minimum needs as
 * many groups; a single known character fills its groups, which must then differ in length.
 */
function checkMinimumFits(
	lesson: LessonDefinition,
	typable: number,
	newCharMinCount: number,
	path: string
): void {
	if (lesson.newChars.length === 0 || newCharMinCount === 0) return;
	if (newCharMinCount > lesson.groupCount) {
		fail(
			`${path}.groupCount`,
			`expected at least ${newCharMinCount} groups to ask each new character ${newCharMinCount} times (rules.newCharMinCount)`
		);
	}
	const [min, max] = lesson.groupLength;
	if (typable < 2 && min === max && newCharMinCount > max) {
		fail(
			`${path}.groupCount`,
			`asking the only known character ${newCharMinCount} times (rules.newCharMinCount) needs identical consecutive groups`
		);
	}
}

function checkGeneratable(
	lesson: LessonDefinition,
	learned: ReadonlySet<string>,
	newCharMinCount: number,
	path: string
): void {
	const [min, max] = lesson.groupLength;
	const typable = [...learned].filter((char) => char !== SPACE).length;
	if (typable === 0) fail(`${path}.newChars`, 'no typable character is known at this stage');
	if (typable < 2 && max > MAX_IDENTICAL_IN_A_ROW) {
		fail(`${path}.groupLength`, 'a single known character cannot fill groups longer than 2');
	}
	if (typable < 2 && lesson.groupCount > 1 && min === max && lesson.words.length === 0) {
		fail(`${path}.groupCount`, 'not enough variety to avoid identical consecutive groups');
	}
	if (lesson.newChars.includes(SPACE) && min < MIN_SPACE_GROUP_LENGTH) {
		fail(
			`${path}.groupLength`,
			`a lesson that introduces the space needs groups of at least ${MIN_SPACE_GROUP_LENGTH}`
		);
	}
	if (lesson.newChars.length > lesson.groupCount) {
		fail(`${path}.groupCount`, 'expected at least one group per new character');
	}
	if (lesson.newChars.length > max) {
		fail(`${path}.groupLength`, 'expected groups long enough to hold all the new characters');
	}
	checkMinimumFits(lesson, typable, newCharMinCount, path);
}

function parseLesson(
	value: unknown,
	introduced: Introduced,
	lessonIds: Set<string>,
	language: string,
	rules: ProgressionRules,
	path: string
): LessonDefinition {
	const record = expectRecord(value, path);
	rejectUnknown(
		record,
		[
			'id',
			'title',
			'intro',
			'newChars',
			'words',
			'mix',
			'unlocks',
			'groupCount',
			'targetLength',
			'groupLength'
		],
		path
	);
	const id = expectId(record['id'], 'lesson', language, `${path}.id`);
	if (lessonIds.has(id)) fail(`${path}.id`, `duplicate lesson id "${id}"`);
	lessonIds.add(id);
	const title = expectString(record['title'], `${path}.title`);
	const intro = expectString(record['intro'], `${path}.intro`);

	const newChars = expectArray(record['newChars'], `${path}.newChars`).map((raw, i) => {
		const char = expectGrapheme(raw, `${path}.newChars[${i}]`);
		if (knownChars(introduced).has(char)) {
			fail(`${path}.newChars[${i}]`, `character "${char}" is already introduced`);
		}
		introduced.chars.add(char);
		return char;
	});

	const mix = parseMix(record['mix'], `${path}.mix`);
	const unlocks = parseUnlocks(record['unlocks'], `${path}.unlocks`);
	if (unlocks.includes('uppercase')) introduced.uppercase = true;

	const groupCount = expectInteger(record['groupCount'], `${path}.groupCount`);
	if (groupCount < 1) fail(`${path}.groupCount`, 'expected at least 1');
	const targetLength = expectInteger(record['targetLength'], `${path}.targetLength`);
	if (targetLength < 1) fail(`${path}.targetLength`, 'expected at least 1');
	const rawLength = expectArray(record['groupLength'], `${path}.groupLength`);
	if (rawLength.length !== 2) fail(`${path}.groupLength`, 'expected [min, max]');
	const min = expectInteger(rawLength[0], `${path}.groupLength[0]`);
	const max = expectInteger(rawLength[1], `${path}.groupLength[1]`);
	if (min < 1) fail(`${path}.groupLength[0]`, 'expected at least 1');
	if (max < min) fail(`${path}.groupLength[1]`, 'expected a value not below the minimum');

	const known = knownChars(introduced);
	const words: string[] = [];
	expectArray(record['words'], `${path}.words`).forEach((raw, i) => {
		const word = parseWord(raw, known, `${path}.words[${i}]`);
		if (words.includes(word)) fail(`${path}.words[${i}]`, `duplicate word "${word}"`);
		words.push(word);
	});

	const lesson: LessonDefinition = {
		id,
		title,
		intro,
		newChars,
		words,
		mix,
		unlocks,
		groupCount,
		targetLength,
		groupLength: [min, max]
	};
	checkGeneratable(lesson, known, rules.newCharMinCount, path);
	return lesson;
}

function parseWorld(
	value: unknown,
	introduced: Introduced,
	lessonIds: Set<string>,
	worldIds: Set<string>,
	language: string,
	rules: ProgressionRules,
	path: string
): WorldDefinition {
	const record = expectRecord(value, path);
	rejectUnknown(record, ['id', 'title', 'themeId', 'gameIds', 'lessons'], path);
	const id = expectId(record['id'], 'world', language, `${path}.id`);
	if (worldIds.has(id)) fail(`${path}.id`, `duplicate world id "${id}"`);
	worldIds.add(id);

	const rawGames = expectArray(record['gameIds'], `${path}.gameIds`);
	if (rawGames.length === 0) fail(`${path}.gameIds`, 'expected at least one game');
	const gameIds: string[] = [];
	rawGames.forEach((raw, i) => {
		const gameId = expectSlug(raw, `${path}.gameIds[${i}]`);
		if (gameIds.includes(gameId)) fail(`${path}.gameIds[${i}]`, `duplicate game id "${gameId}"`);
		gameIds.push(gameId);
	});

	const rawLessons = expectArray(record['lessons'], `${path}.lessons`);
	if (rawLessons.length === 0) fail(`${path}.lessons`, 'expected at least one lesson');
	return {
		id,
		title: expectString(record['title'], `${path}.title`),
		themeId: expectString(record['themeId'], `${path}.themeId`),
		gameIds,
		lessons: rawLessons.map((lesson, i) =>
			parseLesson(lesson, introduced, lessonIds, language, rules, `${path}.lessons[${i}]`)
		)
	};
}

export function parseProgression(data: unknown): ProgressionDefinition {
	const root = expectRecord(data, 'progression');
	rejectUnknown(
		root,
		['schemaVersion', 'id', 'locale', 'layoutIds', 'rules', 'worlds'],
		'progression'
	);
	if (root['schemaVersion'] !== 1) fail('progression.schemaVersion', 'expected 1');

	const locale = expectString(root['locale'], 'progression.locale');
	let language: string;
	try {
		Intl.getCanonicalLocales(locale);
		language = new Intl.Locale(locale).language;
	} catch {
		fail('progression.locale', 'expected a BCP 47 language tag');
	}
	const id = expectId(root['id'], 'progression', language, 'progression.id');

	const rawLayouts = expectArray(root['layoutIds'], 'progression.layoutIds');
	if (rawLayouts.length === 0) fail('progression.layoutIds', 'expected at least one layout');
	const layoutIds: string[] = [];
	rawLayouts.forEach((raw, i) => {
		const path = `progression.layoutIds[${i}]`;
		const layoutId = expectString(raw, path);
		if (!LAYOUT_ID_PATTERN.test(layoutId)) fail(path, 'invalid layout id');
		if (layoutIds.includes(layoutId)) fail(path, `duplicate layout id "${layoutId}"`);
		layoutIds.push(layoutId);
	});

	const rules = parseRules(root['rules'], 'progression.rules');

	const rawWorlds = expectArray(root['worlds'], 'progression.worlds');
	if (rawWorlds.length === 0) fail('progression.worlds', 'expected at least one world');
	const introduced: Introduced = { chars: new Set<string>(), uppercase: false };
	const lessonIdSet = new Set<string>();
	const worldIdSet = new Set<string>();
	const worlds = rawWorlds.map((world, i) =>
		parseWorld(
			world,
			introduced,
			lessonIdSet,
			worldIdSet,
			language,
			rules,
			`progression.worlds[${i}]`
		)
	);

	return { schemaVersion: 1, id, locale, layoutIds, rules, worlds };
}

export function lessonIds(progression: ProgressionDefinition): string[] {
	return progression.worlds.flatMap((world) => world.lessons.map((lesson) => lesson.id));
}

export function findLesson(
	progression: ProgressionDefinition,
	lessonId: string
): LessonDefinition | undefined {
	for (const world of progression.worlds) {
		const lesson = world.lessons.find((candidate) => candidate.id === lessonId);
		if (lesson !== undefined) return lesson;
	}
	return undefined;
}

export function learnedChars(progression: ProgressionDefinition, lessonId: string): string[] {
	const learned: string[] = [];
	let uppercase = false;
	for (const world of progression.worlds) {
		for (const lesson of world.lessons) {
			learned.push(...lesson.newChars);
			if (lesson.unlocks.includes('uppercase')) uppercase = true;
			if (lesson.id === lessonId) {
				if (!uppercase) return learned;
				const present = new Set(learned);
				return [...learned, ...capitalsOf(learned).filter((capital) => !present.has(capital))];
			}
		}
	}
	throw new RangeError(`Unknown lesson: ${lessonId}`);
}
