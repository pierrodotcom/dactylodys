<svelte:options namespace="svg" />

<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import StoryDino from '../StoryDino.svelte';

	interface Props {
		/** One of `STORY_ART_GROUPS.circuit`. */
		art: string;
	}

	let { art }: Props = $props();

	/** The twelve marks of the station clock, every 30 degrees; the four main ones are longer. */
	const CLOCK_MARKS = Array.from({ length: 12 }, (_, i) => {
		const angle = (i * Math.PI) / 6;
		const inner = i % 3 === 0 ? 6.5 : 8;
		return {
			id: i,
			x1: 41 + inner * Math.sin(angle),
			y1: 28 - inner * Math.cos(angle),
			x2: 41 + 9.5 * Math.sin(angle),
			y2: 28 - 9.5 * Math.cos(angle)
		};
	});

	const CONFETTI = [
		{ x: 14, y: 12, r: 20, tone: 'tone-a' },
		{ x: 30, y: 26, r: -30, tone: 'tone-c' },
		{ x: 52, y: 8, r: 45, tone: 'tone-e' },
		{ x: 112, y: 10, r: -15, tone: 'tone-d' },
		{ x: 128, y: 26, r: 30, tone: 'tone-b' },
		{ x: 146, y: 8, r: -40, tone: 'tone-f' },
		{ x: 104, y: 34, r: 10, tone: 'tone-g' },
		{ x: 8, y: 34, r: 60, tone: 'tone-h' }
	] as const;
</script>

