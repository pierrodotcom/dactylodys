<script lang="ts">
	import StoryDino from '$lib/ui/story/StoryDino.svelte';
	import { isRewarded, type GameView } from '../shared/game-view';
	import { stageFor } from '../shared/stage';
	import BlockShape from './BlockShape.svelte';
	import { blockDepth } from './block-art';
	import {
		DROP_STAGES,
		GROUND_Y,
		SCENE,
		TOWER_X,
		blockLook,
		blockSize,
		blockSpot,
		flagSpot,
		hoverOffset
	} from './blocks';
	import {
		APEX,
		APEX_ALL_HOLES,
		APEX_OUTLINE,
		BUSHES,
		CAB,
		CAB_GLINT,
		CAB_SHADE,
		CAB_WINDOW,
		CLOUD,
		CLOUDS,
		CLOUD_LIGHT,
		CLOUD_SHADE,
		CONE,
		COUNTERWEIGHT,
		COUNTERWEIGHT_SEAMS,
		COUNTERWEIGHT_SHADE,
		CRANE,
		CROWN,
		CROWN_LIGHT,
		CROWN_SHADE,
		FLAG,
		FOOTING,
		FOOTING_SHADE,
		FOOTING_TOP,
		GRASS,
		HILL_FAR,
		HILL_NEAR,
		HILL_RIMS,
		HOOK_REACH,
		JIB,
		JIB_ALL_HOLES,
		JIB_OUTLINE,
		JIB_SHADE,
		MAGNET,
		MAST,
		MAST_HOLES,
		MAST_LIGHT,
		MAST_OUTLINE,
		MAST_SHADE,
		NIGHT_STARS,
		PEBBLES,
		PENDANTS,
		PUFF,
		ROCKET,
		SLING,
		SOIL,
		SPARKS,
		SPEED_LINES,
		STOMPER,
		STRATA,
		SUN_DISC,
		SUN_LIGHT,
		SUN_RAYS,
		SUN_SHADE,
		TAIL,
		TAIL_ALL_HOLES,
		TAIL_OUTLINE,
		TREES,
		TRUNK,
		TRUNK_SHADE,
		TUFTS,
		cablePath,
		hookBlockPath,
		hookPath,
		trolleyPath,
		tuftPath,
		twinkle
	} from './shapes';

	interface Props {
		view: GameView;
	}

	let { view }: Props = $props();

	const size = $derived(blockSize(view.total));
	const depth = $derived(blockDepth(size));
	const rewarded = $derived(isRewarded(view));
	const stage = $derived(
		view.phase === 'typing' ? stageFor(view.position, view.group.length, DROP_STAGES) : DROP_STAGES
	);
	const sceneId = $derived(rewarded && view.scene.kind === 'scene' ? view.scene.id : undefined);
	const entrance = $derived(rewarded && view.scene.kind === 'variant' ? view.scene.index : null);
	const below = $derived(Array.from({ length: view.groupIndex }, (_, index) => index));
	const spot = $derived(blockSpot(view.groupIndex, size));
	const lift = $derived(rewarded ? 0 : hoverOffset(stage));
	const place = $derived(`translate(${spot.x} ${spot.y + lift})`);
	const planted = $derived(rewarded && view.groupIndex === view.total - 1);
	const flag = $derived(flagSpot(view.total));

	/** The top of the block, halfway back: where the slings, the dino and the flag meet it. */
	const topMiddle = $derived(spot.y + lift - size.height - depth.y / 2);
	const hookX = $derived(spot.x + depth.x / 2);
	const magnetOn = $derived(sceneId === 'magnet-snap');
	const hookY = $derived(
		!rewarded
			? topMiddle - SLING - HOOK_REACH
			: magnetOn
				? topMiddle - 1 - MAGNET.height - HOOK_REACH + 1
				: CRANE.rest
	);
	const slingSpread = $derived(size.width * 0.3);
	const ropeTop = ROCKET.belly * ROCKET.scale;
	const ropeDrop = ropeTop + 8;

	function placed(x: number, y: number, scale = 1): string {
		return scale === 1 ? `translate(${x} ${y})` : `translate(${x} ${y}) scale(${scale})`;
	}
