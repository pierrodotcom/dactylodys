<svelte:options namespace="svg" />

<script lang="ts">
	import { CARGOS, WAGON } from './shapes';

	interface Props {
		/** Body colour, `0` to `WAGON_TONES - 1`. */
		tone: number;
		/** Which load, an index of `CARGOS`. */
		cargo: number;
		/** Degrees the wheels have turned. */
		angle?: number;
		/** Draw an empty outline, for a wagon that is not hooked yet. */
		empty?: boolean;
		/** The load does the wave, one item after the other. */
		wave?: boolean;
	}

	let { tone, cargo, angle = 0, empty = false, wave = false }: Props = $props();

	const items = $derived(CARGOS[cargo % CARGOS.length] ?? []);
</script>

<g class="wagon" data-tone={tone} data-empty={empty || undefined} data-wave={wave || undefined}>
	{#if !empty}
		{#each items as item, index (index)}
			<g class="item" data-tone={item.tone}>
				<path class="cargo" d={item.d} />
				{#if item.detail !== ''}
					<path class="detail" d={item.detail} />
				{/if}
			</g>
		{/each}
	{/if}
	<path class="chassis" d={WAGON.chassisPath} />
	<path class="hitch" d={WAGON.hitchPath} />
	<path class="hitch" d={WAGON.hitchRingPath} />
	<path class="body" d={WAGON.bodyPath} />
	{#if !empty}
		<path class="detail" d={WAGON.rimPath} />
		{#each WAGON.plankPaths as plank (plank)}
			<path class="detail" d={plank} />
		{/each}
	{/if}
	{#each WAGON.wheels as wheel (wheel.x)}
		<g transform="rotate({angle} {wheel.x} {wheel.y})">
			<circle class="wheel" cx={wheel.x} cy={wheel.y} r={wheel.radius} />
			<path
				class="spoke"
				d="M{wheel.x - wheel.radius + 2} {wheel.y}L{wheel.x + wheel.radius - 2} {wheel.y}"
			/>
			<circle class="hub" cx={wheel.x} cy={wheel.y} r="2" />
		</g>
	{/each}
</g>

<style>
	.wagon {
		--dd-train-body: var(--dd-color-food-a);
	}

	.wagon[data-tone='1'] {
		--dd-train-body: var(--dd-color-food-d);
	}

	.wagon[data-tone='2'] {
		--dd-train-body: var(--dd-color-food-b);
	}

	.wagon[data-tone='3'] {
		--dd-train-body: var(--dd-color-food-e);
	}

	.wagon[data-tone='4'] {
		--dd-train-body: var(--dd-color-food-c);
	}

	.wagon[data-tone='5'] {
		--dd-train-body: var(--dd-color-food-f);
	}

	.item {
		--dd-train-cargo: var(--dd-color-wear-red);
	}

	.item[data-tone='1'] {
		--dd-train-cargo: var(--dd-color-wear-blue);
	}

	.item[data-tone='2'] {
		--dd-train-cargo: var(--dd-color-wear-cream);
	}

	.item[data-tone='3'] {
		--dd-train-cargo: var(--dd-color-wear-gold);
	}

	.body,
	.cargo,
	.chassis,
	.wheel,
	.hub,
	.detail,
	.spoke,
	.hitch {
		stroke: var(--dd-color-drawing-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.body {
		fill: var(--dd-train-body);
	}

	.wagon[data-empty] .body {
		fill: var(--dd-color-surface-raised);
	}

	.cargo {
		fill: var(--dd-train-cargo);
	}

	.chassis {
		fill: var(--dd-color-border-strong);
	}

	.wheel {
		fill: var(--dd-color-pot-body);
	}

	.hub {
		fill: var(--dd-color-star-fill);
	}

	.detail,
	.spoke,
	.hitch {
		fill: transparent;
	}

	.detail {
		stroke-width: var(--dd-border-width-thin);
	}

	.spoke {
		stroke: var(--dd-color-surface-raised);
		stroke-width: var(--dd-border-width-thin);
	}

	.hitch {
		stroke-width: var(--dd-border-width-target);
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
