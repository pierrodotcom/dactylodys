import { isDetour } from '$lib/engine/progression/definition';
import { isLessonUnlocked } from '$lib/engine/progression/progress';
import type {
	LessonDefinition,
	ProgressionDefinition,
	ProgressState,
	StarCount,
	WorldDefinition
} from '$lib/engine/progression/types';

/** `done`: passed at least once. `current`: open, to play. `locked`: the lesson before is not passed. */
export type LessonStatus = 'done' | 'current' | 'locked';

/** Absorbs the rounding error of an accuracy computed as a ratio, as the engine does. */
const ACCURACY_EPSILON = 1e-9;

function progressOf(progress: ProgressState, lessonId: string) {
	return Object.hasOwn(progress.lessons, lessonId) ? progress.lessons[lessonId] : undefined;
}

/**
 * `openedWorldIds`: the worlds the adult opened ahead (`Profile.openedWorldIds`);
 * `keptOpenLessonIds`: the lessons kept open since the order changed (`Profile.keptOpenLessonIds`).
 */
export function lessonStatus(
	progression: ProgressionDefinition,
	progress: ProgressState,
	lessonId: string,
	openedWorldIds: readonly string[],
	keptOpenLessonIds: readonly string[] = []
): LessonStatus {
	if (!isLessonUnlocked(progression, progress, lessonId, openedWorldIds, keptOpenLessonIds)) {
		return 'locked';
	}
	const best = progressOf(progress, lessonId)?.bestAccuracy;
	const passed = best !== undefined && best + ACCURACY_EPSILON >= progression.rules.unlockAccuracy;
	return passed ? 'done' : 'current';
}

export function lessonStars(progress: ProgressState, lessonId: string): StarCount {
	return progressOf(progress, lessonId)?.stars ?? 0;
}

function lessonsOf(progression: ProgressionDefinition): readonly LessonDefinition[] {
	return progression.worlds.flatMap((world) => world.lessons);
}

/**
 * The lesson "next lesson" leads to: after a lesson on the way, the next one on the way (a detour
 * is never where the way goes on); after a detour, the lesson that follows it. A detour never
 * holds the child either: when the detour after it is still closed (`isOpen` says so), the way
 * goes on. `null` after the last one.
 */
export function nextLessonId(
	progression: ProgressionDefinition,
	lessonId: string,
	isOpen: (lessonId: string) => boolean = () => true
): string | null {
	const lessons = lessonsOf(progression);
	const index = lessons.findIndex((lesson) => lesson.id === lessonId);
	if (index < 0) return null;
	const after = lessons.slice(index + 1);
	const onTheWay = after.find((lesson) => !isDetour(lesson));
	const following = after[0];
	const next =
		isDetour(lessons[index] as LessonDefinition) &&
		following !== undefined &&
		(!isDetour(following) || isOpen(following.id))
			? following
			: onTheWay;
	return next?.id ?? null;
}

export function worldOfLesson(
	progression: ProgressionDefinition,
	lessonId: string
): WorldDefinition | undefined {
	return progression.worlds.find((world) => world.lessons.some((lesson) => lesson.id === lessonId));
}

/**
 * The lesson the map proposes: the first lesson on the way that is open and not passed yet, so
 * that a child who passed lessons further on (in another order, ADR-075) is led to those that came
 * before them since, with nothing closed. A world the adult opened ahead is where the child goes
 * on: no lesson before it is proposed while it has one to play. Never a detour; once the way is
 * finished, its last lesson.
 */
export function focusLessonId(
	progression: ProgressionDefinition,
	progress: ProgressState,
	openedWorldIds: readonly string[],
	keptOpenLessonIds: readonly string[] = []
): string | null {
	const lessons = lessonsOf(progression);
	const statusOf = (lesson: LessonDefinition) =>
		lessonStatus(progression, progress, lesson.id, openedWorldIds, keptOpenLessonIds);
	const way = lessons.filter((lesson) => !isDetour(lesson));
	const toPlay = way.filter((lesson) => statusOf(lesson) === 'current');
	if (toPlay.length === 0) {
		return way.findLast((lesson) => statusOf(lesson) !== 'locked')?.id ?? null;
	}
	const ahead = Math.max(
		0,
		...progression.worlds
			.filter((world) => openedWorldIds.includes(world.id))
			.map((world) => lessons.findIndex((lesson) => lesson.id === world.lessons[0]?.id))
	);
	const proposed = toPlay.find((lesson) => lessons.indexOf(lesson) >= ahead) ?? toPlay[0];
	return proposed?.id ?? null;
}

