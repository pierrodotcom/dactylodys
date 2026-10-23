<svelte:options namespace="svg" />

<!--
	The passenger of the scene « dino-passenger »: a baby dinosaur of the eggs (same drawing, same
	colours), standing in the wagon among the load. It rises above the side, waves, and goes down.
	Only what is above the side shows.
-->
<script lang="ts">
	import {
		BELLY,
		BELLY_BANDS,
		BELLY_SHADE,
		BODY,
		BODY_LIGHT,
		BODY_SHADE,
		CHEEKS,
		CHIN_SHADE,
		EYES,
		HEAD,
		HEAD_LIGHTS,
		HEAD_OFFSET,
		HEAD_PLATES,
		HEAD_SHADE,
		MOUTH,
		NOSTRILS,
		RAISED_ARMS,
		SIDES,
		SNOUT_RIDGE,
		TONGUE
	} from '../hatching/shapes';
	import { PASSENGER } from './shapes';

	const uid = $props.id();
	const ref = (name: string) => `${uid}-${name}`;
	const url = (name: string) => `url(#${ref(name)})`;

	const WAVING = RAISED_ARMS.right;
</script>

{#snippet modelled(
	name: string,
	d: string,
	fill: string,
	shade: string,
	lights: readonly string[] = []
)}
	<clipPath id={ref(name)}><path {d} /></clipPath>
	<path class={fill} {d} />
	<g clip-path={url(name)}>
		<path class="shade" fill-rule="evenodd" d={shade} />
		{#each lights as light (light)}
			<path class="light" d={light} />
		{/each}
	</g>
{/snippet}

<clipPath id={ref('above')}><path d={PASSENGER.clip} /></clipPath>
<g clip-path={url('above')}>
	<g class="rise">
		<g transform={PASSENGER.transform}>
			<path class="underlay" d={BODY} />

			<g class="wave">
				<path class="underlay" d={WAVING.fill} />
				<path class="underlay" d={WAVING.hand.fill} />
				{@render modelled('wave', WAVING.fill, 'body', WAVING.shade)}
				{@render modelled('wave-hand', WAVING.hand.fill, 'body', WAVING.hand.shade)}
				<path class="open line" d={WAVING.hand.line} />
				<path class="open fine" d={WAVING.hand.fingers} />
			</g>

			{@render modelled('body', BODY, 'body', BODY_SHADE, [BODY_LIGHT])}
			{@render modelled('belly', BELLY, 'belly', BELLY_SHADE)}
			<g clip-path={url('belly')}>
				<path class="open fine" d={BELLY_BANDS} />
			</g>
			<path class="open fine" d={BELLY} />
			<g clip-path={url('body')}>
				<path class="shade" d={CHIN_SHADE} />
			</g>

			<g transform="translate(0 {HEAD_OFFSET})">
				{#each HEAD_PLATES as plate, index (index)}
					<g transform={plate.transform}>
						{@render modelled(`plate-${index}`, plate.d, 'plate', plate.shade)}
						<path class="open line" d={plate.d} />
					</g>
				{/each}
				{@render modelled('head', HEAD, 'body', HEAD_SHADE, HEAD_LIGHTS)}
				<path class="open line" d={HEAD} />
				<path class="open fine" d={SNOUT_RIDGE} />
				{#each SIDES as side (side)}
					{@const eye = EYES[side]}
					<path class="cheek" d={CHEEKS[side]} />
					<clipPath id={ref(`eye-${side}`)}><path d={eye.white} /></clipPath>
					<path class="white" d={eye.white} />
					<g clip-path={url(`eye-${side}`)}>
						<path class="iris" d={eye.iris} />
						<path class="ink" d={eye.pupil} />
						{#each eye.glints as glint (glint)}
							<path class="white" d={glint} />
						{/each}
					</g>
					<path class="open line" d={eye.white} />
					<path class="ink" d={NOSTRILS[side]} />
				{/each}
				<clipPath id={ref('mouth')}><path d={MOUTH} /></clipPath>
				<path class="ink" d={MOUTH} />
				<g clip-path={url('mouth')}><path class="tongue" d={TONGUE} /></g>
				<path class="open line" d={MOUTH} />
			</g>
		</g>
	</g>
</g>

<style>
	.line,
	.fine,
	.underlay {
		stroke: var(--dd-color-train-line);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.line {
		stroke-width: var(--dd-border-width-thick);
	}

	.fine {
		stroke-width: var(--dd-border-width-thin);
	}

	/* Under two joined forms: only its outer half shows, one outline around both. */
	.underlay {
		fill: var(--dd-color-train-line);
		stroke-width: calc(var(--dd-border-width-thick) * 2);
	}

	.open {
		fill: transparent;
	}

	.body {
		fill: var(--dd-color-baby-c);
	}

	.belly {
		fill: var(--dd-color-baby-c-belly);
	}

	.plate,
	.iris {
		fill: var(--dd-color-baby-c-plate);
	}

	.cheek {
		fill: var(--dd-color-baby-c-cheek);
	}

	.white {
		fill: var(--dd-color-companion-eye);
	}

	.ink {
		fill: var(--dd-color-train-line);
	}

	.tongue {
		fill: var(--dd-color-companion-tongue);
	}

	.shade {
		fill: var(--dd-color-train-shade);
		fill-opacity: var(--dd-opacity-train-shade);
	}

	.light {
		fill: var(--dd-color-train-light);
		fill-opacity: var(--dd-opacity-train-light);
	}

	.rise,
	.wave {
		transform-box: fill-box;
		animation-duration: var(--dd-duration-scene);
		animation-delay: var(--dd-duration-reward-delay);
		animation-timing-function: var(--dd-easing-standard);
		animation-fill-mode: both;
	}

	.rise {
		transform-origin: 50% 100%;
		animation-name: rise;
	}

	/* The hand turns round the shoulder, at the bottom left of the raised arm. */
	.wave {
		transform-origin: 18% 92%;
		animation-name: wave;
	}

	@keyframes rise {
		0%,
		10% {
			translate: 0 calc(var(--dd-space-2xl) * 0.95);
		}

		24%,
		82% {
			translate: 0 0;
		}

		96%,
		100% {
			translate: 0 calc(var(--dd-space-2xl) * 0.95);
		}
	}

	@keyframes wave {
		0%,
		26% {
			rotate: 0deg;
		}

		34%,
		50%,
		66% {
			rotate: 16deg;
		}

		42%,
		58% {
			rotate: -12deg;
		}

		74%,
		100% {
			rotate: 0deg;
		}
	}
</style>
