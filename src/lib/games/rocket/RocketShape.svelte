<svelte:options namespace="svg" />

<script lang="ts">
	import { ROCKET, type Modelled } from './shapes';

	interface Props {
		/** Engine off, legs out. */
		landed: boolean;
		/** Changes with every good key: the engine pushes once each time. */
		thrust: number;
		/** Draw the flame without the push. */
		still: boolean;
	}

	let { landed, thrust, still }: Props = $props();

	const uid = $props.id();
	const [edge, outer, inner, core] = ROCKET.flame;

	function ref(name: string): string {
		return `${uid}-${name}`;
	}

	function url(name: string): string {
		return `url(#${ref(name)})`;
	}
</script>

<!--
	A form with its volume: its fill, then, kept inside it, the shade away from the light and its
	lights. Every outline is drawn under all the forms first (one outline where two forms meet).
-->
{#snippet volume(name: string, form: Modelled, fill: string)}
	<clipPath id={ref(name)}><path d={form.d} /></clipPath>
	<path class={fill} d={form.d} />
	<g clip-path={url(name)}>
		<path class="shade" fill-rule="evenodd" d={form.shade} />
		{#each form.lights as light (light)}
			<path class="light" d={light} />
		{/each}
	</g>
{/snippet}

<g class="rocket" data-still={still || undefined}>
	{#if !landed}
		{#key thrust}
			<g class="flame">
				<path class="flame-edge line" d={edge} />
				<path class="flame-outer" d={outer} />
				<path class="flame-inner" d={inner} />
				<path class="flame-core" d={core} />
			</g>
		{/key}
	{/if}

	{#if landed}
		{#each ROCKET.legs as leg (leg)}
			<path class="underlay" d={leg} />
		{/each}
		{#each ROCKET.feet as foot (foot.d)}
			<path class="underlay" d={foot.d} />
		{/each}
	{/if}
	{#each ROCKET.fins as fin (fin.d)}
		<path class="underlay" d={fin.d} />
	{/each}
	<path class="underlay" d={ROCKET.nozzle.d} />
	<path class="underlay" d={ROCKET.body.d} />

	{#if landed}
		{#each ROCKET.legs as leg (leg)}
			<path class="leg metal" d={leg} />
		{/each}
		<path class="metal fine" d={ROCKET.legCollar} />
		{#each ROCKET.feet as foot, index (foot.d)}
			{@render volume(`foot-${index}`, foot, 'metal')}
		{/each}
	{/if}
	{#each ROCKET.fins as fin, index (fin.d)}
		{@render volume(`fin-${index}`, fin, 'trim')}
	{/each}
	{@render volume('nozzle', ROCKET.nozzle, 'metal')}
	<path class="open fine" d={ROCKET.nozzleRim} />

	<clipPath id={ref('body')}><path d={ROCKET.body.d} /></clipPath>
	<path class="hull" d={ROCKET.body.d} />
	<g clip-path={url('body')}>
		<path class="trim" d={ROCKET.cap} />
		<path class="trim" d={ROCKET.skirt} />
		<path class="shade" fill-rule="evenodd" d={ROCKET.body.shade} />
		{#each ROCKET.body.lights as light (light)}
			<path class="light" d={light} />
		{/each}
		<path class="open fine" d={ROCKET.capSeam} />
		<path class="open fine" d={ROCKET.skirtSeam} />
	</g>
	{#each ROCKET.rivets as rivet (rivet)}
		<path class="rivet" d={rivet} />
	{/each}
	<path class="open fine" d={ROCKET.body.d} />

	{@render volume('ring', ROCKET.window.ring, 'metal')}
	<path class="open line" d={ROCKET.window.ring.d} />
	{#each ROCKET.window.bolts as bolt (bolt)}
		<path class="rivet" d={bolt} />
	{/each}
	{@render volume('glass', ROCKET.window.glass, 'glass')}
	{#each ROCKET.window.glints as glint (glint)}
		<path class="glint" d={glint} />
	{/each}
	<path class="open fine" d={ROCKET.window.glass.d} />
</g>

<style>
	.line,
	.fine,
	.underlay {
		stroke: var(--dd-color-rocket-line);
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

	/* Under joined forms: only its outer half shows, one outline around them all. */
	.underlay {
		fill: var(--dd-color-rocket-line);
		stroke-width: calc(var(--dd-border-width-thick) * 2);
	}

	.open {
		fill: transparent;
	}

	.hull {
		fill: var(--dd-color-rocket-body);
	}

	.trim {
		fill: var(--dd-color-rocket-trim);
	}

	.metal {
		fill: var(--dd-color-rocket-metal);
	}

	.glass {
		fill: var(--dd-color-rocket-glass);
	}

	.rivet {
		fill: var(--dd-color-rocket-line);
		fill-opacity: var(--dd-opacity-rocket-tail);
	}

	.shade {
		fill: var(--dd-color-rocket-shade);
		fill-opacity: var(--dd-opacity-rocket-shade);
	}

	.light {
		fill: var(--dd-color-rocket-light);
		fill-opacity: var(--dd-opacity-rocket-light);
	}

	.glint {
		fill: var(--dd-color-rocket-light);
	}

	.flame-edge {
		fill: var(--dd-color-rocket-flame-edge);
	}

	.flame-outer {
		fill: var(--dd-color-rocket-flame-outer);
	}

	.flame-inner {
		fill: var(--dd-color-rocket-flame-inner);
	}

	.flame-core {
		fill: var(--dd-color-rocket-flame-core);
	}

	.flame {
		transform-box: fill-box;
		transform-origin: 50% 0%;
		animation-name: push;
		animation-duration: var(--dd-duration-base);
		animation-timing-function: var(--dd-easing-enter);
	}

	[data-still] .flame {
		animation-name: none;
	}

	@keyframes push {
		0% {
			scale: 1.3 1.6;
		}

		100% {
			scale: 1 1;
		}
	}
</style>
