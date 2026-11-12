<!--
	Floup, drawn as a group in its 120 x 120 frame (`shapes.ts`). When it reacts, the face it had
	while asking fades out and the new one fades in, a moment after the last key, like every reward.
-->
<script lang="ts">
	import { ANTENNA, ANTENNA_FLOWER, BODY, EYES, FACES, HEARTS, MARKS, WHIRL } from './shapes';
	import type { HostFace } from './talk';

	interface Props {
		face: HostFace;
		/** The common entrance (0 to 3) of the marks of a reaction; `null`: no entrance. */
		entrance?: number | null;
		/** The surprise scene played, which may draw a prop of its own. */
		sceneId?: string | undefined;
		/** Without the little movements of the reactions. */
		still?: boolean;
	}

	let { face, entrance = null, sceneId, still = false }: Props = $props();

	const reacting = $derived(face !== 'asking');
	/** While Floup reacts, its asking face stays under the new one until the reward starts. */
	const layers = $derived<readonly { face: HostFace; role: 'only' | 'leaving' | 'arriving' }[]>(
		reacting
			? [
					{ face: 'asking', role: 'leaving' },
					{ face, role: 'arriving' }
				]
			: [{ face: 'asking', role: 'only' }]
	);
</script>

{#snippet arms(of: HostFace)}
	<path class="limb" d={FACES[of].arms} />
	<path class="line" d={FACES[of].arms} />
{/snippet}

{#snippet features(of: HostFace)}
	{@const art = FACES[of]}
	<path class="cheek" d={EYES.cheeks} />
	{#if art.eyes.kind === 'open'}
		<path class="eye" d={EYES.whites} />
		<path class="line" d={EYES.whites} />
		<path class="pupil" d={art.eyes.pupil} />
		<path class="glint" d={art.eyes.shine} />
	{:else}
		<path class="stroke" d={art.eyes.lines} />
	{/if}
	<path class="stroke" d={art.brows} />
	{#if art.mouth.kind === 'open'}
		<path class="mouth" d={art.mouth.shape} />
		{#if art.mouth.tongue}
			<path class="tongue" d={art.mouth.tongue} />
		{/if}
		<path class="line" d={art.mouth.shape} />
	{:else}
		<path class="stroke" d={art.mouth.line} />
	{/if}
{/snippet}

<g class="floup" data-face={face} data-still={still || undefined}>
	<path class="shadow" d={BODY.shadow} />
	<g class="figure">
		<g class="shake">
			{#each layers as layer (layer.face)}
				{#if !FACES[layer.face].armsInFront}
					<g class="layer" data-role={layer.role}>{@render arms(layer.face)}</g>
				{/if}
			{/each}

			<path class="limb" d={BODY.feet} />
			<path class="line" d={BODY.feet} />

			<g class="antenna">
				<path class="stroke" d={ANTENNA.stem} />
				<path class="tuft" d={ANTENNA.ball} />
				<path class="light" d={ANTENNA.shine} />
				<path class="line" d={ANTENNA.ball} />
				{#if sceneId === 'antenna-whirl'}
					<path class="whirl" d={WHIRL} />
				{/if}
				{#if sceneId === 'flower'}
					<g class="flower">
						<path class="petal" d={ANTENNA_FLOWER.petals} />
						<path class="line" d={ANTENNA_FLOWER.petals} />
						<path class="flower-heart" d={ANTENNA_FLOWER.heart} />
						<path class="line" d={ANTENNA_FLOWER.heart} />
					</g>
				{/if}
			</g>

			<path class="body" d={BODY.outline} />
			<path class="shade" d={BODY.shade} />
			<path class="belly" d={BODY.belly} />
			<path class="shade" d={BODY.bellyShade} />
			<path class="light" d={BODY.light} />
			<path class="line" d={BODY.outline} />
			<path class="fine" d={BODY.belly} />

			{#each layers as layer (layer.face)}
				<g class="layer" data-role={layer.role}>
					{@render features(layer.face)}
					{#if FACES[layer.face].armsInFront}
						{@render arms(layer.face)}
					{/if}
				</g>
			{/each}

			{#if reacting}
				<g
					class="marks"
					data-reward={entrance === null ? undefined : true}
					data-reward-variant={entrance ?? undefined}
				>
					{#if face === 'puzzled'}
						<path class="question" d={MARKS.question.hook} />
						<path class="question-dot" d={MARKS.question.dot} />
					{:else if face === 'laughing'}
						<path class="tear" d={MARKS.tears} />
						<path class="fine" d={MARKS.tears} />
					{:else}
						<path class="sparkle" d={MARKS.sparkles} data-effect />
					{/if}
				</g>
			{/if}
		</g>
	</g>

	{#if sceneId === 'hearts'}
		{#each HEARTS as heart, index (heart)}
			<path class="heart" data-index={index} d={heart} />
		{/each}
	{/if}
</g>

<style>
	path {
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.shadow {
		fill: var(--dd-color-dialogue-shadow);
	}

	.body {
		fill: var(--dd-color-dialogue-host-body);
	}

	.belly {
		fill: var(--dd-color-dialogue-host-belly);
	}

	.limb {
		fill: var(--dd-color-dialogue-host-limb);
	}

	.tuft {
		fill: var(--dd-color-dialogue-host-tuft);
	}

	.cheek {
		fill: var(--dd-color-dialogue-host-cheek);
	}

	.eye {
		fill: var(--dd-color-dialogue-host-eye);
	}

	.pupil {
		fill: var(--dd-color-dialogue-line);
	}

	.question-dot {
		fill: var(--dd-color-dialogue-host-question);
	}

	.glint {
		fill: var(--dd-color-dialogue-light);
	}

	.mouth {
		fill: var(--dd-color-dialogue-host-mouth);
	}

	.tongue {
		fill: var(--dd-color-dialogue-host-tongue);
	}

	.tear {
		fill: var(--dd-color-dialogue-host-tear);
	}

	.petal {
		fill: var(--dd-color-dialogue-host-petal);
	}

	.flower-heart {
		fill: var(--dd-color-dialogue-host-flower);
	}

	.heart {
		fill: var(--dd-color-dialogue-host-heart);
		stroke: var(--dd-color-dialogue-line);
		stroke-width: var(--dd-border-width-thin);
	}

	.sparkle {
		fill: var(--dd-color-dialogue-host-sparkle);
		stroke: var(--dd-color-dialogue-line);
		stroke-width: var(--dd-border-width-thin);
	}

	.shade {
		fill: var(--dd-color-dialogue-shade);
		fill-opacity: var(--dd-opacity-dialogue-shade);
	}

	.light {
		fill: var(--dd-color-dialogue-light);
		fill-opacity: var(--dd-opacity-dialogue-light);
	}

	.line,
	.fine,
	.stroke,
	.question,
	.whirl {
		fill: transparent;
		stroke: var(--dd-color-dialogue-line);
	}

	.line,
	.stroke {
		stroke-width: var(--dd-border-width-thick);
	}

	.fine {
		stroke-width: var(--dd-border-width-thin);
	}

	.stroke {
		stroke-width: var(--dd-border-width-focus);
	}

	.question {
		stroke: var(--dd-color-dialogue-host-question);
		stroke-width: var(--dd-border-width-target);
	}

	.whirl {
		stroke-width: var(--dd-border-width-thick);
	}

	/* The face of the question fades out as the reaction fades in, once the group is done. */
	.layer[data-role='leaving'] {
		animation-name: face-out;
		animation-duration: var(--dd-duration-fast);
		animation-delay: var(--dd-duration-reward-delay);
		animation-fill-mode: both;
	}

	.layer[data-role='arriving'] {
		animation-name: face-in;
		animation-duration: var(--dd-duration-fast);
		animation-delay: var(--dd-duration-reward-delay);
		animation-fill-mode: both;
	}

	/* Floup shakes with laughter, a few times, without any flash. */
	.floup[data-face='laughing']:not([data-still]) .shake {
		transform-box: fill-box;
		transform-origin: 50% 100%;
		animation-name: laugh;
		animation-duration: var(--dd-duration-dialogue-laugh);
		animation-delay: var(--dd-duration-reward-delay);
		animation-iteration-count: 4;
		animation-timing-function: var(--dd-easing-standard);
	}

	@keyframes face-out {
		from {
			opacity: 100%;
		}

		to {
			opacity: 0;
		}
	}

	@keyframes face-in {
		from {
			opacity: 0;
		}

		to {
			opacity: 100%;
		}
	}

	@keyframes laugh {
		0%,
		100% {
			rotate: 0deg;
		}

		25% {
			rotate: -4deg;
		}

		75% {
			rotate: 4deg;
		}
	}
</style>
