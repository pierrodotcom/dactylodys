import { toGraphemes } from '../graphemes';
import { findLesson, learnedChars } from '../progression/definition';
import type { ProgressionDefinition } from '../progression/types';
import type {
	CompanionColor,
	RewardCatalogue,
	RewardCondition,
	RewardDefinition,
	RewardKind,
	RewardStars
} from './types';

const SLUG = '[a-z0-9]+(?:-[a-z0-9]+)*';
const SLUG_PATTERN = new RegExp(`^${SLUG}$`);
const CONTROL_PATTERN = /\p{Cc}/u;
const REWARD_KINDS: readonly RewardKind[] = ['item', 'skill', 'trophy'];
const REWARD_STARS: readonly RewardStars[] = [1, 2, 3];
const MIN_ATTEMPTS = 1;
const MAX_ERROR_RATE = 1;

function fail(path: string, message: string): never {
	throw new Error(`${path}: ${message}`);
}

function expectRecord(value: unknown, path: string): Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		fail(path, 'expected an object');
	}
	return value as Record<string, unknown>;
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

function expectSlug(value: unknown, path: string): string {
	const slug = expectString(value, path);
	if (!SLUG_PATTERN.test(slug)) fail(path, 'expected lowercase words separated by hyphens');
	return slug;
}

function expectId(value: unknown, type: string, language: string, path: string): string {
	const id = expectString(value, path);
	const match = new RegExp(`^([a-z]{2,3})\\.${type}\\.${SLUG}$`).exec(id);
	if (match === null) fail(path, `expected <language>.${type}.<slug>`);
	if (match[1] !== language) fail(path, `expected the language prefix "${language}"`);
	return id;
}

function expectGrapheme(value: unknown, path: string): string {
	if (typeof value !== 'string' || value === '') fail(path, 'expected a non-empty string');
	const text = value.normalize('NFC');
	if (toGraphemes(text).length !== 1) fail(path, 'expected exactly one character');
	if (CONTROL_PATTERN.test(text)) fail(path, 'expected a printable character');
	return text;
}

function expectStars(value: unknown, path: string): RewardStars {
	const stars = REWARD_STARS.find((known) => known === value);
	if (stars === undefined) fail(path, `expected one of: ${REWARD_STARS.join(', ')}`);
	return stars;
}

function parseCharsMastered(
	record: Record<string, unknown>,
	path: string
): Extract<RewardCondition, { kind: 'chars-mastered' }> {
	rejectUnknown(record, ['kind', 'chars', 'minAttempts', 'maxErrorRate'], path);
	const rawChars = expectArray(record['chars'], `${path}.chars`);
	if (rawChars.length === 0) fail(`${path}.chars`, 'expected at least one character');
	const chars: string[] = [];
	rawChars.forEach((raw, i) => {
		const char = expectGrapheme(raw, `${path}.chars[${i}]`);
		if (chars.includes(char)) fail(`${path}.chars[${i}]`, `duplicate character "${char}"`);
		chars.push(char);
	});
	const minAttempts = expectInteger(record['minAttempts'], `${path}.minAttempts`);
	if (minAttempts < MIN_ATTEMPTS) {
		fail(`${path}.minAttempts`, `expected an integer of at least ${MIN_ATTEMPTS}`);
	}
	const maxErrorRate = expectNumber(record['maxErrorRate'], `${path}.maxErrorRate`);
	if (maxErrorRate < 0 || maxErrorRate > MAX_ERROR_RATE) {
		fail(`${path}.maxErrorRate`, `expected a number between 0 and ${MAX_ERROR_RATE}`);
	}
	return { kind: 'chars-mastered', chars, minAttempts, maxErrorRate };
}

function parseCondition(value: unknown, language: string, path: string): RewardCondition {
	const record = expectRecord(value, path);
	switch (record['kind']) {
		case 'lesson-passed':
			rejectUnknown(record, ['kind', 'lessonId'], path);
			return {
				kind: 'lesson-passed',
				lessonId: expectId(record['lessonId'], 'lesson', language, `${path}.lessonId`)
			};
		case 'lesson-stars':
			rejectUnknown(record, ['kind', 'lessonId', 'stars'], path);
			return {
				kind: 'lesson-stars',
				lessonId: expectId(record['lessonId'], 'lesson', language, `${path}.lessonId`),
				stars: expectStars(record['stars'], `${path}.stars`)
			};
		case 'world-passed':
			rejectUnknown(record, ['kind', 'worldId'], path);
			return {
				kind: 'world-passed',
				worldId: expectId(record['worldId'], 'world', language, `${path}.worldId`)
			};
		case 'world-stars':
			rejectUnknown(record, ['kind', 'worldId', 'stars'], path);
			return {
				kind: 'world-stars',
				worldId: expectId(record['worldId'], 'world', language, `${path}.worldId`),
				stars: expectStars(record['stars'], `${path}.stars`)
			};
		case 'chars-mastered':
			return parseCharsMastered(record, path);
		default:
			return fail(
				`${path}.kind`,
				'expected one of: lesson-passed, lesson-stars, world-passed, world-stars, chars-mastered'
			);
	}
}

