<svelte:options namespace="svg" />

<script lang="ts">
	import type { Snippet } from 'svelte';
	import Form from './Form.svelte';
	import { CARGOS, WAGON, type CargoItem } from './shapes';
	import Wheel from './Wheel.svelte';

	interface Props {
		/** Body colour, `0` to `WAGON_TONES - 1`. */
		tone: number;
		/** Which load, an index of `CARGOS`. */
		cargo: number;
		/** Degrees the wheels have turned. */
		angle?: number;
		/** A wagon still to come: no colour, no load. */
		empty?: boolean;
		/** The load does the wave, one item after the other. */
		wave?: boolean;
		/** What stands in the wagon in front of the load, hidden below the side (a passenger). */
		inside?: Snippet;
	}

	let { tone, cargo, angle = 0, empty = false, wave = false, inside }: Props = $props();

	const items = $derived(CARGOS[cargo % CARGOS.length] ?? []);

	function paintOf(item: CargoItem): 'wood' | 'cargo' {
		return item.kind === 'crate' || item.kind === 'barrel' ? 'wood' : 'cargo';
	}
</script>

<g class="wagon" data-tone={tone} data-empty={empty || undefined} data-wave={wave || undefined}>
	{#if !empty}
		{#each items as item, index (index)}
			<g class="item" data-tone={item.tone}>
				{#each item.extras as extra (extra.d)}
					<path class="extra" data-paint={extra.paint} d={extra.d} />
				{/each}
				<Form
					form={item}
					paint={paintOf(item)}
					spots={item.spots}
					spotPaint={item.kind === 'barrel' ? 'iron' : 'accent'}
				/>
				{#if item.detail !== ''}
					<path class="fine" d={item.detail} />
				{/if}
			</g>
		{/each}
	{/if}
	{@render inside?.()}

	<path class="hitch" d={WAGON.hitchPath} />
	{#each WAGON.hitchLinks as link (link)}
		<path class="link" d={link} />
	{/each}
	{#each WAGON.buffers as buffer (buffer.stock)}
		<path class="part iron" d={buffer.stock} />
		<Form form={buffer.head} paint="steel" />
	{/each}
	<Form form={WAGON.solebar} paint="iron" />
	<Form form={WAGON.body} paint={empty ? 'empty' : 'body'} />
	<path class="fine" d={WAGON.planks} />
	{#each WAGON.stanchions as stanchion (stanchion.d)}
		<Form form={stanchion} paint="steel" edge={false} />
		<path class="fine" d={stanchion.d} />
	{/each}
	{#each WAGON.rivets as rivet (`${rivet.x} ${rivet.y}`)}
		<circle class="rivet" cx={rivet.x} cy={rivet.y} r={rivet.radius} />
	{/each}
	<Form form={WAGON.rim} paint="steel" />
	{#each WAGON.springs as spring (spring)}
		<path class="part iron thin" d={spring} />
	{/each}
	{#each WAGON.wheels as wheel (wheel.x)}
		<Wheel x={wheel.x} y={wheel.y} radius={wheel.radius} spokes={6} {angle} />
	{/each}
</g>

<style>
	.wagon {
		--dd-train-body: var(--dd-color-train-wagon-a);
	}

	.wagon[data-tone='1'] {
		--dd-train-body: var(--dd-color-train-wagon-b);
	}

	.wagon[data-tone='2'] {
		--dd-train-body: var(--dd-color-train-wagon-c);
	}

	.wagon[data-tone='3'] {
		--dd-train-body: var(--dd-color-train-wagon-d);
	}

	.wagon[data-tone='4'] {
		--dd-train-body: var(--dd-color-train-wagon-e);
	}

	.wagon[data-tone='5'] {
		--dd-train-body: var(--dd-color-train-wagon-f);
	}

	.item {
		--dd-train-cargo: var(--dd-color-train-cargo-a);
		--dd-train-accent: var(--dd-color-train-cargo-c);
	}

	.item[data-tone='1'] {
		--dd-train-cargo: var(--dd-color-train-cargo-b);
	}

	.item[data-tone='2'] {
		--dd-train-cargo: var(--dd-color-train-cargo-c);
		--dd-train-accent: var(--dd-color-train-cargo-a);
	}

	.item[data-tone='3'] {
		--dd-train-cargo: var(--dd-color-train-cargo-d);
	}

	.part,
	.extra,
	.fine,
	.hitch,
	.link {
		stroke: var(--dd-color-train-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.thin,
	.fine,
	.link {
		stroke-width: var(--dd-border-width-thin);
	}

	.fine,
	.hitch,
	.link {
		fill: transparent;
	}

	.hitch {
		stroke: var(--dd-color-train-iron);
		stroke-width: var(--dd-border-width-target);
	}

	.iron {
		fill: var(--dd-color-train-iron);
	}

	.extra {
		fill: var(--dd-train-accent);
	}

	.extra[data-paint='leaf'] {
		fill: var(--dd-color-train-leaf);
	}

	.extra[data-paint='wood'] {
		fill: var(--dd-color-train-wood);
	}

	.rivet {
		fill: var(--dd-color-train-light);
		fill-opacity: var(--dd-opacity-train-light);
	}

	/* The wave of the load (scene cargo-wave): each item jumps a little after the one before. */
	.wagon[data-wave] .item {
		transform-box: fill-box;
		transform-origin: 50% 100%;
		animation-name: cargo-wave;
		animation-duration: var(--dd-duration-scene);
		animation-delay: calc(var(--dd-duration-reward-delay) + var(--dd-duration-scene) * 0.06);
		animation-timing-function: var(--dd-easing-standard);
		animation-fill-mode: both;
	}

	.wagon[data-wave] .item:nth-of-type(2) {
		animation-delay: calc(var(--dd-duration-reward-delay) + var(--dd-duration-scene) * 0.14);
	}

	.wagon[data-wave] .item:nth-of-type(3) {
		animation-delay: calc(var(--dd-duration-reward-delay) + var(--dd-duration-scene) * 0.22);
	}

	.wagon[data-wave] .item:nth-of-type(4) {
		animation-delay: calc(var(--dd-duration-reward-delay) + var(--dd-duration-scene) * 0.3);
	}

	@keyframes cargo-wave {
		0% {
			translate: 0 0;
			scale: 1 1;
		}

		10% {
			scale: 1.12 0.82;
		}

		24% {
			translate: 0 calc(var(--dd-space-lg) * -1);
			scale: 0.94 1.1;
		}

		38% {
			translate: 0 0;
			scale: 1.1 0.86;
		}

		46% {
			translate: 0 calc(var(--dd-space-sm) * -1);
			scale: 1 1;
		}

		54%,
		100% {
			translate: 0 0;
			scale: 1 1;
		}
	}
</style>
