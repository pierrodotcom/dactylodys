<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { companionAppearance } from '$lib/ui/companion/appearance';
	import CompanionItem from '$lib/ui/companion/CompanionItem.svelte';
	import { starPath } from '$lib/ui/companion/geometry';
	import { ARM_POSES, TRICK_ARMS, wornBySlot, type ArmPose } from '$lib/ui/companion/items';

	type Mood = 'idle' | 'happy' | 'oops' | 'cheer';

	interface Props {
		mood: Mood;
		/** Which dance it does when it cheers: they follow one another (ADR-032). */
		dance?: number;
		/** Overrides the colour given by the route (`provideCompanionAppearance`); `null`: its own colour. */
		colorId?: string | null;
		/** Overrides the worn items given by the route: `RewardDefinition.artId`, one per slot. */
		itemArtIds?: readonly string[];
		/** A learned trick (skill `artId`) played once; re-key the component to play it again. */
		trick?: string | null;
	}

	const LABELS: Readonly<Record<Mood, () => string>> = {
		idle: m.ui_companion_idle,
		happy: m.ui_companion_happy,
		oops: m.ui_companion_oops,
		cheer: m.ui_companion_cheer
	};
	const SPARKLE_PATH = 'M16 22L18.5 28L25 30.5L18.5 33L16 39L13.5 33L7 30.5L13.5 28Z';

	/** Number of different dances; the first one is the hop of every cheer. */
	const DANCES = 5;

	/** Three tomatoes on a circle around (60, 40) that goes through both raised hands. */
	const TOMATOES = [
		{ x: 60, y: 4 },
		{ x: 91.2, y: 22 },
		{ x: 28.8, y: 22 }
	] as const;
	const TOMATO_LEAVES = TOMATOES.map((tomato) => starPath(tomato.x, tomato.y - 6, 3.6, 1.5));

	let { mood, dance = 0, colorId, itemArtIds, trick = null }: Props = $props();

	const appearance = companionAppearance();
	const color = $derived(colorId === undefined ? appearance().colorId : colorId);
	const items = $derived(itemArtIds ?? appearance().itemArtIds);
	const worn = $derived(wornBySlot(items));
	const wornIds = $derived(Object.values(worn));

	const danceIndex = $derived(((dance % DANCES) + DANCES) % DANCES);

	const label = $derived(LABELS[mood]());
	const restArms = $derived<ArmPose>(mood === 'cheer' ? 'up' : 'down');
	const trickArms = $derived<ArmPose | undefined>(trick === null ? undefined : TRICK_ARMS[trick]);
	const smiling = $derived(mood === 'happy' || mood === 'cheer');
</script>

