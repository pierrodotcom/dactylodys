<script lang="ts">
	import type { GameView } from '../shared/game-view';
	import AstreShape from './AstreShape.svelte';
	import {
		FLIGHT,
		SCENE,
		astreVariant,
		departureIndex,
		destinationLit,
		rocketPose
	} from './flight';
	import InhabitantShape from './InhabitantShape.svelte';
	import RocketShape from './RocketShape.svelte';
	import {
		ASTRE_RING,
		CAR,
		COMET_EYE_PATHS,
		COMET_HEAD_RADIUS,
		COMET_MOUTH_PATH,
		COMET_TAIL_PATH,
		COOL_STAR,
		COOL_STAR_EYE_PATHS,
		COOL_STAR_MOUTH_PATH,
		COUGH_PUFFS,
		COW,
		DINO,
		DINO_SEATS,
		DISH,
		HEART_PATH,
		HEART_PUFFS,
		HOOP_BACK_PATH,
		HOOP_FRONT_PATH,
		ROCKET_WINDOW,
		STARS,
		STAR_PATH,
		SUNGLASSES_BRIDGE_PATH,
		SUNGLASSES_GLINT_PATH,
		SUNGLASSES_LENS_PATHS,
		TOQUE
	} from './shapes';

	interface Props {
		view: GameView;
	}

	const HOME_VARIANT = 3;
	const REWARD_VARIANTS = 4;
	/** Directions of the sparks of the fireworks around the astre reached, in degrees. */
	const SPARK_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315] as const;
	const SPARK_COLORS = 4;
	const SPARK_RADIUS = 7;
	const INHABITANT = { x: 372, y: 63, scale: 0.9 } as const;
	const INHABITANT_TRANSFORM = `translate(${INHABITANT.x} ${INHABITANT.y}) scale(${INHABITANT.scale})`;
	const ROCKET_SCALE = 1.2;
	/** Where the smoke of a cough appears, behind the engine. */
	const COUGH_OFFSET = { x: -30, y: -40 } as const;
	/** Where the heart of smoke appears: behind the engine in flight, in the free sky once landed. */
	const HEART_OFFSET = { flying: { x: -84, y: -14 }, landed: { x: -56, y: -6 } } as const;
	const HEART_SCALE = 1.5;
	/** Where the comet and the cow come into the sky; the scene moves them across. */
	const COMET_START = { x: 530, y: 16, scale: 1.4 } as const;
	const COW_START = { x: 70, y: 125 } as const;
	const GIFT_SCALE = 1.5;
	/** The ring of the astre reached, in the sky: the scene spins it like a hoop. */
	const HOOP_TRANSFORM = `translate(${FLIGHT.destinationX} ${FLIGHT.astreY}) scale(${FLIGHT.astreScale}) rotate(${ASTRE_RING.angle})`;
	const DEGREES_TO_RADIANS = Math.PI / 180;

	let { view }: Props = $props();

	const pose = $derived(rocketPose(view));
	const departure = $derived(departureIndex(view));
	const lit = $derived(destinationLit(view));
	const coughing = $derived(view.errorIndex !== null);
	const destinationVariant = $derived(view.groupIndex);
	const sceneId = $derived(lit && view.scene.kind === 'scene' ? view.scene.id : undefined);
	const ringed = $derived(astreVariant(destinationVariant) === 0);
	const heart = $derived(pose.landed ? HEART_OFFSET.landed : HEART_OFFSET.flying);
	const rocketWindow = $derived(rocketPoint(ROCKET_WINDOW.cx, ROCKET_WINDOW.cy));
	const inhabitantMoves = $derived(
		sceneId === 'inhabitant-joy' ||
			sceneId === 'hide-and-seek' ||
			sceneId === 'gift' ||
			sceneId === 'chef-planet'
	);
	const dinoSeat = $derived(
		pose.landed
			? rocketPoint(DINO_SEATS.landed.x, DINO_SEATS.landed.y)
			: rocketPoint(DINO_SEATS.flying.x, DINO_SEATS.flying.y)
	);

	function astreTransform(centerX: number): string {
		const scale = FLIGHT.astreScale;
		const half = 50 * scale;
		return `translate(${centerX - half} ${FLIGHT.astreY - half}) scale(${scale})`;
	}

	/** A point of the rocket drawing, in the sky. */
	function rocketPoint(x: number, y: number): { x: number; y: number } {
		const cos = Math.cos(pose.angle * DEGREES_TO_RADIANS);
		const sin = Math.sin(pose.angle * DEGREES_TO_RADIANS);
		return {
			x: pose.x + (x * cos - y * sin) * ROCKET_SCALE,
			y: pose.y + (x * sin + y * cos) * ROCKET_SCALE
		};
	}
</script>

<svg
	class="sky"
	viewBox="0 0 {SCENE.width} {SCENE.height}"
	focusable="false"
	aria-hidden="true"
	data-still={view.reducedMotion || undefined}
	data-scene={sceneId}
	data-landed={pose.landed || undefined}
