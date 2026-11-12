<!--
	The decor behind the egg (`shared/decor.ts`): an arched window of landscape, in the units of the
	egg drawing so that the ground meets the egg. `front` draws what stands before the egg (the rim
	of the nest). Decorative: hidden from screen readers like the egg.
-->
<script lang="ts">
	import type { DecorOf } from '../shared/decor';
	import { ARCH_PATH, BEACH, NEST, NEST_SPRING, SNOW_NIGHT } from './decor';

	interface Props {
		decor: Exclude<DecorOf<'hatching'>, 'bare'>;
		layer?: 'back' | 'front';
	}

	let { decor, layer = 'back' }: Props = $props();

	const uid = $props.id();
	const archId = `${uid}-arch`;
	const rimId = `${uid}-rim`;
</script>

<svg
	class="decor"
	viewBox="0 0 120 150"
	focusable="false"
	aria-hidden="true"
	data-layer={layer}
	data-decor-art={decor}
>
	<clipPath id={archId}><path d={ARCH_PATH} /></clipPath>
	{#if layer === 'back'}
		<path class="sky" d={ARCH_PATH} />
		<g clip-path="url(#{archId})">
			{#if decor === 'nest'}
				<path class="sun outline" d={NEST_SPRING.sun.disc} />
				<path class="light" d={NEST_SPRING.sun.light} />
				<path class="cloud outline" d={NEST_SPRING.cloud} />
				<path class="open outline" d={NEST_SPRING.birds} />
				<path class="hill-far outline" d={NEST_SPRING.hillFar} />
				<path class="hill-near outline" d={NEST_SPRING.hillNear} />
				<path class="open blade" d={NEST_SPRING.tufts} />
				{#each NEST_SPRING.flowers as flower (flower.heart)}
					{#each flower.petals as petal (petal)}
						<path class="petal-edge" d={petal} />
					{/each}
					{#each flower.petals as petal (petal)}
						<path class="petal" d={petal} />
					{/each}
					<path class="heart" d={flower.heart} />
				{/each}
				<path class="straw outline" d={NEST.back} />
				<path class="open straw-line" d={NEST.backStraws} />
			{:else if decor === 'beach'}
				<path class="sun outline" d={BEACH.sun.disc} />
				<path class="light" d={BEACH.sun.light} />
				<path class="cloud outline" d={BEACH.cloud} />
				<path class="sea outline" d={BEACH.sea} />
				<path class="open foam" d={BEACH.waves} />
				<path class="wet" d={BEACH.wet} />
				<path class="open foam" d={BEACH.foam} />
				<path class="sand outline" d={BEACH.sand} />
				<path class="open ripple" d={BEACH.ripples} />
				<path class="shell outline" d={BEACH.shell.fan} />
				<path class="open outline" d={BEACH.shell.ribs} />
				<path class="starfish outline" d={BEACH.starfish} />
				<path class="dot" d={BEACH.starfishDots} />
			{:else}
				<path class="moon outline" d={SNOW_NIGHT.moon} />
				<path class="star" d={SNOW_NIGHT.stars} data-effect />
				<path class="star" d={SNOW_NIGHT.dots} />
				<path class="open flake" d={SNOW_NIGHT.flakes} />
				<path class="snow-far outline" d={SNOW_NIGHT.hillFar} />
				{#each SNOW_NIGHT.firs as fir (fir.tree)}
					<path class="trunk outline" d={fir.trunk} />
					<path class="fir outline" d={fir.tree} />
					<path class="snow outline" d={fir.snow} />
				{/each}
				<path class="snow outline" d={SNOW_NIGHT.hillNear} />
			{/if}
		</g>
		<path class="open frame" d={ARCH_PATH} />
	{:else if decor === 'nest'}
		<g clip-path="url(#{archId})">
			<clipPath id={rimId}><path d={NEST.front} /></clipPath>
			<path class="straw" d={NEST.front} />
			<g clip-path="url(#{rimId})">
				<path class="straw-shade" d={NEST.frontShade} />
			</g>
			<path class="open straw-line" d={NEST.straws} />
			<path class="open outline" d={NEST.front} />
		</g>
	{/if}
</svg>

<style>
	.decor {
		display: block;
		inline-size: 100%;
		block-size: auto;
		overflow: visible;
	}

	path {
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.outline,
	.frame {
		stroke: var(--dd-color-egg-line);
		stroke-width: var(--dd-border-width-thin);
	}

	.frame {
		stroke-width: var(--dd-border-width-thick);
	}

	.open {
		fill: transparent;
	}

	.light {
		fill: var(--dd-color-egg-light);
		fill-opacity: var(--dd-opacity-egg-light);
	}

	[data-decor-art='nest'] .sky {
		fill: var(--dd-color-decor-spring-sky);
	}

	[data-decor-art='beach'] .sky {
		fill: var(--dd-color-decor-beach-sky);
	}

	[data-decor-art='snow'] .sky {
		fill: var(--dd-color-decor-night-sky);
	}

	.sun {
		fill: var(--dd-color-decor-day-sun);
	}

	.cloud {
		fill: var(--dd-color-decor-day-cloud);
	}

	.hill-far {
		fill: var(--dd-color-decor-spring-hill);
	}

	.hill-near {
		fill: var(--dd-color-decor-meadow-grass);
	}

	.blade {
		stroke: var(--dd-color-decor-meadow-blade);
		stroke-width: var(--dd-border-width-thick);
	}

	.petal-edge {
		fill: var(--dd-color-egg-line);
		stroke: var(--dd-color-egg-line);
		stroke-width: calc(var(--dd-border-width-thin) * 2);
	}

	.petal {
		fill: var(--dd-color-decor-meadow-petal);
	}

	.heart {
		fill: var(--dd-color-decor-meadow-heart);
	}

	.straw {
		fill: var(--dd-color-decor-nest-straw);
	}

	.straw-shade {
		fill: var(--dd-color-egg-shade);
		fill-opacity: var(--dd-opacity-egg-shade);
	}

	.straw-line {
		stroke: var(--dd-color-decor-nest-twig);
		stroke-width: var(--dd-border-width-thin);
	}

	.sea {
		fill: var(--dd-color-decor-beach-sea);
	}

	.wet {
		fill: var(--dd-color-decor-beach-wet);
	}

	.foam {
		stroke: var(--dd-color-decor-beach-foam);
		stroke-width: var(--dd-border-width-thick);
	}

	.sand {
		fill: var(--dd-color-decor-beach-sand);
	}

	.ripple {
		stroke: var(--dd-color-decor-beach-ripple);
		stroke-width: var(--dd-border-width-thin);
	}

	.shell {
		fill: var(--dd-color-decor-beach-shell);
	}

	.starfish {
		fill: var(--dd-color-decor-beach-starfish);
	}

	.dot {
		fill: var(--dd-color-egg-light);
	}

	.moon {
		fill: var(--dd-color-decor-night-moon);
	}

	.star {
		fill: var(--dd-color-decor-winter-flake);
	}

	.flake {
		stroke: var(--dd-color-decor-winter-flake);
		stroke-width: var(--dd-border-width-thin);
	}

	.snow-far {
		fill: var(--dd-color-decor-winter-snow-far);
	}

	.snow {
		fill: var(--dd-color-decor-winter-snow);
	}

	.fir {
		fill: var(--dd-color-decor-winter-evergreen);
	}

	.trunk {
		fill: var(--dd-color-decor-nest-twig);
	}
</style>
