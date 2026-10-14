<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';

	type Mood = 'idle' | 'happy' | 'oops' | 'cheer';

	interface Props {
		mood: Mood;
	}

	const LABELS: Readonly<Record<Mood, () => string>> = {
		idle: m.ui_companion_idle,
		happy: m.ui_companion_happy,
		oops: m.ui_companion_oops,
		cheer: m.ui_companion_cheer
	};
	const SPARKLE_PATH = 'M16 22L18.5 28L25 30.5L18.5 33L16 39L13.5 33L7 30.5L13.5 28Z';

	let { mood }: Props = $props();

	const label = $derived(LABELS[mood]());
	const armsUp = $derived(mood === 'cheer');
	const smiling = $derived(mood === 'happy' || mood === 'cheer');
</script>

<svg class="companion" viewBox="0 0 120 120" role="img" aria-label={label} data-mood={mood}>
	{#if mood === 'cheer'}
		<path class="sparkle line" d={SPARKLE_PATH} />
		<path class="sparkle line" d={SPARKLE_PATH} transform="translate(86 -4)" />
	{/if}
	<g class="dino">
		<path class="body line" d="M88 92Q114 98 108 68Q100 86 86 82Z" />
		<path class="plate line" d="M40 28L45 14L53 24Z" />
		<path class="plate line" d="M52 22L60 8L68 22Z" />
		<path class="plate line" d="M67 24L75 14L80 28Z" />
		<ellipse class="body line" cx="44" cy="107" rx="12" ry="6" />
		<ellipse class="body line" cx="76" cy="107" rx="12" ry="6" />
		<ellipse class="body line" cx="60" cy="76" rx="35" ry="31" />
		<ellipse class="belly line" cx="60" cy="93" rx="20" ry="13" />
		{#if armsUp}
			<ellipse class="body line" cx="24" cy="54" rx="6" ry="10" />
			<ellipse class="body line" cx="96" cy="54" rx="6" ry="10" />
		{:else}
			<ellipse class="body line" cx="27" cy="82" rx="6" ry="10" />
			<ellipse class="body line" cx="93" cy="82" rx="6" ry="10" />
		{/if}
		<circle class="body line" cx="60" cy="48" r="29" />
		{#if smiling}
			<circle class="cheek" cx="38" cy="60" r="5" />
			<circle class="cheek" cx="82" cy="60" r="5" />
			<path class="open line" d="M40 48Q48 38 56 48" />
			<path class="open line" d="M64 48Q72 38 80 48" />
		{:else}
			<g class="eyes">
				<circle class="white line" cx="48" cy="46" r="8" />
				<circle class="white line" cx="72" cy="46" r="8" />
				<circle class="ink" cx={mood === 'oops' ? 47 : 49} cy={mood === 'oops' ? 49 : 47} r="4" />
				<circle class="ink" cx={mood === 'oops' ? 71 : 73} cy={mood === 'oops' ? 49 : 47} r="4" />
			</g>
		{/if}
		{#if mood === 'oops'}
			<path class="open line" d="M38 38L54 33" />
			<path class="open line" d="M66 33L82 38" />
			<path class="open line" d="M52 63Q56 60 60 63Q64 66 68 63" />
		{:else if mood === 'happy'}
			<path class="ink line" d="M50 58Q60 72 70 58Z" />
		{:else if mood === 'cheer'}
			<path class="ink line" d="M47 56Q60 78 73 56Z" />
			<ellipse class="cheek" cx="60" cy="68" rx="6" ry="4" />
		{:else}
			<path class="open line" d="M52 60Q60 66 68 60" />
		{/if}
	</g>
</svg>

<style>
	.companion {
		inline-size: var(--dd-size-companion);
		block-size: var(--dd-size-companion);
	}

	.line {
		stroke: var(--dd-color-companion-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.body {
		fill: var(--dd-color-companion-body);
	}

	.belly {
		fill: var(--dd-color-companion-belly);
	}

	.plate {
		fill: var(--dd-color-companion-plate);
	}

	.white {
		fill: var(--dd-color-companion-eye);
	}

	.sparkle {
		fill: var(--dd-color-star-fill);
	}

	.cheek {
		fill: var(--dd-color-companion-cheek);
	}

	.ink {
		fill: var(--dd-color-companion-line);
	}

	.open {
		fill: transparent;
	}

	[data-mood='happy'] .dino,
	[data-mood='cheer'] .dino {
		animation-name: hop;
		animation-duration: var(--dd-duration-beat);
		animation-delay: var(--dd-duration-reward-delay);
		animation-timing-function: var(--dd-easing-standard);
		animation-iteration-count: 2;
	}

	[data-mood='cheer'] .dino {
		animation-iteration-count: 3;
	}

	[data-mood='oops'] .dino {
		animation-name: nod;
		animation-duration: var(--dd-duration-slow);
		animation-timing-function: var(--dd-easing-standard);
		animation-iteration-count: 2;
	}

	[data-mood='idle'] .eyes {
		transform-box: fill-box;
		transform-origin: center;
		animation-name: blink;
		animation-duration: var(--dd-duration-slow);
		animation-timing-function: var(--dd-easing-standard);
	}

	@keyframes hop {
		0%,
		100% {
			translate: 0 0;
		}
		50% {
			translate: 0 calc(var(--dd-space-md) * -1);
		}
	}

	@keyframes nod {
		0%,
		100% {
			translate: 0 0;
		}
		50% {
			translate: 0 var(--dd-space-xs);
		}
	}

	@keyframes blink {
		0%,
		100% {
			scale: 1 1;
		}
		50% {
			scale: 1 0.1;
		}
	}
</style>