>
	{#each STARS as star (star.x)}
		<circle class="star" cx={star.x} cy={star.y} r={star.radius} />
	{/each}

	{#if sceneId === 'comet'}
		<g transform="translate({COMET_START.x} {COMET_START.y}) scale({COMET_START.scale})">
			<g class="comet">
				<path class="comet-tail" d={COMET_TAIL_PATH} />
				<circle class="star-body" cx="0" cy="0" r={COMET_HEAD_RADIUS} />
				{#each COMET_EYE_PATHS as eye (eye)}
					<path class="face-line" d={eye} />
				{/each}
				<path class="face-line" d={COMET_MOUTH_PATH} />
			</g>
		</g>
	{/if}

	{#if sceneId === 'space-cow'}
		<g transform="translate({COW_START.x} {COW_START.y})">
			<g class="cow">
				<path class="cow-tail" d={COW.tailPath} />
				<circle class="cow-ink" cx={COW.tuft.x} cy={COW.tuft.y} r={COW.tuft.radius} />
				{#each COW.legPaths as leg (leg)}
					<path class="cow-leg" d={leg} />
				{/each}
				{#each COW.hooves as hoof (hoof.x)}
					<circle class="cow-ink" cx={hoof.x} cy={hoof.y} r="2.5" />
				{/each}
				<path class="cow-skin" d={COW.bodyPath} />
				{#each COW.spotPaths as spot (spot)}
					<path class="cow-ink" d={spot} />
				{/each}
				<path class="cow-skin" d={COW.earPath} />
				{#each COW.hornPaths as horn (horn)}
					<path class="cow-horn" d={horn} />
				{/each}
				<ellipse
					class="cow-skin"
					cx={COW.head.cx}
					cy={COW.head.cy}
					rx={COW.head.rx}
					ry={COW.head.ry}
				/>
				<ellipse
					class="cow-snout"
					cx={COW.snout.cx}
					cy={COW.snout.cy}
					rx={COW.snout.rx}
					ry={COW.snout.ry}
				/>
				{#each COW.nostrils as nostril (nostril.x)}
					<circle class="cow-ink" cx={nostril.x} cy={nostril.y} r="1" />
				{/each}
				<circle class="cow-ink" cx={COW.eye.x} cy={COW.eye.y} r="1.8" />
				<path class="cow-collar" d={COW.collarPath} />
				<circle class="cow-helmet" cx={COW.helmet.cx} cy={COW.helmet.cy} r={COW.helmet.radius} />
				<path class="cow-glint" d={COW.glintPath} />
			</g>
		</g>
	{/if}

	{#if sceneId === 'sunglasses'}
		<g transform="translate({COOL_STAR.x} {COOL_STAR.y}) scale({COOL_STAR.scale})">
			<g class="cool-star">
				<path class="star-body" d={STAR_PATH} />
				{#each COOL_STAR_EYE_PATHS as eye (eye)}
					<path class="face-line" d={eye} />
				{/each}
				<path class="face-line" d={COOL_STAR_MOUTH_PATH} />
				<g class="shades">
					{#each SUNGLASSES_LENS_PATHS as lens (lens)}
						<path class="lens" d={lens} />
					{/each}
					<path class="lens-bridge" d={SUNGLASSES_BRIDGE_PATH} />
					<path class="lens-glint" d={SUNGLASSES_GLINT_PATH} />
				</g>
			</g>
		</g>
	{/if}

	{#if sceneId === 'car-flyby'}
		<g transform="translate({CAR.start.x} {CAR.start.y})">
			<g class="car">
				<g transform="scale({CAR.scale})">
					{#each CAR.trailPaths as trail (trail)}
						<path class="car-trail" d={trail} />
					{/each}
					<g class="car-bump">
						<path class="car-body" d={CAR.bodyPath} />
						{#each CAR.windowPaths as window (window)}
							<path class="car-window" d={window} />
						{/each}
						<circle
							class="car-light"
							cx={CAR.headlight.cx}
							cy={CAR.headlight.cy}
							r={CAR.headlight.radius}
						/>
						{#each CAR.wheels as wheel (wheel.cx)}
							<g transform="translate({wheel.cx} {wheel.cy})">
								<g class="car-wheel">
									<circle class="car-tire" cx="0" cy="0" r={CAR.wheelRadius} />
									<path class="car-spoke" d={CAR.spokePath} />
									<circle class="car-hub" cx="0" cy="0" r={CAR.hubRadius} />
								</g>
							</g>
						{/each}
					</g>
				</g>
			</g>
		</g>
	{/if}

	<g transform={astreTransform(FLIGHT.departureX)}>
		<AstreShape variant={departure ?? HOME_VARIANT} lit={true} />
	</g>

	{#if sceneId === 'hide-and-seek'}
		<g transform={INHABITANT_TRANSFORM}>
			<g class="hider">
				<InhabitantShape variant={destinationVariant} />
			</g>
		</g>
	{/if}

	{#if sceneId === 'hula-hoop'}
		<g transform={HOOP_TRANSFORM}>
			<path class="hoop" data-ringed={ringed || undefined} d={HOOP_BACK_PATH} />
		</g>
	{/if}

	<g transform={astreTransform(FLIGHT.destinationX)}>
		<g class="sway">
			<AstreShape variant={destinationVariant} {lit} ringHidden={sceneId === 'hula-hoop'} />
		</g>
	</g>

	{#if sceneId === 'hula-hoop'}
		<g transform={HOOP_TRANSFORM}>
			<path class="hoop" data-ringed={ringed || undefined} d={HOOP_FRONT_PATH} />
		</g>
	{/if}

	{#if lit}
		<g transform={INHABITANT_TRANSFORM}>
			{#if inhabitantMoves}
				<g class="inhabitant">
					<InhabitantShape variant={destinationVariant} />
					{#if sceneId === 'chef-planet'}
						<g class="toque">
							{#each TOQUE.puffs as puff (puff.cx)}
								<circle class="toque-part" cx={puff.cx} cy={puff.cy} r={puff.radius} />
							{/each}
							<path class="toque-part" d={TOQUE.bandPath} />
						</g>
					{/if}
				</g>
			{:else}
				<g data-reward data-reward-variant={destinationVariant % REWARD_VARIANTS}>
					<InhabitantShape variant={destinationVariant} />
				</g>
			{/if}
		</g>
	{/if}

	{#if sceneId === 'chef-planet'}
		<g transform="translate({DISH.spot.x} {DISH.spot.y})">
			<g class="dish">
				<ellipse
					class="dish-plate"
					cx={DISH.plate.cx}
					cy={DISH.plate.cy}
					rx={DISH.plate.rx}
					ry={DISH.plate.ry}
				/>
				<path class="dish-food" d={DISH.foodPath} />
				<circle
					class="dish-garnish"
					cx={DISH.garnish.cx}
					cy={DISH.garnish.cy}
					r={DISH.garnish.radius}
				/>
				<g class="steam">
					{#each DISH.steamPuffs as puff (puff.y)}
						<circle class="puff" cx={puff.x} cy={puff.y} r={puff.radius} />
					{/each}
				</g>
			</g>
		</g>
	{/if}

	{#if sceneId === 'fireworks'}
		{#each SPARK_ANGLES as angle, index (angle)}
			<g transform="rotate({angle} {FLIGHT.destinationX} {FLIGHT.astreY})">
				<circle
					class="spark"
					cx={FLIGHT.destinationX}
					cy={FLIGHT.astreY}
					r={SPARK_RADIUS}
					data-color={index % SPARK_COLORS}
				/>
			</g>
		{/each}
	{/if}

	{#if coughing}
		<g transform="translate({pose.x + COUGH_OFFSET.x} {pose.y + COUGH_OFFSET.y})">
			<g class="cough">
				{#each COUGH_PUFFS as puff (puff.x)}
					<circle class="puff" cx={puff.x} cy={puff.y} r={puff.radius} />
				{/each}
			</g>
		</g>
	{/if}

	{#if sceneId === 'heart-smoke'}
		<g transform="translate({pose.x + heart.x} {pose.y + heart.y}) scale({HEART_SCALE})">
			<g class="heart">
				<path class="puff" d={HEART_PATH} />
				{#if !pose.landed}
					{#each HEART_PUFFS as puff (puff.x)}
						<circle class="puff" cx={puff.x} cy={puff.y} r={puff.radius} />
					{/each}
				{/if}
			</g>
		</g>
	{/if}

	<g transform="translate({pose.x} {pose.y}) rotate({pose.angle}) scale({ROCKET_SCALE})">
		<g class="flyer">
			<RocketShape landed={pose.landed} thrust={view.position} still={view.reducedMotion} />
		</g>
	</g>

	{#if sceneId === 'gift'}
		<g transform="translate({rocketWindow.x} {rocketWindow.y}) scale({GIFT_SCALE})">
			<path class="gift star-body" d={STAR_PATH} />
		</g>
	{/if}

	{#if sceneId === 'dino-aboard'}
		<g transform="translate({dinoSeat.x} {dinoSeat.y})">
			<g class="dino" data-look={astreVariant(destinationVariant)}>
				<g transform="scale({DINO.scale}) translate({-DINO.feet.x} {-DINO.feet.y})">
					<path class="dino-body" d={DINO.tailPath} />
					<path class="dino-body" d={DINO.restingArmPath} />
					{#each DINO.footEllipses as foot (foot.cx)}
						<ellipse class="dino-body" cx={foot.cx} cy={foot.cy} rx={foot.rx} ry={foot.ry} />
					{/each}
					<ellipse
						class="dino-body"
						cx={DINO.body.cx}
						cy={DINO.body.cy}
						rx={DINO.body.rx}
						ry={DINO.body.ry}
					/>
					<g class="dino-arm">
						<path class="dino-body" d={DINO.wavingArmPath} />
					</g>
					{#each DINO.platePaths as plate (plate)}
						<path class="dino-plate" d={plate} />
					{/each}
					<circle class="dino-body" cx={DINO.head.cx} cy={DINO.head.cy} r={DINO.head.radius} />
					{#each DINO.eyes as eye (eye.x)}
						<circle class="dino-white" cx={eye.x} cy={eye.y} r="3" />
						<circle class="dino-ink" cx={eye.x + 0.5} cy={eye.y + 0.5} r="1.5" />
					{/each}
					{#each DINO.cheeks as cheek (cheek.x)}
						<circle class="dino-cheek" cx={cheek.x} cy={cheek.y} r="1.8" />
					{/each}
					<path class="dino-mouth" d={DINO.mouthPath} />
				</g>
			</g>
		</g>
	{/if}
</svg>

<style>
	.sky {
		display: block;
		inline-size: 100%;
		max-inline-size: var(--dd-size-scene-max);
		block-size: auto;
		border-radius: var(--dd-radius-lg);
		background-color: var(--dd-color-sky-base);
	}

	.star {
		fill: var(--dd-color-sky-star);
	}

	.puff {
		fill: var(--dd-color-rocket-smoke);
		stroke: var(--dd-color-sky-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-dasharray: 4 3;
		vector-effect: non-scaling-stroke;
	}

	.cough {
		transform-box: fill-box;
		transform-origin: 100% 50%;
		animation-name: puff-out;
		animation-duration: var(--dd-duration-slow);
		animation-timing-function: var(--dd-easing-enter);
	}

	[data-still] .cough {
		animation-name: none;
	}

	@keyframes puff-out {
		0% {
			scale: 0.5;
		}

		100% {
			scale: 1;
		}
	}
	.spark {
		opacity: 0;
	}

	.spark[data-color='0'] {
		fill: var(--dd-color-star-fill);
	}

	.spark[data-color='1'] {
		fill: var(--dd-color-finger-left-index);
	}

	.spark[data-color='2'] {
		fill: var(--dd-color-finger-right-ring);
	}

	.spark[data-color='3'] {
		fill: var(--dd-color-sky-star);
	}

	.hoop,
	.star-body,
	.face-line,
	.cow-tail,
	.cow-leg,
	.cow-skin,
	.cow-snout,
	.cow-horn,
	.cow-collar,
	.cow-helmet,
	.cow-glint,
	.lens,
	.lens-bridge,
	.lens-glint {
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.hoop,
	.face-line,
	.cow-tail,
	.cow-leg,
	.cow-horn,
	.cow-collar,
	.cow-helmet,
	.cow-glint,
	.lens-bridge,
	.lens-glint {
		fill: transparent;
	}

	.hoop,
	.star-body,
	.cow-helmet,
	.cow-glint,
	.lens-glint {
		stroke: var(--dd-color-sky-line);
	}

	.star-body {
		fill: var(--dd-color-star-fill);
	}

	.face-line,
	.lens,
	.lens-bridge {
		stroke: var(--dd-color-drawing-ink);
	}

	.lens,
	.cow-ink {
		fill: var(--dd-color-drawing-ink);
	}

	.comet-tail {
		fill: var(--dd-color-sky-star);
		opacity: var(--dd-opacity-overlay);
	}

	.cow-skin,
	.cow-snout {
		stroke: var(--dd-color-drawing-line);
	}

	.cow-skin {
		fill: var(--dd-color-rocket-body);
	}

	.cow-snout {
		fill: var(--dd-color-finger-left-index);
	}

	.cow-tail,
	.cow-leg {
		stroke: var(--dd-color-rocket-body);
	}

	.cow-leg,
	.cow-horn,
	.cow-collar,
	.cow-glint {
		stroke-width: var(--dd-border-width-target);
	}

	.cow-horn {
		stroke: var(--dd-color-star-fill);
	}

	.cow-collar {
		stroke: var(--dd-color-astre-dim);
	}

	.dino-body,
	.dino-plate,
	.dino-white,
	.dino-mouth,
	.toque-part,
	.dish-plate,
	.dish-food,
	.dish-garnish,
	.car-trail,
	.car-body,
	.car-window,
	.car-light,
	.car-tire,
	.car-spoke,
	.car-hub {
		stroke: var(--dd-color-sky-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.dino-mouth,
	.car-trail,
	.car-spoke {
		fill: transparent;
	}

	.dino-mouth {
		stroke: var(--dd-color-drawing-ink);
	}

	.dino-body {
		fill: var(--dd-color-baby-a);
	}

	[data-look='1'] .dino-body {
		fill: var(--dd-color-baby-b);
	}

	[data-look='2'] .dino-body {
		fill: var(--dd-color-baby-c);
	}

	[data-look='3'] .dino-body {
		fill: var(--dd-color-baby-d);
	}

	.dino-plate {
		fill: var(--dd-color-companion-plate);
	}

	.dino-white {
		fill: var(--dd-color-companion-eye);
	}

	.dino-ink {
		fill: var(--dd-color-companion-line);
	}

	.dino-cheek {
		fill: var(--dd-color-companion-cheek);
	}

	.toque-part,
	.dish-plate {
		fill: var(--dd-color-wear-cream);
	}

	.dish-food {
		fill: var(--dd-color-food-a);
	}

	.dish-garnish {
		fill: var(--dd-color-wear-red);
	}

	.car-trail {
		opacity: var(--dd-opacity-overlay);
	}

	.car-body {
		fill: var(--dd-color-wear-red);
	}

	.car-window {
		fill: var(--dd-color-rocket-window);
	}

	.car-light {
		fill: var(--dd-color-star-fill);
	}

	.car-tire {
		fill: var(--dd-color-drawing-ink);
	}

	.car-spoke {
		stroke: var(--dd-color-wear-cream);
	}

	.car-hub {
		fill: var(--dd-color-wear-cream);
	}

	/* Surprise scenes (ADR-032): a moment after the last key, long enough to be seen. */
	[data-scene] .flyer,
	[data-scene] .inhabitant,
	[data-scene] .hider,
	[data-scene] .spark,
	[data-scene] .sway,
	[data-scene] .hoop,
	[data-scene] .comet,
	[data-scene] .cow,
	[data-scene] .cool-star,
	[data-scene] .shades,
	[data-scene] .heart,
	[data-scene] .gift,
	[data-scene] .dino,
	[data-scene] .dino-arm,
	[data-scene] .toque,
	[data-scene] .dish,
	[data-scene] .steam,
	[data-scene] .car,
	[data-scene] .car-bump,
	[data-scene] .car-wheel {
		transform-box: fill-box;
		transform-origin: 50% 50%;
		animation-duration: var(--dd-duration-scene);
		animation-delay: var(--dd-duration-reward-delay);
		animation-timing-function: var(--dd-easing-standard);
		animation-fill-mode: both;
	}

	/* The rocket is drawn nose up and turned nose right: its left side is the top of the sky. */
	[data-scene='looping'] .flyer {
		transform-origin: -60% 50%;
		animation-name: looping;
	}

	[data-scene='barrel-roll'] .flyer {
		animation-name: barrel-roll;
	}

	[data-scene='inhabitant-joy'] .inhabitant {
		transform-origin: 50% 100%;
		animation-name: joy;
	}

	[data-scene='fireworks'] .spark {
		animation-name: spark;
	}

	/* In flight, the bottom of the drawing points backwards: a positive y goes back. */
	[data-scene='parking'] .flyer {
		animation-name: parking;
	}

	[data-scene='parking'][data-landed] .flyer {
		transform-origin: 50% 100%;
		animation-name: parking-landed;
	}

	[data-scene='hide-and-seek'] .hider {
		transform-origin: 50% 100%;
		animation-name: hide-and-seek;
	}

	[data-scene='hide-and-seek'] .inhabitant {
		animation-name: back-in-front;
	}

	[data-scene='hula-hoop'] .sway {
		animation-name: sway;
	}

	/* Both halves of the ring turn around the center of the astre. */
	[data-scene='hula-hoop'] .hoop {
		transform-box: view-box;
		transform-origin: 0 0;
		animation-name: hula-drop;
	}

	[data-scene='hula-hoop'] .hoop[data-ringed] {
		animation-name: hula;
	}

	[data-scene='comet'] .comet {
		animation-name: comet;
	}

	[data-scene='space-cow'] .cow {
		animation-name: space-cow;
	}

	[data-scene='heart-smoke'] .flyer {
		animation-name: blow;
	}

	[data-scene='heart-smoke'] .heart {
		transform-origin: 100% 100%;
		animation-name: heart;
	}

	[data-scene='heart-smoke'][data-landed] .heart {
		transform-origin: 100% 50%;
		animation-name: heart-landed;
	}

	[data-scene='gift'] .inhabitant {
		transform-origin: 50% 100%;
		animation-name: offer;
	}

	[data-scene='gift'][data-landed] .inhabitant {
		animation-name: offer-landed;
	}

	[data-scene='gift'] .gift {
		animation-name: gift;
	}

	[data-scene='gift'][data-landed] .gift {
		animation-name: gift-landed;
	}

	[data-scene='gift'] .flyer {
		animation-name: thanks;
	}

	[data-scene='sunglasses'] .cool-star {
		animation-name: cool-star;
	}

	[data-scene='sunglasses'] .shades {
		animation-name: shades;
	}

	/* The baby climbs from the astre: the offsets are where it starts, from the seat it sits on. */
	[data-scene='dino-aboard'] .dino {
		transform-origin: 50% 100%;
		animation-name: dino-ride;
	}

	[data-scene='dino-aboard'][data-landed] .dino {
		animation-name: dino-ride-landed;
	}

	[data-scene='dino-aboard'][data-landed] .flyer {
		animation-name: dino-weight-landed;
	}

	[data-scene='chef-planet'][data-landed] .inhabitant {
		animation-name: chef-lean-landed;
	}

	[data-scene='chef-planet'][data-landed] .dish {
		animation-name: dish-landed;
	}

	[data-scene='dino-aboard'] .dino-arm {
		transform-origin: 100% 100%;
		animation-name: dino-wave;
	}

	[data-scene='dino-aboard'] .flyer {
		animation-name: dino-weight;
	}

	[data-scene='chef-planet'] .inhabitant {
		transform-origin: 50% 100%;
		animation-name: chef-lean;
	}

	[data-scene='chef-planet'] .toque {
		transform-origin: 50% 100%;
		animation-name: toque;
	}

	/* The dish goes from the astre to the rocket: the offsets are where it ends. */
	[data-scene='chef-planet'] .dish {
		animation-name: dish;
	}

	[data-scene='chef-planet'] .steam {
		animation-name: steam;
		animation-duration: calc(var(--dd-duration-scene) * 0.18);
		animation-delay: calc(var(--dd-duration-reward-delay) + var(--dd-duration-scene) * 0.26);
		animation-iteration-count: 3;
	}

	[data-scene='chef-planet'] .flyer {
		animation-name: thanks;
	}

	/* The car crosses the sky at a steady pace; its trails are left of the car, so it goes well past the edge. */
	[data-scene='car-flyby'] .car {
		animation-name: car-flyby;
		animation-timing-function: var(--dd-easing-steady);
	}

	[data-scene='car-flyby'] .car-bump {
		animation-name: car-bump;
		animation-timing-function: var(--dd-easing-steady);
	}

	[data-scene='car-flyby'] .car-wheel {
		animation-name: car-wheel;
		animation-timing-function: var(--dd-easing-steady);
	}

	@keyframes looping {
		0% {
			rotate: 0deg;
		}

		70%,
		100% {
			rotate: 360deg;
		}
	}

	@keyframes barrel-roll {
		0%,
		50%,
		100% {
			scale: 1 1;
		}

		25%,
		75% {
			scale: -1 1;
		}
	}

	@keyframes joy {
		0% {
			opacity: 0;
			translate: 0 0;
			rotate: 0deg;
		}

		10% {
			opacity: 100%;
		}

		25%,
		55% {
			translate: 0 -35%;
		}

		40%,
		70% {
			translate: 0 0;
			rotate: 0deg;
		}

		78%,
		94% {
			rotate: -10deg;
		}

		86% {
			rotate: 10deg;
		}

		100% {
			opacity: 100%;
			translate: 0 0;
			rotate: 0deg;
		}
	}

	@keyframes spark {
		0%,
		20% {
			opacity: 0;
			translate: 0 0;
		}

		30% {
			opacity: 100%;
		}

		100% {
			opacity: 0;
			translate: calc(var(--dd-space-xl) * 2) 0;
		}
	}

	/* Goes too far, backs up too far, hesitates, then edges into its place. */
	@keyframes parking {
		0% {
			translate: 0 0;
			rotate: 0deg;
		}

		25% {
			translate: 0 -55%;
			rotate: 0deg;
		}

		42% {
			translate: 0 22%;
			rotate: 0deg;
		}

		50% {
			translate: 0 22%;
			rotate: -8deg;
		}

		58% {
			translate: 0 22%;
			rotate: 6deg;
		}

		66% {
			translate: 0 -10%;
			rotate: 0deg;
		}

		76% {
			translate: 0 5%;
			rotate: 0deg;
		}

		86%,
		100% {
			translate: 0 0;
			rotate: 0deg;
		}
	}

	@keyframes parking-landed {
		0% {
			translate: -100% -80%;
			rotate: 0deg;
			scale: 1 1;
		}

		25% {
			translate: 18% -40%;
			rotate: 0deg;
			scale: 1 1;
		}

		42% {
			translate: -45% -30%;
			rotate: 0deg;
			scale: 1 1;
		}

		50% {
			translate: -45% -30%;
			rotate: -8deg;
			scale: 1 1;
		}

		58% {
			translate: -45% -30%;
			rotate: 6deg;
			scale: 1 1;
		}

		66% {
			translate: 10% -14%;
			rotate: 0deg;
			scale: 1 1;
		}

		76% {
			translate: -6% -6%;
			rotate: 0deg;
			scale: 1 1;
		}

		86% {
			translate: 0 0;
			rotate: 0deg;
			scale: 1.08 0.92;
		}

		94%,
		100% {
			translate: 0 0;
			rotate: 0deg;
			scale: 1 1;
		}
	}

	/* Slips behind the astre, peeks out on the other side, then comes back. */
	@keyframes hide-and-seek {
		0% {
			opacity: 0;
			translate: 0 0;
			rotate: 0deg;
		}

		8% {
			opacity: 100%;
			translate: 0 0;
			rotate: 0deg;
		}

		14% {
			translate: 0 0;
			rotate: -10deg;
		}

		20% {
			translate: 0 0;
			rotate: 0deg;
		}

		34% {
			translate: 114% 95%;
			rotate: 0deg;
		}

		42% {
			translate: 190% 105%;
			rotate: 0deg;
		}

		52%,
		64% {
			translate: 235% 107%;
			rotate: 14deg;
		}

		58% {
			translate: 235% 107%;
			rotate: 4deg;
		}

		78% {
			translate: 114% 95%;
			rotate: 0deg;
		}

		92%,
		100% {
			opacity: 100%;
			translate: 0 0;
			rotate: 0deg;
		}
	}

	/* The inhabitant in front of the astre waits for the one that hides to come back. */
	@keyframes back-in-front {
		0%,
		91% {
			opacity: 0;
		}

		92%,
		100% {
			opacity: 100%;
		}
	}

	@keyframes sway {
		0%,
		82%,
		100% {
			rotate: 0deg;
		}

		12%,
		32%,
		52%,
		72% {
			rotate: 5deg;
		}

		22%,
		42%,
		62% {
			rotate: -5deg;
		}
	}

	@keyframes hula {
		0%,
		82%,
		100% {
			translate: 0 0;
			rotate: 0deg;
		}

		12%,
		32%,
		52%,
		72% {
			translate: calc(var(--dd-space-md) * -1) 0;
			rotate: 9deg;
		}

		22%,
		42%,
		62% {
			translate: var(--dd-space-md) var(--dd-space-xs);
			rotate: -9deg;
		}
	}

	/* A planet without a ring catches a hoop, spins it, then lets it fall. */
	@keyframes hula-drop {
		0% {
			opacity: 0;
			translate: 0 calc(var(--dd-space-2xl) * -1);
			rotate: 0deg;
		}

		8%,
		82% {
			opacity: 100%;
			translate: 0 0;
			rotate: 0deg;
		}

		12%,
		32%,
		52%,
		72% {
			translate: calc(var(--dd-space-md) * -1) 0;
			rotate: 9deg;
		}

		22%,
		42%,
		62% {
			translate: var(--dd-space-md) var(--dd-space-xs);
			rotate: -9deg;
		}

		100% {
			opacity: 0;
			translate: 0 var(--dd-space-2xl);
			rotate: 0deg;
		}
	}

	@keyframes comet {
		0% {
			opacity: 0;
			translate: 0 0;
		}

		12%,
		85% {
			opacity: 100%;
		}

		100% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * -3.6) var(--dd-space-lg);
		}
	}

	@keyframes space-cow {
		0% {
			opacity: 0;
			translate: 0 0;
			rotate: -12deg;
		}

		8%,
		92% {
			opacity: 100%;
		}

		25% {
			translate: calc(var(--dd-space-3xl) * 1.9) calc(var(--dd-space-md) * -1);
			rotate: -4deg;
		}

		50% {
			translate: calc(var(--dd-space-3xl) * 3.8) calc(var(--dd-space-md) * -3.75);
			rotate: 6deg;
		}

		75% {
			translate: calc(var(--dd-space-3xl) * 5.75) calc(var(--dd-space-md) * -4.5);
			rotate: 14deg;
		}

		100% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * 7.65) calc(var(--dd-space-md) * -6.75);
			rotate: 20deg;
		}
	}

	@keyframes blow {
		0%,
		26%,
		100% {
			scale: 1 1;
		}

		8% {
			scale: 1.06 0.9;
		}

		16% {
			scale: 0.94 1.08;
		}
	}

	@keyframes heart {
		0%,
		12% {
			opacity: 0;
			translate: 0 0;
			scale: 0.2;
			rotate: 0deg;
		}

		26% {
			opacity: 100%;
			scale: 1.1;
		}

		36% {
			scale: 1;
			rotate: 0deg;
		}

		50% {
			rotate: -6deg;
		}

		65% {
			rotate: 6deg;
		}

		80% {
			opacity: 100%;
			translate: calc(var(--dd-space-md) * -1) calc(var(--dd-space-md) * -1);
			scale: 1.05;
			rotate: 0deg;
		}

		100% {
			opacity: 0;
			translate: calc(var(--dd-space-lg) * -1) calc(var(--dd-space-lg) * -1);
			scale: 1.2;
			rotate: 0deg;
		}
	}

	/* Once landed, the sky above is too short: the heart drifts to the left. */
	@keyframes heart-landed {
		0%,
		12% {
			opacity: 0;
			translate: 0 0;
			scale: 0.2;
			rotate: 0deg;
		}

		26% {
			opacity: 100%;
			scale: 1.1;
		}

		36% {
			scale: 1;
			rotate: 0deg;
		}

		50% {
			rotate: -6deg;
		}

		65% {
			rotate: 6deg;
		}

		80% {
			opacity: 100%;
			translate: calc(var(--dd-space-md) * -1) 0;
			scale: 1.05;
			rotate: 0deg;
		}

		100% {
			opacity: 0;
			translate: calc(var(--dd-space-lg) * -1) 0;
			scale: 1.2;
			rotate: 0deg;
		}
	}

	/* The inhabitant leans towards the rocket, below it in flight, to its right once landed. */
	@keyframes offer {
		0% {
			opacity: 0;
			rotate: 0deg;
		}

		10% {
			opacity: 100%;
			rotate: 0deg;
		}

		22%,
		40% {
			rotate: -14deg;
		}

		55%,
		100% {
			opacity: 100%;
			rotate: 0deg;
		}
	}

	@keyframes offer-landed {
		0% {
			opacity: 0;
			rotate: 0deg;
		}

		10% {
			opacity: 100%;
			rotate: 0deg;
		}

		22%,
		40% {
			rotate: 14deg;
		}

		55%,
		100% {
			opacity: 100%;
			rotate: 0deg;
		}
	}

	/* The star starts in front of the inhabitant and ends in the window of the rocket. */
	@keyframes gift {
		0% {
			opacity: 0;
			translate: calc(var(--dd-space-xl) * 0.61) calc(var(--dd-space-xl) * -0.375);
			scale: 0;
			rotate: 0deg;
		}

		14% {
			opacity: 100%;
			scale: 1.3;
		}

		22%,
		40% {
			translate: calc(var(--dd-space-xl) * 0.61) calc(var(--dd-space-xl) * -0.375);
			scale: 1;
			rotate: 0deg;
		}

		65% {
			translate: 0 0;
			rotate: 360deg;
			scale: 1;
		}

		75% {
			opacity: 100%;
			scale: 1.15;
		}

		90%,
		100% {
			opacity: 0;
			translate: 0 0;
			scale: 0.2;
			rotate: 360deg;
		}
	}

	@keyframes gift-landed {
		0% {
			opacity: 0;
			translate: calc(var(--dd-space-xl) * -0.65) calc(var(--dd-space-xl) * 1.2);
			scale: 0;
			rotate: 0deg;
		}

		14% {
			opacity: 100%;
			scale: 1.3;
		}

		22%,
		40% {
			translate: calc(var(--dd-space-xl) * -0.65) calc(var(--dd-space-xl) * 1.2);
			scale: 1;
			rotate: 0deg;
		}

		65% {
			translate: 0 0;
			rotate: 360deg;
			scale: 1;
		}

		75% {
			opacity: 100%;
			scale: 1.15;
		}

		90%,
		100% {
			opacity: 0;
			translate: 0 0;
			scale: 0.2;
			rotate: 360deg;
		}
	}

	@keyframes thanks {
		0%,
		64%,
		90%,
		100% {
			rotate: 0deg;
		}

		70% {
			rotate: -8deg;
		}

		76% {
			rotate: 8deg;
		}

		83% {
			rotate: -4deg;
		}
	}

	/* A tiny star of the sky grows, squints, gets its sunglasses and tilts its head. */
	@keyframes cool-star {
		0% {
			opacity: 0;
			scale: 0.1;
			rotate: 0deg;
		}

		14% {
			opacity: 100%;
			scale: 1.15;
		}

		22%,
		58% {
			scale: 1;
			rotate: 0deg;
		}

		66% {
			scale: 1.08;
			rotate: -14deg;
		}

		78%,
		100% {
			opacity: 100%;
			scale: 1;
			rotate: -10deg;
		}
	}

	@keyframes shades {
		0%,
		26% {
			opacity: 0;
			translate: 0 calc(var(--dd-space-xl) * -1);
		}

		32% {
			opacity: 100%;
		}

		50% {
			translate: 0 0;
		}

		54% {
			translate: 0 calc(var(--dd-space-xs) * 0.4);
		}

		58%,
		100% {
			opacity: 100%;
			translate: 0 0;
		}
	}

	/* Pops out of the astre, hops onto the rocket, sits and waves, then hops back and is gone. */
	@keyframes dino-ride {
		0% {
			opacity: 0;
			translate: calc(var(--dd-space-md) * 3.8) calc(var(--dd-space-md) * 1.25);
			scale: 0.2;
			rotate: 0deg;
		}

		6% {
			opacity: 100%;
			scale: 1.15;
		}

		10% {
			translate: calc(var(--dd-space-md) * 3.8) calc(var(--dd-space-md) * 1.25);
			scale: 1;
			rotate: 0deg;
		}

		20% {
			translate: calc(calc(var(--dd-space-md) * 3.8) * 0.5)
				calc(calc(var(--dd-space-md) * 1.25) * 0.5 - var(--dd-space-lg));
			scale: 1;
			rotate: -8deg;
		}

		30% {
			translate: 0 0;
			scale: 1.2 0.8;
			rotate: 0deg;
		}

		35% {
			scale: 1;
		}

		46% {
			rotate: calc(0deg - 5deg);
		}

		56% {
			rotate: calc(0deg + 5deg);
		}

		66% {
			translate: 0 0;
			scale: 1;
			rotate: 0deg;
		}

		70% {
			translate: 0 0;
			scale: 1.15 0.85;
			rotate: 0deg;
		}

		78% {
			translate: calc(calc(var(--dd-space-md) * 3.8) * 0.5)
				calc(calc(var(--dd-space-md) * 1.25) * 0.5 - var(--dd-space-lg));
			scale: 1;
			rotate: 8deg;
		}

		88% {
			opacity: 100%;
			translate: calc(var(--dd-space-md) * 3.8) calc(var(--dd-space-md) * 1.25);
			scale: 1.2 0.8;
			rotate: 0deg;
		}

		93% {
			opacity: 100%;
			scale: 1;
		}

		100% {
			opacity: 0;
			translate: calc(var(--dd-space-md) * 3.8) calc(var(--dd-space-md) * 1.25);
			scale: 0.2;
			rotate: 0deg;
		}
	}

	@keyframes dino-ride-landed {
		0% {
			opacity: 0;
			translate: calc(var(--dd-space-md) * -0.6) calc(var(--dd-space-md) * 2.55);
			scale: 0.2;
			rotate: 0deg;
		}

		6% {
			opacity: 100%;
			scale: 1.15;
		}

		10% {
			translate: calc(var(--dd-space-md) * -0.6) calc(var(--dd-space-md) * 2.55);
			scale: 1;
			rotate: 0deg;
		}

		20% {
			translate: calc(calc(var(--dd-space-md) * -0.6) * 0.5)
				calc(calc(var(--dd-space-md) * 2.55) * 0.5 - var(--dd-space-lg));
			scale: 1;
			rotate: -8deg;
		}

		30% {
			translate: 0 0;
			scale: 1.2 0.8;
			rotate: 28deg;
		}

		35% {
			scale: 1;
		}

		46% {
			rotate: calc(28deg - 5deg);
		}

		56% {
			rotate: calc(28deg + 5deg);
		}

		66% {
			translate: 0 0;
			scale: 1;
			rotate: 28deg;
		}

		70% {
			translate: 0 0;
			scale: 1.15 0.85;
			rotate: 28deg;
		}

		78% {
			translate: calc(calc(var(--dd-space-md) * -0.6) * 0.5)
				calc(calc(var(--dd-space-md) * 2.55) * 0.5 - var(--dd-space-lg));
			scale: 1;
			rotate: 8deg;
		}

		88% {
			opacity: 100%;
			translate: calc(var(--dd-space-md) * -0.6) calc(var(--dd-space-md) * 2.55);
			scale: 1.2 0.8;
			rotate: 0deg;
		}

		93% {
			opacity: 100%;
			scale: 1;
		}

		100% {
			opacity: 0;
			translate: calc(var(--dd-space-md) * -0.6) calc(var(--dd-space-md) * 2.55);
			scale: 0.2;
			rotate: 0deg;
		}
	}

	@keyframes dino-wave {
		0%,
		36%,
		70%,
		100% {
			rotate: 0deg;
		}

		42%,
		54%,
		64% {
			rotate: -30deg;
		}

		48%,
		59% {
			rotate: 14deg;
		}
	}

	/* The rocket takes the weight of the baby when it lands and when it jumps off. */
	@keyframes dino-weight {
		0%,
		26%,
		40%,
		68%,
		78%,
		100% {
			scale: 1 1;
		}

		31%,
		71% {
			scale: 0.95 1.03;
		}
	}

	@keyframes dino-weight-landed {
		0%,
		26%,
		40%,
		68%,
		78%,
		100% {
			scale: 1 1;
		}

		31%,
		71% {
			scale: 1.03 0.95;
		}
	}

	/* The inhabitant stands, then leans towards the rocket to serve the dish. */
	@keyframes chef-lean {
		0% {
			opacity: 0;
			rotate: 0deg;
		}

		10%,
		50% {
			opacity: 100%;
			rotate: 0deg;
		}

		58%,
		76% {
			opacity: 100%;
			rotate: -12deg;
		}

		88%,
		100% {
			opacity: 100%;
			rotate: 0deg;
		}
	}

	@keyframes chef-lean-landed {
		0% {
			opacity: 0;
			rotate: 0deg;
		}

		10%,
		50% {
			opacity: 100%;
			rotate: 0deg;
		}

		58%,
		76% {
			opacity: 100%;
			rotate: 12deg;
		}

		88%,
		100% {
			opacity: 100%;
			rotate: 0deg;
		}
	}

	@keyframes toque {
		0%,
		12% {
			opacity: 0;
			translate: 0 calc(var(--dd-space-md) * -1);
			scale: 1;
			rotate: -12deg;
		}

		22% {
			opacity: 100%;
			translate: 0 0;
			scale: 1.1 0.85;
			rotate: 4deg;
		}

		28%,
		100% {
			opacity: 100%;
			translate: 0 0;
			scale: 1;
			rotate: 0deg;
		}
	}

	/* Lands on the astre, waits and steams, then travels to the rocket and is eaten. */
	@keyframes dish {
		0%,
		18% {
			opacity: 0;
			translate: 0 calc(var(--dd-space-md) * -1.5);
			scale: 0.6;
		}

		26% {
			opacity: 100%;
			translate: 0 0;
			scale: 1.15 0.85;
		}

		32%,
		54% {
			opacity: 100%;
			translate: 0 0;
			scale: 1;
		}

		62% {
			translate: calc(calc(var(--dd-space-md) * -2.4) * 0.3)
				calc(calc(var(--dd-space-md) * 0.9) * 0.3 - var(--dd-space-sm));
		}

		74% {
			opacity: 100%;
			translate: calc(var(--dd-space-md) * -2.4) calc(var(--dd-space-md) * 0.9);
			scale: 1;
		}

		82% {
			opacity: 100%;
			translate: calc(var(--dd-space-md) * -2.4) calc(var(--dd-space-md) * 0.9);
			scale: 0.6;
		}

		88%,
		100% {
			opacity: 0;
			translate: calc(var(--dd-space-md) * -2.4) calc(var(--dd-space-md) * 0.9);
			scale: 0.2;
		}
	}

	@keyframes dish-landed {
		0%,
		18% {
			opacity: 0;
			translate: 0 calc(var(--dd-space-md) * -1.5);
			scale: 0.6;
		}

		26% {
			opacity: 100%;
			translate: 0 0;
			scale: 1.15 0.85;
		}

		32%,
		54% {
			opacity: 100%;
			translate: 0 0;
			scale: 1;
		}

		62% {
			translate: calc(calc(var(--dd-space-md) * 0.9) * 0.3)
				calc(calc(var(--dd-space-md) * -2) * 0.3 - var(--dd-space-sm));
		}

		74% {
			opacity: 100%;
			translate: calc(var(--dd-space-md) * 0.9) calc(var(--dd-space-md) * -2);
			scale: 1;
		}

		82% {
			opacity: 100%;
			translate: calc(var(--dd-space-md) * 0.9) calc(var(--dd-space-md) * -2);
			scale: 0.6;
		}

		88%,
		100% {
			opacity: 0;
			translate: calc(var(--dd-space-md) * 0.9) calc(var(--dd-space-md) * -2);
			scale: 0.2;
		}
	}

	@keyframes steam {
		0% {
			opacity: 0;
			translate: 0 0;
			scale: 0.6;
		}

		35% {
			opacity: 100%;
		}

		100% {
			opacity: 0;
			translate: 0 calc(var(--dd-space-sm) * -1);
			scale: 1.3;
		}
	}

	@keyframes car-flyby {
		0% {
			opacity: 100%;
			translate: 0 0;
		}

		96% {
			opacity: 100%;
		}

		100% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * 10.5) 0;
		}
	}

	@keyframes car-bump {
		0%,
		12%,
		28%,
		44%,
		60%,
		76%,
		92%,
		100% {
			translate: 0 0;
		}

		6%,
		20%,
		36%,
		52%,
		68%,
		84% {
			translate: 0 calc(var(--dd-space-xs) * -0.5);
		}
	}

	@keyframes car-wheel {
		0% {
			rotate: 0deg;
		}

		100% {
			rotate: 1080deg;
		}
	}
</style>
