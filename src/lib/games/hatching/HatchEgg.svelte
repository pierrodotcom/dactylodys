<script lang="ts">
	import type { SceneChoice } from '$lib/engine/rewards/scenes';
	import {
		ARMS,
		BABY_PLATES,
		BABY_VARIANTS,
		BEAM_PATH,
		CAR_BODY,
		CAR_CABIN,
		CAR_HEADLIGHT,
		CAR_WHEEL_RADIUS,
		CAR_WHEELS,
		CAR_WINDOW,
		CRACKS,
		DISH_CHERRY,
		DISH_FOOD,
		DISH_HANDS,
		DISH_PEAS,
		DISH_PLATE,
		DIZZY_STARS,
		EGG_PATH,
		FEET,
		HAT_PATH,
		HONK_BUBBLE,
		HONK_LINES,
		HONK_MARK,
		SAUCER_BODY,
		SAUCER_DOME,
		SAUCER_LIGHTS,
		SHARDS,
		SHELL_BOTTOM_PATH,
		SHELL_TOP_PATH,
		SPOON_HAND,
		SPOON_PATH,
		SPOTS,
		STEAM_WISPS,
		TOQUE_BAND,
		TOQUE_FOLDS,
		TOQUE_PUFF,
		TWINS,
		WAVES
	} from './shapes';

	interface Props {
		/** Number of cracks to draw on a whole egg. */
		stage: number;
		hatched: boolean;
		/** Which baby dino comes out; the colors cycle. */
		variant: number;
		/** The big egg moves when it hatches; the small ones of the row only change shape. */
		big?: boolean;
		/** Calm motion: the baby fades in and the cap is already off. */
		still?: boolean;
		/** How the big egg hatches: a surprise scene, or a common entrance. */
		scene?: SceneChoice;
	}

	const COMMON_ENTRANCE: SceneChoice = { kind: 'variant', index: 0 };

	let {
		stage,
		hatched,
		variant,
		big = false,
		still = false,
		scene = COMMON_ENTRANCE
	}: Props = $props();

	const color = $derived(Math.abs(variant) % BABY_VARIANTS);
	const sceneId = $derived(big && !still && scene.kind === 'scene' ? scene.id : undefined);
	const entrance = $derived(scene.kind === 'variant' ? scene.index : 0);
	const wholeOnTop = $derived(
		sceneId === 'burst' || sceneId === 'triple-jump' || sceneId === 'spin-top' || sceneId === 'roll'
	);
	const armsUp = $derived(
		sceneId === 'weightlifter' || sceneId === 'yawn' || sceneId === 'ufo-visit'
	);
</script>

<svg
	class="egg"
	viewBox="0 0 120 150"
	focusable="false"
	aria-hidden="true"
	data-hatched={hatched || undefined}
	data-big={big || undefined}
	data-still={still || undefined}
	data-color={color}
	data-scene={(hatched && sceneId) || undefined}