</script>

<svg
	class="scene"
	viewBox="0 0 {SCENE.width} {SCENE.height}"
	focusable="false"
	aria-hidden="true"
	data-probe={stage}
	data-still={view.reducedMotion || undefined}
	data-scene={sceneId}
>
	<!-- Sky: the sun by day, the moon and stars in the dark theme. -->
	<rect class="sky" x="0" y="0" width={SCENE.width} height={SCENE.height} />
	<path class="night-star" d={NIGHT_STARS} />
	<path class="ray" d={SUN_RAYS} />
	<path class="sun" d={SUN_DISC} />
	<path class="shade" d={SUN_SHADE} />
	<path class="shine" d={SUN_LIGHT} />
	<path class="line" d={SUN_DISC} />
	{#each CLOUDS as cloud (cloud.x)}
		<g transform={placed(cloud.x, cloud.y, cloud.scale)}>
			<path class="cloud" d={CLOUD} />
			<path class="soft-shade" d={CLOUD_SHADE} />
			<path class="shine" d={CLOUD_LIGHT} />
			<path class="line" d={CLOUD} />
		</g>
	{/each}

	<!-- Hills, trees and the ground the tower stands on. -->
	<path class="hill-far" d={HILL_FAR} />
	<path class="hill-near" d={HILL_NEAR} />
	<path class="rim" d={HILL_RIMS} />
	{#each TREES as tree (tree.x)}
		<g transform={placed(tree.x, tree.y, tree.scale)}>
			<path class="trunk" d={TRUNK} />
			<path class="shade" d={TRUNK_SHADE} />
			<path class="line" d={TRUNK} />
			<path class="leaf" d={CROWN} />
			<path class="shade" d={CROWN_SHADE} />
			<path class="shine" d={CROWN_LIGHT} />
			<path class="line" d={CROWN} />
		</g>
	{/each}
	<path class="soil" d={SOIL} />
	<path class="fine" d={STRATA} />
	<path class="pebble" d={PEBBLES} />
	<path class="grass" d={GRASS} />
	<path class="line" d={GRASS} />
	{#each BUSHES as bush (bush.x)}
		<g transform={placed(bush.x, bush.y, bush.scale)}>
			<path class="leaf" d={CROWN} />
			<path class="shade" d={CROWN_SHADE} />
			<path class="line" d={CROWN} />
		</g>
	{/each}
	{#each TUFTS as x (x)}
		<path class="tuft" d={tuftPath(x)} />
	{/each}
	<g transform={placed(CONE.x, CONE.y)}>
		<path class="cone" d={CONE.body} />
		<path class="band" d={CONE.band} />
		<path class="shade" d={CONE.shade} />
		<path class="shine" d={CONE.light} />
		<path class="line" d={CONE.body} />
		<path class="cone" d={CONE.base} />
		<path class="line" d={CONE.base} />
	</g>

	<!-- The crane, right of the speech bubble: its arm runs above the tower. -->
	<path class="fine" d={PENDANTS} />
	<path class="crane" fill-rule="evenodd" d={TAIL} />
	<path class="fine" d={TAIL_ALL_HOLES} />
	<path class="line" d={TAIL_OUTLINE} />
	<path class="concrete" d={COUNTERWEIGHT} />
	<path class="shade" d={COUNTERWEIGHT_SHADE} />
	<path class="fine" d={COUNTERWEIGHT_SEAMS} />
	<path class="line" d={COUNTERWEIGHT} />
	<path class="crane" fill-rule="evenodd" d={JIB} />
	<path class="shade" d={JIB_SHADE} />
	<path class="fine" d={JIB_ALL_HOLES} />
	<path class="line" d={JIB_OUTLINE} />
	<path class="crane" fill-rule="evenodd" d={APEX} />
	<path class="fine" d={APEX_ALL_HOLES} />
	<path class="line" d={APEX_OUTLINE} />
	<path class="crane" fill-rule="evenodd" d={MAST} />
	<path class="shade" d={MAST_SHADE} />
	<path class="shine" d={MAST_LIGHT} />
	<path class="fine" d={MAST_HOLES} />
	<path class="line" d={MAST_OUTLINE} />
	<path class="crane" d={CAB} />
	<path class="shade" d={CAB_SHADE} />
	<path class="glass" d={CAB_WINDOW} />
	<path class="shine" d={CAB_GLINT} />
	<path class="fine" d={CAB_WINDOW} />
	<path class="line" d={CAB} />
	<path class="concrete" d={FOOTING} />
	<path class="soft-shine" d={FOOTING_TOP} />
	<path class="shade" d={FOOTING_SHADE} />
	<path class="line" d={FOOTING} />

	<ellipse
		class="ground-shadow"
		cx={TOWER_X + depth.x}
		cy={GROUND_Y - 1}
		rx={size.width / 2 + 10}
		ry="3.6"
	/>

	<g class="stack">
		{#each below as index (index)}
			{@const at = blockSpot(index, size)}
			<g transform="translate({at.x} {at.y})">
				<BlockShape {size} look={blockLook(index)} />
			</g>
		{/each}

		{#if !rewarded}
			<!-- Where the block will land: its shadow grows as it comes down. -->
			<ellipse
				class="drop-shadow"
				cx={spot.x + depth.x / 2}
				cy={spot.y - depth.y / 2}
				rx={size.width * (0.28 + 0.04 * stage)}
				ry={depth.y * 0.45}
			/>
		{/if}

		<g transform={place}>
			{#if sceneId === 'drop-land'}
				{#each [-1, 1] as side (side)}
					<g class="dust" data-side={side}>
						<g transform={placed(side * (size.width / 2 + 4) + (side > 0 ? depth.x : 0), 0)}>
							<path class="dust-fill" d={PUFF.body} />
							<path class="soft-shade" d={PUFF.shade} />
							<path class="thin-line" d={PUFF.body} />
						</g>
					</g>
				{/each}
			{/if}

			{#if sceneId === 'magnet-snap'}
				{#each SPARKS as spark (`${spark.side}${spark.rise}`)}
					{@const x = spark.side * (size.width / 2 + 4) + (spark.side > 0 ? depth.x : 0)}
					{@const y = -size.height * spark.rise}
					<g class="spark">
						<path class="spark-line" d="M {x} {y} l {spark.dx} {spark.dy}" />
						<path class="spark-star" d={twinkle(x + spark.dx * 1.35, y + spark.dy * 1.35, 2.6)} />
					</g>
				{/each}
			{/if}

			<g
				class="landing"
				data-reward={entrance === null ? undefined : true}
				data-reward-variant={entrance ?? undefined}
			>
				<BlockShape {size} look={blockLook(view.groupIndex)} />

				{#if sceneId === 'slide-in'}
					<g class="speed">
						{#each SPEED_LINES as speed (speed.rise)}
							{@const x = size.width / 2 + depth.x + 5}
							<path class="speed-line" d="M {x} {-size.height * speed.rise} l {speed.length} 0" />
						{/each}
					</g>
				{/if}

				{#if sceneId === 'rocket-crane'}
					<g
						class="rocket"
						transform="translate({depth.x / 2} {-size.height - depth.y / 2 - ropeDrop})"
					>
						{#each [-1, 1] as side (side)}
							<path
								class="rope"
								d="M {side * ROCKET.ropeSpread * ROCKET.scale} {ropeTop} L {side *
									size.width *
									0.3} {ropeDrop}"
							/>
						{/each}
						<g transform="scale({ROCKET.scale})">
							<path class="flame-outer" d={ROCKET.flameOuter} />
							<path class="flame-inner" d={ROCKET.flameInner} />
							{#each ROCKET.fins as fin (fin)}
								<path class="fin" d={fin} />
								<path class="line" d={fin} />
							{/each}
							<path class="rocket-body" d={ROCKET.body} />
							<path class="fin" d={ROCKET.nose} />
							<path class="shade" d={ROCKET.shade} />
							<path class="shine" d={ROCKET.light} />
							<path class="fine" d={ROCKET.band} />
							<path class="fine" d={ROCKET.nose} />
							<path class="metal" d={ROCKET.ring} />
							<path class="glass" d={ROCKET.window} />
							<path class="shine" d={ROCKET.glint} />
							<path class="fine" d={ROCKET.window} />
							<path class="line" d={ROCKET.body} />
						</g>
					</g>
				{/if}
			</g>

			{#if sceneId === 'dino-stomp'}
				<g transform="translate({depth.x / 2} {-size.height - depth.y / 2})">
					<g class="dino">
						<StoryDino
							x={-STOMPER.size / 2}
							y={-STOMPER.size * STOMPER.feet}
							size={STOMPER.size}
							mood="happy"
						/>
					</g>
				</g>
			{/if}
		</g>

		{#if planted}
			<g transform="translate({flag.x + depth.x / 2} {flag.y - depth.y / 2})">
				<g
					class="flag"
					data-reward={sceneId === undefined ? true : undefined}
					data-reward-variant={sceneId === undefined ? 0 : undefined}
				>
					<path class="metal" d={FLAG.pole} />
					<path class="shade" d={FLAG.poleShade} />
					<path class="cloth" d={FLAG.cloth} />
					<path class="shade" d={FLAG.fold} />
					<path class="shine" d={FLAG.light} />
					<path class="gold" d={FLAG.star} />
					<path class="fine" d={FLAG.star} />
					<path class="line" d={FLAG.cloth} />
					<path class="fine" d={FLAG.pole} />
					<path class="gold" d={FLAG.knob} />
					<path class="shine" d={FLAG.knobLight} />
					<path class="line" d={FLAG.knob} />
				</g>
			</g>
		{/if}
	</g>

	<!-- The trolley, its cable and its hook: they hold the block until the group is typed. -->
	<path class="cable" d={cablePath(hookX, CRANE.trolley + 3, hookY + 0.5)} />
	<path class="metal" d={trolleyPath(hookX)} />
	<path class="line" d={trolleyPath(hookX)} />
	<path class="crane" d={hookBlockPath(hookX, hookY)} />
	<path class="shade" d={`M ${hookX + 1} ${hookY + 0.6} h 3 v 4.8 h -3 z`} />
	<path class="line" d={hookBlockPath(hookX, hookY)} />
	<path class="hook-under" d={hookPath(hookX, hookY)} />
	<path class="hook" d={hookPath(hookX, hookY)} />
	{#if !rewarded}
		<path
			class="sling"
			d="M {hookX - slingSpread} {topMiddle} L {hookX} {hookY + HOOK_REACH - 1} L {hookX +
				slingSpread} {topMiddle}"
		/>
	{:else if magnetOn}
		<g transform={placed(hookX, topMiddle - 1)}>
			<path class="magnet" d={MAGNET.body} />
			<path class="shade" d={MAGNET.shade} />
			<path class="shine" d={MAGNET.light} />
			<path class="metal" d={MAGNET.poles} />
			<path class="line" d={MAGNET.body} />
			<path class="thin-line" d={MAGNET.shackle} />
		</g>
	{/if}
</svg>

<style>
	.scene {
		--dd-tower-gap: var(--dd-space-md);

		display: block;
		inline-size: 100%;
		max-inline-size: var(--dd-size-scene-max);
		block-size: auto;
		overflow: hidden;
		border-radius: var(--dd-radius-lg);
		background-color: var(--dd-color-tower-sky);
	}

	path,
	ellipse {
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.sky {
		fill: var(--dd-color-tower-sky);
	}

	.night-star {
		fill: var(--dd-color-tower-night-star);
		fill-opacity: var(--dd-opacity-tower-night);
	}

	.ray {
		fill: var(--dd-color-tower-sun);
		fill-opacity: var(--dd-opacity-tower-day);
	}

	.sun {
		fill: var(--dd-color-tower-sun);
	}

	.cloud {
		fill: var(--dd-color-tower-cloud);
	}

	.hill-far {
		fill: var(--dd-color-tower-hill-far);
	}

	.hill-near {
		fill: var(--dd-color-tower-hill-near);
	}

	.rim {
		fill: transparent;
		stroke: var(--dd-color-tower-light);
		stroke-opacity: var(--dd-opacity-tower-light);
		stroke-width: var(--dd-border-width-thick);
	}

	.leaf {
		fill: var(--dd-color-tower-leaf);
	}

	.trunk {
		fill: var(--dd-color-tower-trunk);
	}

	.soil {
		fill: var(--dd-color-tower-soil);
	}

	.pebble {
		fill: var(--dd-color-tower-pebble);
	}

	.grass {
		fill: var(--dd-color-tower-grass);
	}

	.tuft {
		fill: transparent;
		stroke: var(--dd-color-tower-line);
		stroke-width: var(--dd-border-width-thick);
	}

	.cone {
		fill: var(--dd-color-tower-cone);
	}

	.band {
		fill: var(--dd-color-tower-light);
	}

	.crane {
		fill: var(--dd-color-tower-crane);
	}

	.concrete {
		fill: var(--dd-color-tower-concrete);
	}

	.glass {
		fill: var(--dd-color-tower-glass);
	}

	.metal {
		fill: var(--dd-color-tower-metal);
	}

	.gold {
		fill: var(--dd-color-tower-gold);
	}

	.cloth {
		fill: var(--dd-color-tower-flag);
	}

	.magnet {
		fill: var(--dd-color-tower-magnet);
	}

	.rocket-body {
		fill: var(--dd-color-tower-rocket);
	}

	.fin {
		fill: var(--dd-color-tower-rocket-fin);
	}

	.flame-outer {
		fill: var(--dd-color-tower-spark);
	}

	.flame-inner {
		fill: var(--dd-color-tower-gold);
	}

	.dust-fill {
		fill: var(--dd-color-tower-dust);
	}

	.shade {
		fill: var(--dd-color-tower-shade);
		fill-opacity: var(--dd-opacity-tower-side);
	}

	.soft-shade {
		fill: var(--dd-color-tower-shade);
		fill-opacity: var(--dd-opacity-tower-shade);
	}

	.shine {
		fill: var(--dd-color-tower-light);
		fill-opacity: var(--dd-opacity-tower-light);
	}

	.soft-shine {
		fill: var(--dd-color-tower-light);
		fill-opacity: var(--dd-opacity-tower-top);
	}

	.ground-shadow,
	.drop-shadow {
		fill: var(--dd-color-tower-shadow);
	}

	.line,
	.fine,
	.thin-line,
	.cable,
	.sling,
	.rope,
	.speed-line,
	.spark-line,
	.hook-under,
	.hook {
		fill: transparent;
		stroke: var(--dd-color-tower-line);
	}

	.line,
	.hook {
		stroke-width: var(--dd-border-width-thick);
	}

	.fine,
	.thin-line,
	.cable,
	.sling,
	.rope {
		stroke-width: var(--dd-border-width-thin);
	}

	.hook-under {
		stroke-width: var(--dd-border-width-target);
	}

	.hook {
		stroke: var(--dd-color-tower-metal);
	}

	.metal,
	.dust-fill {
		stroke: var(--dd-color-tower-line);
		stroke-width: var(--dd-border-width-thin);
	}

	.speed-line {
		stroke-width: var(--dd-border-width-thick);
	}

	.spark-line {
		stroke: var(--dd-color-tower-spark);
		stroke-width: var(--dd-border-width-target);
	}

	.spark-star {
		fill: var(--dd-color-tower-gold);
		stroke: var(--dd-color-tower-line);
		stroke-width: var(--dd-border-width-thin);
	}

	/* Surprise scenes (ADR-034): a moment after the last key, long enough to be seen. */
	[data-scene] .stack,
	[data-scene] .landing,
	[data-scene] .dino,
	[data-scene] .rocket,
	[data-scene] .speed,
	[data-scene] .dust,
	[data-scene] .spark,
	[data-scene] .rope,
	[data-scene] .flag {
		transform-box: fill-box;
		transform-origin: 50% 100%;
		animation-duration: var(--dd-duration-scene);
		animation-delay: var(--dd-duration-reward-delay);
		animation-timing-function: var(--dd-easing-standard);
		animation-fill-mode: both;
	}

	[data-scene] .flag {
		animation-name: plant;
	}

	/* Calm entrance of the flag: after the block, never together. */
	.flag[data-reward] {
		animation-delay: calc(var(--dd-duration-reward-delay) + var(--dd-duration-reward) * 0.6);
	}

	[data-scene='drop-land'] .landing {
		animation-name: drop-land;
	}

	[data-scene='drop-land'] .dust[data-side='-1'] {
		transform-origin: 50% 50%;
		animation-name: dust-left;
	}

	[data-scene='drop-land'] .dust[data-side='1'] {
		transform-origin: 50% 50%;
		animation-name: dust-right;
	}

	[data-scene='wobble-settle'] .landing {
		animation-name: wobble-drop;
	}

	[data-scene='wobble-settle'] .stack {
		animation-name: wobble;
	}

	[data-scene='dino-stomp'] .landing {
		animation-name: stomped;
	}

	[data-scene='dino-stomp'] .dino {
		animation-name: dino-hop;
	}

	[data-scene='spin-land'] .landing {
		transform-origin: 50% 50%;
		animation-name: spin-land;
	}

	[data-scene='bounce-land'] .landing {
		animation-name: bounce-land;
	}

	[data-scene='rocket-crane'] .landing {
		animation-name: crane-carries;
	}

	[data-scene='rocket-crane'] .rocket {
		transform-origin: 50% 50%;
		animation-name: rocket-leaves;
	}

	[data-scene='rocket-crane'] .rope {
		animation-name: ropes-off;
	}

	[data-scene='slide-in'] .landing {
		animation-name: slide-in;
	}

	[data-scene='slide-in'] .speed {
		animation-name: speed-fades;
	}

	[data-scene='magnet-snap'] .landing {
		transform-origin: 50% 50%;
		animation-name: magnet-snap;
	}

	[data-scene='magnet-snap'] .spark {
		transform-origin: 50% 50%;
		animation-name: spark;
	}

	@keyframes drop-land {
		0% {
			translate: 0 calc(var(--dd-tower-gap) * -1);
			scale: 1;
		}

		12% {
			translate: 0 calc(var(--dd-tower-gap) * -1.6);
			animation-timing-function: var(--dd-easing-exit);
		}

		36% {
			translate: 0 0;
			scale: 1;
		}

		42% {
			translate: 0 0;
			scale: 1.1 0.82;
		}

		56% {
			translate: 0 calc(var(--dd-space-xs) * -2);
			scale: 0.97 1.05;
		}

		72%,
		100% {
			translate: 0 0;
			scale: 1;
		}
	}

	@keyframes dust-left {
		0%,
		38% {
			opacity: 0;
			translate: 0 0;
			scale: 0.4;
		}

		44% {
			opacity: 100%;
		}

		100% {
			opacity: 0;
			translate: calc(var(--dd-space-lg) * -1) calc(var(--dd-space-xs) * -1);
			scale: 1.8;
		}
	}

	@keyframes dust-right {
		0%,
		38% {
			opacity: 0;
			translate: 0 0;
			scale: 0.4;
		}

		44% {
			opacity: 100%;
		}

		100% {
			opacity: 0;
			translate: var(--dd-space-lg) calc(var(--dd-space-xs) * -1);
			scale: 1.8;
		}
	}

	@keyframes wobble-drop {
		0% {
			translate: 0 calc(var(--dd-tower-gap) * -1);
			scale: 1;
			animation-timing-function: var(--dd-easing-exit);
		}

		16% {
			translate: 0 0;
			scale: 1.06 0.9;
		}

		30%,
		100% {
			translate: 0 0;
			scale: 1;
		}
	}

	@keyframes wobble {
		0%,
		14% {
			rotate: 0deg;
		}

		26% {
			rotate: 4deg;
		}

		40% {
			rotate: -4deg;
		}

		54% {
			rotate: 2.5deg;
		}

		68% {
			rotate: -1.5deg;
		}

		82% {
			rotate: 0.6deg;
		}

		100% {
			rotate: 0deg;
		}
	}

	@keyframes stomped {
		0%,
		44% {
			translate: 0 calc(var(--dd-tower-gap) * -1);
			scale: 1;
		}

		52% {
			translate: 0 0;
			scale: 1.08 0.84;
		}

		64% {
			translate: 0 0;
			scale: 1.02 0.97;
		}

		76%,
		100% {
			translate: 0 0;
			scale: 1;
		}
	}

	/* The dino jumps on the block, stamps it down, hops for joy and stays on top. */
	@keyframes dino-hop {
		0% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * -1.7) calc(var(--dd-space-xs) * -1);
			rotate: 0deg;
		}

		8% {
			opacity: 100%;
		}

		26% {
			translate: calc(var(--dd-space-3xl) * -0.85) calc(var(--dd-space-xl) * -1);
			rotate: -10deg;
		}

		44% {
			translate: 0 calc(var(--dd-tower-gap) * -1);
			rotate: 6deg;
		}

		52% {
			translate: 0 0;
			rotate: 0deg;
			scale: 1.08 0.9;
		}

		60% {
			translate: 0 0;
			scale: 1;
		}

		72% {
			translate: 0 calc(var(--dd-space-md) * -1);
			rotate: -6deg;
		}

		84% {
			translate: 0 0;
			rotate: 0deg;
			scale: 1.04 0.95;
		}

		92%,
		100% {
			opacity: 100%;
			translate: 0 0;
			rotate: 0deg;
			scale: 1;
		}
	}

	@keyframes spin-land {
		0% {
			translate: 0 calc(var(--dd-tower-gap) * -1);
			rotate: 0deg;
			scale: 1;
		}

		24% {
			translate: 0 calc(var(--dd-tower-gap) * -1.6);
			rotate: 130deg;
			animation-timing-function: var(--dd-easing-exit);
		}

		62% {
			translate: 0 0;
			rotate: 360deg;
			scale: 1;
		}

		68% {
			translate: 0 0;
			rotate: 360deg;
			scale: 1.08 0.88;
		}

		82%,
		100% {
			translate: 0 0;
			rotate: 360deg;
			scale: 1;
		}
	}

	@keyframes bounce-land {
		0% {
			translate: 0 calc(var(--dd-tower-gap) * -1);
			scale: 1;
			animation-timing-function: var(--dd-easing-exit);
		}

		22% {
			translate: 0 0;
			scale: 1.1 0.86;
		}

		30% {
			translate: 0 0;
			scale: 1;
			animation-timing-function: var(--dd-easing-enter);
		}

		46% {
			translate: 0 calc(var(--dd-tower-gap) * -1.8);
			scale: 0.97 1.04;
			animation-timing-function: var(--dd-easing-exit);
		}

		62% {
			translate: 0 0;
			scale: 1.08 0.9;
		}

		70% {
			translate: 0 0;
			scale: 1;
			animation-timing-function: var(--dd-easing-enter);
		}

		80% {
			translate: 0 calc(var(--dd-space-sm) * -1.25);
			animation-timing-function: var(--dd-easing-exit);
		}

		90%,
		100% {
			translate: 0 0;
			scale: 1;
		}
	}

	@keyframes crane-carries {
		0% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * 1.6) calc(var(--dd-space-2xl) * -1);
		}

		12% {
			opacity: 100%;
		}

		44% {
			opacity: 100%;
			translate: 0 calc(var(--dd-tower-gap) * -1);
		}

		54% {
			translate: 0 calc(var(--dd-tower-gap) * -1);
		}

		76% {
			translate: 0 0;
			scale: 1;
		}

		82% {
			scale: 1.04 0.94;
		}

		92%,
		100% {
			opacity: 100%;
			translate: 0 0;
			scale: 1;
		}
	}

	/* Its delivery made, the rocket backs away to the right, beside the bubble, and waits there. */
	@keyframes rocket-leaves {
		0%,
		76% {
			translate: 0 0;
			rotate: 0deg;
			animation-timing-function: var(--dd-easing-standard);
		}

		88% {
			translate: calc(var(--dd-space-3xl) * 0.9) calc(var(--dd-space-sm) * -2.5);
			rotate: -8deg;
		}

		100% {
			translate: calc(var(--dd-space-3xl) * 1.1) calc(var(--dd-space-sm) * -2);
			rotate: 0deg;
		}
	}

	/* The ropes are let go once the block is down. */
	@keyframes ropes-off {
		0%,
		72% {
			opacity: 100%;
		}

		80%,
		100% {
			opacity: 0;
		}
	}

	@keyframes slide-in {
		0% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * 2) 0;
		}

		10% {
			opacity: 100%;
		}

		58% {
			opacity: 100%;
			translate: calc(var(--dd-space-sm) * -1) 0;
			scale: 1;
		}

		68% {
			translate: 0 0;
			scale: 0.94 1.05;
		}

		82%,
		100% {
			opacity: 100%;
			translate: 0 0;
			scale: 1;
		}
	}

	@keyframes speed-fades {
		0%,
		40% {
			opacity: 100%;
		}

		62%,
		100% {
			opacity: 0;
		}
	}

	@keyframes magnet-snap {
		0% {
			opacity: 0;
			translate: calc(var(--dd-space-2xl) * -1.5) calc(var(--dd-space-2xl) * -1.2);
			rotate: -14deg;
		}

		14% {
			opacity: 100%;
		}

		40% {
			translate: calc(var(--dd-space-xl) * -1.2) calc(var(--dd-space-lg) * -1.2);
			rotate: 6deg;
		}

		56% {
			translate: calc(var(--dd-space-md) * -1) calc(var(--dd-space-md) * -1);
			rotate: -4deg;
			animation-timing-function: var(--dd-easing-exit);
		}

		71% {
			opacity: 100%;
			translate: 0 0;
			rotate: 0deg;
			scale: 1;
		}

		76% {
			translate: 0 0;
			scale: 1.07 0.9;
		}

		88%,
		100% {
			opacity: 100%;
			translate: 0 0;
			rotate: 0deg;
			scale: 1;
		}
	}

	@keyframes spark {
		0%,
		70% {
			opacity: 0;
			translate: 0 0;
			scale: 0.5;
		}

		74% {
			opacity: 100%;
			scale: 1;
		}

		100% {
			opacity: 0;
			scale: 1.2;
		}
	}

	@keyframes plant {
		0%,
		76% {
			opacity: 0;
			scale: 1 0.2;
		}

		90% {
			opacity: 100%;
			scale: 1 1.1;
		}

		100% {
			opacity: 100%;
			scale: 1;
		}
	}
</style>