{#snippet cloud(x: number, y: number)}
	<path class="line white" d="M{x} {y}h24a5 5 0 0 0 -4 -9a7 7 0 0 0 -12 -2a6 6 0 0 0 -8 11z" />
{/snippet}

{#snippet road(top: number)}
	<rect class="line soil" x="-2" y={top} width="164" height={102 - top} />
	{#each [0, 1, 2, 3, 4, 5, 6, 7] as i (i)}
		<rect
			class="line {i % 2 === 0 ? 'red' : 'white'}"
			x={i * 20 - 2}
			y={top - 3}
			width="20"
			height="4"
		/>
	{/each}
{/snippet}

<!-- A race car seen from the side, nose to the left, wheels on y = 0. -->
{#snippet raceCar(tone: string, driven: boolean, learner: boolean)}
	<path class="line {tone}" d="M-4 -18Q-4 -12 2 -12L18 -12L18 -18Z" />
	<path
		class="line {tone}"
		d="M2 -14L4 -22Q6 -28 16 -29L40 -33L44 -40L88 -40L92 -35Q104 -38 116 -35L128 -35L130 -14Z"
	/>
	<path class="line white" d="M10 -24L129 -24L129 -20L7 -20Z" />
	<path class="line bold open" d="M118 -36L118 -46" />
	<path class="line dark" d="M106 -50Q106 -52 108 -52L134 -52Q136 -52 136 -50L136 -46L106 -46Z" />
	{#if driven}
		<path class="line open" d="M50 -44L42 -35" />
		<ellipse
			class="line bold open"
			cx="50"
			cy="-44"
			rx="2.4"
			ry="6"
			transform="rotate(-15 50 -44)"
		/>
	{/if}
	<path class="line glass" d="M38 -33Q38 -45 47 -48L49 -40L44 -40Z" />
	{#if learner}
		<circle class="line red" cx="68" cy="-27" r="10.5" />
		<text class="learner" x="68" y="-27" text-anchor="middle" dominant-baseline="central"
			>{m.story_art_learner()}</text
		>
	{/if}
	{#each [28, 104] as wheel (wheel)}
		<circle class="line dark" cx={wheel} cy="-11" r="11" />
		<circle class="line metal" cx={wheel} cy="-11" r="4.5" />
	{/each}
{/snippet}

<!-- A laughing spectator, sitting with its seat on (0, 0). -->
{#snippet spectator(tone: string)}
	<path class="line {tone}" d="M-7 2L-6 -11Q0 -15 6 -11L7 2Z" />
	<circle class="line sand" cx="0" cy="-20" r="6.5" />
	<path class="line open" d="M-4.5 -21Q-3 -23.5 -1.5 -21M1.5 -21Q3 -23.5 4.5 -21" />
	<path class="line ink" d="M-3.5 -17.5Q0 -11 3.5 -17.5Z" />
	<path class="line water" d="M-6.5 -19q-1.5 2.5 0 3.2q1.5 -0.7 0 -3.2Z" />
	<path class="line open" d="M-6 -8Q-1 -4 3 -7" />
{/snippet}

<!-- A plain race helmet seen from the side, visor to the left, centred on (0, 0). -->
{#snippet helmet(tone: string)}
	<path class="line {tone}" d="M-8 5Q-9 -8 0 -8Q9 -8 8 5Z" />
	<path class="line ink" d="M-8.5 -1L-2 -1Q0 -1 0 1L0 2Q0 3 -2 3L-8.5 3Z" />
{/snippet}

{#if art === 'circuit-opening'}
	<g data-story-art="circuit-opening">
		<rect class="sky" x="0" y="0" width="160" height="66" />
		{@render cloud(22, 22)}
		{@render cloud(118, 14)}
		<path class="line grass" d="M-2 66Q40 52 80 62Q120 52 162 64L162 78L-2 78Z" />
		{@render road(78)}
		{#each [0, 1, 2, 3, 4] as row (row)}
			{#each [0, 1] as col (col)}
				<rect
					class={(row + col) % 2 === 0 ? 'dark' : 'white'}
					x={2 + col * 4}
					y={80 + row * 4.4}
					width="4"
					height="4.4"
				/>
			{/each}
		{/each}
		<rect class="line open" x="2" y="80" width="8" height="22" />
		<StoryDino x={53} y={8} size={54} />
		<g transform="translate(14 92)">
			{@render raceCar('tone-b', true, true)}
		</g>
	</g>
{:else if art === 'circuit-horn'}
	<g data-story-art="circuit-horn">
		<rect class="sky" x="0" y="0" width="160" height="66" />
		<rect class="line page" x="-2" y="4" width="164" height="44" />
		<g transform="translate(14 47) rotate(22)">{@render spectator('tone-e')}</g>
		<g transform="translate(40 47) rotate(-14)">{@render spectator('tone-d')}</g>
		<g transform="translate(66 47) rotate(24)">{@render spectator('tone-g')}</g>
		<g transform="translate(112 47) rotate(-18)">{@render spectator('tone-h')}</g>
		<!-- This one fell backwards off the bench. -->
		<path class="line tone-c" d="M137 46L131 27L136 25L142 46ZM146 46L152 25L157 27L151 46Z" />
		<ellipse class="line dark" cx="132" cy="25" rx="5" ry="3" transform="rotate(-25 132 25)" />
		<ellipse class="line dark" cx="156" cy="25" rx="5" ry="3" transform="rotate(25 156 25)" />
		{#each [0, 1, 2, 3, 4, 5, 6, 7, 8] as i (i)}
			<path
				class="line {i % 2 === 0 ? 'red' : 'white'}"
				d="M{i * 18 - 2} -2L{i * 18 + 16} -2L{i * 18 + 16} 6Q{i * 18 + 7} 12 {i * 18 - 2} 6Z"
			/>
		{/each}
		<rect class="line wood" x="-2" y="42" width="164" height="7" />
		<rect class="line grass" x="-2" y="49" width="164" height="26" />
		{@render road(76)}
		<StoryDino x={77} y={33} size={40} />
		<g transform="translate(48 94) scale(0.75)">
			{@render raceCar('tone-b', false, false)}
		</g>
		<g transform="rotate(16 86 63)">
			<path class="line star" d="M84 61L62 61L32 49L32 77L62 65L84 65Z" />
			<ellipse class="line star" cx="32" cy="63" rx="4" ry="14" />
			<ellipse class="line ink" cx="32" cy="63" rx="2.2" ry="10" />
			<ellipse class="line red" cx="90" cy="63" rx="6" ry="4.5" />
			<path class="line bold open" d="M23 50Q18 63 23 76M15 44Q8 63 15 82" />
		</g>
	</g>
{:else if art === 'circuit-train'}
	<g data-story-art="circuit-train">
		<rect class="sky" x="0" y="0" width="160" height="66" />
		{@render cloud(70, 20)}
		<rect class="line grass" x="-2" y="66" width="164" height="36" />
		<rect class="line sand" x="-2" y="76" width="164" height="8" />
		{#each Array.from({ length: 17 }, (_, i) => i) as i (i)}
			<rect class="line wood" x={i * 10} y="78" width="5" height="5" />
		{/each}
		<rect class="line metal" x="-2" y="76" width="164" height="2" />
		<!-- The station clock, an hour too late. -->
		<rect class="line metal" x="39" y="38" width="4" height="39" />
		<circle class="line dark" cx="41" cy="28" r="13" />
		<circle class="line white" cx="41" cy="28" r="10.5" />
		{#each CLOCK_MARKS as mark (mark.id)}
			<line class="line" x1={mark.x1} y1={mark.y1} x2={mark.x2} y2={mark.y2} />
		{/each}
		<path class="line bold open" d="M41 28L41 20.5M41 28L46 30" />
		<!-- The train, already at the station. -->
		{#each [{ x: 58, tone: 'tone-c' }, { x: 76, tone: 'tone-e' }, { x: 94, tone: 'tone-d' }] as wagon (wagon.x)}
			<g transform="translate({wagon.x} 0)">
				<rect class="line red" x="3" y="53" width="7" height="7" />
				<rect class="line {wagon.tone}" x="0" y="59" width="16" height="12" rx="1.5" />
				<path class="line open" d="M16 66L18 66" />
				<rect class="line dark" x="-1" y="70" width="18" height="2.5" />
				<circle class="line dark" cx="4" cy="73.5" r="3" />
				<circle class="line dark" cx="12" cy="73.5" r="3" />
			</g>
		{/each}
		<path
			class="line white"
			d="M138 40a5 5 0 0 1 9 -6a6 6 0 0 1 11 2a4 4 0 0 1 -1 8h-17a4 4 0 0 1 -2 -4z"
		/>
		<rect class="line dark" x="141" y="44" width="6" height="10" />
		<rect class="line dark" x="139.5" y="42" width="9" height="3" />
		<path class="line tone-b" d="M124 71L124 54L146 54Q152 54 152 62Q152 71 146 71Z" />
		<path class="line tone-c" d="M131 54L131 71M139 54L139 71" />
		<rect class="line tone-a" x="111" y="46" width="14" height="25" />
		<rect class="line dark" x="109" y="43" width="18" height="4" rx="1" />
		<rect class="line sky" x="114" y="50" width="8" height="8" rx="1" />
		<circle class="line star" cx="152" cy="61" r="3" />
		<path class="line tone-c" d="M151 71L157 76L151 76Z" />
		<rect class="line dark" x="109" y="70" width="44" height="3" />
		<circle class="line dark" cx="118" cy="70" r="6" />
		<circle class="line metal" cx="118" cy="70" r="2" />
		<circle class="line dark" cx="136" cy="73.5" r="3" />
		<circle class="line dark" cx="146" cy="73.5" r="3" />
		<!-- The last wagon, far behind, in a hurry. -->
		<path class="line bold open" d="M56 66L52 66" />
		<path class="line bold open" d="M-2 58L3 58M-2 64L2 64" />
		<g transform="rotate(-5 14 76)">
			<path class="line bold open" d="M22 66L27 66" />
			<rect class="line red" x="9" y="53" width="7" height="7" />
			<rect class="line tone-f" x="6" y="59" width="16" height="12" rx="1.5" />
			<rect class="line dark" x="5" y="70" width="18" height="2.5" />
			<circle class="line dark" cx="10" cy="73.5" r="3" />
			<circle class="line dark" cx="18" cy="73.5" r="3" />
		</g>
	</g>
{:else if art === 'circuit-hat'}
	<g data-story-art="circuit-hat">
		<rect class="sky" x="0" y="0" width="160" height="66" />
		{@render cloud(118, 16)}
		<rect class="line grass" x="-2" y="62" width="164" height="16" />
		{@render road(78)}
		<g transform="translate(62 94) scale(0.74)">
			{@render raceCar('tone-g', false, false)}
		</g>
		<g transform="translate(103 59) scale(0.9)">{@render helmet('white')}</g>
		<!-- The pilot, arms crossed, nose up. -->
		<ellipse class="line dark" cx="29" cy="92" rx="6" ry="3" />
		<ellipse class="line dark" cx="45" cy="92" rx="6" ry="3" />
		<path class="line blue" d="M27 66L27 90L35 90L37 72L39 90L47 90L47 66Z" />
		<path class="line blue" d="M24 70L24 48Q24 41 32 41L42 41Q50 41 50 48L50 70Z" />
		<path class="line open" d="M37 41L37 66" />
		<rect class="line blue" x="21" y="50" width="32" height="9" rx="4.5" />
		<path class="line open" d="M30 50Q34 54.5 30 59M44 50Q40 54.5 44 59" />
		<g transform="rotate(-12 37 34)">
			<circle class="line sand" cx="37" cy="31" r="9" />
			<path class="line open" d="M31 31L35 31M39 31L43 31M34 36L40 36" />
			<path class="line tone-f" d="M43 20Q46 4 64 2Q58 6 60 9Q54 10 56 14Q50 14 48 21Z" />
			<path class="line open" d="M45 20Q50 8 62 3" />
			<path class="line wood" d="M28 22Q28 12 37 12Q46 12 46 22Z" />
			<rect class="line tone-a" x="28" y="18" width="18" height="3.5" />
			<ellipse class="line wood" cx="37" cy="22.5" rx="15" ry="3" />
		</g>
	</g>
{:else if art === 'circuit-helmet'}
	<g data-story-art="circuit-helmet">
		<rect class="sky" x="0" y="0" width="160" height="66" />
		{@render cloud(16, 14)}
		{@render cloud(124, 22)}
		<rect class="line grass" x="-2" y="62" width="164" height="16" />
		{@render road(78)}
		<!-- A stack of tyres, right in front of the copilot. -->
		{#each [0, 1, 2] as i (i)}
			<rect class="line dark" x="12" y={66 + i * 9} width="28" height="9" rx="4.5" />
			<path class="line open white-line" d="M16 {70.5 + i * 9}L36 {70.5 + i * 9}" />
		{/each}
		<!-- The copilot walks with arms out: the helmet has slid down to the chin. -->
		<ellipse class="line dark" cx="80" cy="93" rx="6" ry="3" />
		<ellipse class="line dark" cx="100" cy="93" rx="6" ry="3" />
		<path class="line tone-e" d="M84 74L78 91L85 92L90 78L96 92L103 91L98 74Z" />
		<rect class="line tone-e" x="82" y="56" width="20" height="22" rx="5" />
		<path class="line sand" d="M72 56Q70 70 79 70Q87 70 88 58Z" />
		<ellipse class="line ink" cx="78.5" cy="64" rx="2.8" ry="3" />
		<rect class="line tone-e" x="58" y="69" width="30" height="6" rx="3" />
		<rect class="line tone-e" x="60" y="75" width="28" height="6" rx="3" />
		<circle class="line sand" cx="57" cy="72" r="3.2" />
		<circle class="line sand" cx="59" cy="78" r="3.2" />
		<path class="line open" d="M51 67Q48 71 51 75M53 75Q50 79 53 83" />
		<g transform="rotate(-6 90 40)">
			<path class="line white" d="M64 58Q60 12 90 11Q120 12 116 58Q90 64 64 58Z" />
			<path class="line tone-a" d="M88 11.2Q92 11 96 11.4L95 60.8Q91 61 87 60.9Z" />
			<path class="line ink" d="M62 32Q74 28 86 30L86 40Q74 39 63 42Z" />
		</g>
		<path class="line open" d="M60 16L56 12M58 24L53 23M66 9L64 4" />
	</g>
{:else if art === 'circuit-truck'}
	<g data-story-art="circuit-truck">
		<rect class="night" x="0" y="0" width="160" height="88" />
		{#each [{ x: 12, y: 14 }, { x: 26, y: 40 }, { x: 140, y: 12 }, { x: 150, y: 46 }, { x: 8, y: 66 }] as star (star.x)}
			<path
				class="line star"
				d="M{star.x} {star.y - 4}L{star.x + 1.2} {star.y - 1.2}L{star.x + 4} {star.y}L{star.x +
					1.2} {star.y + 1.2}L{star.x} {star.y + 4}L{star.x - 1.2} {star.y + 1.2}L{star.x -
					4} {star.y}L{star.x - 1.2} {star.y - 1.2}Z"
			/>
		{/each}
		<rect class="line soil" x="-2" y="88" width="164" height="14" />
		<rect class="line dark" x="36" y="84" width="18" height="14" rx="3" />
		<rect class="line dark" x="106" y="84" width="18" height="14" rx="3" />
		<rect class="line metal" x="29" y="2" width="6" height="66" rx="2" />
		<rect class="line metal" x="125" y="2" width="6" height="66" rx="2" />
		<path class="line open" d="M34 26L26 26M126 26L134 26" />
		<rect class="line dark" x="20" y="18" width="8" height="18" rx="2" />
		<rect class="line dark" x="132" y="18" width="8" height="18" rx="2" />
		<rect class="line tone-g" x="34" y="10" width="92" height="76" rx="8" />
		{#each [60, 72, 88, 100] as light (light)}
			<circle class="line spark" cx={light} cy="10" r="2.5" />
		{/each}
		<rect class="line water-deep" x="42" y="18" width="76" height="26" rx="4" />
		<path class="line open" d="M80 18L80 44M54 42L66 30M94 42L106 30" />
		<rect class="line metal" x="60" y="50" width="40" height="28" rx="3" />
		<path
			class="line open"
			d="M67 54L67 74M73.5 54L73.5 74M80 54L80 74M86.5 54L86.5 74M93 54L93 74"
		/>
		<!-- Left light on, right light winking. -->
		<path class="line bold star-line" d="M30 62L20 62M32 54L23 49M32 70L23 75" />
		<circle class="line star" cx="46" cy="62" r="9" />
		<circle class="line white" cx="43" cy="59" r="2.5" />
		<circle class="line tone-g" cx="114" cy="62" r="9" />
		<path class="line bold open" d="M106 61Q114 68 122 61" />
		<path class="line open" d="M109 64.5L107 68M114 66L114 70M119 64.5L121 68" />
		<rect class="line metal" x="30" y="78" width="100" height="8" rx="3" />
	</g>
{:else if art === 'circuit-ending'}
	<g data-story-art="circuit-ending">
		<rect class="sky" x="0" y="0" width="160" height="90" />
		{#each CONFETTI as bit (bit.x)}
			<rect
				class="line {bit.tone}"
				x={bit.x - 2.5}
				y={bit.y - 1.5}
				width="5"
				height="3"
				transform="rotate({bit.r} {bit.x} {bit.y})"
			/>
		{/each}
		<rect class="line grass" x="-2" y="90" width="164" height="12" />
		<!-- A chequered flag. -->
		<path class="line open bold" d="M148 92L148 14" />
		<rect class="line white" x="128" y="14" width="20" height="14" />
		{#each [0, 1, 2, 3, 4] as col (col)}
			{#each [0, 1, 2] as row (row)}
				{#if (row + col) % 2 === 0}
					<rect class="dark" x={128 + col * 4} y={14 + row * 4.67} width="4" height="4.67" />
				{/if}
			{/each}
		{/each}
		<rect class="line open" x="128" y="14" width="20" height="14" />
		<!-- The podium. -->
		<rect class="line metal" x="22" y="68" width="36" height="24" />
		<rect class="line spark" x="102" y="76" width="36" height="16" />
		<rect class="line star" x="58" y="56" width="44" height="36" />
		<path
			class="line white"
			d="M80 66L82.4 71.2L88 71.8L83.8 75.6L85 81.2L80 78.4L75 81.2L76.2 75.6L72 71.8L77.6 71.2Z"
		/>
		<StoryDino x={22} y={36} size={36} flip />
		<!-- A pencil, for the next page. -->
		<path class="line tone-a" d="M110 70L130 70L130 75L110 75Z" />
		<path class="line tone-f" d="M130 70L134 70Q135 72.5 134 75L130 75Z" />
		<path class="line sand" d="M110 70L103 72.5L110 75Z" />
		<path class="line ink" d="M105.2 71.7L103 72.5L105.2 73.3Z" />
		<!-- The notebook: closed, and full to bursting. -->
		<g transform="rotate(-14 72 20)">
			<rect class="line white" x="64" y="12" width="16" height="14" />
			<rect class="sky" x="66" y="14" width="12" height="7" />
			<rect class="leaf" x="66" y="21" width="12" height="3" />
			<rect class="line open" x="66" y="14" width="12" height="10" />
		</g>
		<rect class="line tone-e" x="86" y="16" width="7" height="13" transform="rotate(12 89 22)" />
		<rect class="line white" x="60" y="26" width="46" height="28" transform="rotate(-9 82 41)" />
		<rect class="line page" x="60" y="28" width="48" height="27" transform="rotate(8 82 41)" />
		<rect class="line white" x="58" y="28" width="48" height="27" transform="rotate(-2 82 41)" />
		<g transform="rotate(16 108 40)">
			<rect class="line white" x="100" y="33" width="16" height="13" />
			<rect class="water" x="102" y="35" width="12" height="9" />
			<circle class="star" cx="111" cy="38" r="2" />
			<rect class="line open" x="102" y="35" width="12" height="9" />
		</g>
		<path class="line tone-a" d="M80 55L80 67L83 64L86 67L86 55Z" />
		<path
			class="line tone-h"
			d="M56 33Q56 30 59 30Q78 26 97 30Q99 30 99 33L99 54Q99 56 97 56L59 56Q56 56 56 54Z"
		/>
		<path class="line open" d="M62 30L62 56" />
		<circle class="line star" cx="72" cy="40" r="4" />
		<rect class="line tone-e" x="76" y="44" width="7" height="5" transform="rotate(-10 79 46)" />
		<path class="line ink" d="M88 28.5L92 28.8L92 56L88 56Z" />
	</g>
{/if}

<style>
	.line {
		stroke: var(--dd-color-story-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.bold {
		stroke-width: var(--dd-border-width-drawing-bold);
	}

	.open {
		fill: none;
	}

	.white-line {
		stroke: var(--dd-color-story-white);
	}

	.star-line {
		stroke: var(--dd-color-story-star);
	}

	.sky {
		fill: var(--dd-color-story-sky);
	}

	.night {
		fill: var(--dd-color-story-night);
	}

	.grass {
		fill: var(--dd-color-story-grass);
	}

	.leaf {
		fill: var(--dd-color-story-leaf);
	}

	.sand {
		fill: var(--dd-color-story-sand);
	}

	.soil {
		fill: var(--dd-color-story-soil);
	}

	.wood {
		fill: var(--dd-color-story-wood);
	}

	.metal {
		fill: var(--dd-color-story-metal);
	}

	.white {
		fill: var(--dd-color-story-white);
	}

	.dark {
		fill: var(--dd-color-story-dark);
	}

	.ink {
		fill: var(--dd-color-story-ink);
	}

	.star {
		fill: var(--dd-color-story-star);
	}

	.spark {
		fill: var(--dd-color-story-spark);
	}

	.page {
		fill: var(--dd-color-story-page);
	}

	.water {
		fill: var(--dd-color-story-water);
	}

	.water-deep {
		fill: var(--dd-color-story-water-deep);
	}

	.glass {
		fill: var(--dd-color-story-water);
		fill-opacity: var(--dd-opacity-glass);
	}

	.red {
		fill: var(--dd-color-wear-red);
	}

	.blue {
		fill: var(--dd-color-wear-blue);
	}

	.tone-a {
		fill: var(--dd-color-story-a);
	}

	.tone-b {
		fill: var(--dd-color-story-b);
	}

	.tone-c {
		fill: var(--dd-color-story-c);
	}

	.tone-d {
		fill: var(--dd-color-story-d);
	}

	.tone-e {
		fill: var(--dd-color-story-e);
	}

	.tone-f {
		fill: var(--dd-color-story-f);
	}

	.tone-g {
		fill: var(--dd-color-story-g);
	}

	.tone-h {
		fill: var(--dd-color-story-h);
	}

	.learner {
		fill: var(--dd-color-story-white);
		font-family: var(--dd-font-family-base);
		font-size: var(--dd-font-size-sm);
		font-weight: var(--dd-font-weight-bold);
	}
</style>
