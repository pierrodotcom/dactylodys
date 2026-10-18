import { isRewarded, type GameView } from '../shared/game-view';
import { groupRatio } from '../shared/stage';

/** Drawing space of the scene, in SVG units. */
export const SCENE = { width: 520, height: 220 } as const;

/** Where things sit in the scene. The rocket flies from `startX` to `endX`, nose to the right. */
export const FLIGHT = {
	departureX: 70,
	destinationX: 440,
	astreY: 130,
	astreScale: 1.3,
	cruiseY: 130,
	startX: 165,
	endX: 345,
	landingX: 455,
	landingY: 48
} as const;

/** Rotation that turns a rocket drawn nose up so that its nose points to the right. */
export const CRUISE_ANGLE = 90;

/** Number of different astres: they follow one another in this order. */
export const ASTRE_VARIANTS = 4;

export interface RocketPose {
	readonly x: number;
	readonly y: number;
	/** Degrees; 0 is nose up. */
	readonly angle: number;
	readonly landed: boolean;
}

export function astreVariant(index: number): number {
	return ((index % ASTRE_VARIANTS) + ASTRE_VARIANTS) % ASTRE_VARIANTS;
}

/** The group being typed is the last one: its astre is where the rocket lands. */
export function isLastLeg(view: GameView): boolean {
	return view.groupIndex === view.total - 1;
}

/** Distance the rocket moves for one good key in a group of `length` characters. */
export function notchWidth(length: number): number {
	return length <= 0 ? 0 : (FLIGHT.endX - FLIGHT.startX) / length;
}

/** One notch per good key towards the next astre; on it once the group is done. */
export function rocketPose(view: GameView): RocketPose {
	const rewarded = isRewarded(view);
	if (rewarded && isLastLeg(view)) {
		return { x: FLIGHT.landingX, y: FLIGHT.landingY, angle: 0, landed: true };
	}
	const ratio = rewarded ? 1 : groupRatio(view.position, view.group.length);
	return {
		x: FLIGHT.startX + (FLIGHT.endX - FLIGHT.startX) * ratio,
		y: FLIGHT.cruiseY,
		angle: CRUISE_ANGLE,
		landed: false
	};
}

/** The astre the rocket left: the home planet (`null`) for the first group, else the last one reached. */
export function departureIndex(view: GameView): number | null {
	return view.groupIndex === 0 ? null : view.groupIndex - 1;
}

/** The astre the rocket is flying to lights up once reached. */
export function destinationLit(view: GameView): boolean {
	return isRewarded(view);
}

/** Where the inhabitant of the astre reached stands, top left of its drawing. */
export const INHABITANT = { x: 372, y: 63, scale: 0.9 } as const;

/**
 * Where its greeting goes. In flight: the middle of the bottom of the bubble, above its head, high
 * enough for the jump of joy. Landed, the rocket stands above the astre: the middle of the right
 * side of the bubble, on its left.
 */
export const GREETING = {
	flying: { x: 399, y: 54 },
	landed: { x: 380, y: 82 }
} as const;

export interface Size {
	readonly width: number;
	readonly height: number;
}

/**
 * Top left corner of the greeting in a frame of `frame` pixels, where the scene is drawn as large as
 * it fits, in the middle. The bubble never leaves the frame.
 */
export function greetingPlace(
	frame: Size,
	bubble: Size,
	landed: boolean
): { x: number; y: number } {
	const scale = Math.min(frame.width / SCENE.width, frame.height / SCENE.height);
	const left = (frame.width - SCENE.width * scale) / 2;
	const top = (frame.height - SCENE.height * scale) / 2;
	const anchor = landed ? GREETING.landed : GREETING.flying;
	const x = left + anchor.x * scale - (landed ? bubble.width : bubble.width / 2);
	const y = top + anchor.y * scale - (landed ? bubble.height / 2 : bubble.height);
	return {
		x: clamp(x, 0, frame.width - bubble.width),
		y: clamp(y, 0, frame.height - bubble.height)
	};
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(value, Math.max(min, max)));
}
