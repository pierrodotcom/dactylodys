<svelte:options namespace="svg" />

<!--
	One object of the river. It floats one place further, slowly, when the one before it is caught;
	it waits at the dock as long as needed; once caught it hops out of the water into the crate.
	With calm motion it never moves: it is put in its place, and appears in the crate with a fade.
	It carries no label: the group to type is in the text zone, in large letters (E-22).
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { readDurationToken, readEasingToken } from '$lib/ui/motion';
	import ObjectArt from './ObjectArt.svelte';
	import { samePlace, upstreamOf, type ObjectRole, type Place } from './river';
	import { RIPPLE, type ObjectArt as Art } from './shapes';

	interface Props {
		art: Art;
		place: Place;
		role: ObjectRole;
		/** Calm motion: no movement, only a fade. */
		still: boolean;
	}

	const DRIFT_TOKEN = '--dd-duration-river-drift';
	const CATCH_TOKEN = '--dd-duration-reward';
	const CATCH_DELAY_TOKEN = '--dd-duration-reward-delay';
	const EASING_TOKEN = '--dd-easing-standard';
	/** How high the object is lifted out of the water on its way to the crate. */
	const HOP = 48;

	let { art, place, role, still }: Props = $props();

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
</g>

<style>
	.ripple {
		fill: transparent;
		stroke: var(--dd-color-river-ripple);
		stroke-width: var(--dd-border-width-thick);
		stroke-linecap: round;
		stroke-opacity: var(--dd-opacity-river-ripple);
		vector-effect: non-scaling-stroke;
	}
</style>
