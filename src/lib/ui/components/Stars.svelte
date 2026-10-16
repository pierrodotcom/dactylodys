<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime.js';

	interface Props {
		count: 0 | 1 | 2 | 3;
		/** Big stars that pop in one after the other, to celebrate a result. */
		celebrate?: boolean;
		/** The star after the last full one is drawn half full: it was nearly won. */
		almost?: boolean;
	}

	const SLOTS = [0, 1, 2] as const;
	const STAR_PATH =
		'M12 2L14.47 8.6L21.51 8.91L16 13.3L17.88 20.09L12 16.2L6.12 20.09L8 13.3L2.49 8.91L9.53 8.6Z';

	let { count, celebrate = false, almost = false }: Props = $props();

	const label = $derived(
		new Intl.PluralRules(getLocale()).select(count) === 'one'
			? m.ui_stars_one({ count, total: SLOTS.length })
			: m.ui_stars_other({ count, total: SLOTS.length })
	);
</script>

<span class="stars" role="img" aria-label={label} data-celebrate={celebrate || undefined}>
	{#each SLOTS as slot (slot)}
		<svg
			viewBox="0 0 24 24"
			focusable="false"
			aria-hidden="true"
			data-filled={slot < count || undefined}
			data-almost={(almost && slot === count) || undefined}
			data-reward={(celebrate && slot < count) || undefined}
			data-reward-variant={celebrate && slot < count ? '3' : undefined}
		>
			<path d={STAR_PATH} />
		</svg>
	{/each}
</span>

<style>
	.stars {
		display: inline-flex;
		gap: var(--dd-space-xs);
	}

	svg {
		inline-size: var(--dd-size-star);
		block-size: var(--dd-size-star);
		overflow: visible;
	}

	path {
		fill: transparent;
		stroke: var(--dd-color-border-strong);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
	}

	[data-celebrate] svg {
		inline-size: var(--dd-size-star-large);
		block-size: var(--dd-size-star-large);
	}

	/* The stars pop in one after the other, a beat apart. */
	[data-celebrate] svg:nth-child(2) {
		animation-delay: calc(var(--dd-duration-reward-delay) + var(--dd-duration-beat));
	}

	[data-celebrate] svg:nth-child(3) {
		animation-delay: calc(var(--dd-duration-reward-delay) + var(--dd-duration-beat) * 2);
	}

	/* The star that was nearly won: the same yellow, but pale. */
	svg[data-almost] path {
		fill: var(--dd-color-star-fill);
		fill-opacity: var(--dd-opacity-star-almost);
		stroke: var(--dd-color-text-primary);
	}

	svg[data-filled] path {
		fill: var(--dd-color-star-fill);
		stroke: var(--dd-color-text-primary);
	}
</style>