>
	{#snippet babyDrawing(withArms: boolean)}
		<ellipse class="body line" cx="60" cy="100" rx="32" ry="26" />
		{#if withArms}
			<g class="arms">
				{#each ARMS as arm (arm.side)}
					<path class="body line" d={arm.path} />
				{/each}
			</g>
		{/if}
		<g transform="translate(0 -8)">
			<path class="plate line" d={BABY_PLATES[0]} />
			<path class="plate line" d={BABY_PLATES[1]} />
			<path class="plate line" d={BABY_PLATES[2]} />
			<circle class="body line" cx="60" cy="68" r="27" />
			<g class="eye" data-side="left">
				<circle class="white line" cx="49" cy="64" r="7" />
				<circle class="ink" cx="50" cy="65" r="3.5" />
			</g>
			<g class="eye" data-side="right">
				<circle class="white line" cx="71" cy="64" r="7" />
				<circle class="ink" cx="72" cy="65" r="3.5" />
			</g>
			<circle class="cheek" cx="40" cy="78" r="4" />
			<circle class="cheek" cx="80" cy="78" r="4" />
			<path class="open line" d="M52 79Q60 87 68 79" />
			{#if sceneId === 'yawn' || sceneId === 'car-honk'}
				<ellipse class="yawn ink" cx="60" cy="82" rx="8" ry="10" />
			{/if}
			{#if sceneId === 'burst'}
				<path class="shell line" d={HAT_PATH} />
			{/if}
			{#if sceneId === 'chef-baby'}
				<g class="toque">
					<path class="toque-part line" d={TOQUE_PUFF} />
					<path class="fold" d={TOQUE_FOLDS} />
					<rect
						class="toque-part line"
						x={TOQUE_BAND.x}
						y={TOQUE_BAND.y}
						width={TOQUE_BAND.width}
						height={TOQUE_BAND.height}
						rx={TOQUE_BAND.radius}
					/>
				</g>
			{/if}
		</g>
	{/snippet}
	{#if hatched}
		{#if sceneId === 'ufo-visit'}
			<g class="beam">
				<path class="beam-light" d={BEAM_PATH} />
			</g>
		{/if}
		<g class="pair">
			{#if sceneId === 'twins'}
				{#each TWINS as twin (twin.side)}
					<g class="twin" data-side={twin.side}>
						<g transform={twin.transform}>
							{@render babyDrawing(false)}
						</g>
					</g>
				{/each}
			{:else}
				<g
					class="baby"
					data-reward={(big && sceneId === undefined) || undefined}
					data-reward-variant={big && sceneId === undefined ? entrance : undefined}
				>
					{@render babyDrawing(armsUp)}
				</g>
			{/if}
			{#if sceneId === 'shell-pants'}
				{#each FEET as foot (foot.side)}
					<ellipse
						class="foot body line"
						data-side={foot.side}
						cx={foot.cx}
						cy={foot.cy}
						rx="10"
						ry="6"
					/>
				{/each}
			{/if}
			<g class="bottom">
				<path class="shell line" d={SHELL_BOTTOM_PATH} />
			</g>
			{#if sceneId === 'boat'}
				<g class="spoon">
					<path class="spoon-fill line" d={SPOON_PATH} />
					<circle class="body line" cx={SPOON_HAND.cx} cy={SPOON_HAND.cy} r={SPOON_HAND.radius} />
				</g>
			{/if}
		</g>
		{#if sceneId === 'boat'}
			<g class="waves">
				{#each WAVES as wave (wave)}
					<path class="wave line" d={wave} />
				{/each}
			</g>
		{/if}
		<g class="cap">
			<path class="shell line" d={SHELL_TOP_PATH} />
		</g>
		{#if sceneId === 'chef-baby'}
			<g class="dish">
				<ellipse
					class="platter line"
					cx={DISH_PLATE.cx}
					cy={DISH_PLATE.cy}
					rx={DISH_PLATE.rx}
					ry={DISH_PLATE.ry}
				/>
				<path class="food line" d={DISH_FOOD} />
				{#each DISH_PEAS as pea (pea.x)}
					<circle class="pea" cx={pea.x} cy={pea.y} r="2" />
				{/each}
				<circle
					class="cherry line"
					cx={DISH_CHERRY.cx}
					cy={DISH_CHERRY.cy}
					r={DISH_CHERRY.radius}
				/>
				{#each DISH_HANDS as hand (hand.side)}
					<circle class="body line" cx={hand.cx} cy={hand.cy} r="5" />
				{/each}
				<g class="steam">
					{#each STEAM_WISPS as wisp (wisp)}
						<path class="wisp" d={wisp} />
					{/each}
				</g>
			</g>
		{/if}
		{#if sceneId === 'ufo-visit'}
			<g class="saucer">
				<path class="dome line" d={SAUCER_DOME} />
				<ellipse
					class="saucer-body line"
					cx={SAUCER_BODY.cx}
					cy={SAUCER_BODY.cy}
					rx={SAUCER_BODY.rx}
					ry={SAUCER_BODY.ry}
				/>
				{#each SAUCER_LIGHTS as light (light.x)}
					<circle class="light" cx={light.x} cy={light.y} r="2" />
				{/each}
			</g>
		{/if}
		{#if sceneId === 'car-honk'}
			<g class="car">
				<path class="car-body line" d={CAR_CABIN} />
				<path class="glass line" d={CAR_WINDOW} />
				<path class="car-body line" d={CAR_BODY} />
				<circle
					class="headlight line"
					cx={CAR_HEADLIGHT.cx}
					cy={CAR_HEADLIGHT.cy}
					r={CAR_HEADLIGHT.radius}
				/>
				{#each CAR_WHEELS as wheel (wheel.cx)}
					<g class="wheel">
						<circle class="tire line" cx={wheel.cx} cy={wheel.cy} r={CAR_WHEEL_RADIUS} />
						<path class="spoke" d={wheel.spoke} />
					</g>
				{/each}
			</g>
			<g class="honk">
				<path class="honk-bubble line" d={HONK_BUBBLE} />
				<rect
					class="honk-mark"
					x={HONK_MARK.bar.x}
					y={HONK_MARK.bar.y}
					width={HONK_MARK.bar.width}
					height={HONK_MARK.bar.height}
					rx={HONK_MARK.bar.radius}
				/>
				<circle
					class="honk-mark"
					cx={HONK_MARK.dot.cx}
					cy={HONK_MARK.dot.cy}
					r={HONK_MARK.dot.radius}
				/>
				<path class="honk-line" d={HONK_LINES} />
			</g>
		{/if}
		{#if sceneId === 'fall-out'}
			<g class="dizzy">
				{#each DIZZY_STARS as star (star)}
					<path class="star line" d={star} />
				{/each}
			</g>
		{/if}
		{#if sceneId === 'burst'}
			{#each SHARDS as shard (shard.angle)}
				<g transform="rotate({shard.angle} 60 78)">
					<path class="shard shell line" d={shard.path} />
				</g>
			{/each}
		{/if}
		{#if wholeOnTop}
			<g class="whole">
				<path class="shell line" d={EGG_PATH} />
				{#each SPOTS as spot (spot.x)}
					<circle class="spot" cx={spot.x} cy={spot.y} r={spot.radius} />
				{/each}
			</g>
		{/if}
	{:else}
		<path class="shell line" d={EGG_PATH} />
		{#each SPOTS as spot (spot.x)}
			<circle class="spot" cx={spot.x} cy={spot.y} r={spot.radius} />
		{/each}
		{#each CRACKS as crack, index (index)}
			{#if index < stage}
				<path class="crack" d={crack} />
			{/if}
		{/each}
	{/if}
</svg>

<style>
	.egg {
		display: block;
		inline-size: 100%;
		block-size: auto;
		overflow: visible;
	}

	/* The egg rolls out of its own frame, not over the text beside it. */
	.egg[data-scene='roll'] {
		overflow: hidden;
	}

	/* The saucer and the car come in from the edge of their own frame, not over the text. */
	.egg[data-scene='ufo-visit'],
	.egg[data-scene='car-honk'] {
		overflow: hidden;
	}

	.line {
		stroke: var(--dd-color-egg-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.shell {
		fill: var(--dd-color-egg-shell);
	}

	.spot {
		fill: var(--dd-color-egg-spot);
	}

	.crack {
		fill: transparent;
		stroke: var(--dd-color-egg-crack);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	[data-big] .crack {
		stroke-width: var(--dd-border-width-target);
	}

	.body {
		fill: var(--dd-color-baby-a);
	}

	[data-color='1'] .body {
		fill: var(--dd-color-baby-b);
	}

	[data-color='2'] .body {
		fill: var(--dd-color-baby-c);
	}

	[data-color='3'] .body {
		fill: var(--dd-color-baby-d);
	}

	.plate {
		fill: var(--dd-color-companion-plate);
	}

	.white {
		fill: var(--dd-color-companion-eye);
	}

	.ink {
		fill: var(--dd-color-companion-line);
	}

	.cheek {
		fill: var(--dd-color-companion-cheek);
	}

	.open {
		fill: transparent;
	}

	.cap {
		transform-box: fill-box;
		transform-origin: 20% 90%;
		rotate: -38deg;
		translate: -14% -18%;
	}

	.star,
	.spoon-fill {
		fill: var(--dd-color-star-fill);
	}

	.wave {
		fill: transparent;
	}

	.honk-line,
	.fold,
	.wisp,
	.spoke {
		fill: transparent;
		stroke-linecap: round;
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
	}

	.honk-line {
		stroke: var(--dd-color-egg-line);
		stroke-width: var(--dd-border-width-target);
	}

	.fold {
		stroke: var(--dd-color-wear-metal);
		stroke-width: var(--dd-border-width-thick);
	}

	.wisp {
		stroke: var(--dd-color-pot-steam);
		stroke-width: var(--dd-border-width-target);
	}

	.spoke {
		stroke: var(--dd-color-wear-metal);
		stroke-width: var(--dd-border-width-target);
	}

	.toque-part,
	.platter {
		fill: var(--dd-color-wear-cream);
	}

	.food {
		fill: var(--dd-color-food-a);
	}

	.cherry {
		fill: var(--dd-color-food-b);
	}

	.pea {
		fill: var(--dd-color-food-d);
	}

	.beam-light {
		fill: var(--dd-color-rocket-flame-inner);
		fill-opacity: var(--dd-opacity-overlay);
	}

	.dome,
	.glass {
		fill: var(--dd-color-wear-glass);
	}

	.saucer-body {
		fill: var(--dd-color-wear-metal);
	}

	.light,
	.headlight {
		fill: var(--dd-color-wear-gold);
	}

	.car-body {
		fill: var(--dd-color-wear-red);
	}

	.tire {
		fill: var(--dd-color-wear-ink);
	}

	.honk-bubble {
		fill: var(--dd-color-bubble-surface);
	}

	.honk-mark {
		fill: var(--dd-color-bubble-text);
	}

	[data-big]:not([data-still]):not([data-scene]) .cap {
		animation-name: lift;
		animation-duration: var(--dd-duration-reward);
		animation-delay: var(--dd-duration-reward-delay);
		animation-timing-function: var(--dd-easing-enter);
		animation-fill-mode: backwards;
	}

	@keyframes lift {
		0% {
			rotate: 0deg;
			translate: 0 0;
		}

		100% {
			rotate: -38deg;
			translate: -14% -18%;
		}
	}
	/* Surprise scenes (ADR-032): a moment after the last key, long enough to be seen. */
	[data-scene] .baby,
	[data-scene] .bottom,
	[data-scene] .cap,
	[data-scene] .whole,
	[data-scene] .dizzy,
	[data-scene] .shard,
	[data-scene] .pair,
	[data-scene] .twin,
	[data-scene] .arms,
	[data-scene] .eye,
	[data-scene] .yawn,
	[data-scene] .foot,
	[data-scene] .spoon,
	[data-scene] .waves,
	[data-scene] .toque,
	[data-scene] .dish,
	[data-scene] .steam,
	[data-scene] .beam,
	[data-scene] .saucer,
	[data-scene] .car,
	[data-scene] .wheel,
	[data-scene] .honk {
		transform-box: fill-box;
		animation-duration: var(--dd-duration-scene);
		animation-delay: var(--dd-duration-reward-delay);
		animation-timing-function: var(--dd-easing-standard);
		animation-fill-mode: both;
	}

	[data-scene] .baby,
	[data-scene] .bottom,
	[data-scene] .whole,
	[data-scene] .pair,
	[data-scene] .twin,
	[data-scene] .arms {
		transform-origin: 50% 100%;
	}

	[data-scene] .dizzy,
	[data-scene] .shard,
	[data-scene] .eye,
	[data-scene] .yawn,
	[data-scene] .foot,
	[data-scene] .waves {
		transform-origin: 50% 50%;
	}

	[data-scene] .spoon {
		transform-origin: 5% 0;
	}

	[data-scene] .toque,
	[data-scene] .steam,
	[data-scene] .car {
		transform-origin: 50% 100%;
	}

	[data-scene] .dish,
	[data-scene] .saucer,
	[data-scene] .wheel {
		transform-origin: 50% 50%;
	}

	[data-scene] .beam {
		transform-origin: 50% 0;
	}

	[data-scene] .honk {
		transform-origin: 20% 100%;
	}

	[data-scene='cork'] .cap,
	[data-scene='weightlifter'] .cap {
		transform-origin: 50% 100%;
	}

	[data-scene='boat'] .bottom,
	[data-scene='roll'] .whole,
	[data-scene='roll'] .pair {
		transform-origin: 50% 50%;
	}

	[data-scene='fall-out'] .baby {
		animation-name: fall;
	}

	[data-scene='fall-out'] .bottom,
	[data-scene='fall-out'] .cap {
		animation-name: shell-away;
	}

	[data-scene='fall-out'] .dizzy {
		animation-name: dizzy;
	}

	[data-scene='burst'] .whole {
		animation-name: swell;
	}

	[data-scene='burst'] .cap {
		animation-name: cap-flies;
	}

	[data-scene='burst'] .bottom {
		animation-name: bottom-drops;
	}

	[data-scene='burst'] .shard {
		animation-name: shard-flies;
	}

	[data-scene='burst'] .baby {
		animation-name: pop-out;
	}

	[data-scene='triple-jump'] .whole {
		animation-name: three-jumps;
	}

	[data-scene='triple-jump'] .cap {
		animation-name: lift-late;
	}

	[data-scene='triple-jump'] .bottom {
		animation-name: appear-late;
	}

	[data-scene='triple-jump'] .baby {
		animation-name: emerge-late;
	}

	[data-scene='peek'] .cap {
		animation-name: ajar;
	}

	[data-scene='peek'] .baby {
		animation-name: peek;
	}

	[data-scene='cork'] .cap {
		animation-name: cork-pop;
	}

	[data-scene='cork'] .baby {
		animation-name: cork-bonk;
	}

	[data-scene='cork'] .eye {
		animation-name: cork-blink;
	}

	[data-scene='spin-top'] .whole {
		animation-name: spin-whole;
	}

	[data-scene='spin-top'] .bottom {
		animation-name: appear-half;
	}

	[data-scene='spin-top'] .cap {
		animation-name: cap-off-half;
	}

	[data-scene='spin-top'] .baby {
		animation-name: spin-baby;
	}

	[data-scene='shell-pants'] .cap,
	[data-scene='chef-baby'] .cap,
	[data-scene='boat'] .cap,
	[data-scene='yawn'] .cap,
	[data-scene='twins'] .cap {
		animation-name: cap-off;
	}

	[data-scene='shell-pants'] .pair {
		animation-name: waddle;
	}

	[data-scene='shell-pants'] .foot[data-side='left'] {
		animation-name: step-left;
	}

	[data-scene='shell-pants'] .foot[data-side='right'] {
		animation-name: step-right;
	}

	[data-scene='boat'] .baby {
		animation-name: hop-in;
	}

	[data-scene='boat'] .bottom {
		animation-name: turn-over;
	}

	[data-scene='boat'] .pair {
		animation-name: rock;
	}

	[data-scene='boat'] .spoon {
		animation-name: row;
	}

	[data-scene='boat'] .waves {
		animation-name: ripple;
	}

	[data-scene='weightlifter'] .cap {
		animation-name: heave;
	}

	[data-scene='weightlifter'] .arms {
		animation-name: arms-heave;
	}

	[data-scene='weightlifter'] .baby {
		animation-name: strain;
	}

	[data-scene='weightlifter'] .eye {
		animation-name: squint;
	}

	[data-scene='yawn'] .baby {
		animation-name: stretch;
	}

	[data-scene='yawn'] .arms {
		animation-name: arms-stretch;
	}

	[data-scene='yawn'] .yawn {
		animation-name: yawn;
	}

	[data-scene='yawn'] .eye[data-side='left'] {
		animation-name: sleepy-wink;
	}

	[data-scene='yawn'] .eye[data-side='right'] {
		animation-name: sleepy;
	}

	[data-scene='twins'] .twin[data-side='left'] {
		animation-name: twin-first;
	}

	[data-scene='twins'] .twin[data-side='right'] {
		animation-name: twin-second;
	}

	[data-scene='roll'] .whole {
		animation-name: roll-away;
	}

	[data-scene='roll'] .pair {
		animation-name: roll-back;
	}

	[data-scene='roll'] .cap {
		animation-name: gone;
	}

	[data-scene='chef-baby'] .baby {
		animation-name: chef-rise;
	}

	[data-scene='chef-baby'] .toque {
		animation-name: toque-drop;
	}

	[data-scene='chef-baby'] .dish {
		animation-name: serve;
	}

	[data-scene='chef-baby'] .steam {
		animation-name: steam-rise;
	}

	[data-scene='ufo-visit'] .saucer {
		animation-name: saucer-visit;
	}

	[data-scene='ufo-visit'] .beam {
		animation-name: beam-on;
	}

	[data-scene='ufo-visit'] .cap {
		animation-name: beam-cap;
	}

	[data-scene='ufo-visit'] .baby {
		animation-name: beam-baby;
	}

	[data-scene='ufo-visit'] .arms {
		animation-name: beam-wave;
	}

	[data-scene='car-honk'] .car {
		animation-name: drive-by;
	}

	[data-scene='car-honk'] .wheel {
		animation-name: spin-wheel;
	}

	[data-scene='car-honk'] .honk {
		animation-name: honk-pop;
	}

	[data-scene='car-honk'] .pair {
		animation-name: startle;
	}

	[data-scene='car-honk'] .cap {
		animation-name: honk-cap;
	}

	[data-scene='car-honk'] .baby {
		animation-name: honk-baby;
	}

	[data-scene='car-honk'] .eye {
		animation-name: wide-eyes;
	}

	[data-scene='car-honk'] .yawn {
		animation-name: gasp;
	}

	@keyframes fall {
		0% {
			opacity: 0;
			translate: 0 -10%;
		}

		15% {
			opacity: 100%;
			translate: 0 -10%;
		}

		45% {
			translate: 0 18%;
		}

		58% {
			translate: 0 8%;
		}

		70%,
		100% {
			opacity: 100%;
			translate: 0 18%;
		}
	}

	@keyframes shell-away {
		0% {
			opacity: 100%;
			rotate: 0deg;
			translate: 0 0;
		}

		45% {
			opacity: 100%;
			rotate: 0deg;
			translate: 0 -30%;
		}

		70%,
		100% {
			opacity: 0;
			rotate: 0deg;
			translate: 0 -60%;
		}
	}

	@keyframes dizzy {
		0%,
		68% {
			opacity: 0;
			rotate: 0deg;
			translate: 0 18%;
		}

		75% {
			opacity: 100%;
		}

		100% {
			opacity: 100%;
			rotate: 360deg;
			translate: 0 18%;
		}
	}

	@keyframes swell {
		0% {
			opacity: 100%;
			scale: 1;
			rotate: 0deg;
		}

		10% {
			rotate: -4deg;
		}

		20% {
			scale: 1.05;
			rotate: 4deg;
		}

		30% {
			rotate: -4deg;
		}

		40% {
			opacity: 100%;
			scale: 1.15;
			rotate: 0deg;
		}

		45%,
		100% {
			opacity: 0;
			scale: 1.2;
		}
	}

	@keyframes cap-flies {
		0%,
		44% {
			opacity: 100%;
			rotate: 0deg;
			translate: 0 0;
		}

		100% {
			opacity: 0;
			rotate: -120deg;
			translate: -60% -80%;
		}
	}

	@keyframes bottom-drops {
		0%,
		44% {
			opacity: 100%;
			rotate: 0deg;
			translate: 0 0;
		}

		100% {
			opacity: 0;
			rotate: 30deg;
			translate: 30% 60%;
		}
	}

	@keyframes shard-flies {
		0%,
		44% {
			opacity: 0;
			translate: 0 0;
		}

		50% {
			opacity: 100%;
		}

		100% {
			opacity: 0;
			translate: calc(var(--dd-space-xl) * 1.5) 0;
		}
	}

	@keyframes pop-out {
		0%,
		44% {
			opacity: 0;
			scale: 0.3;
		}

		60% {
			opacity: 100%;
			scale: 1.15;
		}

		75% {
			scale: 0.95;
		}

		100% {
			opacity: 100%;
			scale: 1;
		}
	}

	@keyframes three-jumps {
		0%,
		16%,
		36%,
		58% {
			opacity: 100%;
			translate: 0 0;
		}

		8% {
			translate: 0 -12%;
		}

		26% {
			translate: 0 -18%;
		}

		47% {
			translate: 0 -26%;
		}

		62%,
		100% {
			opacity: 0;
			translate: 0 0;
		}
	}

	@keyframes appear-late {
		0%,
		57% {
			opacity: 0;
		}

		60%,
		100% {
			opacity: 100%;
		}
	}

	@keyframes lift-late {
		0%,
		57% {
			opacity: 0;
			rotate: 0deg;
			translate: 0 0;
		}

		60% {
			opacity: 100%;
			rotate: 0deg;
			translate: 0 0;
		}

		85%,
		100% {
			opacity: 100%;
			rotate: -38deg;
			translate: -14% -18%;
		}
	}

	@keyframes emerge-late {
		0%,
		60% {
			opacity: 0;
			translate: 0 30%;
		}

		85% {
			opacity: 100%;
			translate: 0 -6%;
		}

		100% {
			opacity: 100%;
			translate: 0 0;
		}
	}

	@keyframes ajar {
		0% {
			rotate: 0deg;
			translate: 0 0;
		}

		15%,
		55% {
			rotate: -26deg;
			translate: 0 0;
		}

		62%,
		72% {
			rotate: 0deg;
			translate: 0 0;
		}

		88%,
		100% {
			rotate: -38deg;
			translate: -14% -18%;
		}
	}

	@keyframes peek {
		0% {
			translate: 0 30%;
		}

		15%,
		48% {
			translate: 0 4%;
		}

		25% {
			translate: -6% 4%;
		}

		38% {
			translate: 6% 4%;
		}

		60%,
		72% {
			translate: 0 30%;
		}

		85% {
			translate: 0 -8%;
		}

		100% {
			translate: 0 0;
		}
	}

	@keyframes cork-pop {
		0% {
			rotate: 0deg;
			translate: 0 0;
			scale: 1;
		}

		6% {
			rotate: -6deg;
		}

		12% {
			rotate: 6deg;
		}

		18% {
			rotate: 0deg;
			translate: 0 0;
			scale: 1;
		}

		34% {
			rotate: 200deg;
			translate: 0 -130%;
			scale: 0.8;
		}

		46% {
			rotate: 330deg;
			translate: 0 -140%;
			scale: 0.65;
		}

		70% {
			rotate: 372deg;
			translate: 0 -57%;
			scale: 0.6;
		}

		76% {
			translate: 0 -50%;
		}

		84% {
			translate: 0 -60%;
		}

		92%,
		100% {
			rotate: 372deg;
			translate: 0 -57%;
			scale: 0.6;
		}
	}

	@keyframes cork-bonk {
		0%,
		18% {
			translate: 0 0;
			scale: 1;
		}

		26% {
			translate: 0 -8%;
			scale: 0.95 1.06;
		}

		36%,
		70% {
			translate: 0 0;
			scale: 1;
		}

		76% {
			scale: 1.06 0.92;
		}

		84% {
			scale: 0.98 1.03;
		}

		92%,
		100% {
			translate: 0 0;
			scale: 1;
		}
	}

	@keyframes cork-blink {
		0%,
		70% {
			scale: 1;
		}

		75%,
		84% {
			scale: 1 0.2;
		}

		92%,
		100% {
			scale: 1;
		}
	}

	@keyframes spin-whole {
		0% {
			opacity: 100%;
			scale: 1;
			rotate: 0deg;
		}

		12% {
			scale: -1 1;
			rotate: -3deg;
		}

		22% {
			scale: 1;
			rotate: 3deg;
		}

		31% {
			scale: -1 1;
			rotate: -3deg;
		}

		38% {
			scale: 1;
			rotate: 3deg;
		}

		44% {
			scale: -1 1;
			rotate: -3deg;
		}

		50% {
			opacity: 100%;
			scale: 1;
			rotate: 0deg;
		}

		51%,
		100% {
			opacity: 0;
			scale: 1;
		}
	}

	@keyframes appear-half {
		0%,
		50% {
			opacity: 0;
		}

		51%,
		100% {
			opacity: 100%;
		}
	}

	@keyframes cap-off-half {
		0%,
		50% {
			opacity: 0;
			rotate: 0deg;
			translate: 0 0;
		}

		51% {
			opacity: 100%;
			rotate: 0deg;
			translate: 0 0;
		}

		64% {
			opacity: 100%;
			rotate: -30deg;
			translate: -10% -40%;
		}

		74%,
		100% {
			opacity: 0;
			rotate: -60deg;
			translate: -30% -70%;
		}
	}

	@keyframes spin-baby {
		0%,
		50% {
			opacity: 0;
			translate: 0 30%;
			scale: 1;
			rotate: 0deg;
		}

		51% {
			opacity: 100%;
			translate: 0 30%;
			scale: 1;
		}

		59% {
			translate: 0 10%;
			scale: -1 1;
		}

		67% {
			translate: 0 0;
			scale: 1;
		}

		76% {
			scale: -1 1;
		}

		84% {
			scale: 1;
			rotate: 0deg;
		}

		88% {
			rotate: -14deg;
		}

		92% {
			rotate: 10deg;
		}

		96% {
			rotate: -6deg;
		}

		100% {
			opacity: 100%;
			translate: 0 0;
			scale: 1;
			rotate: 0deg;
		}
	}

	@keyframes cap-off {
		0% {
			opacity: 100%;
			rotate: 0deg;
			translate: 0 0;
		}

		8% {
			rotate: -8deg;
		}

		22% {
			opacity: 100%;
			rotate: -30deg;
			translate: -10% -40%;
		}

		34%,
		100% {
			opacity: 0;
			rotate: -60deg;
			translate: -30% -70%;
		}
	}

	@keyframes waddle {
		0%,
		16% {
			translate: 0 0;
			rotate: 0deg;
		}

		28% {
			translate: 0 -10%;
			rotate: 0deg;
		}

		36% {
			translate: -8% -12%;
			rotate: -10deg;
		}

		44% {
			translate: -16% -10%;
			rotate: 10deg;
		}

		52% {
			translate: -22% -12%;
			rotate: -10deg;
		}

		60% {
			translate: -12% -10%;
			rotate: 10deg;
		}

		68% {
			translate: 0 -12%;
			rotate: -10deg;
		}

		76% {
			translate: 12% -10%;
			rotate: 10deg;
		}

		84% {
			translate: 18% -12%;
			rotate: -10deg;
		}

		92% {
			translate: 8% -10%;
			rotate: 5deg;
		}

		100% {
			translate: 0 -10%;
			rotate: 0deg;
		}
	}

	@keyframes step-left {
		0%,
		18% {
			opacity: 0;
			translate: 0 0;
		}

		26% {
			opacity: 100%;
		}

		36%,
		52%,
		68%,
		84% {
			translate: 0 calc(var(--dd-space-xs) * -1);
		}

		44%,
		60%,
		76%,
		92%,
		100% {
			opacity: 100%;
			translate: 0 0;
		}
	}

	@keyframes step-right {
		0%,
		18% {
			opacity: 0;
			translate: 0 0;
		}

		26% {
			opacity: 100%;
		}

		44%,
		60%,
		76%,
		92% {
			translate: 0 calc(var(--dd-space-xs) * -1);
		}

		36%,
		52%,
		68%,
		84%,
		100% {
			opacity: 100%;
			translate: 0 0;
		}
	}

	@keyframes hop-in {
		0%,
		8% {
			translate: 0 0;
		}

		24% {
			translate: 0 -45%;
		}

		36% {
			translate: 0 -42%;
		}

		48% {
			translate: 0 4%;
		}

		54%,
		100% {
			translate: 0 0;
		}
	}

	@keyframes turn-over {
		0%,
		12% {
			rotate: 0deg;
			translate: 0 0;
		}

		26% {
			rotate: 180deg;
			translate: 0 -20%;
		}

		40% {
			rotate: 360deg;
			translate: 0 0;
		}

		44% {
			translate: 0 -4%;
		}

		48%,
		100% {
			rotate: 360deg;
			translate: 0 0;
		}
	}

	@keyframes rock {
		0%,
		48% {
			rotate: 0deg;
			translate: 0 0;
		}

		58% {
			rotate: 4deg;
			translate: 2% 0;
		}

		68% {
			rotate: -3deg;
			translate: 4% 0;
		}

		78% {
			rotate: 4deg;
			translate: 6% 0;
		}

		88% {
			rotate: -3deg;
			translate: 7% 0;
		}

		100% {
			rotate: 0deg;
			translate: 8% 0;
		}
	}

	@keyframes row {
		0%,
		46% {
			opacity: 0;
			rotate: 0deg;
		}

		52%,
		72%,
		92% {
			opacity: 100%;
			rotate: -18deg;
		}

		62%,
		82% {
			rotate: 8deg;
		}

		100% {
			opacity: 100%;
			rotate: -5deg;
		}
	}

	@keyframes ripple {
		0%,
		40% {
			opacity: 0;
			translate: 0 0;
		}

		52% {
			opacity: 100%;
			translate: -3% 0;
		}

		70% {
			translate: 3% 0;
		}

		85% {
			translate: -3% 0;
		}

		100% {
			opacity: 100%;
			translate: 0 0;
		}
	}

	@keyframes heave {
		0% {
			rotate: 0deg;
			translate: 0 0;
			scale: 1;
		}

		6% {
			rotate: -3deg;
		}

		12% {
			rotate: 3deg;
		}

		18% {
			rotate: 0deg;
			translate: 0 -10%;
			scale: 1;
		}

		32% {
			translate: 0 -40%;
			scale: 0.75;
		}

		40% {
			translate: 0 -34%;
			scale: 0.72;
		}

		56% {
			rotate: -4deg;
			translate: 0 -69%;
			scale: 0.5;
		}

		62% {
			rotate: 4deg;
		}

		68%,
		84% {
			rotate: 0deg;
			translate: 0 -69%;
		}

		76%,
		90% {
			translate: 0 calc(-69% - var(--dd-space-xs));
		}

		100% {
			rotate: 0deg;
			translate: 0 -69%;
			scale: 0.5;
		}
	}

	@keyframes arms-heave {
		0%,
		20% {
			opacity: 0;
			scale: 1 0.1;
		}

		26% {
			opacity: 100%;
			scale: 1 0.2;
		}

		32%,
		40% {
			scale: 1 0.5;
		}

		56%,
		68%,
		84% {
			scale: 1;
		}

		76%,
		90% {
			scale: 1 1.08;
		}

		100% {
			opacity: 100%;
			scale: 1;
		}
	}

	@keyframes strain {
		0%,
		18% {
			translate: 0 0;
			scale: 1;
		}

		40% {
			translate: 0 11%;
			scale: 1.04 0.96;
		}

		56%,
		100% {
			translate: 0 9%;
			scale: 1;
		}
	}

	@keyframes squint {
		0%,
		28% {
			scale: 1;
		}

		34%,
		48% {
			scale: 1 0.35;
		}

		56%,
		100% {
			scale: 1;
		}
	}

	@keyframes stretch {
		0% {
			opacity: 0;
			translate: 0 30%;
			scale: 1;
			rotate: 0deg;
		}

		4% {
			opacity: 100%;
		}

		18%,
		28% {
			translate: 0 0;
			scale: 1;
			rotate: 0deg;
		}

		40% {
			scale: 0.96 1.08;
			rotate: -5deg;
		}

		52% {
			scale: 0.96 1.08;
			rotate: 5deg;
		}

		62%,
		100% {
			opacity: 100%;
			translate: 0 0;
			scale: 1;
			rotate: 0deg;
		}
	}

	@keyframes arms-stretch {
		0%,
		28% {
			opacity: 0;
			scale: 1 0.2;
		}

		30% {
			opacity: 100%;
			scale: 1 0.35;
		}

		40%,
		56% {
			scale: 1;
		}

		64% {
			opacity: 100%;
			scale: 1 0.2;
		}

		66%,
		100% {
			opacity: 0;
			scale: 1 0.2;
		}
	}

	@keyframes yawn {
		0%,
		24% {
			opacity: 0;
			scale: 0.2;
		}

		26% {
			opacity: 100%;
			scale: 0.3;
		}

		34% {
			scale: 1;
		}

		48% {
			scale: 1.1;
		}

		56% {
			opacity: 100%;
			scale: 0.2;
		}

		58%,
		100% {
			opacity: 0;
			scale: 0.2;
		}
	}

	@keyframes sleepy {
		0%,
		24% {
			scale: 1;
		}

		30%,
		50% {
			scale: 1 0.25;
		}

		58%,
		100% {
			scale: 1;
		}
	}

	@keyframes sleepy-wink {
		0%,
		24% {
			scale: 1;
		}

		30%,
		50% {
			scale: 1 0.25;
		}

		58%,
		72% {
			scale: 1;
		}

		78%,
		90% {
			scale: 1 0.15;
		}

		96%,
		100% {
			scale: 1;
		}
	}

	@keyframes twin-first {
		0%,
		16% {
			opacity: 0;
			translate: 0 60%;
			rotate: 0deg;
		}

		18% {
			opacity: 100%;
		}

		28% {
			translate: 0 -8%;
		}

		34%,
		62% {
			translate: 0 0;
			rotate: 0deg;
		}

		68%,
		76% {
			rotate: 8deg;
		}

		82%,
		94% {
			translate: 0 0;
			rotate: 0deg;
		}

		88% {
			translate: 0 -8%;
		}

		100% {
			opacity: 100%;
			translate: 0 0;
			rotate: 0deg;
		}
	}

	@keyframes twin-second {
		0%,
		40% {
			opacity: 0;
			translate: 0 60%;
			rotate: 0deg;
		}

		42% {
			opacity: 100%;
		}

		50% {
			translate: 0 -10%;
		}

		56%,
		62% {
			translate: 0 0;
			rotate: 0deg;
		}

		68%,
		76% {
			rotate: -8deg;
		}

		82%,
		94% {
			translate: 0 0;
			rotate: 0deg;
		}

		88% {
			translate: 0 -8%;
		}

		100% {
			opacity: 100%;
			translate: 0 0;
			rotate: 0deg;
		}
	}

	@keyframes roll-away {
		0% {
			opacity: 100%;
			translate: 0 0;
			rotate: 0deg;
		}

		12% {
			translate: -8% 0;
			rotate: -15deg;
			animation-timing-function: var(--dd-easing-exit);
		}

		36% {
			opacity: 100%;
			translate: 130% 0;
			rotate: 260deg;
		}

		37%,
		100% {
			opacity: 0;
			translate: 130% 0;
			rotate: 260deg;
		}
	}

	@keyframes roll-back {
		0%,
		38% {
			opacity: 0;
			translate: -130% 0;
			rotate: -260deg;
		}

		39% {
			opacity: 100%;
			translate: -130% 0;
			rotate: -260deg;
		}

		72% {
			translate: 5% 0;
			rotate: 10deg;
		}

		84% {
			translate: -2% 0;
			rotate: -4deg;
		}

		100% {
			opacity: 100%;
			translate: 0 0;
			rotate: 0deg;
		}
	}

	@keyframes gone {
		0%,
		100% {
			opacity: 0;
		}
	}

	@keyframes chef-rise {
		0%,
		10% {
			opacity: 0;
			translate: 0 30%;
			rotate: 0deg;
		}

		14% {
			opacity: 100%;
		}

		36% {
			opacity: 100%;
			translate: 0 -6%;
			rotate: 0deg;
		}

		46% {
			translate: 0 0;
		}

		58% {
			rotate: -3deg;
		}

		70% {
			rotate: 3deg;
		}

		82%,
		100% {
			opacity: 100%;
			translate: 0 0;
			rotate: 0deg;
		}
	}

	@keyframes toque-drop {
		0%,
		34% {
			opacity: 0;
			translate: 0 -60%;
		}

		38% {
			opacity: 100%;
			translate: 0 -60%;
		}

		50% {
			translate: 0 6%;
		}

		58%,
		100% {
			opacity: 100%;
			translate: 0 0;
		}
	}

	@keyframes serve {
		0%,
		30% {
			opacity: 0;
			translate: 0 var(--dd-space-sm);
			scale: 0.8;
		}

		40% {
			opacity: 100%;
			translate: 0 calc(var(--dd-space-sm) * -1);
			scale: 1;
		}

		52%,
		60% {
			opacity: 100%;
			translate: 0 calc(var(--dd-space-sm) * -1.5);
			scale: 1.12;
		}

		76% {
			translate: 0 0;
			scale: 1;
		}

		88% {
			opacity: 100%;
		}

		100% {
			opacity: 0;
			translate: 0 0;
			scale: 1;
		}
	}

	@keyframes steam-rise {
		0%,
		36% {
			opacity: 0;
			translate: 0 0;
		}

		50% {
			opacity: 100%;
			translate: 0 calc(var(--dd-space-xs) * -1);
		}

		76% {
			opacity: 100%;
			translate: 0 calc(var(--dd-space-xs) * -2);
		}

		92%,
		100% {
			opacity: 0;
			translate: 0 calc(var(--dd-space-xs) * -3);
		}
	}

	@keyframes saucer-visit {
		0% {
			opacity: 100%;
			translate: 0 -150%;
		}

		18% {
			translate: 0 0;
		}

		34%,
		70% {
			translate: 0 calc(var(--dd-space-xs) * 0.5);
		}

		52% {
			translate: 0 calc(var(--dd-space-xs) * -0.5);
		}

		78% {
			opacity: 100%;
			translate: 0 0;
			animation-timing-function: var(--dd-easing-exit);
		}

		92% {
			opacity: 100%;
			translate: 0 -150%;
		}

		100% {
			opacity: 0;
			translate: 0 -150%;
		}
	}

	@keyframes beam-on {
		0%,
		20% {
			opacity: 0;
			scale: 1 0.2;
		}

		34%,
		66% {
			opacity: 100%;
			scale: 1;
		}

		78%,
		100% {
			opacity: 0;
			scale: 1;
		}
	}

	@keyframes beam-cap {
		0%,
		30% {
			opacity: 100%;
			rotate: 0deg;
			translate: 0 0;
		}

		46% {
			opacity: 100%;
			rotate: -10deg;
			translate: -6% -25%;
		}

		60%,
		100% {
			opacity: 0;
			rotate: -16deg;
			translate: -10% -45%;
		}
	}

	@keyframes beam-baby {
		0%,
		36% {
			opacity: 0;
			translate: 0 30%;
		}

		38% {
			opacity: 100%;
		}

		60%,
		72% {
			opacity: 100%;
			translate: 0 -5%;
		}

		86%,
		100% {
			opacity: 100%;
			translate: 0 0;
		}
	}

	@keyframes beam-wave {
		0%,
		56% {
			opacity: 0;
			scale: 1 0.2;
			rotate: 0deg;
		}

		60% {
			opacity: 100%;
			scale: 1 0.35;
		}

		66% {
			scale: 1;
			rotate: 0deg;
		}

		72%,
		84% {
			rotate: -8deg;
		}

		78% {
			rotate: 8deg;
		}

		90% {
			opacity: 100%;
			scale: 1;
			rotate: 0deg;
		}

		94% {
			opacity: 100%;
			scale: 1 0.2;
		}

		96%,
		100% {
			opacity: 0;
			scale: 1 0.2;
		}
	}

	@keyframes drive-by {
		0% {
			opacity: 100%;
			translate: -220% 0;
			rotate: 0deg;
		}

		22% {
			translate: 0 0;
			rotate: 0deg;
		}

		26% {
			rotate: -2deg;
		}

		30%,
		40% {
			translate: 0 calc(var(--dd-space-xs) * -0.75);
			rotate: 0deg;
		}

		34%,
		44% {
			translate: 0 0;
		}

		66% {
			translate: 0 0;
			animation-timing-function: var(--dd-easing-exit);
		}

		98% {
			opacity: 100%;
			translate: 220% 0;
		}

		100% {
			opacity: 0;
			translate: 220% 0;
		}
	}

	@keyframes spin-wheel {
		0% {
			rotate: 0deg;
		}

		22%,
		66% {
			rotate: 1080deg;
		}

		98%,
		100% {
			rotate: 2160deg;
		}
	}

	@keyframes honk-pop {
		0%,
		24% {
			opacity: 0;
			scale: 0.3;
		}

		28%,
		38% {
			opacity: 100%;
			scale: 1.2;
		}

		32%,
		42%,
		62% {
			opacity: 100%;
			scale: 1;
		}

		70%,
		100% {
			opacity: 0;
			scale: 0.8;
		}
	}

	@keyframes startle {
		0%,
		26%,
		34%,
		44%,
		100% {
			translate: 0 0;
		}

		30%,
		40% {
			translate: 0 -4%;
		}
	}

	@keyframes honk-cap {
		0%,
		26%,
		34%,
		44% {
			opacity: 100%;
			rotate: 0deg;
			translate: 0 0;
		}

		30%,
		40% {
			opacity: 100%;
			rotate: 0deg;
			translate: 0 -4%;
		}

		46% {
			opacity: 100%;
			rotate: 0deg;
			translate: 0 0;
		}

		60% {
			opacity: 100%;
			rotate: -140deg;
			translate: -50% -140%;
		}

		72%,
		100% {
			opacity: 0;
			rotate: -180deg;
			translate: -60% -120%;
		}
	}

	@keyframes honk-baby {
		0%,
		46% {
			opacity: 0;
			translate: 0 30%;
			scale: 0.8;
		}

		48% {
			opacity: 100%;
			translate: 0 30%;
			scale: 0.8;
		}

		58% {
			translate: 0 -12%;
			scale: 1.08;
		}

		66%,
		100% {
			opacity: 100%;
			translate: 0 0;
			scale: 1;
		}
	}

	@keyframes wide-eyes {
		0%,
		50%,
		88%,
		100% {
			scale: 1;
		}

		54%,
		80% {
			scale: 1.3;
		}
	}

	@keyframes gasp {
		0%,
		50%,
		86%,
		100% {
			opacity: 0;
			scale: 0.5;
		}

		52%,
		80% {
			opacity: 100%;
			scale: 0.5;
		}
	}
</style>
