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

	const uid = $props.id();
	const weights = $derived(picture.strokes.map((stroke) => stroke.weight));
	const fractions = $derived(strokeFractions(weights, share));
	const painted = $derived(paintOrder(picture));
	/** Every visible piece of line, in drawing order, with how much of it is drawn. */
	const pieces = $derived(
		picture.strokes.flatMap((stroke, index) => {
			const drawn = strokeFractions(
				stroke.pieces.map((piece) => piece.length),
				fractions[index] ?? 0
			);
			return stroke.pieces.map((piece, at) => ({
				d: piece.d,
				fine: stroke.fine === true,
				cut: piece.cut,
				drawn: drawn[at] ?? 0
			}));
		})
	);
	/** Index of the first piece of each stroke in `pieces`. */
	const firstPiece = $derived(
		picture.strokes.reduce<number[]>(
			(starts, stroke, index) => [
				...starts,
				(starts[index - 1] ?? 0) + (picture.strokes[index - 1]?.pieces.length ?? 0)
			],
			[]
		)
	);
	const lines: (SVGPathElement | undefined)[] = [];

	function clipId(index: number): string {
		return `${uid}-paint-${index}`;
	}

	/** Where the pencil is when `at` of the drawing is traced (a measure of the page, once drawn). */
	export function pointAt(at: number): DrawingPoint | null {
		const { index, fraction } = locateShare(weights, at);
		const stroke = picture.strokes[index];
		if (!stroke || stroke.pieces.length === 0) return null;
		const inStroke = locateShare(
			stroke.pieces.map((piece) => piece.length),
			fraction
		);
		const line = lines[(firstPiece[index] ?? 0) + inStroke.index];
		if (!line || typeof line.getTotalLength !== 'function') return null;
		const point = line.getPointAtLength(line.getTotalLength() * inStroke.fraction);
		return { x: point.x, y: point.y };
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
		{#if picture.ground}
			<path class="paint" data-tone="ground" d={picture.ground} />
		{/if}
		{#each painted as stroke, index (index)}
			<clipPath id={clipId(index)}><path d={stroke.fill ?? stroke.d} /></clipPath>
			<path class="paint" data-tone={stroke.tone} d={stroke.fill ?? stroke.d} />
			<g clip-path="url(#{clipId(index)})">
				{#each stroke.marks ?? [] as mark, at (at)}
					<path class="paint" data-tone={mark.tone} fill-rule="evenodd" d={mark.d} />
				{/each}
				{#if stroke.shade}
					<path class="paint" data-tone="shade" fill-rule="evenodd" d={stroke.shade} />
				{/if}
				{#if stroke.rim}
					<path class="paint" data-tone="light" fill-rule="evenodd" d={stroke.rim} />
				{/if}
			</g>
		{/each}
		{#each picture.touches as touch, index (index)}
			<path class="paint" data-tone={touch.tone} d={touch.d} />
		{/each}
	</g>
	<g class="lines">
		{#each pieces as piece, index (index)}
			<path
				bind:this={lines[index]}
				class="line"
				data-fine={piece.fine || undefined}
				data-cut={piece.cut || undefined}
				d={piece.d}
				pathLength="1"
				stroke-dashoffset={1 - piece.drawn}
				visibility={piece.drawn > 0 ? 'visible' : 'hidden'}
			/>
		{/each}
	</g>
</g>

<style>
	.line {
		fill: transparent;
		stroke: var(--dd-color-drawing-pencil);
		stroke-width: calc(var(--dd-border-width-drawing-bold) * 0.85);
		stroke-linecap: round;
		stroke-linejoin: round;
		/* pathLength="1": the dash covers the whole line, the gap is long enough to hide the cap. */
		stroke-dasharray: 1 3;
		transition-property: stroke-dashoffset;
		transition-duration: var(--dd-duration-fast);
		transition-timing-function: var(--dd-easing-steady);
	}

	.line[data-fine] {
		stroke-width: calc(var(--dd-border-width-drawing-bold) * 0.5);
	}

	/* A line that goes behind a form stops flat under its outline, without a round end showing. */
	.line[data-cut] {
		stroke-linecap: butt;
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

	.paint[data-tone='shade'] {
		fill: var(--dd-color-drawing-shade);
		fill-opacity: var(--dd-opacity-drawing-shade);
	}

	.paint[data-tone='light'] {
		fill: var(--dd-color-drawing-light);
		fill-opacity: var(--dd-opacity-drawing-light);
	}

	.paint[data-tone='ground'] {
		fill: var(--dd-color-drawing-shade);
		fill-opacity: var(--dd-opacity-drawing-ground);
	}

	.paint[data-tone='ink'] {
		fill: var(--dd-color-drawing-ink);
	}

	.paint[data-tone='fur'] {
		fill: var(--dd-color-drawing-fur);
	}

	.paint[data-tone='fur-dark'] {
		fill: var(--dd-color-drawing-fur-dark);
	}

	.paint[data-tone='cream'] {
		fill: var(--dd-color-drawing-cream);
	}

	.paint[data-tone='pink'] {
		fill: var(--dd-color-drawing-pink);
	}

	.paint[data-tone='iris'] {
		fill: var(--dd-color-drawing-iris);
	}

	.paint[data-tone='white'] {
		fill: var(--dd-color-drawing-white);
	}

	.paint[data-tone='sea'] {
		fill: var(--dd-color-drawing-sea);
	}

	.paint[data-tone='fin'] {
		fill: var(--dd-color-drawing-fin);
	}

	.paint[data-tone='stripe'] {
		fill: var(--dd-color-drawing-stripe);
	}

	.paint[data-tone='bubble'] {
		fill: var(--dd-color-drawing-bubble);
	}

	.paint[data-tone='leaf'] {
		fill: var(--dd-color-drawing-leaf);
	}

	.paint[data-tone='leaf-dark'] {
		fill: var(--dd-color-drawing-leaf-dark);
	}

	.paint[data-tone='wall'] {
		fill: var(--dd-color-drawing-wall);
	}

	.paint[data-tone='roof'] {
		fill: var(--dd-color-drawing-roof);
	}

	.paint[data-tone='roof-dark'] {
		fill: var(--dd-color-drawing-roof-dark);
	}

	.paint[data-tone='wood'] {
		fill: var(--dd-color-drawing-wood);
	}

	.paint[data-tone='glass'] {
		fill: var(--dd-color-drawing-glass);
	}

	.paint[data-tone='brick'] {
		fill: var(--dd-color-drawing-brick);
	}

	.paint[data-tone='grass'] {
		fill: var(--dd-color-drawing-grass);
	}

	.paint[data-tone='stone'] {
		fill: var(--dd-color-drawing-stone);
	}

	.paint[data-tone='curtain'] {
		fill: var(--dd-color-drawing-curtain);
	}

	.paint[data-tone='petal'] {
		fill: var(--dd-color-drawing-petal);
	}

	.paint[data-tone='petal-dark'] {
		fill: var(--dd-color-drawing-petal-dark);
	}

	.paint[data-tone='pollen'] {
		fill: var(--dd-color-drawing-pollen);
	}

	.paint[data-tone='hull'] {
		fill: var(--dd-color-drawing-hull);
	}

	.paint[data-tone='water'] {
		fill: var(--dd-color-drawing-water);
	}

	.paint[data-tone='gold'] {
		fill: var(--dd-color-drawing-gold);
	}

	.paint[data-tone='gold-dark'] {
		fill: var(--dd-color-drawing-gold-dark);
	}

	.paint[data-tone='lilac'] {
		fill: var(--dd-color-drawing-lilac);
	}

	.paint[data-tone='smoke'] {
		fill: var(--dd-color-drawing-smoke);
	}
</style>