export interface MapLesson {
	readonly id: string;
	readonly title: string;
	/** Rank among the lessons on the way, from 1; `null` for a detour, which has no number. */
	readonly number: number | null;
	/** A lesson nothing waits for (`LessonDefinition.optional`): shown as a way to go further. */
	readonly detour: boolean;
	readonly status: LessonStatus;
	readonly stars: StarCount;
	/** Which side of the path the lesson sits on; they alternate along the whole path. */
	readonly side: 0 | 1;
}

export interface MapWorld {
	readonly id: string;
	readonly title: string;
	/** The world of the most advanced open lesson. */
	readonly current: boolean;
	readonly lessons: readonly MapLesson[];
}

export interface WorldMapLayout {
	readonly worlds: readonly MapWorld[];
	/** The lesson the page scrolls to. */
	readonly focusId: string | null;
}

/** Every world one after the other, locked lessons included, the current world and lesson marked. */
export function layoutMap(
	progression: ProgressionDefinition,
	progress: ProgressState,
	openedWorldIds: readonly string[],
	keptOpenLessonIds: readonly string[] = []
): WorldMapLayout {
	const focusId = focusLessonId(progression, progress, openedWorldIds, keptOpenLessonIds);
	let number = 0;
	let place = 0;
	const worlds = progression.worlds.map((world): MapWorld => {
		const lessons = world.lessons.map((lesson): MapLesson => {
			const detour = isDetour(lesson);
			if (!detour) number += 1;
			place += 1;
			return {
				id: lesson.id,
				title: lesson.title,
				number: detour ? null : number,
				detour,
				status: lessonStatus(progression, progress, lesson.id, openedWorldIds, keptOpenLessonIds),
				stars: lessonStars(progress, lesson.id),
				side: place % 2 === 0 ? 1 : 0
			};
		});
		return {
			id: world.id,
			title: world.title,
			current: focusId !== null && world.lessons.some((lesson) => lesson.id === focusId),
			lessons
		};
	});
	return { worlds, focusId };
}

/** A move of the companion on the map, between the exercises (ADR-027). */
export type MapMove = 'next' | 'previous' | 'first' | 'last';

const MOVES_BY_KEY: Readonly<Record<string, MapMove>> = {
	ArrowRight: 'next',
	ArrowDown: 'next',
	ArrowLeft: 'previous',
	ArrowUp: 'previous',
	Home: 'first',
	End: 'last'
};

/** The move a key asks for on the map; `null`: the key is not one of the map's. */
export function mapMoveForKey(key: string): MapMove | null {
	return Object.hasOwn(MOVES_BY_KEY, key) ? (MOVES_BY_KEY[key] ?? null) : null;
}

function isOpen(lesson: MapLesson): boolean {
	return lesson.status !== 'locked';
}

/**
 * Where a move leads from a lesson, along the whole path and from one world to the next; locked
 * lessons are stepped over. `null`: no open lesson that way, the companion stays where it is.
 */
export function moveOnMap(
	layout: WorldMapLayout,
	fromId: string | null,
	move: MapMove
): string | null {
	const lessons = layout.worlds.flatMap((world) => world.lessons);
	if (move === 'first') return lessons.find(isOpen)?.id ?? null;
	if (move === 'last') return lessons.findLast(isOpen)?.id ?? null;
	const index = lessons.findIndex((lesson) => lesson.id === fromId);
	if (index < 0) return null;
	const ahead = move === 'next' ? lessons.slice(index + 1) : lessons.slice(0, index).reverse();
	return ahead.find(isOpen)?.id ?? null;
}

/** Whether a lesson of the map can be opened. */
export function isOpenOnMap(layout: WorldMapLayout, lessonId: string): boolean {
	return layout.worlds.some((world) =>
		world.lessons.some((lesson) => lesson.id === lessonId && isOpen(lesson))
	);
}

/** The hint of the arrows is shown once they can move the companion: two open lessons or more. */
export function showsKeysHint(layout: WorldMapLayout): boolean {
	return layout.worlds.flatMap((world) => world.lessons).filter(isOpen).length >= 2;
}

export interface Box {
	readonly left: number;
	readonly top: number;
	readonly width: number;
	readonly height: number;
}

/**
 * Where the companion stands beside a lesson, in the frame of the trail: in the middle of the room
 * the path leaves free beside the lesson, level with the lesson's middle.
 */
export function companionSpot(
	trail: Box,
	room: Box,
	lesson: Box,
	companion: { readonly width: number; readonly height: number },
	side: 0 | 1
): { x: number; y: number } {
	const free =
		side === 0
			? { start: lesson.left + lesson.width, end: room.left + room.width }
			: { start: room.left, end: lesson.left };
	return {
		x: (free.start + free.end) / 2 - companion.width / 2 - trail.left,
		y: lesson.top + lesson.height / 2 - companion.height / 2 - trail.top
	};
}
