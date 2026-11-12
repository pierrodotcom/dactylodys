<svelte:options namespace="svg" />

<!--
	One object of the river. It floats one place further, slowly, when the one before it is caught;
	it waits at the dock as long as needed; once caught it hops out of the water into the crate.
	With calm motion it never moves: it is put in its place, and appears in the crate with a fade.
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { readDurationToken, readEasingToken } from '$lib/ui/motion';
	import ObjectArt from './ObjectArt.svelte';
	import { labelShift, samePlace, upstreamOf, type ObjectRole, type Place } from './river';
	import { RIPPLE, type ObjectArt as Art } from './shapes';

	interface Props {
		art: Art;
		place: Place;
		role: ObjectRole;
		/** Calm motion: no movement, only a fade. */
		still: boolean;
		/** The group the object carries, in small, with the good keys typed so far. */
		label?: { readonly text: readonly string[]; readonly typed: number };
	}

	const DRIFT_TOKEN = '--dd-duration-river-drift';
	const CATCH_TOKEN = '--dd-duration-reward';
	const CATCH_DELAY_TOKEN = '--dd-duration-reward-delay';
	const EASING_TOKEN = '--dd-easing-standard';
	/** How high the object is lifted out of the water on its way to the crate. */
	const HOP = 48;
	/** The label hangs this far above the middle of the object. */
	const TAG_Y = -46;
	const TAG_HEIGHT = 26;
	const TAG_PADDING = 8;
	/** Room kept between the label and the edges of the scene. */
	const TAG_MARGIN = 6;
	/** Width of a character before the label is measured. */
	const CHAR_GUESS = 9;

	let { art, place, role, still, label }: Props = $props();

	const floating = $derived(role === 'docked' || role === 'waiting');
	const position = new Tween<Place>(
		untrack(() => (still || !floating ? place : upstreamOf(place)))
	);

	function hop(from: Place, to: Place): (t: number) => Place {
		return (t) => ({
			x: from.x + (to.x - from.x) * t,
			y: from.y + (to.y - from.y) * t - HOP * Math.sin(Math.PI * t),
			scale: from.scale + (to.scale - from.scale) * t
		});
	}

	/** Where the object was last sent: a key typed or a mood that changes must not start it again. */
	let aimed: Place | null = null;

	$effect(() => {
		const target = place;
		if (aimed !== null && samePlace(aimed, target)) return;
		aimed = target;
		if (still) {
			void position.set(target, { duration: 0 });
			return;
		}
		const caught = role === 'caught';
		void position.set(target, {
			duration: readDurationToken(caught ? CATCH_TOKEN : DRIFT_TOKEN),
			delay: caught ? readDurationToken(CATCH_DELAY_TOKEN) : 0,
			easing: readEasingToken(EASING_TOKEN),
			...(caught ? { interpolate: hop } : {})
		});
	});

	const fadeIn = $derived(still && role === 'caught');

	let textNode: SVGTextElement | undefined = $state();
	let measured: number | null = $state(null);
	const typedText = $derived(label ? label.text.slice(0, label.typed).join('') : '');
	const restText = $derived(label ? label.text.slice(label.typed).join('') : '');

	$effect(() => {
		void typedText;
		void restText;
		try {
			measured = textNode ? textNode.getComputedTextLength() : null;
		} catch {
			measured = null;
		}
	});

	const tagWidth = $derived((measured ?? (label?.text.length ?? 0) * CHAR_GUESS) + TAG_PADDING * 2);
	const shift = $derived(labelShift(position.current.x, tagWidth, TAG_MARGIN));
</script>

<g
	class="floater"
	transform="translate({position.current.x} {position.current.y}) scale({position.current.scale})"
	data-role={role}
	data-art={art.id}
>
	{#if floating}
		<path class="ripple" d={RIPPLE} />
	{/if}
	<g class="body" data-reward={fadeIn || undefined} data-still={fadeIn || undefined}>
		<ObjectArt {art} />
	</g>
	{#if label}
		<path class="thread" d="M{shift * 0.4} {TAG_Y + TAG_HEIGHT / 2}L0 -24" />
		<g class="tag" transform="translate({shift} {TAG_Y})">
			<rect
				class="tag-card"
				x={-tagWidth / 2}
				y={-TAG_HEIGHT / 2}
				width={tagWidth}
				height={TAG_HEIGHT}
				rx="6"
			/>
			<text
				class="tag-text"
				y="0"
				dominant-baseline="central"
				text-anchor="middle"
				bind:this={textNode}
				><tspan class="typed">{typedText}</tspan><tspan class="pending">{restText}</tspan></text
			>
		</g>
	{/if}
</g>

<style>
	.ripple,
	.thread {
		fill: transparent;
		stroke: var(--dd-color-river-ripple);
		stroke-width: var(--dd-border-width-thick);
		stroke-linecap: round;
		stroke-opacity: var(--dd-opacity-river-ripple);
		vector-effect: non-scaling-stroke;
	}

	.thread {
		stroke: var(--dd-color-river-label-border);
		stroke-width: var(--dd-border-width-thin);
		stroke-opacity: 1;
	}

	.tag-card {
		fill: var(--dd-color-river-label-surface);
		stroke: var(--dd-color-river-label-border);
		stroke-width: var(--dd-border-width-thin);
		vector-effect: non-scaling-stroke;
	}

	.tag-text {
		font-family: var(--dd-font-family-base);
		font-size: var(--dd-font-size-sm);
		font-weight: var(--dd-font-weight-bold);
		white-space: pre;
	}

	.typed {
		fill: var(--dd-color-river-label-text);
	}

	.pending {
		fill: var(--dd-color-river-label-pending);
	}
</style>
