<script lang="ts">
	import type { GameView } from '../shared/game-view';
	import AstreShape from './AstreShape.svelte';
	import BabyDino from './BabyDino.svelte';
	import {
		FLIGHT,
		INHABITANT,
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
		COMET,
		COOL,
		COOL_STAR,
		COUGH_PUFFS,
		COW,
		DINO,
		DINO_SEATS,
		DISH,
		GIFT,
		HEART,
		HEART_PUFFS,
		HOOP_BACK_PATH,
		HOOP_FRONT_PATH,
		INHABITANT_ASTRE,
		INHABITANT_SHAPE,
		NEBULAS,
		PUFF_LIGHTS,
		ROCKET,
		ROCKET_SCALE,
		ROUTE,
		SPARK,
		STARS,
		TOQUE,
		TWINKLES,
		type Modelled
	} from './shapes';

	interface Props {
		view: GameView;
	}

	const REWARD_VARIANTS = 4;
	/** Directions of the sparks of the fireworks around the astre reached, in degrees. */
	const SPARK_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315] as const;
	const SPARK_COLORS = 4;
	const INHABITANT_TRANSFORM = `translate(${INHABITANT.x} ${INHABITANT.y}) scale(${INHABITANT.scale})`;
	/**
	 * Where the inhabitant peeks out in the hide-and-seek: behind the right edge of its astre, leaning
	 * out; its feet (41, 53 in its box) inside the astre.
	 */
	const PEEKER_TRANSFORM = `translate(${462 - 41 * INHABITANT.scale} ${124 - 53 * INHABITANT.scale}) scale(${INHABITANT.scale}) rotate(50 41 53)`;
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
	const DINO_TRANSFORM = `scale(${DINO.scale}) translate(${-DINO.seat.x} ${-DINO.seat.y})`;
	const DEGREES_TO_RADIANS = Math.PI / 180;

	let { view }: Props = $props();

	const uid = $props.id();

	const pose = $derived(rocketPose(view));
	const departure = $derived(departureIndex(view));
	const lit = $derived(destinationLit(view));
	const coughing = $derived(view.errorIndex !== null);
	const destinationVariant = $derived(view.groupIndex);
	const sceneId = $derived(lit && view.scene.kind === 'scene' ? view.scene.id : undefined);
	const ringed = $derived(astreVariant(destinationVariant) === 0);
	const heart = $derived(pose.landed ? HEART_OFFSET.landed : HEART_OFFSET.flying);
	const rocketWindow = $derived(rocketPoint(ROCKET.windowCenter.x, ROCKET.windowCenter.y));
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

	function ref(name: string): string {
		return `${uid}-${name}`;
	}

	function url(name: string): string {
		return `url(#${ref(name)})`;
	}
</script>

<!-- A form with its volume: its fill, then, kept inside it, its shade and its lights. -->
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

