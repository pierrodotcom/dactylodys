/**
 * Drawing of a block of the tower, seen a little from above and from the right: its front, its
 * top and its right side, lit from the top left. A block has its bottom front centre on the
 * origin; its top and side go up and right by `blockDepth`, so that a block put on another hides
 * the top of the one below, except where the tower leans.
 */
import type { BlockMark, BlockSize } from './blocks';

export type XY = readonly [number, number];

/** What a block is made of: its mark (`blockLook`) picks it, its colour paints it. */
export type BlockMaterial = 'wood' | 'house' | 'stone' | 'plastic' | 'girder' | 'crystal';

export const MATERIAL_OF_MARK: Readonly<Record<BlockMark, BlockMaterial>> = {
	bar: 'wood',
	windows: 'house',
	stripes: 'stone',
	studs: 'plastic',
	zigzag: 'girder',
	diamond: 'crystal'
};

/** How rounded the outer corners of each material are. */
const CORNER: Readonly<Record<BlockMaterial, number>> = {
	wood: 1.2,
	house: 0.8,
	stone: 1.6,
	plastic: 2,
	girder: 0.6,
	crystal: 0.5
};

export interface Depth {
	readonly x: number;
	readonly y: number;
}

function round(value: number): number {
	const rounded = Math.round(value * 100) / 100;
	return Object.is(rounded, -0) ? 0 : rounded;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function pt([x, y]: XY): string {
	return `${round(x)} ${round(y)}`;
}

/** How far the top and the side of a block go back: a little more for a thicker block. */
export function blockDepth(size: BlockSize): Depth {
	const y = round(clamp(size.height * 0.4, 3, 5));
	return { x: round(y * 1.4), y };
}

/**
 * A closed polygon whose corners are bent by `radii` (one per corner, 0 keeps it sharp); a
 * radius never takes more than a third of the edges it joins.
 */
export function roundedPolygon(points: readonly XY[], radii: readonly number[]): string {
	const count = points.length;
	const toward = (from: XY, to: XY, distance: number): XY => {
		const length = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
		const share = Math.min(distance, length / 3) / length;
		return [from[0] + (to[0] - from[0]) * share, from[1] + (to[1] - from[1]) * share];
	};
	const parts = points.map((corner, index) => {
		const radius = radii[index] ?? 0;
		const before = points[(index + count - 1) % count] ?? corner;
		const after = points[(index + 1) % count] ?? corner;
		const command = index === 0 ? 'M' : 'L';
		if (radius <= 0) return `${command}${pt(corner)}`;
		return `${command}${pt(toward(corner, before, radius))}Q${pt(corner)} ${pt(toward(corner, after, radius))}`;
	});
	return `${parts.join('')}Z`;
}

/** A rounded bar from `from` to `to`, `width` wide. */
export function capsule(from: XY, to: XY, width: number): string {
	const [x1, y1] = from;
	const [x2, y2] = to;
	const length = Math.hypot(x2 - x1, y2 - y1) || 1;
	const nx = (-(y2 - y1) / length) * (width / 2);
	const ny = ((x2 - x1) / length) * (width / 2);
	const r = round(width / 2);
	return (
		`M${pt([x1 + nx, y1 + ny])}L${pt([x2 + nx, y2 + ny])}` +
		`A${r} ${r} 0 0 0 ${pt([x2 - nx, y2 - ny])}L${pt([x1 - nx, y1 - ny])}` +
		`A${r} ${r} 0 0 0 ${pt([x1 + nx, y1 + ny])}Z`
	);
}

export function oval(cx: number, cy: number, rx: number, ry: number): string {
	return (
		`M${pt([cx - rx, cy])}A${round(rx)} ${round(ry)} 0 1 0 ${pt([cx + rx, cy])}` +
		`A${round(rx)} ${round(ry)} 0 1 0 ${pt([cx - rx, cy])}Z`
	);
}

/** A triangle shrunk toward its middle: the hole between two bars of a lattice. */
export function inset(points: readonly XY[], share: number): string {
	const cx = points.reduce((sum, [x]) => sum + x, 0) / points.length;
	const cy = points.reduce((sum, [, y]) => sum + y, 0) / points.length;
	const moved = points.map(([x, y]): XY => [cx + (x - cx) * share, cy + (y - cy) * share]);
	return roundedPolygon(
		moved,
		moved.map(() => 0.5)
	);
}

/** Holes of a lattice between two chords: triangles pointing up and down in turn. */
export function latticeHoles(
	left: number,
	right: number,
	top: number,
	bottom: number,
	bays: number,
	share: number
): string[] {
	const step = (right - left) / bays;
	const nodes: XY[] = Array.from({ length: bays + 1 }, (_, index) => [
		left + index * step,
		index % 2 === 0 ? bottom : top
	]);
	const first = nodes[0] ?? [left, bottom];
	const second = nodes[1] ?? [right, top];
	const last = nodes[bays] ?? [right, top];
	const beforeLast = nodes[bays - 1] ?? [left, bottom];
	const holes = [inset([[left, second[1]], second, first], share)];
	for (let index = 0; index + 2 <= bays; index++) {
		const [a, b, c] = [nodes[index], nodes[index + 1], nodes[index + 2]];
		if (a && b && c) holes.push(inset([a, b, c], share));
	}
	holes.push(inset([beforeLast, last, [right, beforeLast[1]]], share));
	return holes;
}

export interface BlockArt {
	readonly material: BlockMaterial;
	readonly depth: Depth;
	/** The whole block: its fill, and its outline drawn last. */
	readonly outline: string;
	readonly top: string;
	readonly side: string;
	/** Bottom of the front, in the shade of the ground. */
	readonly low: string;
	/** Lit edge along the top and the left of the front. */
	readonly rim: string;
	/** The two edges between the faces. */
	readonly edges: string;
	/** Material drawings, by role, in the order of this list. */
	readonly parts: readonly Part[];
}

/** The drawing of a block of this size and material, its bottom front centre on the origin. */
export function blockArt(size: BlockSize, material: BlockMaterial): BlockArt {
	const { width: w, height: h } = size;
	const depth = blockDepth(size);
	const { x: dx, y: dy } = depth;
	const L = -w / 2;
	const R = w / 2;
	const T = -h;
	const r = CORNER[material];
	const outline = roundedPolygon(
		[
			[L, 0],
			[R, 0],
			[R + dx, -dy],
			[R + dx, T - dy],
			[L + dx, T - dy],
			[L, T]
		],
		[r, r * 0.6, r, r, r, r]
	);
	const top = roundedPolygon(
		[
			[L, T],
			[R, T],
			[R + dx, T - dy],
			[L + dx, T - dy]
		],
		[r, 0, r, r]
	);
	const side = roundedPolygon(
		[
			[R, 0],
			[R + dx, -dy],
			[R + dx, T - dy],
			[R, T]
		],
		[r * 0.6, r, r, 0]
	);
	const lowTop = -h * 0.3;
	const low = roundedPolygon(
		[
			[L, lowTop],
			[R, lowTop],
			[R, 0],
			[L, 0]
		],
		[0, 0, 0, r]
	);
	const inner = Math.min(1.2, h * 0.1);
	const rim = `M${pt([L + inner, -h * 0.45])}L${pt([L + inner, T + inner])}L${pt([R - inner * 2, T + inner])}`;
	const edges = `M${pt([L + r, T])}L${pt([R, T])}L${pt([R, -r * 0.6])}M${pt([R, T])}L${pt([R + dx - r * 0.7, T - dy + r * 0.5])}`;
	return {
		material,
		depth,
		outline,
		top,
		side,
		low,
		rim,
		edges,
		parts: partsOf(material, w, h, depth)
	};
}

/** A drawing of a block, its look given by its role; `over`: drawn over the outline. */
/** How a part is painted (a class of `BlockShape`). */
export type PartRole =
	| 'fine'
	| 'line'
	| 'paint'
	| 'light'
	| 'shade'
	| 'shine'
	| 'metal'
	| 'frame'
	| 'sill'
	| 'glass'
	| 'joint'
	| 'hole'
	| 'ink'
	| 'gem';

export interface Part {
	readonly role: PartRole;
	readonly d: string;
	readonly over?: boolean;
}

function partsOf(material: BlockMaterial, w: number, h: number, depth: Depth): Part[] {
	switch (material) {
		case 'wood':
			return woodParts(w, h, depth);
		case 'house':
			return houseParts(w, h);
		case 'stone':
			return stoneParts(w, h, depth);
		case 'plastic':
			return plasticParts(w, h, depth);
		case 'girder':
			return girderParts(w, h);
		case 'crystal':
			return crystalParts(w, h);
	}
}

/** A plank: grain that bends around a knot, nails at both ends, rings on its end. */
function woodParts(w: number, h: number, { x: dx, y: dy }: Depth): Part[] {
	const L = -w / 2;
	const R = w / 2;
	const T = -h;
	const knot: XY = [L + w * 0.62, T + h * 0.52];
	const grain = [0.3, 0.72].map((share) => {
		const y = T + h * share;
		const bend = share < 0.5 ? -h * 0.14 : h * 0.14;
		return (
			`M${pt([L + 2, y])}C${pt([L + w * 0.3, y + h * 0.04])} ${pt([knot[0] - w * 0.14, y])} ${pt([knot[0] - w * 0.06, y + bend * 0.2])}` +
			`C${pt([knot[0] - w * 0.02, y + bend])} ${pt([knot[0] + w * 0.08, y + bend])} ${pt([knot[0] + w * 0.12, y])}` +
			`C${pt([R - w * 0.2, y - h * 0.04])} ${pt([R - w * 0.1, y + h * 0.03])} ${pt([R - 2, y])}`
		);
	});
	const nailR = clamp(h * 0.1, 0.9, 1.6);
	const nails = [L + 3.2, R - 3.2].map((x) => oval(x, T + h * 0.5, nailR, nailR)).join('');
	const cx = R + dx / 2;
	const cy = T / 2 - dy / 2;
	const rings = [0.34, 0.2].map((share) => oval(cx, cy, dx * share, h * share * 1.1)).join('');
	return [
		{ role: 'fine', d: grain.join('') },
		{ role: 'fine', d: oval(knot[0], knot[1], h * 0.18, h * 0.11) },
		{ role: 'fine', d: rings },
		{ role: 'metal', d: nails }
	];
}

/** A storey of a little house: windows with frames, glass and a glint, under a cornice. */
function houseParts(w: number, h: number): Part[] {
	const T = -h;
	const count = w >= 80 ? 3 : 2;
	const winH = h * 0.5;
	const winW = Math.max(4, h * 0.62);
	const top = T + h * 0.24;
	const frames: string[] = [];
	const panes: string[] = [];
	const glints: string[] = [];
	const sills: string[] = [];
	for (let index = 0; index < count; index++) {
		const cx = -w / 2 + (w * (index + 0.5)) / count;
		const frame = 1.4;
		frames.push(
			roundedPolygon(
				[
					[cx - winW / 2 - frame, top - frame],
					[cx + winW / 2 + frame, top - frame],
					[cx + winW / 2 + frame, top + winH + frame],
					[cx - winW / 2 - frame, top + winH + frame]
				],
				[0.6, 0.6, 0.6, 0.6]
			)
		);
		panes.push(
			roundedPolygon(
				[
					[cx - winW / 2, top],
					[cx + winW / 2, top],
					[cx + winW / 2, top + winH],
					[cx - winW / 2, top + winH]
				],
				[0.3, 0.3, 0.3, 0.3]
			)
		);
		glints.push(
			capsule(
				[cx - winW * 0.22, top + winH * 0.62],
				[cx + winW * 0.02, top + winH * 0.2],
				winW * 0.16
			)
		);
		sills.push(
			capsule(
				[cx - winW / 2 - 1.4, top + winH + frame + 0.6],
				[cx + winW / 2 + 1.4, top + winH + frame + 0.6],
				1.2
			)
		);
	}
	const cornice = roundedPolygon(
		[
			[-w / 2, T],
			[w / 2, T],
			[w / 2, T + h * 0.12],
			[-w / 2, T + h * 0.12]
		],
		[0, 0, 0, 0]
	);
	return [
		{ role: 'light', d: cornice },
		{ role: 'frame', d: frames.join('') },
		{ role: 'glass', d: panes.join('') },
		{ role: 'shine', d: glints.join('') },
		{ role: 'sill', d: sills.join('') }
	];
}

/** Three cut stones with mortar between them, a chip and a crack. */
function stoneParts(w: number, h: number, { x: dx, y: dy }: Depth): Part[] {
	const L = -w / 2;
	const R = w / 2;
	const T = -h;
	const joints = [0.37, 0.71].map((share) => L + w * share);
	const gap = 0.7;
	const edges = [L, ...joints, R];
	const stones: string[] = [];
	const shades: string[] = [];
	for (let index = 0; index + 1 < edges.length; index++) {
		const left = (edges[index] ?? L) + (index === 0 ? 0 : gap);
		const right = (edges[index + 1] ?? R) - (index === edges.length - 2 ? 0 : gap);
		const r = Math.min(1.6, h * 0.14);
		stones.push(
			roundedPolygon(
				[
					[left, T + (index === 0 ? 0 : 0)],
					[right, T],
					[right, 0],
					[left, 0]
				],
				[r, r, r, r]
			)
		);
		shades.push(
			roundedPolygon(
				[
					[right - Math.min(2.2, (right - left) * 0.1), T + 1],
					[right, T + 1.6],
					[right, -0.4],
					[left + 1.2, -0.4],
					[left + 1.6, -h * 0.2],
					[right - Math.min(2.2, (right - left) * 0.1), -h * 0.24]
				],
				[0, 0.6, 0.6, 0.6, 0, 0]
			)
		);
	}
	const mortar = joints
		.map((x) => `M${pt([x, T])}L${pt([x, 0])}M${pt([x, T])}L${pt([x + dx, T - dy])}`)
		.join('');
	const crackX = L + w * 0.5;
	const crack = `M${pt([crackX, T])}L${pt([crackX + 1.6, T + h * 0.35])}L${pt([crackX - 0.6, T + h * 0.55])}L${pt([crackX + 0.8, T + h * 0.8])}`;
	return [
		{ role: 'joint', d: mortar },
		{ role: 'shade', d: shades.join('') },
		{ role: 'fine', d: stones.join('') },
		{ role: 'fine', d: crack }
	];
}

/** A toy brick: round studs on its top, a long gloss on its front. */
function plasticParts(w: number, h: number, { x: dx, y: dy }: Depth): Part[] {
	const L = -w / 2;
	const T = -h;
	const count = w >= 80 ? 3 : 2;
	const studW = Math.min((w / count) * 0.42, 12);
	const studH = clamp(dy * 0.45 + 0.8, 1.8, 3);
	const ry = Math.max(1.2, dy * 0.32);
	const bodies: string[] = [];
	const caps: string[] = [];
	const sides: string[] = [];
	for (let index = 0; index < count; index++) {
		const cx = L + dx / 2 + (w * (index + 0.5)) / count;
		const base = T - dy / 2;
		const lid = base - studH;
		const x1 = cx - studW / 2;
		const x2 = cx + studW / 2;
		bodies.push(
			`M${pt([x1, lid])}L${pt([x1, base])}A${round(studW / 2)} ${round(ry)} 0 0 0 ${pt([x2, base])}L${pt([x2, lid])}Z`
		);
		sides.push(
			`M${pt([cx + studW * 0.15, base + ry * 0.98])}A${round(studW / 2)} ${round(ry)} 0 0 0 ${pt([x2, base])}L${pt([x2, lid])}L${pt([cx + studW * 0.15, lid])}Z`
		);
		caps.push(oval(cx, lid, studW / 2, ry));
	}
	const gloss = capsule(
		[L + 3, T + Math.max(1.8, h * 0.2)],
		[L + w * 0.42, T + Math.max(1.8, h * 0.2)],
		Math.max(1.2, h * 0.12)
	);
	const dot = oval(
		L + w * 0.48,
		T + Math.max(1.8, h * 0.2),
		Math.max(0.6, h * 0.06),
		Math.max(0.6, h * 0.06)
	);
	return [
		{ role: 'shine', d: gloss + dot },
		{ role: 'paint', d: bodies.join(''), over: true },
		{ role: 'shade', d: sides.join(''), over: true },
		{ role: 'paint', d: caps.join(''), over: true },
		{ role: 'light', d: caps.join(''), over: true },
		{ role: 'fine', d: bodies.join('') + caps.join(''), over: true }
	];
}

/** A steel beam: two chords, a zigzag web between them, rivets. */
function girderParts(w: number, h: number): Part[] {
	const L = -w / 2;
	const R = w / 2;
	const T = -h;
	const chord = Math.max(2.2, h * 0.24);
	const end = Math.max(2.6, h * 0.22);
	const bays = Math.max(4, Math.round(w / 13) * 2 - 2);
	const holes = latticeHoles(L + end, R - end, T + chord, -chord, bays, 0.66);
	const step = (w - 2 * end) / bays;
	const rivetR = clamp(h * 0.07, 0.55, 1);
	const rivets = Array.from({ length: bays + 1 }, (_, index) => {
		const x = L + end + index * step;
		return oval(x, index % 2 === 0 ? -chord / 2 : T + chord / 2, rivetR, rivetR);
	}).join('');
	return [
		{ role: 'hole', d: holes.join('') },
		{ role: 'fine', d: holes.join('') },
		{ role: 'ink', d: rivets }
	];
}

/** A glass block: slanted lights through it, a cut gem in its middle, a sparkle. */
function crystalParts(w: number, h: number): Part[] {
	const L = -w / 2;
	const R = w / 2;
	const T = -h;
	const slant = h * 0.55;
	const bands = [
		[0.14, 0.09],
		[0.27, 0.04]
	].map(([at = 0, wide = 0]) => {
		const x = L + slant + w * at;
		return roundedPolygon(
			[
				[x, T + 0.6],
				[x + w * wide, T + 0.6],
				[x + w * wide - slant, -0.6],
				[x - slant, -0.6]
			],
			[0, 0, 0, 0]
		);
	});
	const gw = Math.min(h * 0.75, w * 0.12);
	const gh = h * 0.34;
	const cy = T + h * 0.5;
	const gem = roundedPolygon(
		[
			[0, cy - gh],
			[gw, cy],
			[0, cy + gh],
			[-gw, cy]
		],
		[0.4, 0.4, 0.4, 0.4]
	);
	const gemShade = `M${pt([0, cy])}L${pt([gw, cy])}L${pt([0, cy + gh])}Z`;
	const gemLight = `M${pt([0, cy])}L${pt([-gw, cy])}L${pt([0, cy - gh])}Z`;
	const facets = `M${pt([-gw, cy])}L${pt([gw, cy])}M${pt([0, cy - gh])}L${pt([0, cy + gh])}`;
	const s = Math.max(1.4, h * 0.16);
	const sx = R - w * 0.14;
	const sy = T + h * 0.34;
	const sparkle = `M${pt([sx, sy - s])}Q${pt([sx, sy])} ${pt([sx + s, sy])}Q${pt([sx, sy])} ${pt([sx, sy + s])}Q${pt([sx, sy])} ${pt([sx - s, sy])}Q${pt([sx, sy])} ${pt([sx, sy - s])}Z`;
	return [
		{ role: 'shine', d: bands.join('') },
		{ role: 'gem', d: gem },
		{ role: 'shade', d: gemShade },
		{ role: 'shine', d: gemLight },
		{ role: 'fine', d: gem + facets },
		{ role: 'shine', d: sparkle }
	];
}