{#snippet arms(pose: ArmPose)}
	{#each ARM_POSES[pose].arms as arm (arm.cx)}
		<ellipse class="body line" cx={arm.cx} cy={arm.cy} rx={arm.rx} ry={arm.ry} />
	{/each}
	{#if worn.hand}
		<CompanionItem artId={worn.hand} grip={ARM_POSES[pose].grip} />
	{/if}
{/snippet}

{#snippet front(artId: string | undefined)}
	{#if artId}
		<CompanionItem {artId} />
	{/if}
{/snippet}

<svg
	class="companion"
	viewBox="0 0 120 120"
	role="img"
	aria-label={label}
	data-mood={mood}
	data-dance={danceIndex}
	data-color={color ?? undefined}
	data-items={items.join(' ') || undefined}
	data-trick={trick ?? undefined}
>
	{#if trick === 'float'}
		<ellipse class="shadow trick appear" cx="60" cy="116" rx="24" ry="3.5" />
	{:else if trick === 'cartwheel'}
		<path class="open line trick appear" d="M10 44A52 52 0 0 1 44 9M110 76A52 52 0 0 1 76 111" />
	{/if}
	{#if mood === 'cheer'}
		<path class="sparkle line" d={SPARKLE_PATH} />
		<path class="sparkle line" d={SPARKLE_PATH} transform="translate(86 -4)" />
	{/if}
	<g class="dino">
		<g class="pose trick">
			{#if trick === 'juggle'}
				<g class="trick appear">
					<g class="juggle-orbit">
						{#each TOMATOES as tomato, i (tomato.x)}
							<circle class="tomato line" cx={tomato.x} cy={tomato.y} r="7.5" />
							<path class="leaf line" d={TOMATO_LEAVES[i]} />
						{/each}
					</g>
				</g>
			{/if}
			{#each wornIds as artId (artId)}
				<CompanionItem {artId} layer="back" />
			{/each}
			<path class="body line" d="M88 92Q114 98 108 68Q100 86 86 82Z" />
			<g class="plates trick">
				<path class="plate line" d="M40 28L45 14L53 24Z" />
				<path class="plate line" d="M52 22L60 8L68 22Z" />
				<path class="plate line" d="M67 24L75 14L80 28Z" />
			</g>
			<ellipse class="body line" cx="44" cy="107" rx="12" ry="6" />
			<ellipse class="body line" cx="76" cy="107" rx="12" ry="6" />
			<ellipse class="body line" cx="60" cy="76" rx="35" ry="31" />
			<ellipse class="belly line" cx="60" cy="93" rx="20" ry="13" />
			{@render front(worn.body)}
			{@render front(worn.back)}
			<circle class="body line" cx="60" cy="48" r="29" />
			{#if smiling}
				<circle class="cheek" cx="38" cy="60" r="5" />
				<circle class="cheek" cx="82" cy="60" r="5" />
				<path class="open line" d="M40 48Q48 38 56 48" />
				<path class="open line" d="M64 48Q72 38 80 48" />
			{:else}
				<g class="eyes">
					<circle class="white line" cx="48" cy="46" r="8" />
					<circle class="white line" cx="72" cy="46" r="8" />
					<circle class="ink" cx={mood === 'oops' ? 47 : 49} cy={mood === 'oops' ? 49 : 47} r="4" />
					<circle class="ink" cx={mood === 'oops' ? 71 : 73} cy={mood === 'oops' ? 49 : 47} r="4" />
				</g>
			{/if}
			{#if mood === 'oops'}
				<path class="open line" d="M38 38L54 33" />
				<path class="open line" d="M66 33L82 38" />
				<path class="open line" d="M52 63Q56 60 60 63Q64 66 68 63" />
			{:else if mood === 'happy'}
				<path class="ink line" d="M50 58Q60 72 70 58Z" />
			{:else if mood === 'cheer'}
				<path class="ink line" d="M47 56Q60 78 73 56Z" />
				<ellipse class="cheek" cx="60" cy="68" rx="6" ry="4" />
			{:else}
				<path class="open line" d="M52 60Q60 66 68 60" />
			{/if}
			{#if trick === 'roar'}
				<g class="trick appear">
					<path class="ink line" d="M47 58Q60 52 73 58Q72 77 60 78Q48 77 47 58Z" />
					<path class="white line" d="M51 57L54 62L57 56ZM63 56L66 62L69 57Z" />
					<path
						class="open line bold"
						d="M86 60L96 55M88 67L99 67M86 74L96 79M34 60L24 55M32 67L21 67M34 74L24 79"
					/>
				</g>
			{/if}
			{@render front(worn.neck)}
			{@render front(worn.feet)}
			{@render front(worn.face)}
			{@render front(worn.head)}
			{#if trickArms !== undefined && trickArms !== restArms}
				<g class="arms-rest trick">{@render arms(restArms)}</g>
				<g class="trick appear">{@render arms(trickArms)}</g>
			{:else}
				{@render arms(restArms)}
			{/if}
		</g>
	</g>
</svg>

<style>
	.companion {
		--dd-companion-body: var(--dd-color-companion-body);
		--dd-companion-belly: var(--dd-color-companion-belly);
		--dd-companion-plate: var(--dd-color-companion-plate);
		--dd-companion-cheek: var(--dd-color-companion-cheek);

		inline-size: var(--dd-size-companion);
		block-size: var(--dd-size-companion);
		overflow: visible;
	}

	.companion[data-color='sky'] {
		--dd-companion-body: var(--dd-color-companion-sky-body);
		--dd-companion-belly: var(--dd-color-companion-sky-belly);
		--dd-companion-plate: var(--dd-color-companion-sky-plate);
		--dd-companion-cheek: var(--dd-color-companion-sky-cheek);
	}

	.companion[data-color='violet'] {
		--dd-companion-body: var(--dd-color-companion-violet-body);
		--dd-companion-belly: var(--dd-color-companion-violet-belly);
		--dd-companion-plate: var(--dd-color-companion-violet-plate);
		--dd-companion-cheek: var(--dd-color-companion-violet-cheek);
	}

	.companion[data-color='orange'] {
		--dd-companion-body: var(--dd-color-companion-orange-body);
		--dd-companion-belly: var(--dd-color-companion-orange-belly);
		--dd-companion-plate: var(--dd-color-companion-orange-plate);
		--dd-companion-cheek: var(--dd-color-companion-orange-cheek);
	}

	.companion[data-color='pink'] {
		--dd-companion-body: var(--dd-color-companion-pink-body);
		--dd-companion-belly: var(--dd-color-companion-pink-belly);
		--dd-companion-plate: var(--dd-color-companion-pink-plate);
		--dd-companion-cheek: var(--dd-color-companion-pink-cheek);
	}

	.companion[data-color='yellow'] {
		--dd-companion-body: var(--dd-color-companion-yellow-body);
		--dd-companion-belly: var(--dd-color-companion-yellow-belly);
		--dd-companion-plate: var(--dd-color-companion-yellow-plate);
		--dd-companion-cheek: var(--dd-color-companion-yellow-cheek);
	}

	.companion[data-color='turquoise'] {
		--dd-companion-body: var(--dd-color-companion-turquoise-body);
		--dd-companion-belly: var(--dd-color-companion-turquoise-belly);
		--dd-companion-plate: var(--dd-color-companion-turquoise-plate);
		--dd-companion-cheek: var(--dd-color-companion-turquoise-cheek);
	}

	.companion[data-color='tomato'] {
		--dd-companion-body: var(--dd-color-companion-tomato-body);
		--dd-companion-belly: var(--dd-color-companion-tomato-belly);
		--dd-companion-plate: var(--dd-color-companion-tomato-plate);
		--dd-companion-cheek: var(--dd-color-companion-tomato-cheek);
	}

	.line {
		stroke: var(--dd-color-companion-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.bold {
		stroke-width: var(--dd-border-width-drawing-bold);
	}

	.body {
		fill: var(--dd-companion-body);
	}

	.belly {
		fill: var(--dd-companion-belly);
	}

	.plate {
		fill: var(--dd-companion-plate);
	}

	.white {
		fill: var(--dd-color-companion-eye);
	}

	.sparkle {
		fill: var(--dd-color-star-fill);
	}

	.cheek {
		fill: var(--dd-companion-cheek);
	}

	.ink {
		fill: var(--dd-color-companion-line);
	}

	.open {
		fill: transparent;
	}

	.tomato {
		fill: var(--dd-color-wear-red);
	}

	.leaf {
		fill: var(--dd-color-wear-leaf);
	}

	.shadow {
		fill: var(--dd-color-companion-shadow);
	}

	[data-mood='happy'] .dino,
	[data-mood='cheer'] .dino {
		animation-name: hop;
		animation-duration: var(--dd-duration-beat);
		animation-delay: var(--dd-duration-reward-delay);
		animation-timing-function: var(--dd-easing-standard);
		animation-iteration-count: 2;
	}

	[data-mood='cheer'] .dino {
		animation-iteration-count: 3;
	}

	[data-mood='cheer'] .dino {
		transform-box: fill-box;
		transform-origin: 50% 100%;
	}

	[data-mood='cheer'][data-dance='1'] .dino {
		animation-name: spin;
		animation-iteration-count: 2;
	}

	[data-mood='cheer'][data-dance='2'] .dino {
		animation-name: wiggle;
	}

	[data-mood='cheer'][data-dance='3'] .dino {
		animation-name: stretch;
	}

	[data-mood='cheer'][data-dance='4'] .dino {
		animation-name: slide;
		animation-iteration-count: 2;
	}

	[data-mood='oops'] .dino {
		animation-name: nod;
		animation-duration: var(--dd-duration-slow);
		animation-timing-function: var(--dd-easing-standard);
		animation-iteration-count: 2;
	}

	[data-mood='idle'] .eyes {
		transform-box: fill-box;
		transform-origin: center;
		animation-name: blink;
		animation-duration: var(--dd-duration-slow);
		animation-timing-function: var(--dd-easing-standard);
	}

	/*
	 * A trick goes to its pose and comes back: two runs, the second one reversed. When motion is
	 * reduced (app.css keeps one run of a millisecond) or under `data-still`, it stops on the pose.
	 */
	.trick {
		animation-duration: var(--dd-duration-trick);
		animation-timing-function: var(--dd-easing-standard);
		animation-iteration-count: 2;
		animation-direction: alternate;
		animation-fill-mode: both;
	}

	.pose,
	.plates,
	.juggle-orbit {
		transform-box: view-box;
	}

	.pose {
		transform-origin: 60px 58px;
	}

	.plates {
		transform-origin: 60px 27px;
	}

	.juggle-orbit {
		transform-origin: 60px 40px;
		animation-name: orbit;
		animation-duration: var(--dd-duration-trick-orbit);
		animation-timing-function: var(--dd-easing-steady);
		animation-iteration-count: 2;
	}

	.appear {
		animation-name: appear;
	}

	.arms-rest {
		animation-name: vanish;
	}

	.companion[data-trick='roar'] .pose {
		animation-name: shake;
		animation-duration: var(--dd-duration-trick-shake);
		animation-iteration-count: 8;
		animation-direction: normal;
		animation-fill-mode: none;
	}

	.companion[data-trick='roar'] .plates {
		animation-name: plates-up;
	}

	.companion[data-trick='handstand'] .pose {
		animation-name: handstand;
	}

	.companion[data-trick='float'] .pose {
		animation-name: float;
	}

	.companion[data-trick='cartwheel'] .pose {
		animation-name: cartwheel;
	}

	@keyframes hop {
		0%,
		100% {
			translate: 0 0;
		}
		50% {
			translate: 0 calc(var(--dd-space-md) * -1);
		}
	}

	@keyframes spin {
		0% {
			rotate: 0deg;
		}

		100% {
			rotate: 360deg;
		}
	}

	@keyframes wiggle {
		0%,
		100% {
			rotate: 0deg;
		}

		25% {
			rotate: -12deg;
		}

		75% {
			rotate: 12deg;
		}
	}

	@keyframes stretch {
		0%,
		100% {
			scale: 1 1;
		}

		40% {
			scale: 0.9 1.15;
		}

		70% {
			scale: 1.1 0.9;
		}
	}

	@keyframes slide {
		0%,
		100% {
			translate: 0 0;
		}

		25% {
			translate: calc(var(--dd-space-md) * -1) 0;
		}

		75% {
			translate: var(--dd-space-md) 0;
		}
	}

	@keyframes nod {
		0%,
		100% {
			translate: 0 0;
		}
		50% {
			translate: 0 var(--dd-space-xs);
		}
	}

	@keyframes blink {
		0%,
		100% {
			scale: 1 1;
		}
		50% {
			scale: 1 0.1;
		}
	}

	@keyframes appear {
		0%,
		20% {
			opacity: 0;
		}

		35%,
		100% {
			opacity: 100%;
		}
	}

	@keyframes vanish {
		0%,
		20% {
			opacity: 100%;
		}

		35%,
		100% {
			opacity: 0;
		}
	}

	@keyframes shake {
		0%,
		100% {
			translate: 0 0;
		}

		25% {
			translate: calc(var(--dd-space-xs) * -1) 0;
		}

		75% {
			translate: var(--dd-space-xs) 0;
		}
	}

	@keyframes plates-up {
		0%,
		15% {
			scale: 1 1;
		}

		100% {
			scale: 1.1 1.5;
		}
	}

	@keyframes handstand {
		0% {
			rotate: 0deg;
			translate: 0 0;
		}

		50% {
			translate: 0 calc(var(--dd-space-md) * -1);
		}

		100% {
			rotate: 180deg;
			translate: 0 0;
		}
	}

	@keyframes float {
		0% {
			rotate: 0deg;
			translate: 0 0;
		}

		35% {
			rotate: -5deg;
		}

		70% {
			rotate: 5deg;
		}

		100% {
			rotate: 0deg;
			translate: 0 calc(var(--dd-space-md) * -1);
		}
	}

	@keyframes cartwheel {
		0% {
			rotate: 0deg;
			translate: 0 0;
		}

		50% {
			translate: var(--dd-space-md) 0;
		}

		100% {
			rotate: 450deg;
			translate: 0 0;
		}
	}

	@keyframes orbit {
		0% {
			rotate: 0deg;
		}

		100% {
			rotate: 360deg;
		}
	}

	/* A picture of a trick (`data-still` on an ancestor) shows its pose at once, without moving. */
	:global([data-still]) .companion .trick,
	:global([data-still]) .companion .juggle-orbit,
	:global([data-still]) .companion .eyes {
		animation-duration: var(--dd-duration-instant);
		animation-delay: var(--dd-duration-instant);
		animation-iteration-count: 1;
	}

	:global([data-silhouette]) .companion :not(.open) {
		fill: var(--dd-color-silhouette);
	}

	:global([data-silhouette]) .companion * {
		stroke: var(--dd-color-silhouette);
	}
</style>
