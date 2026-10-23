/**
 * Drawing data of the magic drawings, in a local box of 200 x 200, lit from the top left. A picture
 * is a list of strokes drawn in turn (the longer a stroke, the longer it takes), then coloured all
 * at once at the end. A line that goes behind a form painted over it stops at that form's outline:
 * joined forms show one contour, during the drawing as once coloured.
 */
import {
	ellipseLength,
	ellipsePath,
	pathBox,
	regionOf,
	shiftPath,
	visiblePieces,
	type Piece
} from './geometry';
import { SUBJECTS } from './subjects';

export { ellipseLength, ellipsePath };

/** A colour of the drawings: each one is a design token `--dd-color-drawing-<tone>`. */
export type Tone =
	| 'fur'
	| 'fur-dark'
	| 'cream'
	| 'pink'
	| 'iris'
	| 'ink'
	| 'white'
	| 'sea'
	| 'fin'
	| 'stripe'
	| 'bubble'
	| 'leaf'
	| 'leaf-dark'
	| 'wall'
	| 'roof'
	| 'roof-dark'
	| 'wood'
	| 'glass'
	| 'brick'
	| 'grass'
	| 'stone'
	| 'curtain'
	| 'petal'
	| 'petal-dark'
	| 'pollen'
	| 'hull'
	| 'water'
	| 'gold'
	| 'gold-dark'
	| 'lilac'
	| 'smoke';

/** A tone, or the shade and light washed over a colour to give it its volume. */
export type Wash = Tone | 'shade' | 'light';

/** Where a colour is painted among the others: behind them, with them, or on top. */
export type Layer = 'back' | 'middle' | 'front';

/** A touch of colour inside a coloured form, kept inside it: a stripe, a spot, a gleam. */
export interface Mark {
	readonly d: string;
	readonly tone: Wash;
}

/** A stroke as it is written: its line, and what it paints once the drawing is finished. */
export interface StrokeSpec {
	/** The line, in the order the pencil draws it. */
	readonly d: string;
	/** Colour given to the inside once the drawing is finished; none: the line stays alone. */
	readonly tone?: Tone;
	/** The form painted, when it is not the line itself (a line left open on a form behind). */
	readonly fill?: string;
	/** Order of painting; a line without colour counts as drawn on top. */
	readonly layer?: Layer;
	/** A thin line: a detail, a fold, a whisker. */
	readonly fine?: boolean;
	readonly marks?: readonly Mark[];
	/** No shade nor light of its own: a flat colour (a pupil, a glint). */
	readonly flat?: boolean;
}

export interface Stroke extends StrokeSpec {
	readonly layer: Layer;
	/** Length of the visible line: the share of the drawing time this stroke takes. */
	readonly weight: number;
	/** The visible pieces of the line, in drawing order. */
	readonly pieces: readonly Piece[];
	/** The side away from the light, and the thin light along the lit edge (even-odd paths). */
	readonly shade?: string;
	readonly rim?: string;
}

/** A coloured touch that only appears with the colours, outside any form (cheeks, glints). */
export interface Touch {
	readonly d: string;
	readonly tone: Wash;
}

export interface PictureSpec {
	readonly id: string;
	readonly strokes: readonly StrokeSpec[];
	readonly touches?: readonly Touch[];
	/** The soft shadow on the paper under the subject. */
	readonly ground?: string;
}

export interface DrawingPicture {
	readonly id: string;
	readonly strokes: readonly Stroke[];
	readonly touches: readonly Touch[];
	readonly ground?: string;
}

/** A point of the drawing, in the local box of the picture. */
export interface DrawingPoint {
	readonly x: number;
	readonly y: number;
}

const LAYER_RANK: Readonly<Record<Layer, number>> = { back: 0, middle: 1, front: 2 };

/** How far inside a form a line must be to be hidden by it: the rest is under its outline. */
const COVER_MARGIN = 1.3;

function clamp(value: number, low: number, high: number): number {
	return Math.min(high, Math.max(low, value));
}

/** Shade and light of a form, sized on the form: thin on a small one, wide on a big one. */
function volumeOf(fill: string): { shade: string; rim: string } {
	const [x0, y0, x1, y1] = pathBox(fill);
	const size = Math.min(x1 - x0, y1 - y0);
	const depth = clamp(size * 0.14, 1.2, 9);
	const inset = clamp(size * 0.05, 1.4, 3);
	const band = inset + clamp(size * 0.05, 0.8, 3);
	return {
		shade: fill + shiftPath(fill, -depth, -depth * 0.85),
		rim: shiftPath(fill, inset, inset) + shiftPath(fill, band, band)
	};
}

function layerOf(spec: StrokeSpec): Layer {
	return spec.layer ?? (spec.tone === undefined ? 'front' : 'middle');
}

/** Measures the strokes and cuts their lines where a form painted later hides them. */
export function buildPicture(spec: PictureSpec): DrawingPicture {
	const ranks = spec.strokes.map((stroke, index) => ({
		index,
		rank: LAYER_RANK[layerOf(stroke)],
		region: stroke.tone === undefined ? null : regionOf(stroke.fill ?? stroke.d)
	}));
	const strokes = spec.strokes.map((stroke, index): Stroke => {
		const own = ranks[index] ?? { index, rank: 0 };
		const covers = ranks
			.filter((o) => o.rank > own.rank || (o.rank === own.rank && o.index > index))
			.flatMap((o) => (o.region ? [o.region] : []));
		const pieces = visiblePieces(stroke.d, covers, COVER_MARGIN);
		const weight = Math.round(pieces.reduce((sum, piece) => sum + piece.length, 0));
		const volume =
			stroke.tone !== undefined && !stroke.flat ? volumeOf(stroke.fill ?? stroke.d) : {};
		return { ...stroke, ...volume, layer: layerOf(stroke), weight, pieces };
	});
	return { id: spec.id, strokes, touches: spec.touches ?? [], ground: spec.ground };
}

export const DRAWINGS: readonly [DrawingPicture, ...DrawingPicture[]] = [
	buildPicture(SUBJECTS[0]),
	...SUBJECTS.slice(1).map(buildPicture)
];

/** The little pencil marks of the progress row, in a box of 36 x 36, picked in turn. */
export const SQUIGGLES: readonly [string, ...string[]] = [
	'M6 26C9 12 14 9 17 17C20 26 25 25 30 10',
	'M6 14C11 6 15 12 18 18C21 24 26 22 30 12',
	'M6 28C8 18 12 8 16 14C19 19 15 25 19 26C24 27 26 14 30 8',
	'M6 20C9 12 13 11 17 18C21 26 26 26 30 16'
];

/** The coloured strokes in the order they are painted: the back ones first, the front ones last. */
export function paintOrder(picture: DrawingPicture): readonly Stroke[] {
	return picture.strokes
		.filter((stroke) => stroke.tone !== undefined)
		.map((stroke, index) => ({ stroke, index }))
		.sort((a, b) => LAYER_RANK[a.stroke.layer] - LAYER_RANK[b.stroke.layer] || a.index - b.index)
		.map(({ stroke }) => stroke);
}
