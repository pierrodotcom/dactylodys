<script lang="ts">
	import {
		BELLY,
		BELLY_BANDS,
		BELLY_SHADE,
		BODY,
		BODY_LIGHT,
		BODY_SHADE,
		BROWS,
		CHEEKS,
		CHIN_SHADE,
		EYES,
		FEET,
		HEAD,
		HEAD_LIGHTS,
		HEAD_OFFSET,
		HEAD_PLATES,
		HEAD_SHADE,
		MOUTH,
		NOSTRILS,
		RAISED_ARMS,
		REST_ARMS,
		SIDES,
		SNOUT_RIDGE,
		TONGUE,
		type Arm
	} from '../hatching/shapes';
	import type { GameView } from '../shared/game-view';
	import IngredientShape from './IngredientShape.svelte';
	import Pot from './Pot.svelte';
	import { ingredientPlace, isDishReady, prepStage } from './prep';
	import {
		BALLOON,
		BURP_BUBBLE,
		CATAPULT,
		DELIVERY_ROCKET,
		DINO,
		DIVING_BOARD,
		GIRAFFE,
		KITCHEN,
		LADLE,
		LID,
		NAPKIN,
		OLA_HUMPS,
		POT,
		SCENE,
		SPLASH,
		STEAM_SHAPES,
		WAVING_ARM
	} from './shapes';

	interface Props {
		view: GameView;
	}

	let { view }: Props = $props();

	const uid = $props.id();

	const place = $derived(ingredientPlace(view));
	const stage = $derived(prepStage(view));
	const ready = $derived(isDishReady(view));
	const sceneId = $derived(
		place === 'pot' && view.scene.kind === 'scene' ? view.scene.id : undefined
	);
	const entrance = $derived(view.scene.kind === 'variant' ? view.scene.index : 0);
	const steamShape = $derived(STEAM_SHAPES[view.groupIndex % STEAM_SHAPES.length] ?? []);

	function placeTransform(spot: { x: number; y: number; scale: number }): string {
		return `translate(${spot.x} ${spot.y}) scale(${spot.scale})`;
	}

	function ref(name: string): string {
		return `${uid}-${name}`;
	}

	function url(name: string): string {
		return `url(#${ref(name)})`;
	}
</script>

