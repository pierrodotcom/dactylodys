import { isRewarded, pickCyclic, type GameView } from '../shared/game-view';

/** Drawing space of the scene, in SVG units: the river crosses it from left to right. */
export const SCENE = { width: 520, height: 280 } as const;

/** Where the object of the group waits, in the middle of the river, above the companion. */
export const DOCK = { x: 260, y: 136 } as const;

/** Distance between two objects floating one behind the other. */
export const SPACING = 104;

/** Objects shown waiting behind the one at the dock; the others are still upstream, out of sight. */
export const MAX_WAITING = 2;

/** Half the width of an object drawn at full size, from its middle. */
export const OBJECT_HALF = 30;

/** Where an object sits on its waterline, below its middle, at full size. */
const OBJECT_FOOT = 12;

/** The crate on the bank where the objects caught are put, in two rows. */
export const COLLECTION = { x: 352, y: 206, width: 152, rowHeight: 30, rows: 2 } as const;

/** Biggest size of an object in the crate, against its size on the water. */
const COLLECTED_MAX_SCALE = 0.55;

export interface Place {
	readonly x: number;
	readonly y: number;
	readonly scale: number;
}

/**
 * `docked`: waits at the dock for its group to be typed; `waiting`: floats behind it; `caught`: the
 * companion has just fished it out, it goes to the crate; `collected`: in the crate.
 */
export type ObjectRole = 'docked' | 'waiting' | 'caught' | 'collected';

export interface RiverObject {
	/** Index of the group the object carries. */
	readonly index: number;
	readonly role: ObjectRole;
	readonly place: Place;
}

/**
 * Index of the first object not caught yet: it floats to the dock as soon as the one before it is
 * caught, so that it is there when its group is typed. `total` once every object is caught.
 */
export function frontIndex(view: GameView): number {
	return isRewarded(view) ? view.groupIndex + 1 : view.groupIndex;
}

/** Place of an object `slot` places behind the dock (0: at the dock). */
export function floatingPlace(slot: number): Place {
	return { x: DOCK.x - slot * SPACING, y: DOCK.y, scale: 1 };
}

/** Where an object comes from when it floats in: one place further upstream. */
export function upstreamOf(place: Place): Place {
	return { ...place, x: place.x - SPACING };
}

/** The same spot at the same size: an object already on its way there has nothing new to do. */
export function samePlace(a: Place, b: Place): boolean {
	return a.x === b.x && a.y === b.y && a.scale === b.scale;
}

/** Place of object `index` in the crate, which holds every object of the exercise. */
export function collectionPlace(index: number, total: number): Place {
	const columns = Math.max(1, Math.ceil(total / COLLECTION.rows));
	const cell = COLLECTION.width / columns;
	const scale = Math.min(COLLECTED_MAX_SCALE, cell / (OBJECT_HALF * 2));
	const column = index % columns;
	const row = Math.min(COLLECTION.rows - 1, Math.floor(index / columns));
	const shelf = COLLECTION.y + COLLECTION.rowHeight * (row + 1);
	return { x: COLLECTION.x + cell * (column + 0.5), y: shelf - OBJECT_FOOT * scale, scale };
}

/** Every object to draw: those in the crate, the one at the dock and the ones behind it. */
export function riverObjects(view: GameView): RiverObject[] {
	const front = frontIndex(view);
	const objects: RiverObject[] = [];
	for (let index = 0; index < Math.min(front, view.total); index++) {
		const caught = index === front - 1 && isRewarded(view);
		objects.push({
			index,
			role: caught ? 'caught' : 'collected',
			place: collectionPlace(index, view.total)
		});
	}
	const last = Math.min(view.total - 1, front + MAX_WAITING);
	for (let index = front; index <= last; index++) {
		const slot = index - front;
		objects.push({ index, role: slot === 0 ? 'docked' : 'waiting', place: floatingPlace(slot) });
	}
	return objects;
}

/** The whole object stays inside the scene. */
export function isInFrame(place: Place): boolean {
	const half = OBJECT_HALF * place.scale;
	return place.x - half >= 0 && place.x + half <= SCENE.width;
}

/**
 * The drawing of object `index`: one after the other from the first play of the child, so that a
 * replayed game brings other objects (ADR-059). Never chosen by chance.
 */
export function objectOf<T>(list: readonly T[], view: GameView, index: number): T | undefined {
	return pickCyclic(list, view.playOffset + index);
}

/** Steps of the picture: one per good key of the group, all of them once it is typed. */
export function probeOf(view: GameView): number {
	return isRewarded(view) ? view.group.length : view.position;
}

/** How far the label of a group has to move sideways to stay inside the scene, around `x`. */
export function labelShift(x: number, width: number, margin: number): number {
	const half = width / 2;
	const low = margin + half - x;
	const high = SCENE.width - margin - half - x;
	if (low > high) return (low + high) / 2;
	return Math.min(Math.max(0, low), high);
}
