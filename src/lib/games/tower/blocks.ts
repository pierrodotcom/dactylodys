/** Size of the scene drawing, in its own units. */
export const SCENE = { width: 520, height: 240 } as const;

/** Top of the ground: the first block rests on it. */
export const GROUND_Y = 204;

/** Horizontal centre of the tower. */
export const TOWER_X = 360;

/** Height shared by all the blocks of the tower: the more blocks, the thinner each one. */
export const TOWER_HEIGHT = 100;

const MIN_BLOCK_HEIGHT = 8;
const MAX_BLOCK_HEIGHT = 26;
const MIN_BLOCK_WIDTH = 90;
const MAX_BLOCK_WIDTH = 118;

/** Steps of the falling block while a group is typed, one per good key at most. */
export const DROP_STAGES = 4;

/** Gap above its place that the falling block keeps until the group is complete (`--dd-space-md`). */
export const HOVER_GAP = 16;

/** Distance covered by one step of the fall (`--dd-space-sm` is 8, so this is one and a quarter). */
const DROP_STEP = 10;

/** Crooked-on-purpose offsets, in a fixed order: the tower leans a little, never at random. */
const JITTER = [0, 5, -4, 6, -6, 3, -3, 5, -5, 2];

export const BLOCK_COLOURS = ['a', 'b', 'c', 'd', 'e', 'f'] as const;
export type BlockColour = (typeof BLOCK_COLOURS)[number];

export const BLOCK_MARKS = ['bar', 'windows', 'stripes', 'studs', 'zigzag', 'diamond'] as const;
export type BlockMark = (typeof BLOCK_MARKS)[number];

export interface BlockSize {
	readonly width: number;
	readonly height: number;
}

export interface BlockLook {
	readonly colour: BlockColour;
	readonly mark: BlockMark;
}

/** Bottom centre of a block of the tower. */
export interface BlockSpot {
	readonly x: number;
	readonly y: number;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

/** Size of the blocks so that `total` of them fill the same height whatever their number. */
export function blockSize(total: number): BlockSize {
	const height = clamp(
		Math.floor(TOWER_HEIGHT / Math.max(1, total)),
		MIN_BLOCK_HEIGHT,
		MAX_BLOCK_HEIGHT
	);
	return { width: clamp(height * 4 + 28, MIN_BLOCK_WIDTH, MAX_BLOCK_WIDTH), height };
}

/** Shape and colour of the block of a group: the same one for the same group, always. */
export function blockLook(index: number): BlockLook {
	const position = Math.max(0, Math.trunc(index));
	const lap = Math.floor(position / BLOCK_COLOURS.length);
	return {
		colour: BLOCK_COLOURS[position % BLOCK_COLOURS.length] ?? 'a',
		mark: BLOCK_MARKS[(position + lap * 2) % BLOCK_MARKS.length] ?? 'bar'
	};
}

export function blockSpot(index: number, size: BlockSize): BlockSpot {
	const position = Math.max(0, Math.trunc(index));
	return {
		x: TOWER_X + (JITTER[position % JITTER.length] ?? 0),
		y: GROUND_Y - position * size.height
	};
}

/** Vertical offset of the falling block, relative to its place: negative is above. */
export function hoverOffset(stage: number): number {
	const step = clamp(Math.trunc(stage), 0, DROP_STAGES);
	return -(HOVER_GAP + (DROP_STAGES - step) * DROP_STEP);
}

/** Where the flag is planted: the top of the last block, a little to the left of its middle. */
export function flagSpot(total: number): BlockSpot {
	const size = blockSize(total);
	const top = blockSpot(Math.max(0, total - 1), size);
	return { x: top.x - Math.round(size.width * 0.28), y: top.y - size.height };
}

export const FLAG_HEIGHT = 46;

/** Points of a five-branch star centred on the origin, rounded to keep the markup short. */
export function starPoints(radius: number): string {
	const inner = radius * 0.45;
	return Array.from({ length: 10 }, (_, index) => {
		const reach = index % 2 === 0 ? radius : inner;
		const angle = (Math.PI * index) / 5 - Math.PI / 2;
		return `${(reach * Math.cos(angle)).toFixed(1)},${(reach * Math.sin(angle)).toFixed(1)}`;
	}).join(' ');
}
