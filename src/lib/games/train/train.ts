import { isRewarded, type GameView } from '../shared/game-view';
import { groupRatio } from '../shared/stage';
import { LOCO, TRACK, WAGON } from './shapes';

/** Drawing space of the scene, in SVG units. */
export const SCENE = { width: 520, height: 240 } as const;

/** Free space kept right of the locomotive, and where a wagon starts out of the scene. */
const MARGIN = 12;

/** Free space left of the train, for the scenes that bring something in from the left. */
const LEFT_ROOM = 80;

/** A short train is drawn bigger, up to this scale. */
const MAX_SCALE = 1.2;

/**
 * Scenes in which the wagon stops short of its place while the group is typed, and finishes the way
 * in the scene. The distance is in train units and mirrors the first keyframe of the scene.
 */
const HOLD_BACK: Readonly<Record<string, number>> = {
	'bounce-hook': 24,
	'sliding-stop': 96,
	'tunnel-peek': 64,
	'wagon-flip': 64
};

/** Width of the whole train once every wagon is hooked, in train units. */
export function trainSpan(total: number): number {
	return Math.max(0, total) * WAGON.pitch + LOCO.width;
}

/** Scale of the train so that it fits the scene with any number of wagons. */
export function trainScale(total: number): number {
	return Math.min(MAX_SCALE, (SCENE.width - MARGIN - LEFT_ROOM) / trainSpan(total));
}

/** Where the locomotive starts in the scene: the train grows to the left of it. */
export function trainOriginX(total: number): number {
	return SCENE.width - MARGIN - LOCO.width * trainScale(total);
}

/** Left edge of the place of wagon `index`, in train units. */
export function slotX(index: number): number {
	return -(index + 1) * WAGON.pitch;
}

/** Left edge of a wagon that has not entered the scene yet, in train units. */
export function rollStartX(total: number): number {
	const scale = trainScale(total);
	return (-(WAGON.width * scale + MARGIN) - trainOriginX(total)) / scale;
}

/** The surprise scene of the group when it is one, else `undefined`. */
export function sceneIdOf(view: GameView): string | undefined {
	return view.scene.kind === 'scene' ? view.scene.id : undefined;
}

/** How far the wagon of the group stays short of its place until the group is done. */
export function holdBack(view: GameView): number {
	if (isRewarded(view)) return 0;
	const id = sceneIdOf(view);
	return id === undefined ? 0 : (HOLD_BACK[id] ?? 0);
}

/** Share of the way the wagon of the current group has rolled: one notch per good key. */
export function rollRatio(view: GameView): number {
	return isRewarded(view) ? 1 : groupRatio(view.position, view.group.length);
}

/** The last reward is over: the train leaves. */
export function isDeparting(view: GameView): boolean {
	return view.phase === 'finale' || view.phase === 'complete';
}

/** The wagon of the last group is hooked: the train is complete. */
export function isTrainComplete(view: GameView): boolean {
	return isRewarded(view) && view.groupIndex === view.total - 1;
}

/** Wagons to draw: every hooked one, and the one that rolls in. */
export function wagonIndexes(view: GameView): number[] {
	const count = Math.min(view.total, view.groupIndex + 1);
	return Array.from({ length: count }, (_, index) => index);
}

/** Screen position of the top of the chimney, where the smoke of the departure starts. */
export function chimneyPoint(total: number): { x: number; y: number } {
	const scale = trainScale(total);
	return {
		x: trainOriginX(total) + LOCO.chimney.x * scale,
		y: TRACK.y + LOCO.chimney.top * scale
	};
}

/** Degrees a wheel of `radius` turns while the wagon rolls `distance` along the rail. */
export function wheelAngle(distance: number, radius: number): number {
	return ((distance / radius) * 180) / Math.PI;
}
