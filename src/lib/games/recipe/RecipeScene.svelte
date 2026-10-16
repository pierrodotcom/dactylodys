<script lang="ts">
	import type { GameView } from '../shared/game-view';
	import IngredientShape from './IngredientShape.svelte';
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
</script>

<svg
	class="kitchen"
	viewBox="0 0 {SCENE.width} {SCENE.height}"
	focusable="false"
	aria-hidden="true"
	data-still={view.reducedMotion || undefined}
	data-scene={sceneId}
>
	<path class="counter" d={KITCHEN.counterPath} />
	<path class="board" d={KITCHEN.boardPath} />

	{#each POT.handlePaths as handle (handle)}
		<path class="handle" d={handle} />
	{/each}
	<ellipse class="inside" cx={POT.rim.cx} cy={POT.rim.cy} rx={POT.rim.rx} ry={POT.rim.ry} />
	<ellipse class="soup" cx={POT.soup.cx} cy={POT.soup.cy} rx={POT.soup.rx} ry={POT.soup.ry} />

	{#if sceneId === 'wave'}
		<g class="olas">
			{#each OLA_HUMPS as wave (wave.hump)}
				<g class="ola">
					<path class="hump" d={wave.hump} />
					<path class="fold" d={wave.foam} />
				</g>
			{/each}
		</g>
	{/if}

	{#if sceneId === 'slide'}
		<g class="ladle">
			<path class="utensil" d={LADLE.bowlPath} />
			<path class="utensil" d={LADLE.handlePath} />
		</g>
	{/if}

	{#if place === 'pot'}
		<g class="bubbles" data-reward data-reward-variant="0">
			{#each POT.bubbles as bubble (bubble.x)}
				<circle class="bubble-dot" cx={bubble.x} cy={bubble.y} r={bubble.radius} />
			{/each}
		</g>
		<g transform={placeTransform(KITCHEN.potIngredient)}>
			{#if sceneId === 'diving-board'}
				<g class="diving-board">
					<rect class="plank" {...DIVING_BOARD.plank} />
					<rect class="plank" {...DIVING_BOARD.leg} />
				</g>
			{/if}
			{#if sceneId === undefined}
				<g data-reward data-reward-variant={entrance}>
					<IngredientShape variant={view.groupIndex} {stage} />
				</g>
			{:else}
				<g class="diver">
					<IngredientShape variant={view.groupIndex} {stage} />
					{#if sceneId === 'parachute'}
						<g class="napkin">
							{#each NAPKIN.cordPaths as cord (cord)}
								<path class="cord" d={cord} />
							{/each}
							<path class="canopy" d={NAPKIN.canopyPath} />
							{#each NAPKIN.foldPaths as fold (fold)}
								<path class="fold" d={fold} />
							{/each}
						</g>
					{:else if sceneId === 'balloon'}
						<path class="cord balloon-string" d={BALLOON.stringPath} />
						<g class="balloon">
							<path class="balloon-body" d={BALLOON.bodyPath} />
							<path class="balloon-body" d={BALLOON.knotPath} />
							<path class="fold" d={BALLOON.shinePath} />
						</g>
					{:else if sceneId === 'float'}
						<g class="arm">
							<path class="glove" d={WAVING_ARM.armPath} />
							<circle
								class="glove"
								cx={WAVING_ARM.hand.x}
								cy={WAVING_ARM.hand.y}
								r={WAVING_ARM.hand.radius}
							/>
						</g>
					{/if}
				</g>
			{/if}
		</g>
	{/if}

	<g class="pot-body">
		<path class="pot" d={POT.bodyPath} />
	</g>

	{#if sceneId === 'somersault' || sceneId === 'diving-board'}
		{#each SPLASH.angles as angle (angle)}
			<g transform="rotate({angle} {SPLASH.center.x} {SPLASH.center.y})">
				<circle class="drop" cx={SPLASH.center.x} cy={SPLASH.center.y} r={SPLASH.radius} />
			</g>
		{/each}
	{/if}

	{#if sceneId === 'burp'}
		<circle class="burp" cx={BURP_BUBBLE.cx} cy={BURP_BUBBLE.cy} r={BURP_BUBBLE.r} />
	{/if}

	{#if sceneId === 'catapult'}
		<g class="catapult">
			<path class="plank" d={CATAPULT.pivotPath} />
			<g class="spoon">
				<path class="utensil" d={CATAPULT.handlePath} />
				<path class="utensil" d={CATAPULT.bowlPath} />
			</g>
		</g>
	{/if}

	{#if sceneId === 'hungry-lid'}
		<g class="lid">
			<path class="pot" d={LID.knobPath} />
			<path class="pot" d={LID.domePath} />
			{#each LID.eyes as eye (eye.x)}
				<circle class="eye" cx={eye.x} cy={eye.y} r={eye.radius} />
			{/each}
			{#each LID.pupils as pupil (pupil.x)}
				<circle class="pupil" cx={pupil.x} cy={pupil.y} r={pupil.radius} />
			{/each}
		</g>
	{/if}

	{#if sceneId === 'dino-snatch'}
		<g transform={placeTransform(DINO.rest)}>
			<g class="dino">
				<path class="dino-skin" d={DINO.tailPath} />
				{#each DINO.platePaths as plate (plate)}
					<path class="dino-plate" d={plate} />
				{/each}
				{#each DINO.feetPaths as foot (foot)}
					<path class="dino-skin" d={foot} />
				{/each}
				<path class="dino-skin" d={DINO.bodyPath} />
				<circle class="eye" cx={DINO.eye.x} cy={DINO.eye.y} r={DINO.eye.radius} />
				<circle class="pupil" cx={DINO.pupil.x} cy={DINO.pupil.y} r={DINO.pupil.radius} />
				<path class="cord" d={DINO.smilePath} />
				<g class="dino-arm">
					<path class="dino-skin" d={DINO.armPath} />
					<circle class="dino-skin" cx={DINO.hand.x} cy={DINO.hand.y} r={DINO.hand.radius} />
				</g>
			</g>
		</g>
	{/if}

	{#if sceneId === 'rocket-delivery'}
		<g transform={placeTransform(DELIVERY_ROCKET.rest)}>
			<g class="delivery-rocket">
				<path class="flame-outer" d={DELIVERY_ROCKET.flameOuterPath} />
				<path class="flame-inner" d={DELIVERY_ROCKET.flameInnerPath} />
				{#each DELIVERY_ROCKET.finPaths as fin (fin)}
					<path class="rocket-fin" d={fin} />
				{/each}
				<path class="rocket-body" d={DELIVERY_ROCKET.bodyPath} />
				<circle
					class="rocket-window"
					cx={DELIVERY_ROCKET.window.x}
					cy={DELIVERY_ROCKET.window.y}
					r={DELIVERY_ROCKET.window.radius}
				/>
				{#each DELIVERY_ROCKET.clawPaths as claw (claw)}
					<path class="rocket-fin" d={claw} />
				{/each}
			</g>
		</g>
	{/if}

	{#if sceneId === 'giraffe-guest'}
		<g transform={GIRAFFE.transform}>
			<g class="neck">
				<path class="giraffe-skin" d={GIRAFFE.neckPath} />
				{#each GIRAFFE.spots as spot (spot.x)}
					<circle class="giraffe-spot" cx={spot.x} cy={spot.y} r={spot.radius} />
				{/each}
			</g>
			<g class="head">
				<g transform={GIRAFFE.headTransform}>
					{#each GIRAFFE.hornPaths as horn (horn)}
						<path class="line" d={horn} />
					{/each}
					{#each GIRAFFE.hornTips as tip (tip.x)}
						<circle class="giraffe-spot" cx={tip.x} cy={tip.y} r={tip.radius} />
					{/each}
					<path class="giraffe-skin" d={GIRAFFE.earPath} />
					<path class="giraffe-skin" d={GIRAFFE.headPath} />
					<circle
						class="giraffe-spot"
						cx={GIRAFFE.cheek.x}
						cy={GIRAFFE.cheek.y}
						r={GIRAFFE.cheek.radius}
					/>
					<circle class="pupil" cx={GIRAFFE.eye.x} cy={GIRAFFE.eye.y} r={GIRAFFE.eye.radius} />
					<path class="cord" d={GIRAFFE.smilePath} />
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
			{/each}
		</g>
	{/if}

	{#if place === 'board'}
		<g transform={placeTransform(KITCHEN.boardIngredient)}>
			<IngredientShape variant={view.groupIndex} {stage} />
		</g>
	{/if}

	{#if ready}
		<g data-reward data-reward-variant="0">
			{#each POT.steamPaths as steam (steam)}
				<path class="steam" d={steam} />
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

	.counter,
	.board,
	.handle,
	.inside,
	.soup,
	.pot,
	.bubble-dot,
	.steam {
		stroke: var(--dd-color-drawing-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.counter {
		fill: var(--dd-color-border-subtle);
	}

	.board {
		fill: var(--dd-color-border-strong);
	}

	.handle,
	.steam {
		fill: transparent;
	}

	.handle {
		stroke-width: var(--dd-border-width-target);
	}

	.steam {
		stroke: var(--dd-color-pot-steam);
		stroke-width: var(--dd-border-width-target);
	}

	.inside {
		fill: var(--dd-color-pot-inside);
	}

	.soup {
		fill: var(--dd-color-pot-soup);
	}

	.pot {
		fill: var(--dd-color-pot-body);
	}

	.bubble-dot {
		fill: var(--dd-color-pot-bubble);
	}
	.plank {
		fill: var(--dd-color-border-strong);
		stroke: var(--dd-color-drawing-line);
		stroke-width: var(--dd-border-width-thick);
		vector-effect: non-scaling-stroke;
	}

	.drop,
	.burp {
		fill: var(--dd-color-pot-soup);
		stroke: var(--dd-color-drawing-line);
		stroke-width: var(--dd-border-width-thick);
		vector-effect: non-scaling-stroke;
	}

	.burp {
		fill: var(--dd-color-pot-bubble);
	}

	.utensil,
	.canopy,
	.balloon-body,
	.glove,
	.eye,
	.hump,
	.dino-skin,
	.dino-plate,
	.rocket-body,
	.rocket-fin,
	.rocket-window,
	.flame-outer,
	.flame-inner,
	.giraffe-skin,
	.giraffe-spot,
	.line {
		stroke: var(--dd-color-drawing-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.utensil {
		fill: var(--dd-color-pot-steam);
	}

	.canopy {
		fill: var(--dd-color-food-b);
	}

	.balloon-body {
		fill: var(--dd-color-food-e);
	}

	.glove,
	.eye {
		fill: var(--dd-color-pot-bubble);
	}

	.pupil {
		fill: var(--dd-color-drawing-ink);
	}

	.hump {
		fill: var(--dd-color-pot-soup);
	}

	.dino-skin {
		fill: var(--dd-color-baby-a);
	}

	.dino-plate {
		fill: var(--dd-color-baby-c);
	}

	.rocket-body {
		fill: var(--dd-color-rocket-body);
	}

	.rocket-fin {
		fill: var(--dd-color-rocket-fin);
	}

	.rocket-window {
		fill: var(--dd-color-rocket-window);
	}

	.flame-outer {
		fill: var(--dd-color-rocket-flame-outer);
	}

	.flame-inner {
		fill: var(--dd-color-rocket-flame-inner);
	}

	.giraffe-skin {
		fill: var(--dd-color-food-a);
	}

	.giraffe-spot {
		fill: var(--dd-color-pot-soup);
	}

	.line {
		fill: transparent;
	}

	.cord,
	.fold {
		fill: transparent;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.cord {
		stroke: var(--dd-color-drawing-line);
		stroke-width: var(--dd-border-width-thin);
	}

	.fold {
		stroke: var(--dd-color-pot-bubble);
		stroke-width: var(--dd-border-width-thick);
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
		animation-name: dino-leaps;
	}

	[data-scene='dino-snatch'] .dino-arm {
		transform-origin: 0% 50%;
		animation-name: dino-waves;
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
			translate: 0 calc(var(--dd-space-3xl) * -2.2);
			rotate: 0deg;
		}

		10% {
			opacity: 100%;
		}

		55% {
			translate: 0 calc(var(--dd-space-3xl) * -2.4);
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
			translate: calc(var(--dd-space-3xl) * 0.8) 0;
		}
	}

	@keyframes rim-bounce {
		0% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * -2) calc(var(--dd-space-3xl) * -2.5);
			rotate: 0deg;
		}

		10% {
			opacity: 100%;
		}

		35% {
			translate: calc(var(--dd-space-3xl) * -1.6) calc(var(--dd-space-3xl) * -0.6);
			rotate: 0deg;
		}

		55% {
			translate: calc(var(--dd-space-3xl) * -0.8) calc(var(--dd-space-3xl) * -1.8);
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
			translate: calc(var(--dd-space-3xl) * -3.3) calc(var(--dd-space-3xl) * -1.75);
			rotate: 0deg;
		}

		8% {
			opacity: 100%;
		}

		28% {
			translate: calc(var(--dd-space-3xl) * -2.4) calc(var(--dd-space-3xl) * -1.75);
		}

		36% {
			translate: calc(var(--dd-space-3xl) * -2.4) calc(var(--dd-space-3xl) * -2.3);
		}

		44% {
			translate: calc(var(--dd-space-3xl) * -2.4) calc(var(--dd-space-3xl) * -1.75);
		}

		56% {
			translate: calc(var(--dd-space-3xl) * -1.8) calc(var(--dd-space-3xl) * -2.9);
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
			translate: 0 calc(var(--dd-space-3xl) * -1.5);
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
			translate: calc(var(--dd-space-3xl) * 3.3) calc(var(--dd-space-3xl) * -2.6);
			rotate: -28deg;
		}

		10% {
			opacity: 100%;
			translate: calc(var(--dd-space-3xl) * 3.3) calc(var(--dd-space-3xl) * -2.6);
		}

		20% {
			translate: calc(var(--dd-space-3xl) * 3.1) calc(var(--dd-space-3xl) * -2.45);
			rotate: -28deg;
		}

		45% {
			translate: calc(var(--dd-space-3xl) * 0.93) calc(var(--dd-space-3xl) * -1.34);
			rotate: -28deg;
		}

		60% {
			translate: calc(var(--dd-space-3xl) * 0.3) calc(var(--dd-space-3xl) * -1.7);
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
			translate: calc(var(--dd-space-3xl) * -4.45) 0;
			rotate: 0deg;
		}

		10%,
		30% {
			opacity: 100%;
			translate: calc(var(--dd-space-3xl) * -4.45) 0;
			rotate: 0deg;
		}

		36% {
			translate: calc(var(--dd-space-3xl) * -4) calc(var(--dd-space-3xl) * -0.9);
			rotate: 90deg;
		}

		46% {
			translate: calc(var(--dd-space-3xl) * -3.1) calc(var(--dd-space-3xl) * -1.7);
			rotate: 270deg;
		}

		58% {
			translate: calc(var(--dd-space-3xl) * -1.9) calc(var(--dd-space-3xl) * -2);
			rotate: 450deg;
		}

		70% {
			translate: calc(var(--dd-space-3xl) * -0.9) calc(var(--dd-space-3xl) * -1.6);
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
			translate: calc(var(--dd-space-3xl) * 2.6) calc(var(--dd-space-3xl) * -2.2);
			rotate: 12deg;
		}

		10% {
			opacity: 100%;
		}

		30% {
			translate: calc(var(--dd-space-3xl) * 1.9) calc(var(--dd-space-3xl) * -1.4);
			rotate: -10deg;
		}

		50% {
			translate: calc(var(--dd-space-3xl) * 1.1) calc(var(--dd-space-3xl) * -0.85);
			rotate: 8deg;
		}

		66% {
			translate: calc(var(--dd-space-3xl) * 0.45) calc(var(--dd-space-3xl) * -0.4);
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
			translate: calc(var(--dd-space-3xl) * 3) calc(var(--dd-space-3xl) * -1.3);
			rotate: -6deg;
		}

		10% {
			opacity: 100%;
		}

		25% {
			translate: calc(var(--dd-space-3xl) * 2.2) calc(var(--dd-space-3xl) * -1.1);
			rotate: 6deg;
		}

		40% {
			translate: calc(var(--dd-space-3xl) * 1.1) calc(var(--dd-space-3xl) * -0.9);
			rotate: -4deg;
		}

		52% {
			translate: 0 calc(var(--dd-space-3xl) * -0.8);
			rotate: 0deg;
		}

		62% {
			translate: 0 calc(var(--dd-space-3xl) * -0.68);
			rotate: 3deg;
		}

		72% {
			translate: 0 calc(var(--dd-space-3xl) * -0.48);
			rotate: -3deg;
		}

		82% {
			translate: 0 calc(var(--dd-space-3xl) * -0.24);
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
			translate: calc(var(--dd-space-3xl) * -3.5) calc(var(--dd-space-3xl) * 0.2);
			rotate: 0deg;
		}

		10%,
		18% {
			opacity: 100%;
			translate: calc(var(--dd-space-3xl) * -3.5) calc(var(--dd-space-3xl) * 0.2);
			rotate: 0deg;
		}

		30% {
			translate: calc(var(--dd-space-3xl) * -1.8) calc(var(--dd-space-3xl) * -1.4);
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
			rotate: 24deg;
		}

		10%,
		40% {
			opacity: 100%;
			rotate: 24deg;
		}

		48%,
		62%,
		76% {
			rotate: 0deg;
		}

		56%,
		70% {
			rotate: 14deg;
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
			translate: 0 calc(var(--dd-space-3xl) * -1.6);
			rotate: 0deg;
		}

		10% {
			opacity: 100%;
		}

		26% {
			translate: 0 calc(var(--dd-space-3xl) * -0.45);
			rotate: -90deg;
		}

		34%,
		50% {
			translate: 0 calc(var(--dd-space-3xl) * -0.38);
			rotate: -86deg;
		}

		42%,
		58% {
			translate: 0 calc(var(--dd-space-3xl) * -0.48);
			rotate: -93deg;
		}

		68% {
			translate: 0 calc(var(--dd-space-3xl) * -0.42);
			rotate: -90deg;
		}

		90% {
			translate: 0 calc(var(--dd-space-3xl) * 0.35);
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
			translate: 0 calc(var(--dd-space-3xl) * -1.5);
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
			translate: 0 calc(var(--dd-space-3xl) * -0.45);
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
			translate: calc(var(--dd-space-3xl) * -1.95) calc(var(--dd-space-3xl) * -1.29);
			rotate: 0deg;
		}

		6% {
			opacity: 100%;
		}

		16% {
			translate: calc(var(--dd-space-3xl) * -1.95) calc(var(--dd-space-3xl) * -1.41);
		}

		32% {
			translate: calc(var(--dd-space-3xl) * -1.95) calc(var(--dd-space-3xl) * -1.29);
		}

		42% {
			translate: calc(var(--dd-space-3xl) * -1.68) calc(var(--dd-space-3xl) * -1.21);
			rotate: 0deg;
		}

		50% {
			translate: calc(var(--dd-space-3xl) * -0.94) calc(var(--dd-space-3xl) * -1.48);
			rotate: 180deg;
		}

		56% {
			translate: calc(var(--dd-space-3xl) * -0.27) calc(var(--dd-space-3xl) * -0.9);
			rotate: 300deg;
		}

		62%,
		100% {
			opacity: 100%;
			translate: 0 0;
			rotate: 360deg;
		}
	}

	@keyframes dino-leaps {
		0% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * -0.87) 0;
			rotate: 0deg;
		}

		8% {
			opacity: 100%;
			translate: calc(var(--dd-space-3xl) * -0.87) 0;
		}

		22% {
			translate: calc(var(--dd-space-3xl) * -0.03) calc(var(--dd-space-3xl) * -0.78);
			rotate: -20deg;
		}

		32% {
			translate: calc(var(--dd-space-3xl) * 0.91) calc(var(--dd-space-3xl) * -1.22);
			rotate: 0deg;
		}

		42% {
			translate: calc(var(--dd-space-3xl) * 1.13) calc(var(--dd-space-3xl) * -1.16);
		}

		56% {
			translate: calc(var(--dd-space-3xl) * 1.06) calc(var(--dd-space-3xl) * -0.62);
			scale: 1 1;
		}

		72% {
			translate: 0 0;
			scale: 1.15 0.85;
		}

		78% {
			scale: 1 1;
		}

		92% {
			opacity: 100%;
			translate: 0 0;
		}

		100% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * -1.44) 0;
			scale: 1 1;
		}
	}

	@keyframes dino-waves {
		0%,
		72% {
			rotate: 0deg;
		}

		78%,
		86% {
			rotate: -55deg;
		}

		82%,
		90% {
			rotate: -30deg;
		}

		96%,
		100% {
			rotate: 0deg;
		}
	}

	@keyframes delivered {
		0% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * -5.74) calc(var(--dd-space-3xl) * -1.33);
			rotate: 0deg;
		}

		6% {
			opacity: 100%;
		}

		44%,
		46% {
			translate: 0 calc(var(--dd-space-3xl) * -1.33);
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
			translate: calc(var(--dd-space-3xl) * 0.05) calc(var(--dd-space-3xl) * -0.9);
			rotate: 0deg;
		}

		49% {
			opacity: 100%;
			translate: calc(var(--dd-space-3xl) * 0.05) calc(var(--dd-space-3xl) * -0.9);
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