<!-- Round puffs of smoke under one outline, lit on their top left. -->
{#snippet smoke(puffs: readonly { x: number; y: number; radius: number }[], lit: boolean)}
	{#each puffs as puff (puff.x)}
		<circle class="underlay" cx={puff.x} cy={puff.y} r={puff.radius} />
	{/each}
	{#each puffs as puff (puff.x)}
		<circle class="puff" cx={puff.x} cy={puff.y} r={puff.radius} />
	{/each}
	{#if lit}
		{#each PUFF_LIGHTS as light (light)}
			<path class="light" d={light} />
		{/each}
	{/if}
{/snippet}

<svg
	class="sky"
	viewBox="0 0 {SCENE.width} {SCENE.height}"
	focusable="false"
	aria-hidden="true"
	data-still={view.reducedMotion || undefined}
	data-scene={sceneId}
	data-landed={pose.landed || undefined}
>
	<defs>
		{#each ['a', 'b'] as tone (tone)}
			<radialGradient id={ref(`nebula-${tone}`)}>
				<stop class="nebula-{tone}" offset="0" />
				<stop class="nebula-{tone}-edge" offset="1" stop-opacity="0" />
			</radialGradient>
		{/each}
		<clipPath id={ref('astre')}><path d={INHABITANT_ASTRE} /></clipPath>
	</defs>

	{#each NEBULAS as nebula (nebula.cx)}
		<ellipse
			cx={nebula.cx}
			cy={nebula.cy}
			rx={nebula.rx}
			ry={nebula.ry}
			fill={url(`nebula-${nebula.tone}`)}
		/>
	{/each}
	{#each STARS as star (star.x)}
		<circle class="star" cx={star.x} cy={star.y} r={star.radius} />
	{/each}
	{#each TWINKLES as twinkle (twinkle)}
		<path class="twinkle" d={twinkle} />
	{/each}
	<path class="route" d={ROUTE} />

	{#if sceneId === 'comet'}
		<g transform="translate({COMET_START.x} {COMET_START.y}) scale({COMET_START.scale})">
			<g class="comet">
				{#each COMET.tail as tail, index (tail)}
					<path class="comet-tail" data-layer={index} d={tail} />
				{/each}
				{#each COMET.sparkles as sparkle (sparkle)}
					<path class="sparkle" d={sparkle} />
				{/each}
				<path class="underlay" d={COMET.head.d} />
				{@render volume('comet-head', COMET.head, 'comet-head')}
				{#each COMET.eyes as eye (eye)}
					<path class="open line" d={eye} />
				{/each}
				{#each COMET.cheeks as cheek (cheek)}
					<path class="cheek" d={cheek} />
				{/each}
				<path class="open line" d={COMET.mouth} />
			</g>
		</g>
	{/if}

	{#if sceneId === 'space-cow'}
		<g transform="translate({COW_START.x} {COW_START.y})">
			<g class="cow">
				<path class="open tail-line" d={COW.tail} />
				<path class="open tail-fill" d={COW.tail} />
				<path class="underlay" d={COW.tuft.d} />
				{@render volume('cow-tuft', COW.tuft, 'cow-spot')}
				{#each COW.legs as leg, index (leg.hoof)}
					<path class="underlay" d={leg.leg.d} />
					<path class="underlay" d={leg.hoof} />
					{@render volume(`cow-leg-${index}`, leg.leg, 'cow-skin')}
					<path class="cow-hoof" d={leg.hoof} />
				{/each}
				<path class="underlay" d={COW.udder.d} />
				{@render volume('cow-udder', COW.udder, 'cow-pink')}
				<path class="open fine" d={COW.teats} />
				<path class="underlay" d={COW.body.d} />
				<clipPath id={ref('cow-body')}><path d={COW.body.d} /></clipPath>
				<path class="cow-skin" d={COW.body.d} />
				<g clip-path={url('cow-body')}>
					{#each COW.spots as spot (spot)}
						<path class="cow-spot" d={spot} />
					{/each}
					<path class="shade" fill-rule="evenodd" d={COW.body.shade} />
					{#each COW.body.lights as light (light)}
						<path class="light" d={light} />
					{/each}
				</g>
				<path class="underlay" d={COW.collar.d} />
				{@render volume('cow-collar', COW.collar, 'metal')}
				{#each COW.horns as horn, index (horn.d)}
					<path class="underlay" d={horn.d} />
					{@render volume(`cow-horn-${index}`, horn, 'cow-horn')}
				{/each}
				<path class="underlay" d={COW.ear.d} />
				{@render volume('cow-ear', COW.ear, 'cow-skin')}
				<path class="cow-pink" d={COW.earInside} />
				<path class="underlay" d={COW.head.d} />
				{@render volume('cow-head', COW.head, 'cow-skin')}
				{@render volume('cow-snout', COW.snout, 'cow-pink')}
				<path class="open fine" d={COW.snout.d} />
				{#each COW.nostrils as nostril (nostril)}
					<path class="ink" d={nostril} />
				{/each}
				{#each COW.eyes as eye (eye)}
					<path class="open line" d={eye} />
				{/each}
				<path class="cheek" d={COW.cheek} />
				<path class="glass line" d={COW.helmet} />
				{#each COW.helmetLights as light (light)}
					<path class="glint" d={light} />
				{/each}
			</g>
		</g>
	{/if}

	{#if sceneId === 'sunglasses'}
		<g transform="translate({COOL_STAR.x} {COOL_STAR.y}) scale({COOL_STAR.scale})">
			<g class="cool-star">
				{@render volume('cool-star', COOL.star, 'star-fill')}
				<path class="open line" d={COOL.star.d} />
				{#each COOL.eyes as eye (eye)}
					<path class="open line" d={eye} />
				{/each}
				<path class="open line" d={COOL.mouth} />
				<g class="shades">
					{#each COOL.lenses as lens (lens)}
						<path class="ink" d={lens} />
					{/each}
					<path class="open line" d={COOL.bridge} />
					{#each COOL.glints as glint (glint)}
						<path class="open glint-line" d={glint} />
					{/each}
				</g>
			</g>
		</g>
	{/if}

	{#if sceneId === 'car-flyby'}
		<g transform="translate({CAR.start.x} {CAR.start.y})">
			<g class="car">
				<g transform="scale({CAR.scale})">
					{#each CAR.trails as trail (trail)}
						<path class="car-trail" d={trail} />
					{/each}
					<g class="car-bump">
						<path class="underlay" d={CAR.body.d} />
						{@render volume('car-body', CAR.body, 'car-paint')}
						<path class="glass fine" d={CAR.window} />
						<path class="glint" d={CAR.windowShine} />
						<path class="open fine" d={CAR.pillar} />
						<path class="open fine" d={CAR.trim} />
						<path class="gold fine" d={CAR.headlight} />
						<path class="jewel fine" d={CAR.tailLight} />
						{#each CAR.wheels as wheel (wheel.cx)}
							<g transform="translate({wheel.cx} {wheel.cy})">
								<g class="car-wheel">
									<circle class="tire line" cx="0" cy="0" r={CAR.wheelRadius} />
									<circle class="metal fine" cx="0" cy="0" r={CAR.hubRadius} />
									<path class="open fine" d={CAR.spokePath} />
								</g>
							</g>
						{/each}
					</g>
				</g>
			</g>
		</g>
	{/if}

	<g transform={astreTransform(FLIGHT.departureX)}>
		<AstreShape variant={departure ?? 0} lit={true} home={departure === null} />
	</g>

	{#if sceneId === 'hide-and-seek'}
		<g transform={INHABITANT_TRANSFORM}>
			<g class="hider">
				<InhabitantShape variant={destinationVariant} />
			</g>
		</g>
		<g transform={PEEKER_TRANSFORM}>
			<g class="peeker">
				<InhabitantShape variant={destinationVariant} />
			</g>
		</g>
	{/if}

	{#if sceneId === 'hula-hoop'}
		<g transform={HOOP_TRANSFORM}>
			<g class="hoop" data-ringed={ringed || undefined}>
				<path class="hoop-edge" d={HOOP_BACK_PATH} />
				<path class="hoop-band" d={HOOP_BACK_PATH} />
				<path class="hoop-stripe" d={HOOP_BACK_PATH} />
			</g>
		</g>
	{/if}

	<g transform={astreTransform(FLIGHT.destinationX)}>
		<g class="sway">
			<AstreShape variant={destinationVariant} {lit} ringHidden={sceneId === 'hula-hoop'} />
		</g>
	</g>

	{#if sceneId === 'hula-hoop'}
		<g transform={HOOP_TRANSFORM}>
			<g class="hoop" data-ringed={ringed || undefined}>
				<path class="hoop-edge" d={HOOP_FRONT_PATH} />
				<path class="hoop-band" d={HOOP_FRONT_PATH} />
				<path class="hoop-stripe" d={HOOP_FRONT_PATH} />
			</g>
		</g>
	{/if}

	{#if lit}
		<g transform={INHABITANT_TRANSFORM}>
			{#if sceneId !== 'hide-and-seek'}
				<path class="ground" clip-path={url('astre')} d={INHABITANT_SHAPE.ground} />
			{/if}
			{#if inhabitantMoves}
				<g class="inhabitant">
					<InhabitantShape
						variant={destinationVariant}
						pose={sceneId === 'inhabitant-joy' ? 'cheer' : 'rest'}
					/>
					{#if sceneId === 'chef-planet'}
						<g class="toque">
							<path class="underlay" d={TOQUE.puff.d} />
							<path class="underlay" d={TOQUE.band.d} />
							{@render volume('toque-puff', TOQUE.puff, 'cream')}
							<path class="open fine" d={TOQUE.folds} />
							{@render volume('toque-band', TOQUE.band, 'cream')}
							<path class="open fine" d={TOQUE.band.d} />
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
				<path class="underlay" d={DISH.plate.d} />
				<path class="cream" d={DISH.plate.d} />
				<path class="shade" d={DISH.well} />
				<path class="underlay" d={DISH.cake.d} />
				{@render volume('dish-cake', DISH.cake, 'food')}
				{@render volume('dish-icing', DISH.icing, 'cream')}
				<path class="open fine" d={DISH.icing.d} />
				<path class="open stem" d={DISH.stem} />
				<path class="underlay" d={DISH.cherry.d} />
				{@render volume('dish-cherry', DISH.cherry, 'jewel')}
				<path class="glint" d={DISH.cherryGlint} />
				<g class="steam">
					{#each DISH.wisps as wisp (wisp)}
						<path class="wisp" d={wisp} />
					{/each}
				</g>
			</g>
		</g>
	{/if}

	{#if sceneId === 'fireworks'}
		{#each SPARK_ANGLES as angle, index (angle)}
			<g transform="rotate({angle} {FLIGHT.destinationX} {FLIGHT.astreY})">
				<path class="spark fine" d={SPARK} data-color={index % SPARK_COLORS} />
			</g>
		{/each}
	{/if}

	{#if coughing}
		<g transform="translate({pose.x + COUGH_OFFSET.x} {pose.y + COUGH_OFFSET.y})">
			<g class="cough">
				{@render smoke(COUGH_PUFFS, true)}
			</g>
		</g>
	{/if}

	{#if sceneId === 'heart-smoke'}
		<g transform="translate({pose.x + heart.x} {pose.y + heart.y}) scale({HEART_SCALE})">
			<g class="heart">
				<path class="underlay" d={HEART.d} />
				{@render volume('heart', HEART, 'puff')}
				{#if !pose.landed}
					{@render smoke(HEART_PUFFS, false)}
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
			<g class="gift">
				<path class="underlay" d={GIFT.box.d} />
				<path class="underlay" d={GIFT.lid.d} />
				{#each GIFT.bow as loop (loop)}
					<path class="underlay" d={loop} />
				{/each}
				{@render volume('gift-box', GIFT.box, 'trim')}
				{@render volume('gift-lid', GIFT.lid, 'trim')}
				{#each GIFT.ribbon as band (band)}
					<path class="ribbon" d={band} />
				{/each}
				<path class="open fine" d={GIFT.lid.d} />
				{#each GIFT.bow as loop (loop)}
					<path class="ribbon" d={loop} />
				{/each}
				<path class="ribbon fine" d={GIFT.knot} />
				{#each GIFT.lights as light (light)}
					<path class="light" d={light} />
				{/each}
			</g>
		</g>
	{/if}

	{#if sceneId === 'dino-aboard'}
		<g transform="translate({dinoSeat.x} {dinoSeat.y})">
			<g class="dino">
				<g transform={DINO_TRANSFORM}>
					<BabyDino look={astreVariant(destinationVariant)} />
				</g>
			</g>
		</g>
	{/if}
</svg>

<style>
	/* The drawing fits the height it is given; the sky goes on to the sides. */
	.sky {
		display: block;
		inline-size: 100%;
		block-size: 100%;
		border-radius: var(--dd-radius-lg);
		background-color: var(--dd-color-sky-base);
	}

	.line,
	.fine,
	.underlay,
	.tail-line,
	.tail-fill,
	.stem,
	.wisp,
	.glint-line,
	.car-trail,
	.hoop-edge,
	.hoop-band,
	.hoop-stripe {
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.line,
	.fine,
	.underlay,
	.tail-line,
	.stem {
		stroke: var(--dd-color-rocket-line);
	}

	.line,
	.stem {
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

	.ink {
		fill: var(--dd-color-rocket-line);
	}

	.cheek {
		fill: var(--dd-color-rocket-inhabitant-cheek);
	}

	.nebula-a {
		stop-color: var(--dd-color-rocket-nebula-a);
		stop-opacity: var(--dd-opacity-rocket-nebula);
	}

	.nebula-b {
		stop-color: var(--dd-color-rocket-nebula-b);
		stop-opacity: var(--dd-opacity-rocket-nebula);
	}

	.nebula-a-edge {
		stop-color: var(--dd-color-rocket-nebula-a);
	}

	.nebula-b-edge {
		stop-color: var(--dd-color-rocket-nebula-b);
	}

	.star,
	.twinkle {
		fill: var(--dd-color-sky-star);
	}

	.route {
		fill: transparent;
		stroke: var(--dd-color-sky-line);
		stroke-width: var(--dd-border-width-target);
		stroke-linecap: round;
		stroke-dasharray: 0 14;
		stroke-opacity: var(--dd-opacity-rocket-route);
		vector-effect: non-scaling-stroke;
	}

	.ground {
		fill: var(--dd-color-rocket-shade);
		fill-opacity: var(--dd-opacity-rocket-ground);
	}

	.puff {
		fill: var(--dd-color-rocket-smoke);
	}

	.metal {
		fill: var(--dd-color-rocket-metal);
	}

	.glass {
		fill: var(--dd-color-wear-glass);
		fill-opacity: var(--dd-opacity-glass);
	}

	.trim {
		fill: var(--dd-color-rocket-trim);
	}

	.ribbon {
		fill: var(--dd-color-rocket-gift-ribbon);
	}

	.cream {
		fill: var(--dd-color-wear-cream);
	}

	.food {
		fill: var(--dd-color-food-a);
	}

	.jewel {
		fill: var(--dd-color-wear-jewel);
	}

	.gold,
	.star-fill,
	.sparkle {
		fill: var(--dd-color-star-fill);
	}

	.comet-head {
		fill: var(--dd-color-rocket-comet-head);
	}

	.comet-tail {
		fill: var(--dd-color-rocket-comet-tail);
		fill-opacity: var(--dd-opacity-rocket-tail);
	}

	.comet-tail[data-layer='1'] {
		fill: var(--dd-color-rocket-comet-tail-light);
	}

	.comet-tail[data-layer='2'] {
		fill: var(--dd-color-rocket-light);
	}

	.cow-skin {
		fill: var(--dd-color-rocket-cow-skin);
	}

	.cow-spot,
	.cow-hoof {
		fill: var(--dd-color-rocket-cow-spot);
	}

	.cow-pink {
		fill: var(--dd-color-rocket-cow-pink);
	}

	.cow-horn {
		fill: var(--dd-color-rocket-cow-horn);
	}

	.tail-line {
		stroke-width: calc(var(--dd-border-width-thick) * 2 + var(--dd-border-width-thick));
	}

	.tail-fill {
		stroke: var(--dd-color-rocket-cow-skin);
		stroke-width: var(--dd-border-width-thick);
	}

	.glint-line {
		stroke: var(--dd-color-rocket-light);
		stroke-width: var(--dd-border-width-thin);
	}

	.car-paint {
		fill: var(--dd-color-wear-red);
	}

	.tire {
		fill: var(--dd-color-wear-ink);
	}

	.car-trail {
		fill: transparent;
		stroke: var(--dd-color-sky-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-opacity: var(--dd-opacity-overlay);
	}

	.wisp {
		fill: transparent;
		stroke: var(--dd-color-rocket-smoke);
		stroke-width: var(--dd-border-width-target);
	}

	.hoop-edge,
	.hoop-band,
	.hoop-stripe {
		fill: transparent;
	}

	.hoop-edge {
		stroke: var(--dd-color-rocket-line);
		stroke-width: calc(var(--dd-border-width-target) + var(--dd-border-width-thick) * 2);
	}

	.hoop-band {
		stroke: var(--dd-color-rocket-hoop);
		stroke-width: var(--dd-border-width-target);
	}

	.hoop-stripe {
		stroke: var(--dd-color-rocket-hoop-stripe);
		stroke-width: var(--dd-border-width-target);
		stroke-linecap: butt;
		stroke-dasharray: 4 9;
	}

	.spark {
		opacity: 0;
	}

	.spark[data-color='0'] {
		fill: var(--dd-color-rocket-spark-a);
	}

	.spark[data-color='1'] {
		fill: var(--dd-color-rocket-spark-b);
	}

	.spark[data-color='2'] {
		fill: var(--dd-color-rocket-spark-c);
	}

	.spark[data-color='3'] {
		fill: var(--dd-color-rocket-spark-d);
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

	/* Surprise scenes (ADR-032): a moment after the last key, long enough to be seen. */
	[data-scene] .flyer,
	[data-scene] .inhabitant,
	[data-scene] .hider,
	[data-scene] .peeker,
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
	[data-scene] :global(.dino-arm),
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

	[data-scene='hide-and-seek'] .peeker {
		transform-origin: 50% 100%;
		animation-name: peek;
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

	[data-scene='dino-aboard'] :global(.dino-arm) {
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
			translate: calc(var(--dd-space-xl) * 1.1) 0;
			scale: 0.4;
		}

		30% {
			opacity: 100%;
			scale: 1.2;
		}

		70% {
			opacity: 100%;
		}

		100% {
			opacity: 0;
			translate: calc(var(--dd-space-xl) * 2.6) 0;
			scale: 0.8;
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

	/* Looks around, ducks behind its astre, then comes back up where it was. */
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

		32%,
		76% {
			translate: 45% 82%;
			rotate: 0deg;
		}

		88% {
			translate: 0 -6%;
		}

		92%,
		100% {
			opacity: 100%;
			translate: 0 0;
			rotate: 0deg;
		}
	}

	/* Meanwhile, the head peeks out from behind the other side of the astre, looks, and is gone. */
	@keyframes peek {
		0%,
		38% {
			opacity: 0;
			translate: 0 60%;
			rotate: 0deg;
		}

		40% {
			opacity: 100%;
			translate: 0 60%;
		}

		48%,
		62% {
			translate: 0 0;
			rotate: 0deg;
		}

		53% {
			rotate: -8deg;
		}

		58% {
			rotate: 8deg;
		}

		70% {
			opacity: 100%;
			translate: 0 60%;
		}

		72%,
		100% {
			opacity: 0;
			translate: 0 60%;
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

	/* The present starts in front of the inhabitant and ends in the window of the rocket. */
	@keyframes gift {
		0% {
			opacity: 0;
			translate: calc(var(--dd-space-xl) * 0.6) calc(var(--dd-space-xl) * -0.36);
			scale: 0;
			rotate: 0deg;
		}

		14% {
			opacity: 100%;
			scale: 1.3;
		}

		22%,
		40% {
			translate: calc(var(--dd-space-xl) * 0.6) calc(var(--dd-space-xl) * -0.36);
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
			translate: calc(var(--dd-space-xl) * -0.4) calc(var(--dd-space-xl) * 1.42);
			scale: 0;
			rotate: 0deg;
		}

		14% {
			opacity: 100%;
			scale: 1.3;
		}

		22%,
		40% {
			translate: calc(var(--dd-space-xl) * -0.4) calc(var(--dd-space-xl) * 1.42);
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
			translate: calc(calc(var(--dd-space-md) * -2.875) * 0.3)
				calc(calc(var(--dd-space-md) * 0.5) * 0.3 - var(--dd-space-sm));
		}

		74% {
			opacity: 100%;
			translate: calc(var(--dd-space-md) * -2.875) calc(var(--dd-space-md) * 0.5);
			scale: 1;
		}

		82% {
			opacity: 100%;
			translate: calc(var(--dd-space-md) * -2.875) calc(var(--dd-space-md) * 0.5);
			scale: 0.6;
		}

		88%,
		100% {
			opacity: 0;
			translate: calc(var(--dd-space-md) * -2.875) calc(var(--dd-space-md) * 0.5);
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
			translate: calc(calc(var(--dd-space-md) * 1.0625) * 0.3)
				calc(calc(var(--dd-space-md) * -4.25) * 0.3 - var(--dd-space-sm));
		}

		74% {
			opacity: 100%;
			translate: calc(var(--dd-space-md) * 1.0625) calc(var(--dd-space-md) * -4.25);
			scale: 1;
		}

		82% {
			opacity: 100%;
			translate: calc(var(--dd-space-md) * 1.0625) calc(var(--dd-space-md) * -4.25);
			scale: 0.6;
		}

		88%,
		100% {
			opacity: 0;
			translate: calc(var(--dd-space-md) * 1.0625) calc(var(--dd-space-md) * -4.25);
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

	/* The sky is wider than the scene on a wide screen: the car fades in and out where it may be seen. */
	@keyframes car-flyby {
		0% {
			opacity: 0;
			translate: 0 0;
		}

		6%,
		94% {
			opacity: 100%;
		}

		100% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * 14.4) 0;
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
