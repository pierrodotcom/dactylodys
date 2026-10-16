<script lang="ts">
	import type { BlockLook, BlockSize } from './blocks';

	interface Props {
		size: BlockSize;
		look: BlockLook;
	}

	let { size, look }: Props = $props();

	const left = $derived(-size.width / 2);
	const radius = $derived(Math.min(4, size.height / 4));
	const middle = $derived(-size.height / 2);
	const dot = $derived(size.height * 0.16);
	const windowRadius = $derived(size.height * 0.24);
	const zigzag = $derived(
		Array.from({ length: 9 }, (_, index) => {
			const x = left + size.width * 0.12 + (size.width * 0.76 * index) / 8;
			const y = index % 2 === 0 ? middle - size.height * 0.2 : middle + size.height * 0.2;
			return `${x.toFixed(1)},${y.toFixed(1)}`;
		}).join(' ')
	);
</script>

<!-- A block with its bottom centre on the origin. -->
<g class="block" data-colour={look.colour}>
	<rect
		class="body"
		x={left}
		y={-size.height}
		width={size.width}
		height={size.height}
		rx={radius}
	/>
	{#if look.mark === 'bar'}
		<line
			class="line"
			x1={left + size.width * 0.14}
			x2={-left - size.width * 0.14}
			y1={-size.height * 0.7}
			y2={-size.height * 0.7}
		/>
	{:else if look.mark === 'windows'}
		<circle class="dot" cx={-size.width * 0.22} cy={middle} r={windowRadius} />
		<circle class="dot" cx={size.width * 0.22} cy={middle} r={windowRadius} />
	{:else if look.mark === 'stripes'}
		{#each [-0.25, 0, 0.25] as share (share)}
			<line
				class="line"
				x1={size.width * share}
				x2={size.width * share}
				y1={-size.height * 0.8}
				y2={-size.height * 0.2}
			/>
		{/each}
	{:else if look.mark === 'studs'}
		{#each [-0.3, -0.1, 0.1, 0.3] as share (share)}
			<circle class="dot" cx={size.width * share} cy={middle} r={dot} />
		{/each}
	{:else if look.mark === 'zigzag'}
		<polyline class="line" points={zigzag} />
	{:else}
		<rect
			class="dot"
			x={-size.height * 0.2}
			y={middle - size.height * 0.2}
			width={size.height * 0.4}
			height={size.height * 0.4}
			transform="rotate(45 0 {middle})"
		/>
	{/if}
</g>

<style>
	.body,
	.line,
	.dot {
		stroke: var(--dd-color-drawing-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.line {
		fill: transparent;
		stroke: var(--dd-color-pot-bubble);
	}

	.dot {
		fill: var(--dd-color-pot-bubble);
		stroke: var(--dd-color-drawing-line);
		stroke-width: var(--dd-border-width-thin);
	}

	[data-colour='a'] .body {
		fill: var(--dd-color-food-a);
	}

	[data-colour='b'] .body {
		fill: var(--dd-color-food-b);
	}

	[data-colour='c'] .body {
		fill: var(--dd-color-food-c);
	}

	[data-colour='d'] .body {
		fill: var(--dd-color-food-d);
	}

	[data-colour='e'] .body {
		fill: var(--dd-color-food-e);
	}

	[data-colour='f'] .body {
		fill: var(--dd-color-food-f);
	}
</style>
