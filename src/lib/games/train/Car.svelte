<svelte:options namespace="svg" />

<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { readDurationToken, readEasingToken } from '$lib/ui/motion';
	import { BRAKE_DUST, HOOK_SPARKS, ROOF_ROCKET, TUNNEL, WAGON, wagonLook } from './shapes';
	import Cloud from './Cloud.svelte';
	import Form from './Form.svelte';
	import Passenger from './Passenger.svelte';
	import { rollStartX, slotX, wheelAngle } from './train';
	import WagonShape from './WagonShape.svelte';

	interface Props {
		/** Index of the group this wagon stands for. */
		index: number;
		total: number;
		/** Share of the way rolled in, `1` once hooked. */
		ratio: number;
		/** Distance the wagon stays short of its place (train units), for the scene that finishes the way. */
		hold: number;
		/** The wagon of the current group: the one that rolls in, hooks and shows the surprise. */
		arriving: boolean;
		/** The group is typed to the end. */
		hooked: boolean;
		/** The surprise scene to play on this wagon. */
		sceneId: string | undefined;
		/** Common entrance (0 to 3) of what appears when the wagon is hooked. */
		entrance: number;
		/** Calm motion: no rolling, only fades. */
		still: boolean;
	}

	const MOVE_TOKEN = '--dd-duration-base';
	const EASING_TOKEN = '--dd-easing-standard';
	/** Where the wheels stand along the wagon. */
	const WHEEL_X = WAGON.wheels.map((wheel) => wheel.x);

	let { index, total, ratio, hold, arriving, hooked, sceneId, entrance, still }: Props = $props();

	const roll = new Tween(0);

	$effect(() => {
		const target = ratio;
		const duration = still ? 0 : readDurationToken(MOVE_TOKEN);
		void roll.set(target, { duration, easing: readEasingToken(EASING_TOKEN) });
	});

	const look = $derived(wagonLook(index));
	const slot = $derived(slotX(index));
	const start = $derived(rollStartX(total));
	const x = $derived(start + (slot - hold - start) * roll.current);
	const playing = $derived(arriving && hooked && sceneId !== undefined);
	const play = $derived(playing ? sceneId : undefined);
</script>

