<svelte:options namespace="svg" />

<script lang="ts">
	import { locateShare, strokeFractions } from './draw';
	import { paintOrder, type DrawingPicture, type DrawingPoint } from './shapes';

	interface Props {
		picture: DrawingPicture;
		/** Share (0 to 1) of the drawing that is traced. */
		share: number;
		/** Show the colours. */
		colored: boolean;
		/** Calm motion: the lines and the colours appear without moving. */
		still: boolean;
	}

	/** Samples taken along the stretch of line drawn by the last group. */
	const TRACE_SAMPLES = 14;

	let { picture, share, colored, still }: Props = $props();

	const weights = $derived(picture.strokes.map((stroke) => stroke.weight));
	const fractions = $derived(strokeFractions(weights, share));
	const painted = $derived(paintOrder(picture));
	const lines: (SVGPathElement | undefined)[] = [];

	/** Where the pencil is when `at` of the drawing is traced (a measure of the page, once drawn). */
	export function pointAt(at: number): DrawingPoint | null {
		const { index, fraction } = locateShare(weights, at);
		const line = lines[index];
		if (!line || typeof line.getTotalLength !== 'function') return null;
		const length = line.getTotalLength();
		const point = line.getPointAtLength(length * fraction);
		const matrix = line.transform.baseVal.consolidate()?.matrix;
		const placed = matrix ? new DOMPoint(point.x, point.y).matrixTransform(matrix) : point;
		return { x: placed.x, y: placed.y };
	}

	/** The line drawn between two shares of the drawing, as a path; empty when it cannot be measured. */
	export function traceBetween(from: number, to: number): string {
		const points: DrawingPoint[] = [];
		for (let step = 0; step <= TRACE_SAMPLES; step++) {
			const point = pointAt(from + ((to - from) * step) / TRACE_SAMPLES);
			if (point) points.push(point);
		}
		return points
			.map(
				(point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`
			)
			.join('');
	}
</script>

<g class="art" data-colored={colored || undefined} data-still={still || undefined}>
	<g class="colors">
		{#each painted as stroke, index (index)}
			<path class="paint" data-tone={stroke.tone} d={stroke.d} transform={stroke.transform} />
		{/each}
		{#each picture.touches as touch, index (index)}
			<path class="paint" data-tone={touch.tone} d={touch.d} />
		{/each}
	</g>
	<g class="lines">
		{#each picture.strokes as stroke, index (index)}
			<path
				bind:this={lines[index]}
				class="line"
				d={stroke.d}
				transform={stroke.transform}
				pathLength="1"
				stroke-dashoffset={1 - (fractions[index] ?? 0)}
				visibility={(fractions[index] ?? 0) > 0 ? 'visible' : 'hidden'}
			/>
		{/each}
	</g>
</g>

<style>
	.line {
		fill: transparent;
		stroke: var(--dd-color-drawing-line);
		stroke-width: calc(var(--dd-border-width-drawing-bold) * 1.25);
		stroke-linecap: round;
		stroke-linejoin: round;
		/* pathLength="1": the dash covers the whole line, the gap is long enough to hide the cap. */
		stroke-dasharray: 1 3;
		transition-property: stroke-dashoffset;
		transition-duration: var(--dd-duration-fast);
		transition-timing-function: var(--dd-easing-steady);
	}

	.art[data-still] .line {
		transition: none;
	}

	.paint {
		stroke: none;
	}

	.colors {
		opacity: 0;
		transition-property: opacity;
		transition-duration: var(--dd-duration-slow);
		transition-delay: var(--dd-duration-reward-delay);
		transition-timing-function: var(--dd-easing-enter);
	}

	.art[data-colored] .colors {
		opacity: 100%;
	}

	.art[data-still]:not([data-colored]) .colors {
		transition: none;
	}

	.paint[data-tone='orange'] {
		fill: var(--dd-color-food-a);
	}

	.paint[data-tone='pink'] {
		fill: var(--dd-color-food-b);
	}

	.paint[data-tone='yellow'] {
		fill: var(--dd-color-food-c);
	}

	.paint[data-tone='green'] {
		fill: var(--dd-color-food-d);
	}

	.paint[data-tone='teal'] {
		fill: var(--dd-color-food-e);
	}

	.paint[data-tone='lilac'] {
		fill: var(--dd-color-food-f);
	}

	.paint[data-tone='clay'] {
		fill: var(--dd-color-astre-b);
	}

	.paint[data-tone='cream'] {
		fill: var(--dd-color-bubble-surface);
	}

	.paint[data-tone='slate'] {
		fill: var(--dd-color-pot-steam);
	}

	.paint[data-tone='ink'] {
		fill: var(--dd-color-drawing-ink);
	}
</style>
