<script lang="ts">
	import BlockShape from './BlockShape.svelte';
	import { latticeHoles, oval, roundedPolygon } from './block-art';
	import type { BlockLook } from './blocks';
	import { FLAG } from './shapes';

	/** The blocks of the picture, from the bottom, drawn with the game's own blocks. */
	const BLOCKS: readonly { width: number; x: number; look: BlockLook }[] = [
		{ width: 50, x: 36, look: { colour: 'a', mark: 'bar' } },
		{ width: 46, x: 39, look: { colour: 'b', mark: 'windows' } },
		{ width: 44, x: 35, look: { colour: 'd', mark: 'studs' } }
	];
	const BLOCK_HEIGHT = 15;
	const GROUND = 90;
	const TOP = GROUND - BLOCKS.length * BLOCK_HEIGHT;
	const FLAG_SCALE = 0.8;
	/** A fourth block, still on the hook of the crane. */
	const HANGING = {
		width: 26,
		height: 11,
		x: 73,
		y: 44,
		look: { colour: 'f', mark: 'diamond' }
	} as const;

	const MAST = { left: 86, right: 93, top: 8, foot: GROUND } as const;
	const JIB = { left: 58, top: 8, bottom: 12.4 } as const;

	function box(x: number, y: number, width: number, height: number, r: number): string {
		return roundedPolygon(
			[
				[x, y],
				[x + width, y],
				[x + width, y + height],
				[x, y + height]
			],
			[r, r, r, r]
		);
	}

	const mastOutline = box(MAST.left, MAST.top, MAST.right - MAST.left, MAST.foot - MAST.top, 0.4);
	const mastHoles = latticeHoles(
		JIB.bottom + 1,
		MAST.foot - 1,
		MAST.left + 1.6,
		MAST.right - 1.6,
		10,
		0.62
	)
		.join('')
		.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x: string, y: string) => `${y} ${x}`);
	const jibOutline = box(JIB.left, JIB.top, MAST.left - JIB.left, JIB.bottom - JIB.top, 0.6);
	const jibHoles = latticeHoles(
		JIB.left + 1.6,
		MAST.left - 0.6,
		JIB.top + 1.2,
		JIB.bottom - 1.2,
		10,
		0.6
	).join('');
	const hookTop = JIB.bottom + 1;
	const slingTop = HANGING.y - HANGING.height - 9;
	const ground = oval(48, GROUND + 1, 46, 5);
</script>

<svg viewBox="0 0 100 100" focusable="false" aria-hidden="true">
	<path class="grass" d={ground} />
	<path class="line" d={ground} />
	<ellipse class="shadow" cx="40" cy={GROUND - 1} rx="30" ry="2.4" />

	<path class="crane" fill-rule="evenodd" d={jibOutline + jibHoles} />
	<path class="fine" d={jibHoles} />
	<path class="line" d={jibOutline} />
	<path class="crane" fill-rule="evenodd" d={mastOutline + mastHoles} />
	<path class="fine" d={mastHoles} />
	<path class="line" d={mastOutline} />
	<path class="fine" d="M {HANGING.x} {hookTop} L {HANGING.x} {slingTop}" />
	<path
		class="fine"
		d="M {HANGING.x - 8} {HANGING.y - HANGING.height - 2} L {HANGING.x} {slingTop} L {HANGING.x +
			10} {HANGING.y - HANGING.height - 2}"
	/>
	<g transform="translate({HANGING.x} {HANGING.y})">
		<BlockShape size={HANGING} look={HANGING.look} />
	</g>

	{#each BLOCKS as block, index (index)}
		<g transform="translate({block.x} {GROUND - index * BLOCK_HEIGHT})">
			<BlockShape size={{ width: block.width, height: BLOCK_HEIGHT }} look={block.look} />
		</g>
	{/each}
	<g transform="translate(24 {TOP - 2}) scale({FLAG_SCALE})">
		<path class="metal" d={FLAG.pole} />
		<path class="cloth" d={FLAG.cloth} />
		<path class="shade" d={FLAG.fold} />
		<path class="shine" d={FLAG.light} />
		<path class="gold" d={FLAG.star} />
		<path class="line" d={FLAG.cloth} />
		<path class="fine" d={FLAG.pole} />
		<path class="gold" d={FLAG.knob} />
		<path class="line" d={FLAG.knob} />
	</g>
</svg>

<style>
	svg {
		display: block;
		inline-size: 100%;
		block-size: 100%;
	}

	path {
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.grass {
		fill: var(--dd-color-tower-grass);
	}

	.shadow {
		fill: var(--dd-color-tower-shadow);
	}

	.crane {
		fill: var(--dd-color-tower-crane);
	}

	.metal {
		fill: var(--dd-color-tower-metal);
	}

	.cloth {
		fill: var(--dd-color-tower-flag);
	}

	.gold {
		fill: var(--dd-color-tower-gold);
	}

	.shade {
		fill: var(--dd-color-tower-shade);
		fill-opacity: var(--dd-opacity-tower-side);
	}

	.shine {
		fill: var(--dd-color-tower-light);
		fill-opacity: var(--dd-opacity-tower-light);
	}

	.line,
	.fine {
		fill: transparent;
		stroke: var(--dd-color-tower-line);
		stroke-width: var(--dd-border-width-thick);
	}

	.fine {
		stroke-width: var(--dd-border-width-thin);
	}
</style>