<!-- A form with its volume: its fill, then, kept inside it, its shade and its lights. -->
{#snippet modelled(
	name: string,
	d: string,
	fill: string,
	shade: string | undefined,
	lights: readonly string[] = []
)}
	<clipPath id={ref(name)}><path {d} /></clipPath>
	<path class={fill} {d} />
	<g clip-path={url(name)}>
		{#if shade}
			<path class="shade" fill-rule="evenodd" d={shade} />
		{/if}
		{#each lights as light (light)}
			<path class="light" d={light} />
		{/each}
	</g>
{/snippet}

<!-- An arm of the baby dino: its outline under it, so that the body shares it at the shoulder. -->
{#snippet babyArm(limb: Arm, name: string)}
	<path class="underlay" d={limb.fill} />
	{@render modelled(name, limb.fill, 'skin', limb.shade)}
	{@render modelled(`${name}-hand`, limb.hand.fill, 'skin', limb.hand.shade)}
	<path class="open line" d={limb.hand.line} />
	<path class="open fine" d={limb.hand.fingers} />
{/snippet}

{#snippet baby()}
	<path class="ground" d={DINO.groundPath} />
	<path class="skin line" d={DINO.tailPath} />
	<path class="shade" d={DINO.tailShade} />
	<g transform="translate(0 {DINO.feetLift})">
		{#each FEET as foot (foot.side)}
			{@render modelled(`foot-${foot.side}`, foot.fill, 'skin', foot.shade)}
			<path class="open line" d={foot.fill} />
			<path class="open fine" d={foot.toes} />
			<path class="claw fine" d={foot.claws} />
		{/each}
	</g>
	<path class="underlay" d={BODY} />
	<g class="dino-rest-arms">
		{#each SIDES as side (side)}
			{@render babyArm(REST_ARMS[side], `rest-${side}`)}
		{/each}
	</g>
	<g class="dino-arm">
		{#each SIDES as side (side)}
			{@render babyArm(RAISED_ARMS[side], `up-${side}`)}
		{/each}
	</g>
	{@render modelled('body', BODY, 'skin', BODY_SHADE, [BODY_LIGHT])}
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
				<path class="open fine" d={plate.vein} />
			</g>
		{/each}
		{@render modelled('head', HEAD, 'skin', HEAD_SHADE, HEAD_LIGHTS)}
		<path class="open line" d={HEAD} />
		<path class="open fine" d={SNOUT_RIDGE} />
		{#each SIDES as side (side)}
			{@const eye = EYES[side]}
			<path class="baby-cheek" d={CHEEKS[side]} />
			<clipPath id={ref(`eye-${side}`)}><path d={eye.white} /></clipPath>
			<path class="white" d={eye.white} />
			<g clip-path={url(`eye-${side}`)}>
				<path class="plate" d={eye.iris} />
				<path class="ink" d={eye.pupil} />
				{#each eye.glints as glint (glint)}
					<path class="white" d={glint} />
				{/each}
				<path class="shade" d={eye.lid} />
			</g>
			<path class="open line" d={eye.white} />
			<path class="ink fine" d={BROWS[side]} />
			<path class="ink" d={NOSTRILS[side]} />
		{/each}
		<clipPath id={ref('mouth')}><path d={MOUTH} /></clipPath>
		<path class="ink" d={MOUTH} />
		<g clip-path={url('mouth')}><path class="tongue" d={TONGUE} /></g>
		<path class="open line" d={MOUTH} />
	</g>
{/snippet}

{#snippet eyeOf(eye: { white: string; iris: string; pupil: string; glint: string })}
	<path class="white line" d={eye.white} />
	<path class="iris" d={eye.iris} />
	<path class="ink" d={eye.pupil} />
	<path class="white" d={eye.glint} />
{/snippet}

<svg
	class="kitchen"
	viewBox="0 0 {SCENE.width} {SCENE.height}"
	focusable="false"
	aria-hidden="true"
	data-still={view.reducedMotion || undefined}
	data-scene={sceneId}
>
	<path class="tile" d={KITCHEN.tilesPath} />

	<g class="window">
		<path class="frame line" d={KITCHEN.window.framePath} />
		<path class="sky fine" d={KITCHEN.window.panePath} />
		<path class="sun" d={KITCHEN.window.sun} />
		<path class="cloud" d={KITCHEN.window.cloud} />
		<path class="light" d={KITCHEN.window.gleams} />
		<path class="frame fine" d={KITCHEN.window.barsPath} />
		<path class="wood-light line" d={KITCHEN.window.sillPath} />
		{#each KITCHEN.plant.leaves as leaf (leaf)}
			<path class="leaf line" d={leaf} />
		{/each}
		<path class="crease" d={KITCHEN.plant.veins} />
		<path class="plant-pot line" d={KITCHEN.plant.potPath} />
		<path class="plant-pot line" d={KITCHEN.plant.rimPath} />
	</g>

	{#each KITCHEN.bracketPaths as bracket (bracket)}
		<path class="wood line" d={bracket} />
	{/each}
	<path class="wood line" d={KITCHEN.shelfPath} />
	<path class="wood-light" d={KITCHEN.shelfTopPath} />
	<path class="crease" d={KITCHEN.shelfGrain} />
	<path class="open fine" d={KITCHEN.shelfEdge} />

	<path class="wood-light line" d={KITCHEN.counterTopPath} />
	<path class="wood line" d={KITCHEN.counterFrontPath} />
	<path class="crease" d={KITCHEN.counterGrain} />
	<path class="knot" d={KITCHEN.counterKnots} />
	<path class="lip" d={KITCHEN.counterLip} />

	<Pot layer="back" />

	{#if sceneId === 'wave'}
		<g class="olas">
			{#each OLA_HUMPS as wave, index (wave.hump)}
				<g class="ola">
					{@render modelled(`ola-${index}`, wave.hump, 'soup-fill', wave.shade)}
					<path class="open line" d={wave.hump} />
					<path class="foam fine" d={wave.foam} />
				</g>
			{/each}
		</g>
	{/if}

	{#if sceneId === 'slide'}
		<g class="ladle">
			<path class="metal-light line" d={LADLE.bowlPath} />
			<path class="metal-dark" d={LADLE.bowlInside} />
			{@render modelled('ladle', LADLE.handlePath, 'metal-light', LADLE.handleShade)}
			<path class="open line" d={LADLE.handlePath} />
			<path class="open line" d={LADLE.hookPath} />
			<path class="gleam" d={LADLE.gleam} />
		</g>
	{/if}

	{#if place === 'pot'}
		<g class="bubbles" data-reward data-reward-variant="0">
			{#each POT.bubbles as bubble (bubble.x)}
				<circle class="bubble-dot" cx={bubble.x} cy={bubble.y} r={bubble.radius} />
				<circle
					class="white"
					cx={bubble.x - bubble.radius * 0.35}
					cy={bubble.y - bubble.radius * 0.35}
					r={bubble.radius * 0.3}
				/>
			{/each}
		</g>
		<g transform={placeTransform(KITCHEN.potIngredient)}>
			{#if sceneId === 'diving-board'}
				<g class="diving-board">
					<path class="metal-light line" d={DIVING_BOARD.postPath} />
					<path class="gleam" d={DIVING_BOARD.postGleam} />
					<path class="metal line" d={DIVING_BOARD.footPath} />
					<path class="metal line" d={DIVING_BOARD.rollerPath} />
					<path class="cloth line" d={DIVING_BOARD.plankPath} />
					<path class="stripe" d={DIVING_BOARD.stripePath} />
					<path class="gleam" d={DIVING_BOARD.gleam} />
				</g>
			{/if}
			{#if sceneId === undefined}
				<g data-reward data-reward-variant={entrance}>
					<IngredientShape variant={view.groupIndex} {stage} />
				</g>
			{:else}
				<g class="diver">
					{#if sceneId === 'balloon'}
						<path class="cord balloon-string" d={BALLOON.stringPath} />
					{/if}
					<IngredientShape variant={view.groupIndex} {stage} />
					{#if sceneId === 'parachute'}
						<g class="napkin">
							{#each NAPKIN.cordPaths as cord (cord)}
								<path class="cord" d={cord} />
							{/each}
							<clipPath id={ref('napkin')}><path d={NAPKIN.canopyPath} /></clipPath>
							<path class="cloth" d={NAPKIN.canopyPath} />
							<g clip-path={url('napkin')}>
								<path class="check" d={NAPKIN.checksPath} />
								<path class="shade" fill-rule="evenodd" d={NAPKIN.canopyShade} />
								<path class="light" d={NAPKIN.canopyLight} />
								{#each NAPKIN.foldPaths as fold (fold)}
									<path class="crease" d={fold} />
								{/each}
							</g>
							<path class="open line" d={NAPKIN.canopyPath} />
						</g>
					{:else if sceneId === 'balloon'}
						<g class="balloon">
							<path class="balloon-fill line" d={BALLOON.knotPath} />
							{@render modelled('balloon', BALLOON.bodyPath, 'balloon-fill', BALLOON.bodyShade, [
								BALLOON.shinePath,
								BALLOON.glint
							])}
							<path class="open line" d={BALLOON.bodyPath} />
						</g>
					{:else if sceneId === 'float'}
						<g class="arm">
							<path class="hose" d={WAVING_ARM.armPath} />
							<path class="cloth line" d={WAVING_ARM.cuffPath} />
							<path class="cloth line" d={WAVING_ARM.glovePath} />
							<path class="open fine" d={WAVING_ARM.fingers} />
						</g>
					{/if}
				</g>
			{/if}
		</g>
	{/if}

	<Pot layer="surface" />

	<g class="pot-body">
		<Pot layer="front" />
	</g>

	{#if sceneId === 'somersault' || sceneId === 'diving-board'}
		{#each SPLASH.angles as angle (angle)}
			<g transform="rotate({angle} {SPLASH.center.x} {SPLASH.center.y})">
				<g class="drop">
					<path class="soup-fill line" d={SPLASH.dropPath} />
					<path class="white" d={SPLASH.glintPath} />
				</g>
			</g>
		{/each}
	{/if}

	{#if sceneId === 'burp'}
		<g class="burp">
			<circle class="burp-fill line" cx={BURP_BUBBLE.cx} cy={BURP_BUBBLE.cy} r={BURP_BUBBLE.r} />
			<path class="white" d={BURP_BUBBLE.shinePath} />
			<path class="light" d={BURP_BUBBLE.glint} />
		</g>
	{/if}

	{#if sceneId === 'catapult'}
		<g class="catapult">
			<path class="wood line" d={CATAPULT.pivotPath} />
			<g class="spoon">
				{@render modelled('spoon-handle', CATAPULT.handlePath, 'wood-light', CATAPULT.handleShade)}
				<path class="open line" d={CATAPULT.handlePath} />
				{@render modelled('spoon-bowl', CATAPULT.bowlPath, 'wood-light', CATAPULT.bowlShade)}
				<path class="open line" d={CATAPULT.bowlPath} />
				<path class="wood line" d={CATAPULT.hollowPath} />
				<path class="gleam" d={CATAPULT.gleam} />
			</g>
		</g>
	{/if}

	{#if sceneId === 'hungry-lid'}
		<g class="lid">
			<path class="white line" d={LID.teethPath} />
			<path class="metal-light line" d={LID.knobStem} />
			{@render modelled('knob', LID.knobPath, 'wood', LID.knobShade)}
			<path class="open line" d={LID.knobPath} />
			{@render modelled('dome', LID.domePath, 'metal', LID.domeShade, [LID.domeLight])}
			<path class="open line" d={LID.domePath} />
			<path class="metal-light line" d={LID.rimPath} />
			{#each LID.eyes as eye (eye.white)}
				{@render eyeOf(eye)}
			{/each}
			{#each LID.brows as brow (brow)}
				<path class="ink line" d={brow} />
			{/each}
		</g>
	{/if}

	{#if sceneId === 'dino-snatch'}
		<g transform="translate({DINO.rest.x} {DINO.rest.y})">
			<g class="dino">
				<g transform="scale({DINO.scale}) translate({DINO.origin.x} {DINO.origin.y})">
					{@render baby()}
				</g>
			</g>
		</g>
	{/if}

	{#if sceneId === 'rocket-delivery'}
		<g transform="translate({DELIVERY_ROCKET.rest.x} {DELIVERY_ROCKET.rest.y})">
			<g class="delivery-rocket">
				<path class="flame-fill" d={DELIVERY_ROCKET.flameOuterPath} />
				<path class="flame-core" d={DELIVERY_ROCKET.flameInnerPath} />
				<path class="metal line" d={DELIVERY_ROCKET.nozzlePath} />
				{#each DELIVERY_ROCKET.finPaths as fin (fin)}
					<path class="trim line" d={fin} />
				{/each}
				<path class="metal-light line" d={DELIVERY_ROCKET.rodPath} />
				{#each DELIVERY_ROCKET.clawPaths as claw (claw)}
					<path class="metal line" d={claw} />
				{/each}
				<path class="metal-light line" d={DELIVERY_ROCKET.hubPath} />
				<clipPath id={ref('rocket')}><path d={DELIVERY_ROCKET.bodyPath} /></clipPath>
				<path class="rocket-fill" d={DELIVERY_ROCKET.bodyPath} />
				<g clip-path={url('rocket')}>
					<path class="trim" d={DELIVERY_ROCKET.nosePath} />
					<path class="trim" d={DELIVERY_ROCKET.bandPath} />
					<path class="shade" fill-rule="evenodd" d={DELIVERY_ROCKET.bodyShade} />
					<path class="light" d={DELIVERY_ROCKET.bodyLight} />
				</g>
				<path class="open line" d={DELIVERY_ROCKET.bodyPath} />
				<path class="metal-light line" d={DELIVERY_ROCKET.windowFrame} />
				<path class="glass-fill line" d={DELIVERY_ROCKET.window} />
				<path class="white" d={DELIVERY_ROCKET.windowGleam} />
			</g>
		</g>
	{/if}

	{#if sceneId === 'giraffe-guest'}
		<g transform={GIRAFFE.transform}>
			<g class="neck">
				<path class="mane line" d={GIRAFFE.manePath} />
				<clipPath id={ref('neck')}><path d={GIRAFFE.neckPath} /></clipPath>
				<path class="giraffe-fill" d={GIRAFFE.neckPath} />
				<g clip-path={url('neck')}>
					{#each GIRAFFE.spots as spot (spot)}
						<path class="spot" d={spot} />
					{/each}
					<path class="shade" fill-rule="evenodd" d={GIRAFFE.neckShade} />
					<path class="light" d={GIRAFFE.neckLight} />
				</g>
				<path class="open line" d={GIRAFFE.neckPath} />
			</g>
			<g class="head">
				<g transform={GIRAFFE.headTransform}>
					{#each GIRAFFE.horns as horn (horn)}
						<path class="giraffe-fill line" d={horn} />
					{/each}
					{#each GIRAFFE.hornTips as tip (tip)}
						<path class="mane line" d={tip} />
					{/each}
					<path class="giraffe-fill line" d={GIRAFFE.earPath} />
					<path class="ear" d={GIRAFFE.earInner} />
					<clipPath id={ref('head')}><path d={GIRAFFE.headPath} /></clipPath>
					<path class="giraffe-fill" d={GIRAFFE.headPath} />
					<g clip-path={url('head')}>
						<path class="snout" d={GIRAFFE.snoutPath} />
						<path class="shade" d={GIRAFFE.headShade} />
						<path class="light" d={GIRAFFE.headLight} />
					</g>
					<path class="open line" d={GIRAFFE.headPath} />
					<path class="open fine" d={GIRAFFE.snoutPath} />
					<path class="cheek" d={GIRAFFE.cheek} />
					{@render eyeOf(GIRAFFE.eye)}
					<path class="open line" d={GIRAFFE.lidPath} />
					<path class="open fine" d={GIRAFFE.lashes} />
					<path class="ink" d={GIRAFFE.nostril} />
					<path class="open line" d={GIRAFFE.mouthPath} />
				</g>
				<g class="held" transform={GIRAFFE.heldTransform}>
					<IngredientShape variant={view.groupIndex} {stage} />
				</g>
			</g>
		</g>
	{/if}

	{#if sceneId === 'steam-shape'}
		<g class="steam-shape">
			{#each steamShape as wisp (wisp)}
				<path class="steam wisp" d={wisp} pathLength="1" />
				<path class="steam-core wisp" d={wisp} pathLength="1" />
			{/each}
		</g>
	{/if}

	{#if place === 'board'}
		<path class="ground" d={KITCHEN.boardShadow} />
		<g transform={placeTransform(KITCHEN.boardIngredient)}>
			<IngredientShape variant={view.groupIndex} {stage} />
		</g>
	{/if}

	{#if ready}
		<g data-reward data-reward-variant="0">
			{#each POT.steamPaths as steam (steam)}
				<path class="steam" d={steam} />
				<path class="steam-core" d={steam} />
			{/each}
		</g>
	{/if}
</svg>

<style>
	.kitchen {
		display: block;
		inline-size: 100%;
		max-inline-size: var(--dd-size-scene-max);
		block-size: auto;
		overflow: hidden;
		border-radius: var(--dd-radius-lg);
		background-color: var(--dd-color-surface-sunken);
	}

	.line,
	.fine,
	.underlay,
	.crease,
	.lip,
	.gleam,
	.cord,
	.hose,
	.steam,
	.steam-core {
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.line {
		stroke: var(--dd-color-recipe-line);
		stroke-width: var(--dd-border-width-thick);
	}

	.fine {
		stroke: var(--dd-color-recipe-line);
		stroke-width: var(--dd-border-width-thin);
	}

	/* Under two joined forms: only its outer half shows, one outline around both. */
	.underlay {
		fill: var(--dd-color-recipe-line);
		stroke: var(--dd-color-recipe-line);
		stroke-width: calc(var(--dd-border-width-thick) * 2);
	}

	.open,
	.crease,
	.lip,
	.gleam,
	.cord,
	.hose,
	.steam,
	.steam-core {
		fill: transparent;
	}

	.crease {
		stroke: var(--dd-color-recipe-line);
		stroke-width: var(--dd-border-width-thin);
		stroke-opacity: var(--dd-opacity-recipe-crease);
	}

	.lip,
	.gleam {
		stroke: var(--dd-color-recipe-light);
		stroke-width: var(--dd-border-width-thick);
		stroke-opacity: var(--dd-opacity-recipe-light);
	}

	.shade {
		fill: var(--dd-color-recipe-shade);
		fill-opacity: var(--dd-opacity-recipe-shade);
	}

	.light {
		fill: var(--dd-color-recipe-light);
		fill-opacity: var(--dd-opacity-recipe-light);
	}

	.ground {
		fill: var(--dd-color-recipe-shade);
		fill-opacity: var(--dd-opacity-recipe-shadow);
	}

	.tile {
		fill: var(--dd-color-recipe-tile);
		fill-opacity: var(--dd-opacity-recipe-tile);
	}

	.frame,
	.cloth,
	.white,
	.rocket-fill {
		fill: var(--dd-color-recipe-cloth);
	}

	.sky {
		fill: var(--dd-color-recipe-sky);
	}

	.sun {
		fill: var(--dd-color-recipe-sun);
	}

	.cloud {
		fill: var(--dd-color-recipe-cloud);
	}

	.leaf {
		fill: var(--dd-color-recipe-leaf);
	}

	.plant-pot {
		fill: var(--dd-color-recipe-plant-pot);
	}

	.wood {
		fill: var(--dd-color-recipe-wood);
	}

	.wood-light {
		fill: var(--dd-color-recipe-wood-light);
	}

	.knot {
		fill: var(--dd-color-recipe-wood-dark);
		fill-opacity: var(--dd-opacity-recipe-crease);
	}

	.metal {
		fill: var(--dd-color-recipe-pot);
	}

	.metal-light {
		fill: var(--dd-color-recipe-pot-light);
	}

	.metal-dark {
		fill: var(--dd-color-recipe-pot-inside);
	}

	.soup-fill {
		fill: var(--dd-color-recipe-soup);
	}

	.foam {
		fill: var(--dd-color-recipe-soup-light);
	}

	.bubble-dot {
		fill: var(--dd-color-recipe-soup-light);
		stroke: var(--dd-color-recipe-line);
		stroke-width: var(--dd-border-width-thick);
		vector-effect: non-scaling-stroke;
	}

	.burp-fill {
		fill: var(--dd-color-recipe-soup-light);
		fill-opacity: var(--dd-opacity-recipe-glass);
	}

	.stripe {
		fill: var(--dd-color-recipe-stripe);
	}

	.check,
	.trim {
		fill: var(--dd-color-recipe-check);
	}

	.balloon-fill {
		fill: var(--dd-color-recipe-balloon);
	}

	.glass-fill {
		fill: var(--dd-color-recipe-rocket-glass);
	}

	.flame-fill {
		fill: var(--dd-color-recipe-flame);
	}

	.flame-core {
		fill: var(--dd-color-recipe-flame-core);
	}

	.giraffe-fill {
		fill: var(--dd-color-recipe-giraffe);
	}

	.spot {
		fill: var(--dd-color-recipe-giraffe-spot);
	}

	.mane {
		fill: var(--dd-color-recipe-giraffe-mane);
	}

	.snout {
		fill: var(--dd-color-recipe-snout);
	}

	.ear {
		fill: var(--dd-color-recipe-ear);
	}

	.cheek {
		fill: var(--dd-color-recipe-cheek);
	}

	.iris {
		fill: var(--dd-color-recipe-iris);
	}

	.ink {
		fill: var(--dd-color-recipe-line);
	}

	.cord {
		stroke: var(--dd-color-recipe-line);
		stroke-width: var(--dd-border-width-thin);
	}

	.hose {
		stroke: var(--dd-color-recipe-line);
		stroke-width: var(--dd-border-width-target);
	}

	.steam {
		stroke: var(--dd-color-recipe-steam);
		stroke-width: calc(var(--dd-border-width-target) * 2);
		stroke-opacity: var(--dd-opacity-recipe-steam);
	}

	.steam-core {
		stroke: var(--dd-color-recipe-light);
		stroke-width: var(--dd-border-width-thick);
	}

	/* The baby dino of the visit, in the colors of the first baby of the eggs. */
	.skin {
		fill: var(--dd-color-baby-a);
	}

	.belly {
		fill: var(--dd-color-baby-a-belly);
	}

	.plate {
		fill: var(--dd-color-baby-a-plate);
	}

	.baby-cheek {
		fill: var(--dd-color-baby-a-cheek);
	}

	.claw {
		fill: var(--dd-color-recipe-eye);
	}

	.tongue {
		fill: var(--dd-color-companion-tongue);
	}

	/* Its raised arms only show while it jumps. */
	.dino-arm {
		opacity: 0;
	}

	/* pathLength="1": the dash covers the whole line, so its offset draws it bit by bit. */
	.wisp {
		vector-effect: none;
		stroke-dasharray: 1;
	}

	/* Surprise scenes (ADR-032): a moment after the last key, long enough to be seen. */
	[data-scene] .diver,
	[data-scene] .diving-board,
	[data-scene] .drop,
	[data-scene] .burp,
	[data-scene] .ladle,
	[data-scene] .catapult,
	[data-scene] .spoon,
	[data-scene] .napkin,
	[data-scene] .balloon,
	[data-scene] .balloon-string,
	[data-scene] .arm,
	[data-scene] .lid,
	[data-scene] .dino,
	[data-scene] .dino-arm,
	[data-scene] .dino-rest-arms,
	[data-scene] .delivery-rocket,
	[data-scene] .neck,
	[data-scene] .head,
	[data-scene] .held,
	[data-scene] .ola,
	[data-scene] .steam-shape,
	[data-scene] .wisp,
	[data-scene] .pot-body {
		transform-box: fill-box;
		transform-origin: 50% 50%;
		animation-duration: var(--dd-duration-scene);
		animation-delay: var(--dd-duration-reward-delay);
		animation-timing-function: var(--dd-easing-standard);
		animation-fill-mode: both;
	}

	[data-scene] .pot-body {
		transform-origin: 50% 100%;
	}

	[data-scene='somersault'] .diver {
		animation-name: somersault;
	}

	[data-scene='somersault'] .drop,
	[data-scene='diving-board'] .drop {
		animation-name: splash;
	}

	[data-scene='rim-bounce'] .diver {
		animation-name: rim-bounce;
	}

	[data-scene='diving-board'] .diver {
		animation-name: dive;
	}

	[data-scene='diving-board'] .diving-board {
		animation-name: board-shows;
	}

	[data-scene='burp'] .diver {
		animation-name: drop-in;
	}

	[data-scene='burp'] .burp {
		animation-name: burp;
	}

	[data-scene='burp'] .pot-body {
		animation-name: squash;
	}

	[data-scene='slide'] .diver {
		animation-name: slide;
	}

	[data-scene='slide'] .ladle,
	[data-scene='catapult'] .catapult {
		animation-name: prop-shows;
	}

	[data-scene='catapult'] .diver {
		animation-name: thrown;
	}

	[data-scene='catapult'] .spoon {
		transform-origin: 54% 64%;
		animation-name: spoon-throws;
	}

	[data-scene='parachute'] .diver,
	[data-scene='balloon'] .diver {
		transform-origin: 50% 0%;
	}

	[data-scene='parachute'] .diver {
		animation-name: glide-down;
	}

	[data-scene='parachute'] .napkin {
		transform-origin: 50% 100%;
		animation-name: napkin-folds;
	}

	[data-scene='balloon'] .diver {
		animation-name: hang-down;
	}

	[data-scene='balloon'] .balloon {
		transform-origin: 50% 100%;
		animation-name: deflate;
	}

	[data-scene='balloon'] .balloon-string {
		animation-name: string-goes;
	}

	[data-scene='hungry-lid'] .diver {
		animation-name: jump-in;
	}

	[data-scene='hungry-lid'] .lid {
		transform-origin: 100% 100%;
		animation-name: munch;
	}

	[data-scene='float'] .diver {
		animation-name: float;
	}

	[data-scene='float'] .arm {
		transform-origin: 0% 100%;
		animation-name: wave-hello;
	}

	[data-scene='dino-snatch'] .diver {
		animation-name: snatched;
	}

	[data-scene='dino-snatch'] .dino {
		transform-origin: 50% 100%;
		animation-name: dino-leaps;
	}

	[data-scene='dino-snatch'] .dino-arm {
		animation-name: arms-up;
	}

	[data-scene='dino-snatch'] .dino-rest-arms {
		animation-name: arms-down;
	}

	[data-scene='rocket-delivery'] .diver {
		animation-name: delivered;
	}

	[data-scene='rocket-delivery'] .delivery-rocket {
		animation-name: rocket-passes;
	}

	[data-scene='giraffe-guest'] .diver {
		animation-name: fed;
	}

	[data-scene='giraffe-guest'] .neck {
		transform-origin: 100% 50%;
		animation-name: neck-grows;
	}

	[data-scene='giraffe-guest'] .head {
		animation-name: head-slides;
	}

	[data-scene='giraffe-guest'] .held {
		animation-name: held-lets-go;
	}

	[data-scene='steam-shape'] .diver {
		animation-name: drop-in;
	}

	[data-scene='steam-shape'] .steam-shape {
		animation-name: steam-rises;
	}

	[data-scene='steam-shape'] .wisp {
		animation-name: steam-draws;
	}

	[data-scene='wave'] .diver {
		animation-name: ride;
	}

	[data-scene='wave'] .ola {
		transform-origin: 50% 100%;
		animation-name: ola;
	}

	[data-scene='wave'] .ola:nth-child(2) {
		animation-delay: calc(var(--dd-duration-reward-delay) + var(--dd-duration-scene) * 0.1);
	}

	[data-scene='wave'] .ola:nth-child(3) {
		animation-delay: calc(var(--dd-duration-reward-delay) + var(--dd-duration-scene) * 0.2);
	}

	[data-scene='wave'] .ola:nth-child(4) {
		animation-delay: calc(var(--dd-duration-reward-delay) + var(--dd-duration-scene) * 0.3);
	}

	[data-scene='wave'] .ola:nth-child(5) {
		animation-delay: calc(var(--dd-duration-reward-delay) + var(--dd-duration-scene) * 0.4);
	}

	@keyframes somersault {
		0% {
			opacity: 0;
			translate: 0 calc(var(--dd-space-3xl) * -1.11);
			rotate: 0deg;
		}

		10% {
			opacity: 100%;
		}

		55% {
			translate: 0 calc(var(--dd-space-3xl) * -1.26);
			rotate: 360deg;
		}

		85%,
		100% {
			opacity: 100%;
			translate: 0 0;
			rotate: 360deg;
		}
	}

	@keyframes splash {
		0%,
		82% {
			opacity: 0;
			translate: 0 0;
		}

		86% {
			opacity: 100%;
		}

		100% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * 0.6) 0;
		}
	}

	@keyframes rim-bounce {
		0% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * -2.6) calc(var(--dd-space-3xl) * -1.21);
			rotate: 0deg;
		}

		10% {
			opacity: 100%;
		}

		35% {
			translate: calc(var(--dd-space-3xl) * -1.6) calc(var(--dd-space-3xl) * -0.41);
			rotate: 0deg;
		}

		55% {
			translate: calc(var(--dd-space-3xl) * -0.8) calc(var(--dd-space-3xl) * -1.26);
			rotate: 200deg;
		}

		85%,
		100% {
			opacity: 100%;
			translate: 0 0;
			rotate: 360deg;
		}
	}

	@keyframes dive {
		0% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * -3.3) calc(var(--dd-space-3xl) * -1.21);
			rotate: 0deg;
		}

		8% {
			opacity: 100%;
		}

		28% {
			translate: calc(var(--dd-space-3xl) * -2.4) calc(var(--dd-space-3xl) * -1.21);
		}

		36% {
			translate: calc(var(--dd-space-3xl) * -2.4) calc(var(--dd-space-3xl) * -1.43);
		}

		44% {
			translate: calc(var(--dd-space-3xl) * -2.4) calc(var(--dd-space-3xl) * -1.21);
		}

		56% {
			translate: calc(var(--dd-space-3xl) * -1.2) calc(var(--dd-space-3xl) * -1.31);
			rotate: 90deg;
		}

		85%,
		100% {
			opacity: 100%;
			translate: 0 0;
			rotate: 180deg;
		}
	}

	@keyframes board-shows {
		0%,
		70% {
			opacity: 100%;
		}

		100% {
			opacity: 0;
		}
	}

	@keyframes drop-in {
		0% {
			opacity: 0;
			translate: 0 calc(var(--dd-space-3xl) * -1.21);
		}

		10% {
			opacity: 100%;
		}

		35%,
		100% {
			opacity: 100%;
			translate: 0 0;
		}
	}

	@keyframes burp {
		0%,
		40% {
			opacity: 0;
			scale: 0.1;
		}

		50% {
			opacity: 100%;
			scale: 0.4;
		}

		80% {
			opacity: 100%;
			scale: 1.2;
		}

		90%,
		100% {
			opacity: 0;
			scale: 1.5;
		}
	}

	@keyframes squash {
		0%,
		55%,
		100% {
			scale: 1 1;
		}

		75% {
			scale: 1.04 0.94;
		}
	}

	@keyframes prop-shows {
		0% {
			opacity: 0;
		}

		8%,
		72% {
			opacity: 100%;
		}

		100% {
			opacity: 0;
		}
	}

	@keyframes slide {
		0% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * 3.63) calc(var(--dd-space-3xl) * -2.26);
			rotate: -23deg;
		}

		10% {
			opacity: 100%;
			translate: calc(var(--dd-space-3xl) * 3.63) calc(var(--dd-space-3xl) * -2.26);
		}

		20% {
			translate: calc(var(--dd-space-3xl) * 3.32) calc(var(--dd-space-3xl) * -2.12);
			rotate: -23deg;
		}

		45% {
			translate: calc(var(--dd-space-3xl) * 1.37) calc(var(--dd-space-3xl) * -1.28);
			rotate: -23deg;
		}

		60% {
			translate: calc(var(--dd-space-3xl) * 0.59) calc(var(--dd-space-3xl) * -1.57);
			rotate: -200deg;
		}

		85%,
		100% {
			opacity: 100%;
			translate: 0 0;
			rotate: -360deg;
		}
	}

	@keyframes thrown {
		0% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * -4.5) calc(var(--dd-space-3xl) * 0.44);
			rotate: 0deg;
		}

		10%,
		30% {
			opacity: 100%;
			translate: calc(var(--dd-space-3xl) * -4.5) calc(var(--dd-space-3xl) * 0.44);
			rotate: 0deg;
		}

		36% {
			translate: calc(var(--dd-space-3xl) * -4) calc(var(--dd-space-3xl) * -0.71);
			rotate: 90deg;
		}

		46% {
			translate: calc(var(--dd-space-3xl) * -3.1) calc(var(--dd-space-3xl) * -1.11);
			rotate: 270deg;
		}

		58% {
			translate: calc(var(--dd-space-3xl) * -1.9) calc(var(--dd-space-3xl) * -1.26);
			rotate: 450deg;
		}

		70% {
			translate: calc(var(--dd-space-3xl) * -0.9) calc(var(--dd-space-3xl) * -1.01);
			rotate: 600deg;
		}

		85%,
		100% {
			opacity: 100%;
			translate: 0 0;
			rotate: 720deg;
		}
	}

	@keyframes spoon-throws {
		0%,
		28% {
			rotate: -8deg;
		}

		34% {
			rotate: 26deg;
		}

		42% {
			rotate: 16deg;
		}

		52%,
		100% {
			rotate: 0deg;
		}
	}

	@keyframes glide-down {
		0% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * 4.6) calc(var(--dd-space-3xl) * -1.41);
			rotate: 12deg;
		}

		10% {
			opacity: 100%;
		}

		30% {
			translate: calc(var(--dd-space-3xl) * 3.4) calc(var(--dd-space-3xl) * -0.91);
			rotate: -10deg;
		}

		50% {
			translate: calc(var(--dd-space-3xl) * 2) calc(var(--dd-space-3xl) * -0.51);
			rotate: 8deg;
		}

		66% {
			translate: calc(var(--dd-space-3xl) * 0.9) calc(var(--dd-space-3xl) * -0.16);
			rotate: -5deg;
		}

		82%,
		100% {
			opacity: 100%;
			translate: 0 0;
			rotate: 0deg;
		}
	}

	@keyframes napkin-folds {
		0%,
		80% {
			opacity: 100%;
			scale: 1 1;
		}

		100% {
			opacity: 0;
			scale: 1 0.3;
		}
	}

	@keyframes hang-down {
		0% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * 4.4) calc(var(--dd-space-3xl) * -0.76);
			rotate: -6deg;
		}

		10% {
			opacity: 100%;
		}

		25% {
			translate: calc(var(--dd-space-3xl) * 3) calc(var(--dd-space-3xl) * -0.56);
			rotate: 6deg;
		}

		40% {
			translate: calc(var(--dd-space-3xl) * 1.5) calc(var(--dd-space-3xl) * -0.53);
			rotate: -4deg;
		}

		52% {
			translate: 0 calc(var(--dd-space-3xl) * -0.51);
			rotate: 0deg;
		}

		62% {
			translate: 0 calc(var(--dd-space-3xl) * -0.39);
			rotate: 3deg;
		}

		72% {
			translate: 0 calc(var(--dd-space-3xl) * -0.23);
			rotate: -3deg;
		}

		82% {
			translate: 0 calc(var(--dd-space-3xl) * -0.01);
			rotate: 2deg;
		}

		92%,
		100% {
			opacity: 100%;
			translate: 0 0;
			rotate: 0deg;
		}
	}

	@keyframes deflate {
		0%,
		52% {
			opacity: 100%;
			scale: 1;
			rotate: 0deg;
		}

		62% {
			scale: 0.85;
			rotate: 10deg;
		}

		72% {
			scale: 0.7;
			rotate: -10deg;
		}

		82% {
			scale: 0.55;
			rotate: 8deg;
		}

		92% {
			opacity: 100%;
			scale: 0.4;
			rotate: 0deg;
		}

		100% {
			opacity: 0;
			scale: 0.3;
			rotate: 0deg;
		}
	}

	@keyframes string-goes {
		0%,
		88% {
			opacity: 100%;
		}

		100% {
			opacity: 0;
		}
	}

	@keyframes jump-in {
		0% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * -3.5) calc(var(--dd-space-3xl) * 0.39);
			rotate: 0deg;
		}

		10%,
		18% {
			opacity: 100%;
			translate: calc(var(--dd-space-3xl) * -3.5) calc(var(--dd-space-3xl) * 0.39);
			rotate: 0deg;
		}

		30% {
			translate: calc(var(--dd-space-3xl) * -1.8) calc(var(--dd-space-3xl) * -1.21);
			rotate: -20deg;
		}

		42%,
		100% {
			opacity: 100%;
			translate: 0 0;
			rotate: 0deg;
		}
	}

	@keyframes munch {
		0% {
			opacity: 0;
			translate: 0 0;
			rotate: 18deg;
		}

		10%,
		40% {
			opacity: 100%;
			rotate: 18deg;
		}

		48%,
		62%,
		76% {
			rotate: 0deg;
		}

		56%,
		70% {
			rotate: 10deg;
		}

		86% {
			opacity: 100%;
			translate: 0 0;
			rotate: 0deg;
		}

		100% {
			opacity: 0;
			translate: 0 calc(var(--dd-space-3xl) * -0.5);
			rotate: 0deg;
		}
	}

	@keyframes float {
		0% {
			opacity: 0;
			translate: 0 calc(var(--dd-space-3xl) * -1.11);
			rotate: 0deg;
		}

		10% {
			opacity: 100%;
		}

		26% {
			translate: 0 calc(var(--dd-space-3xl) * -0.26);
			rotate: -90deg;
		}

		34%,
		50% {
			translate: 0 calc(var(--dd-space-3xl) * -0.19);
			rotate: -86deg;
		}

		42%,
		58% {
			translate: 0 calc(var(--dd-space-3xl) * -0.29);
			rotate: -93deg;
		}

		68% {
			translate: 0 calc(var(--dd-space-3xl) * -0.23);
			rotate: -90deg;
		}

		90% {
			translate: 0 calc(var(--dd-space-3xl) * 0.31);
			rotate: -30deg;
		}

		100% {
			opacity: 100%;
			translate: 0 0;
			rotate: 0deg;
		}
	}

	@keyframes wave-hello {
		0%,
		28% {
			opacity: 0;
			rotate: 0deg;
		}

		32% {
			opacity: 100%;
			rotate: 0deg;
		}

		38%,
		50% {
			rotate: -35deg;
		}

		44%,
		56% {
			rotate: 15deg;
		}

		62% {
			opacity: 100%;
			rotate: 0deg;
		}

		68%,
		100% {
			opacity: 0;
			rotate: 0deg;
		}
	}

	@keyframes steam-rises {
		0%,
		25% {
			opacity: 0;
			translate: 0 calc(var(--dd-space-3xl) * 0.5);
			scale: 0.6;
		}

		50% {
			opacity: 100%;
			translate: 0 0;
			scale: 1;
		}

		80% {
			opacity: 100%;
			translate: 0 calc(var(--dd-space-3xl) * -0.1);
			scale: 1;
		}

		100% {
			opacity: 0;
			translate: 0 calc(var(--dd-space-3xl) * -0.4);
			scale: 1.1;
		}
	}

	@keyframes steam-draws {
		0%,
		25% {
			stroke-dashoffset: 1;
		}

		60%,
		100% {
			stroke-dashoffset: 0;
		}
	}

	@keyframes ride {
		0% {
			opacity: 0;
			translate: 0 calc(var(--dd-space-3xl) * -1.11);
			rotate: 0deg;
		}

		10% {
			opacity: 100%;
		}

		32%,
		52% {
			translate: 0 0;
			rotate: 0deg;
		}

		60% {
			translate: 0 calc(var(--dd-space-3xl) * -0.26);
			rotate: -12deg;
		}

		68% {
			translate: 0 0;
			rotate: 6deg;
		}

		76%,
		100% {
			opacity: 100%;
			translate: 0 0;
			rotate: 0deg;
		}
	}

	@keyframes snatched {
		0% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * 3.13) calc(var(--dd-space-3xl) * -1.1);
			rotate: 0deg;
		}

		6% {
			opacity: 100%;
		}

		20% {
			translate: calc(var(--dd-space-3xl) * -0.2) calc(var(--dd-space-3xl) * -1.2);
			rotate: -120deg;
		}

		32% {
			translate: calc(var(--dd-space-3xl) * -2.97) calc(var(--dd-space-3xl) * -1.24);
			rotate: -360deg;
		}

		42% {
			translate: calc(var(--dd-space-3xl) * -2.85) calc(var(--dd-space-3xl) * -1.16);
			rotate: -360deg;
		}

		50% {
			translate: calc(var(--dd-space-3xl) * -1.56) calc(var(--dd-space-3xl) * -1.1);
			rotate: -180deg;
		}

		56% {
			translate: calc(var(--dd-space-3xl) * -0.49) calc(var(--dd-space-3xl) * -0.59);
			rotate: -60deg;
		}

		62%,
		100% {
			opacity: 100%;
			translate: 0 0;
			rotate: 0deg;
		}
	}

	@keyframes dino-leaps {
		0% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * -0.88) 0;
			rotate: 0deg;
			scale: 1 1;
		}

		8% {
			opacity: 100%;
			translate: calc(var(--dd-space-3xl) * -0.88) 0;
		}

		16% {
			translate: calc(var(--dd-space-3xl) * -0.4) 0;
			scale: 1.08 0.9;
		}

		24% {
			translate: calc(var(--dd-space-3xl) * 0.2) calc(var(--dd-space-3xl) * -0.45);
			rotate: 8deg;
			scale: 1 1;
		}

		32% {
			translate: calc(var(--dd-space-3xl) * 0.84) calc(var(--dd-space-3xl) * -0.59);
			rotate: 0deg;
		}

		42% {
			translate: calc(var(--dd-space-3xl) * 0.94) calc(var(--dd-space-3xl) * -0.53);
		}

		56% {
			translate: calc(var(--dd-space-3xl) * 0.62) calc(var(--dd-space-3xl) * -0.25);
			scale: 1 1;
		}

		70% {
			translate: 0 0;
			scale: 1.12 0.88;
		}

		76% {
			scale: 1 1;
			rotate: 0deg;
		}

		82% {
			rotate: -6deg;
		}

		88% {
			rotate: 6deg;
		}

		93% {
			opacity: 100%;
			translate: 0 0;
			rotate: 0deg;
		}

		100% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * -1.44) 0;
			rotate: 0deg;
			scale: 1 1;
		}
	}

	@keyframes arms-up {
		0%,
		15% {
			opacity: 0;
		}

		16%,
		69% {
			opacity: 100%;
		}

		70%,
		77% {
			opacity: 0;
		}

		78%,
		92% {
			opacity: 100%;
		}

		93%,
		100% {
			opacity: 0;
		}
	}

	@keyframes arms-down {
		0%,
		15% {
			opacity: 100%;
		}

		16%,
		69% {
			opacity: 0;
		}

		70%,
		77% {
			opacity: 100%;
		}

		78%,
		92% {
			opacity: 0;
		}

		93%,
		100% {
			opacity: 100%;
		}
	}

	@keyframes delivered {
		0% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * -6.44) calc(var(--dd-space-3xl) * -0.12);
			rotate: 0deg;
		}

		6% {
			opacity: 100%;
		}

		44%,
		46% {
			translate: calc(var(--dd-space-3xl) * -0.7) calc(var(--dd-space-3xl) * -0.12);
			rotate: 0deg;
		}

		56%,
		100% {
			opacity: 100%;
			translate: 0 0;
			rotate: 360deg;
		}
	}

	@keyframes rocket-passes {
		0% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * -4.59) 0;
			rotate: 0deg;
		}

		6% {
			opacity: 100%;
		}

		44%,
		46% {
			translate: 0 0;
			rotate: 0deg;
		}

		56% {
			translate: calc(var(--dd-space-3xl) * 0.09) calc(var(--dd-space-3xl) * -0.25);
			rotate: -14deg;
		}

		70% {
			translate: calc(var(--dd-space-3xl) * 3.84) calc(var(--dd-space-3xl) * -0.37);
			rotate: -16deg;
		}

		80% {
			opacity: 100%;
			translate: calc(var(--dd-space-3xl) * 6.97) calc(var(--dd-space-3xl) * -0.72);
			rotate: -18deg;
		}

		82%,
		100% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * 6.97) calc(var(--dd-space-3xl) * -0.72);
			rotate: -18deg;
		}
	}

	@keyframes fed {
		0%,
		48% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * 0.05) calc(var(--dd-space-3xl) * -0.71);
			rotate: 0deg;
		}

		49% {
			opacity: 100%;
			translate: calc(var(--dd-space-3xl) * 0.05) calc(var(--dd-space-3xl) * -0.71);
			rotate: 0deg;
		}

		62%,
		100% {
			opacity: 100%;
			translate: 0 0;
			rotate: 360deg;
		}
	}

	@keyframes neck-grows {
		0% {
			opacity: 0;
			scale: 0.1 1;
		}

		6% {
			opacity: 100%;
		}

		40%,
		52% {
			scale: 1 1;
		}

		84% {
			opacity: 100%;
			scale: 0.1 1;
		}

		92%,
		100% {
			opacity: 0;
			scale: 0.1 1;
		}
	}

	@keyframes head-slides {
		0% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * 3.12) 0;
			rotate: 0deg;
		}

		6% {
			opacity: 100%;
		}

		40%,
		52% {
			translate: 0 0;
			rotate: 0deg;
		}

		62% {
			rotate: 14deg;
		}

		84% {
			opacity: 100%;
			translate: calc(var(--dd-space-3xl) * 3.12) 0;
			rotate: 14deg;
		}

		92%,
		100% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * 3.12) 0;
			rotate: 14deg;
		}
	}

	@keyframes held-lets-go {
		0%,
		48% {
			opacity: 100%;
		}

		49%,
		100% {
			opacity: 0;
		}
	}

	@keyframes ola {
		0%,
		28% {
			opacity: 0;
			scale: 1 0;
		}

		32% {
			opacity: 100%;
			scale: 1 0.3;
		}

		40% {
			scale: 1 1;
		}

		48% {
			opacity: 100%;
			scale: 1 0.3;
		}

		52%,
		100% {
			opacity: 0;
			scale: 1 0;
		}
	}
</style>
