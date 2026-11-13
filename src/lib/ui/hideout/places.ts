/*
 * Where the places of the hideout are in its drawing, a 560 × 320 view box. Which places exist
 * and which objects fit them are data (`content/common/hideout.json`); a place listed there has
 * its spot here (tested).
 */
import type { XY } from '$lib/ui/companion/geometry';
import type { Mount } from './decorations';

export interface PlaceSpot {
	/** The hook, peg or nail an object hangs from, or the middle of the surface it stands on. */
	readonly point: XY;
	readonly mount: Mount;
	/** Widest and tallest an object may be there, in units of the cabin. */
	readonly room: readonly [number, number];
}

export const SCENE_WIDTH = 560;
export const SCENE_HEIGHT = 320;

export const PLACE_SPOTS: Readonly<Record<string, PlaceSpot>> = {
	ceiling: { point: [196, 22], mount: 'hang', room: [76, 100] },
	wall: { point: [372, 44], mount: 'hang', room: [42, 58] },
	pegs: { point: [128, 64], mount: 'hang', room: [62, 74] },
	window: { point: [290, 151], mount: 'stand', room: [84, 72] },
	shelf: { point: [428, 132], mount: 'stand', room: [56, 52] },
	'coat-stand': { point: [40, 121], mount: 'hang', room: [74, 112] },
	chest: { point: [136, 205], mount: 'stand', room: [72, 66] },
	desk: { point: [466, 204], mount: 'stand', room: [62, 68] },
	rug: { point: [190, 293], mount: 'stand', room: [78, 70] },
	corner: { point: [482, 303], mount: 'stand', room: [72, 74] }
};

/** Where the companion stands, and the side of its square, in units of the cabin. */
export const COMPANION_SPOT = { x: 230, y: 184, size: 110 } as const;

/** The outline around a place being chosen: the room of the place, a little wider. */
export function markOf(spot: PlaceSpot, margin: number): [number, number, number, number] {
	const [x, y] = spot.point;
	const [width, height] = spot.room;
	const top = spot.mount === 'hang' ? y - margin : y - height - margin;
	return [x - width / 2 - margin, top, width + 2 * margin, height + 2 * margin];
}
