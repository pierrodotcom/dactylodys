import type { ProgressionDefinition } from '../progression/types';
import type { StoryDefinition, StoryLessonLine, StoryWorld } from './types';

const SLUG = '[a-z0-9]+(?:-[a-z0-9]+)*';

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

function expectText(value: unknown, path: string): string {
	const text = expectString(value, path);
	if (text !== text.normalize('NFC')) fail(path, 'expected a text in NFC');
	if (text !== text.trim()) fail(path, 'a text must not start or end with a space');
	return text;
}

function expectArt(value: unknown, path: string): string {
	const art = expectString(value, path);
	if (!new RegExp(`^${SLUG}$`).test(art)) fail(path, 'expected a picture name in kebab-case');
	return art;
}

function parseLine(
	value: unknown,
	language: string,
	lessonIds: Set<string>,
	path: string
): StoryLessonLine {
	const record = expectRecord(value, path);
	rejectUnknown(record, ['lessonId', 'line', 'art'], path);
	const lessonId = expectId(record['lessonId'], 'lesson', language, `${path}.lessonId`);
	if (lessonIds.has(lessonId)) fail(`${path}.lessonId`, `duplicate lesson id "${lessonId}"`);
	lessonIds.add(lessonId);
	return {
		lessonId,
		line: expectText(record['line'], `${path}.line`),
		art: expectArt(record['art'], `${path}.art`)
	};
}

function parseWorld(
	value: unknown,
	language: string,
	worldIds: Set<string>,
	lessonIds: Set<string>,
	path: string
): StoryWorld {
	const record = expectRecord(value, path);
	rejectUnknown(
		record,
		['worldId', 'opening', 'openingArt', 'ending', 'endingArt', 'lessons'],
		path
	);
	const worldId = expectId(record['worldId'], 'world', language, `${path}.worldId`);
	if (worldIds.has(worldId)) fail(`${path}.worldId`, `duplicate world id "${worldId}"`);
	worldIds.add(worldId);
	const opening = expectText(record['opening'], `${path}.opening`);
	const openingArt = expectArt(record['openingArt'], `${path}.openingArt`);
	const ending = expectText(record['ending'], `${path}.ending`);
	const endingArt = expectArt(record['endingArt'], `${path}.endingArt`);
	const lessons = expectArray(record['lessons'], `${path}.lessons`).map((lesson, i) =>
		parseLine(lesson, language, lessonIds, `${path}.lessons[${i}]`)
	);
	return { worldId, opening, openingArt, ending, endingArt, lessons };
}

export function parseStory(data: unknown): StoryDefinition {
	const root = expectRecord(data, 'story');
	rejectUnknown(root, ['schemaVersion', 'id', 'locale', 'progressionId', 'worlds'], 'story');
	if (root['schemaVersion'] !== 1) fail('story.schemaVersion', 'expected 1');

	const locale = expectString(root['locale'], 'story.locale');
	let language: string;
	try {
		Intl.getCanonicalLocales(locale);
		language = new Intl.Locale(locale).language;
	} catch {
		fail('story.locale', 'expected a BCP 47 language tag');
	}
	const id = expectId(root['id'], 'story', language, 'story.id');
	const progressionId = expectId(
		root['progressionId'],
		'progression',
		language,
		'story.progressionId'
	);

	const rawWorlds = expectArray(root['worlds'], 'story.worlds');
	if (rawWorlds.length === 0) fail('story.worlds', 'expected at least one world');
	const worldIds = new Set<string>();
	const lessonIds = new Set<string>();
	const worlds = rawWorlds.map((world, i) =>
		parseWorld(world, language, worldIds, lessonIds, `story.worlds[${i}]`)
	);

	return { schemaVersion: 1, id, locale, progressionId, worlds };
}

/** Inconsistencies between a story and the progression it follows; empty when there are none. */
export function validateStory(
	story: StoryDefinition,
	progression: ProgressionDefinition
): string[] {
	const problems: string[] = [];
	if (story.progressionId !== progression.id) {
		problems.push(
			`story.progressionId: expected "${progression.id}" but the story follows "${story.progressionId}"`
		);
	}

	const worldOfLesson = new Map<string, string>();
	for (const world of progression.worlds) {
		for (const lesson of world.lessons) worldOfLesson.set(lesson.id, world.id);
	}
	const knownWorlds = new Set(progression.worlds.map((world) => world.id));

	const told = new Set<string>();
	story.worlds.forEach((world, i) => {
		const path = `story.worlds[${i}]`;
		if (!knownWorlds.has(world.worldId)) {
			problems.push(`${path}.worldId: world "${world.worldId}" is not in the progression`);
		}
		told.add(world.worldId);
		if (world.opening.trim() === '') problems.push(`${path}.opening: expected an opening`);
		if (world.ending.trim() === '') problems.push(`${path}.ending: expected an ending`);
		world.lessons.forEach((line, j) => {
			const owner = worldOfLesson.get(line.lessonId);
			const linePath = `${path}.lessons[${j}].lessonId`;
			if (owner === undefined) {
				problems.push(`${linePath}: lesson "${line.lessonId}" is not in the progression`);
			} else if (owner !== world.worldId) {
				problems.push(
					`${linePath}: lesson "${line.lessonId}" belongs to world "${owner}", not "${world.worldId}"`
				);
			}
		});
	});

	const toldLessons = new Set(
		story.worlds.flatMap((world) => world.lessons.map((l) => l.lessonId))
	);
	for (const world of progression.worlds) {
		if (!told.has(world.id)) {
			problems.push(`world "${world.id}" has no opening and no ending in the story`);
		}
		for (const lesson of world.lessons) {
			if (!toldLessons.has(lesson.id)) {
				problems.push(`lesson "${lesson.id}" has no line in the story`);
			}
		}
	}
	return problems;
}