function parseReward(
	value: unknown,
	language: string,
	ids: Set<string>,
	path: string
): RewardDefinition {
	const record = expectRecord(value, path);
	rejectUnknown(record, ['id', 'kind', 'title', 'description', 'artId', 'slot', 'condition'], path);
	const id = expectId(record['id'], 'reward', language, `${path}.id`);
	if (ids.has(id)) fail(`${path}.id`, `duplicate reward id "${id}"`);
	ids.add(id);

	const kind = REWARD_KINDS.find((known) => known === record['kind']);
	if (kind === undefined) fail(`${path}.kind`, `expected one of: ${REWARD_KINDS.join(', ')}`);

	const hasSlot = Object.hasOwn(record, 'slot');
	if (kind === 'item' && !hasSlot) fail(`${path}.slot`, 'expected a slot for an item');
	if (kind !== 'item' && hasSlot) fail(`${path}.slot`, 'only an item has a slot');

	const base = {
		id,
		kind,
		title: expectString(record['title'], `${path}.title`),
		description: expectString(record['description'], `${path}.description`),
		artId: expectSlug(record['artId'], `${path}.artId`)
	};
	const condition = parseCondition(record['condition'], language, `${path}.condition`);
	return hasSlot
		? { ...base, slot: expectSlug(record['slot'], `${path}.slot`), condition }
		: { ...base, condition };
}

function parseColors(value: unknown, path: string): CompanionColor[] {
	const colors: CompanionColor[] = [];
	expectArray(value, path).forEach((raw, i) => {
		const itemPath = `${path}[${i}]`;
		const record = expectRecord(raw, itemPath);
		rejectUnknown(record, ['id', 'title'], itemPath);
		const id = expectSlug(record['id'], `${itemPath}.id`);
		if (colors.some((color) => color.id === id)) {
			fail(`${itemPath}.id`, `duplicate colour id "${id}"`);
		}
		colors.push({ id, title: expectString(record['title'], `${itemPath}.title`) });
	});
	return colors;
}

export function parseRewardCatalogue(data: unknown): RewardCatalogue {
	const root = expectRecord(data, 'catalogue');
	rejectUnknown(
		root,
		['schemaVersion', 'id', 'locale', 'progressionId', 'colors', 'rewards'],
		'catalogue'
	);
	if (root['schemaVersion'] !== 1) fail('catalogue.schemaVersion', 'expected 1');

	const locale = expectString(root['locale'], 'catalogue.locale');
	let language: string;
	try {
		Intl.getCanonicalLocales(locale);
		language = new Intl.Locale(locale).language;
	} catch {
		fail('catalogue.locale', 'expected a BCP 47 language tag');
	}
	const id = expectId(root['id'], 'rewards', language, 'catalogue.id');
	const progressionId = expectId(
		root['progressionId'],
		'progression',
		language,
		'catalogue.progressionId'
	);
	const colors = parseColors(root['colors'], 'catalogue.colors');

	const ids = new Set<string>();
	const rewards = expectArray(root['rewards'], 'catalogue.rewards').map((reward, i) =>
		parseReward(reward, language, ids, `catalogue.rewards[${i}]`)
	);
	return { schemaVersion: 1, id, locale, progressionId, colors, rewards };
}

function conditionProblems(
	condition: RewardCondition,
	progression: ProgressionDefinition,
	taught: ReadonlySet<string>
): string[] {
	switch (condition.kind) {
		case 'lesson-passed':
		case 'lesson-stars':
			return findLesson(progression, condition.lessonId) === undefined
				? [`unknown lesson "${condition.lessonId}"`]
				: [];
		case 'world-passed':
		case 'world-stars':
			return progression.worlds.some((world) => world.id === condition.worldId)
				? []
				: [`unknown world "${condition.worldId}"`];
		case 'chars-mastered': {
			const problems = condition.chars
				.filter((char) => !taught.has(char))
				.map((char) => `character "${char}" is never taught by the progression`);
			const window = progression.rules.recentCharWindow;
			if (condition.minAttempts > window) {
				problems.push(
					`minAttempts ${condition.minAttempts} exceeds rules.recentCharWindow ${window}: recent results never cover that many keystrokes`
				);
			}
			return problems;
		}
	}
}

/** What the catalogue says that its progression cannot satisfy; empty when everything is coherent. */
export function validateRewardCatalogue(
	catalogue: RewardCatalogue,
	progression: ProgressionDefinition
): string[] {
	const problems: string[] = [];
	if (catalogue.progressionId !== progression.id) {
		problems.push(
			`progressionId "${catalogue.progressionId}" is not the progression "${progression.id}"`
		);
	}
	const lastWorld = progression.worlds[progression.worlds.length - 1];
	const lastLesson = lastWorld?.lessons[lastWorld.lessons.length - 1];
	const taught = new Set(lastLesson === undefined ? [] : learnedChars(progression, lastLesson.id));
	catalogue.rewards.forEach((reward, i) => {
		for (const problem of conditionProblems(reward.condition, progression, taught)) {
			problems.push(`rewards[${i}] (${reward.id}): ${problem}`);
		}
	});
	return problems;
}
