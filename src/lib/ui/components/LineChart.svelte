<script lang="ts">
	import { chartPoints, chartTicks, chartY, type ChartFrame } from './line-chart';

	interface Props {
		/** The values, oldest first. */
		values: readonly number[];
		/** The top of the scale. */
		max: number;
		/** A value drawn as a dashed line across the chart, e.g. a speed to reach; `null`: none. */
		reference?: number | null;
		/** How a value of the scale is written, in the language of the page. */
		formatTick: (value: number) => string;
	}

	let { values, max, reference = null, formatTick }: Props = $props();

	/* Geometry of the drawing, in `viewBox` units: the chart takes the width it is given. */
	const FRAME: ChartFrame = { width: 600, height: 200, left: 56, right: 12, top: 12, bottom: 12 };
	const TICK_GAP = 8;
	const POINT_RADIUS = 5;

	const points = $derived(chartPoints(values, max, FRAME));
	const path = $derived(points.map((point) => `${point.x},${point.y}`).join(' '));
	const ticks = $derived(
		chartTicks(max).map((value) => ({
			value,
			y: chartY(value, max, FRAME),
			label: formatTick(value)
		}))
	);
	const referenceY = $derived(reference === null ? null : chartY(reference, max, FRAME));
</script>

<!-- The figures are given in a table beside the chart: the drawing is hidden from screen readers. -->
<svg
	class="chart"
	viewBox="0 0 {FRAME.width} {FRAME.height}"
	focusable="false"
	aria-hidden="true"
	data-chart
>
	{#each ticks as tick (tick.value)}
		<line class="grid" x1={FRAME.left} x2={FRAME.width - FRAME.right} y1={tick.y} y2={tick.y} />
		<text
			class="tick"
			x={FRAME.left - TICK_GAP}
			y={tick.y}
			text-anchor="end"
			dominant-baseline="middle">{tick.label}</text
		>
	{/each}
	{#if referenceY !== null}
		<line
			class="reference"
			x1={FRAME.left}
			x2={FRAME.width - FRAME.right}
			y1={referenceY}
			y2={referenceY}
			data-chart-reference
		/>
	{/if}
	{#if points.length > 1}
		<polyline class="line" points={path} />
	{/if}
	{#each points as point, index (index)}
		<circle class="point" cx={point.x} cy={point.y} r={POINT_RADIUS} data-chart-point />
	{/each}
</svg>

<style>
	.chart {
		display: block;
		inline-size: 100%;
		block-size: auto;
	}

	.grid {
		stroke: var(--dd-color-chart-grid);
		stroke-width: var(--dd-border-width-thin);
		vector-effect: non-scaling-stroke;
	}

	.tick {
		fill: var(--dd-color-chart-text);
		font-size: var(--dd-font-size-sm);
	}

	.reference {
		stroke: var(--dd-color-chart-reference);
		stroke-width: var(--dd-border-width-thick);
		stroke-dasharray: 8 6;
		vector-effect: non-scaling-stroke;
	}

	.line {
		fill: none;
		stroke: var(--dd-color-chart-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
	}

	.point {
		fill: var(--dd-color-chart-point);
		stroke: var(--dd-color-chart-line);
		stroke-width: var(--dd-border-width-thick);
		vector-effect: non-scaling-stroke;
	}
</style>