{#snippet passenger()}
	<Passenger />
{/snippet}

<g transform="translate({x} 0)" data-arriving={arriving || undefined}>
	{#if play === 'tunnel-peek'}
		<path class="mouth" d={TUNNEL.mouth} />
	{/if}

	<g class="car" data-play={play}>
		<rect
			class="box"
			x={WAGON.box.x}
			y={WAGON.box.y}
			width={WAGON.box.width}
			height={WAGON.box.height}
		/>
		<WagonShape
			tone={look.tone}
			cargo={look.cargo}
			angle={wheelAngle(x, WAGON.wheelRadius)}
			wave={play === 'cargo-wave'}
			inside={play === 'dino-passenger' ? passenger : undefined}
		/>

		{#if play === 'rocket-roof'}
			<g transform="translate({ROOF_ROCKET.seat.x} {ROOF_ROCKET.seat.y})">
				<g class="launch-puff">
					<Cloud puffs={ROOF_ROCKET.puffs} />
				</g>
				<g class="rocket">
					<g class="flame">
						<path class="part flame-outer" d={ROOF_ROCKET.flameOuterPath} />
						<path class="part flame-inner" d={ROOF_ROCKET.flameInnerPath} />
					</g>
					<path class="part iron" d={ROOF_ROCKET.nozzle} />
					{#each ROOF_ROCKET.fins as fin (fin.d)}
						<path class="underlay" d={fin.d} />
					{/each}
					<path class="underlay" d={ROOF_ROCKET.body.d} />
					{#each ROOF_ROCKET.fins as fin (fin.d)}
						<Form form={fin} paint="paint" edge={false} />
					{/each}
					<Form
						form={ROOF_ROCKET.body}
						paint="rocket"
						edge={false}
						spots={ROOF_ROCKET.paint}
						spotPaint="paint"
					/>
					<path class="part steel thin" d={ROOF_ROCKET.window.ring} />
					<path class="part glass thin" d={ROOF_ROCKET.window.glass} />
					<path class="glint" d={ROOF_ROCKET.window.glint} />
				</g>
			</g>
		{/if}

		{#if arriving && hooked}
			<g class="lamp" data-reward data-reward-variant={entrance}>
				<path class="bracket" d={WAGON.lamp.bracketPath} />
				<path class="bracket" d={WAGON.lamp.handle} />
				<Form form={WAGON.lamp.housing} paint="iron" />
				<circle
					class="part lens thin"
					cx={WAGON.lamp.lens.x}
					cy={WAGON.lamp.lens.y}
					r={WAGON.lamp.lens.radius}
				/>
				<path class="glint" d={WAGON.lamp.glint} />
			</g>
		{/if}
	</g>

	{#if play === 'bounce-hook'}
		<g class="sparks">
			{#each HOOK_SPARKS as spark (spark)}
				<path class="part spark" d={spark} />
			{/each}
		</g>
	{/if}

	{#if play === 'sliding-stop'}
		{#each WHEEL_X as wheelX (wheelX)}
			<g class="dust" transform="translate({wheelX} 0)">
				<Cloud puffs={BRAKE_DUST} tone="dust" />
			</g>
		{/each}
	{/if}

	{#if play === 'tunnel-peek'}
		<g class="hill">
			<Form form={TUNNEL.hill} paint="grass" spots={TUNNEL.rocks} spotPaint="stone" />
			<path class="part fine" d={TUNNEL.rockCracks} />
			<path class="part fine" d={TUNNEL.tufts} />
			<Form form={TUNNEL.pier} paint="stone" />
			<path class="part fine" d={TUNNEL.pierJoints} />
			<Form form={TUNNEL.arch} paint="stone" />
			<path class="part fine" d={TUNNEL.archJoints} />
		</g>
	{/if}
</g>

<style>
	.part,
	.underlay,
	.bracket,
	.mouth {
		stroke: var(--dd-color-train-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.thin,
	.fine {
		stroke-width: var(--dd-border-width-thin);
	}

	.fine,
	.bracket {
		fill: transparent;
	}

	.bracket {
		stroke: var(--dd-color-train-iron);
		stroke-width: var(--dd-border-width-target);
	}

	/* Under two joined forms: only its outer half shows, one outline around both. */
	.underlay {
		fill: var(--dd-color-train-line);
		stroke-width: calc(var(--dd-border-width-thick) * 2);
	}

	.box {
		fill: none;
	}

	.mouth {
		fill: var(--dd-color-train-mouth);
	}

	.iron {
		fill: var(--dd-color-train-iron);
	}

	.steel {
		fill: var(--dd-color-train-steel);
	}

	.glass {
		fill: var(--dd-color-train-glass);
	}

	.glint {
		fill: var(--dd-color-train-light);
	}

	.lens {
		fill: var(--dd-color-train-paint);
	}

	.flame-outer {
		fill: var(--dd-color-train-glow);
	}

	.flame-inner {
		fill: var(--dd-color-train-flame);
	}

	.spark {
		fill: var(--dd-color-train-glow);
	}

	/* Surprise scenes (ADR-034): a moment after the last key, long enough to be seen. */
	.car[data-play],
	.rocket,
	.flame,
	.launch-puff,
	.sparks,
	.dust,
	.hill,
	.mouth {
		transform-box: fill-box;
		transform-origin: 50% 100%;
		animation-duration: var(--dd-duration-scene);
		animation-delay: var(--dd-duration-reward-delay);
		animation-timing-function: var(--dd-easing-standard);
		animation-fill-mode: both;
	}

	.car[data-play='bounce-hook'] {
		animation-name: bounce-hook;
	}

	.sparks {
		transform-origin: 50% 50%;
		animation-name: spark-flash;
	}

	.car[data-play='sliding-stop'] {
		animation-name: slide-stop;
	}

	.dust {
		animation-name: dust-rises;
	}

	.car[data-play='tunnel-peek'] {
		animation-name: tunnel-exit;
	}

	.hill {
		animation-name: hill-shows;
	}

	.mouth {
		animation-name: mouth-shows;
	}

	.car[data-play='wagon-flip'] {
		transform-origin: 50% 50%;
		animation-name: wagon-flip;
	}

	.rocket {
		animation-name: rocket-launch;
	}

	.flame {
		transform-origin: 50% 0%;
		animation-name: flame-shows;
	}

	.launch-puff {
		animation-name: launch-puff;
	}

	@keyframes bounce-hook {
		0% {
			translate: calc(var(--dd-space-lg) * -1) 0;
			scale: 1 1;
		}

		30% {
			translate: 0 0;
			scale: 0.94 1.05;
		}

		42% {
			scale: 1.03 0.97;
		}

		50% {
			translate: calc(var(--dd-space-sm) * -1.1) 0;
			scale: 1 1;
		}

		68% {
			translate: 0 0;
			scale: 0.97 1.03;
		}

		80% {
			translate: calc(var(--dd-space-xs) * -0.8) 0;
			scale: 1 1;
		}

		100% {
			translate: 0 0;
			scale: 1 1;
		}
	}

	@keyframes spark-flash {
		0%,
		28% {
			opacity: 0;
			scale: 0.5;
		}

		34% {
			opacity: 100%;
			scale: 1.1;
		}

		58%,
		100% {
			opacity: 0;
			scale: 1.3;
		}
	}

	@keyframes slide-stop {
		0% {
			translate: calc(var(--dd-space-3xl) * -1.5) 0;
			rotate: 0deg;
		}

		58% {
			translate: calc(var(--dd-space-xs) * -1) 0;
			rotate: 0deg;
		}

		66% {
			translate: 0 0;
			rotate: 3deg;
		}

		80% {
			rotate: -1.5deg;
		}

		100% {
			translate: 0 0;
			rotate: 0deg;
		}
	}

	@keyframes dust-rises {
		0%,
		30% {
			opacity: 0;
			scale: 0.4;
			translate: 0 0;
		}

		42% {
			opacity: 100%;
			scale: 1;
		}

		85%,
		100% {
			opacity: 0;
			scale: 1.5;
			translate: calc(var(--dd-space-md) * -1) calc(var(--dd-space-sm) * -1);
		}
	}

	@keyframes tunnel-exit {
		0%,
		18% {
			translate: calc(var(--dd-space-3xl) * -1) 0;
		}

		70%,
		100% {
			translate: 0 0;
		}
	}

	@keyframes hill-shows {
		0% {
			opacity: 0;
			scale: 1 0.2;
		}

		12% {
			opacity: 100%;
			scale: 1 1;
		}

		80% {
			opacity: 100%;
		}

		100% {
			opacity: 0;
		}
	}

	@keyframes mouth-shows {
		0% {
			opacity: 0;
		}

		12%,
		80% {
			opacity: 100%;
		}

		100% {
			opacity: 0;
		}
	}

	@keyframes wagon-flip {
		0% {
			translate: calc(var(--dd-space-3xl) * -1) 0;
			rotate: 0deg;
			scale: 1 1;
		}

		8% {
			scale: 1.1 0.88;
		}

		22% {
			translate: calc(var(--dd-space-3xl) * -0.8) calc(var(--dd-space-2xl) * -0.8);
			rotate: 90deg;
			scale: 1 1;
		}

		40% {
			translate: calc(var(--dd-space-3xl) * -0.5) calc(var(--dd-space-2xl) * -1.2);
			rotate: 200deg;
		}

		58% {
			translate: calc(var(--dd-space-3xl) * -0.18) calc(var(--dd-space-2xl) * -0.5);
			rotate: 320deg;
		}

		68% {
			translate: 0 0;
			rotate: 360deg;
			scale: 1.1 0.88;
		}

		78% {
			scale: 0.97 1.04;
		}

		90%,
		100% {
			translate: 0 0;
			rotate: 360deg;
			scale: 1 1;
		}
	}

	@keyframes rocket-launch {
		0% {
			opacity: 0;
			translate: 0 0;
			scale: 0.3;
			rotate: 0deg;
		}

		10% {
			opacity: 100%;
			scale: 1;
		}

		16%,
		24% {
			translate: 0 0;
			rotate: -4deg;
		}

		20%,
		28% {
			rotate: 4deg;
		}

		32% {
			translate: 0 0;
			rotate: 0deg;
		}

		62% {
			opacity: 100%;
			translate: 0 calc(var(--dd-space-3xl) * -0.9);
		}

		76%,
		100% {
			opacity: 0;
			translate: 0 calc(var(--dd-space-3xl) * -1.5);
			scale: 0.8;
			rotate: 0deg;
		}
	}

	@keyframes flame-shows {
		0%,
		30% {
			opacity: 0;
		}

		36%,
		100% {
			opacity: 100%;
		}
	}

	@keyframes launch-puff {
		0%,
		30% {
			opacity: 0;
			scale: 0.4;
		}

		42% {
			opacity: 100%;
			scale: 1;
		}

		80%,
		100% {
			opacity: 0;
			scale: 1.6;
		}
	}
</style>
