<script lang="ts">
	import { starPath } from '$lib/ui/companion/geometry';
	import StoryDino from '../StoryDino.svelte';

	interface Props {
		/** One of `STORY_ART_GROUPS.zoo`. */
		art: string;
	}

	let { art }: Props = $props();

	const uid = $props.id();
	const ZEBRA_CLIP = `zoo-zebra-${uid}`;

	/** Garland of the ball: bulbs along its curve, each with its colour. */
	const BULBS = [
		{ x: 20, y: 17.5, paint: 'tone-a' },
		{ x: 40, y: 19.5, paint: 'tone-c' },
		{ x: 60, y: 18.5, paint: 'tone-b' },
		{ x: 80, y: 15, paint: 'tone-f' },
		{ x: 100, y: 11.5, paint: 'tone-e' },
		{ x: 120, y: 10.5, paint: 'tone-g' },
		{ x: 140, y: 12.5, paint: 'tone-h' }
	] as const;

	/** Keys of the keyboard in front of the screen, as [x, y]. */
	const KEYS = [48, 55, 62, 69, 76, 83, 90, 97, 104].flatMap((x) => [
		[x, 83.5],
		[x, 88]
	]);

	/** Every signature of the last page: a print, where, how it is turned, in which ink. */
	const PRINTS = [
		{ kind: 'hoof', x: 42, y: 30, turn: 12, paint: 'dark' },
		{ kind: 'horseshoe', x: 68, y: 27, turn: -14, paint: 'tone-h' },
		{ kind: 'hoof', x: 96, y: 33, turn: 24, paint: 'spot' },
		{ kind: 'paw', x: 120, y: 30, turn: -8, paint: 'tone-b' },
		{ kind: 'dino', x: 46, y: 62, turn: -18, paint: 'tone-e' },
		{ kind: 'hoof', x: 74, y: 60, turn: -22, paint: 'fur' },
		{ kind: 'paw', x: 100, y: 66, turn: 16, paint: 'tone-a' },
		{ kind: 'horseshoe', x: 34, y: 82, turn: 30, paint: 'tone-g' }
	] as const;

	const PRINT_PATHS = {
		hoof: 'M-1.2 -7Q-7 -3 -6 5Q-3.5 8 -1.2 5.5ZM1.2 -7Q7 -3 6 5Q3.5 8 1.2 5.5Z',
		horseshoe: 'M-6 6L-6 -1A6 6 0 0 1 6 -1L6 6L2.5 6L2.5 -1A2.5 2.5 0 0 0 -2.5 -1L-2.5 6Z',
		paw: 'M-6 4Q-6 -1 0 -1Q6 -1 6 4Q6 8 0 7Q-6 8 -6 4ZM-8 -5a2 2.4 0 1 0 4 0a2 2.4 0 1 0 -4 0ZM-4 -8.5a2 2.4 0 1 0 4 0a2 2.4 0 1 0 -4 0ZM0 -8.5a2 2.4 0 1 0 4 0a2 2.4 0 1 0 -4 0ZM4 -5a2 2.4 0 1 0 4 0a2 2.4 0 1 0 -4 0Z',
		dino: 'M0 8Q-4.5 8 -4 3L-8 -6Q-6 -8.5 -4 -5L-1.2 -1L-1.2 -8.5Q0 -10.5 1.2 -8.5L1.2 -1L4 -5Q6 -8.5 8 -6L4 3Q4.5 8 0 8Z'
	} as const;

	const RING_XS = [34, 46, 58, 70, 82, 94, 106, 118, 130];
	const STICKER = starPath(124, 80, 8, 3.6);
</script>

<!-- A giraffe's head seen from the side, looking left; origin at the middle of its skull. -->
{#snippet giraffeHead()}
	<path class="open line bold" d="M1 -5L-1 -13M6 -5L7 -13" />
	<circle class="spot line" cx="-1" cy="-13.5" r="2.2" />
	<circle class="spot line" cx="7" cy="-13.5" r="2.2" />
	<path class="fur-light line" d="M7 -4Q16 -9 19 -4Q13 0 7 -1Z" />
	<ellipse class="fur-light line" cx="0" cy="0" rx="9" ry="7" />
	<ellipse class="spot" cx="4" cy="2.5" rx="2.4" ry="1.8" />
	<ellipse class="sand line" cx="-11" cy="3" rx="7" ry="5" />
	<circle class="dark" cx="-15" cy="1.6" r="1" />
	<path class="open line" d="M-17 5.6Q-13 7.4 -9 6.4" />
	<circle class="white line" cx="-2" cy="-2" r="2.8" />
	<circle class="dark" cx="-3.2" cy="-1" r="1.5" />
{/snippet}

<!-- A giraffe standing, looking left; origin between its hooves. -->
{#snippet giraffe()}
	<path class="open line" d="M16 -36Q20 -30 19 -24" />
	<path class="dark line" d="M17.5 -25L20.5 -25L20 -21L18.5 -21Z" />
	{#each [-12, -7, 7, 12] as legX (legX)}
		<rect class="fur-light line" x={legX - 2} y="-32" width="4" height="32" rx="1.5" />
		<rect class="dark line" x={legX - 2} y="-3" width="4" height="3" rx="1" />
	{/each}
	<path class="fur-light line" d="M-15 -36L-25 -74L-15 -77L-3 -40Z" />
	<ellipse class="spot" cx="-15" cy="-56" rx="2.6" ry="3.2" />
	<ellipse class="spot" cx="-19" cy="-68" rx="2" ry="2.6" />
	<ellipse class="fur-light line" cx="0" cy="-35" rx="18" ry="9" />
	<ellipse class="spot" cx="-8" cy="-35" rx="3.6" ry="2.8" />
	<ellipse class="spot" cx="2" cy="-31" rx="3.4" ry="2.4" />
	<ellipse class="spot" cx="10" cy="-37" rx="3.2" ry="2.6" />
	<ellipse class="spot" cx="0" cy="-39.5" rx="2.4" ry="1.6" />
	<g transform="translate(-23 -81) rotate(-12)">
		{@render giraffeHead()}
	</g>
{/snippet}

<!-- A zebra standing, looking right; origin between its hooves. `kick`: its front hoof points ahead. -->
{#snippet zebra(kick: boolean)}
	<defs>
		<clipPath id={ZEBRA_CLIP}>
			<ellipse cx="0" cy="-22" rx="18" ry="10" />
			<path d="M8 -29L19 -46L27 -41L17 -20Z" />
		</clipPath>
	</defs>
	<path class="open line" d="M-17 -25Q-23 -21 -22 -12" />
	<path class="dark line" d="M-23.5 -13L-20.5 -13L-21 -8L-23 -8Z" />
	{#each [-13, -8, 7] as legX (legX)}
		<rect class="white line" x={legX - 2} y="-16" width="4" height="16" rx="1.5" />
		<rect class="dark line" x={legX - 2} y="-3" width="4" height="3" rx="1" />
	{/each}
	<g transform={kick ? 'rotate(-80 12 -15)' : undefined}>
		<rect class="white line" x="10" y="-16" width="4" height="16" rx="1.5" />
		<rect class="dark line" x="10" y="-3" width="4" height="3" rx="1" />
	</g>
	<path class="white line" d="M8 -29L19 -46L27 -41L17 -20Z" />
	<ellipse class="white line" cx="0" cy="-22" rx="18" ry="10" />
	<g clip-path="url(#{ZEBRA_CLIP})">
		<path
			class="dark"
			d="M-14 -34L-11 -34L-13 -10L-16 -10ZM-7 -34L-4 -34L-6 -10L-9 -10ZM0 -34L3 -34L1 -10L-2 -10ZM7 -34L10 -34L8 -10L5 -10ZM14 -34L17 -34L15 -10L12 -10ZM10 -40L24 -32L23 -29L9 -37ZM14 -45L26 -38L25 -35L13 -42Z"
		/>
	</g>
	<ellipse class="open line" cx="0" cy="-22" rx="18" ry="10" />
	<path class="open line" d="M8 -29L19 -46M27 -41L17 -20" />
	<path class="dark line" d="M8 -31L18 -48L21 -46L11 -29Z" />
	<path class="white line" d="M20 -48L19 -55L24 -49Z" />
	<ellipse class="white line" cx="26" cy="-43" rx="9.5" ry="5.2" transform="rotate(32 26 -43)" />
	<path class="dark" d="M24 -45.6L26.5 -46.6L25 -41.2L22.6 -40.4Z" />
	<ellipse class="dark line" cx="32.4" cy="-38.6" rx="3.6" ry="3.2" />
	<circle class="white line" cx="25" cy="-46" r="2" />
	<circle class="dark" cx="25.7" cy="-45.2" r="1.1" />
	<path class="open line" d="M22.4 -49.6L27 -50.4" />
	{#if kick}
		<ellipse class="grass-shade" cx="43" cy="-3" rx="5" ry="1.2" />
		<path class="dark line" d="M42.5 -33L45.5 -33L44 -11L41 -11Z" transform="rotate(10 43.5 -22)" />
	{/if}
{/snippet}

{#if art === 'zoo-opening'}
	<g data-story-art="zoo-opening">
		<rect class="rock" x="0" y="0" width="160" height="100" />
		<rect class="sand line" x="-2" y="78" width="164" height="24" />
		<rect class="metal line" x="8" y="4" width="124" height="72" rx="2" />
		<rect class="sky" x="12" y="8" width="116" height="64" />
		<path class="rock line" d="M14 58Q16 44 28 42Q40 42 42 58Z" />
		<rect class="wood line" x="111" y="44" width="5" height="16" />
		<circle class="leaf line" cx="113.5" cy="38" r="11" />
		<rect class="grass line" x="12" y="56" width="116" height="16" />
		<StoryDino x={45} y={9} size={50} mood="idle" />
		<path class="glass" d="M34 8L48 8L12 62L12 41Z" />
		<path class="glass" d="M54 8L59 8L23 62L18 62Z" />
		<path class="glass" d="M104 72L128 36L128 47L111 72Z" />
		<path class="glass" d="M116 72L128 54L128 59L120 72Z" />
		<rect class="open line bold" x="12" y="8" width="116" height="64" />
		<rect class="page line" x="138" y="24" width="18" height="18" rx="1.5" />
		<path class="dark" d="M141 32L142.5 28.5L144 31L145.5 27.5L147 31L148.5 28.5L150 32Z" />
		<ellipse class="dark" cx="145.5" cy="34" rx="5" ry="3.4" />
		<circle class="dark" cx="151.5" cy="30.5" r="2.6" />
		<path class="dark" d="M141.5 34Q136 36 140 31Q141 33 142 32.5Z" />
		<rect class="dark" x="142" y="36" width="2" height="3.5" />
		<rect class="dark" x="147" y="36" width="2" height="3.5" />

		<!-- The visitors, seen from behind. -->
		<path class="fur-light line" d="M17 100L20 40L32 40L35 100Z" />
		<rect class="spot line" x="24" y="40" width="4" height="62" rx="1.5" />
		<ellipse class="spot" cx="20.5" cy="58" rx="2.2" ry="3.6" />
		<ellipse class="spot" cx="31" cy="68" rx="2.2" ry="3.6" />
		<ellipse class="spot" cx="21" cy="82" rx="2.2" ry="3.6" />
		<ellipse class="spot" cx="31.5" cy="92" rx="2.2" ry="3.6" />
		<path class="open line bold" d="M22.5 28L20.5 19M29.5 28L31.5 19" />
		<circle class="spot line" cx="20.5" cy="18" r="2.4" />
		<circle class="spot line" cx="31.5" cy="18" r="2.4" />
		<path class="fur-light line" d="M19 31Q10 26 7 31Q11 36 19 34Z" />
		<path class="fur-light line" d="M33 31Q42 26 45 31Q41 36 33 34Z" />
		<ellipse class="fur-light line" cx="26" cy="34" rx="8" ry="9" />
		<rect class="spot line" x="24" y="27" width="4" height="15" rx="2" />

		<path class="white line" d="M33 100L35 92L53 92L55 100Z" />
		<path class="sand line" d="M37 79Q30 77 30 67Q35 73 41 75Z" />
		<path class="sand line" d="M51 79Q58 77 58 67Q53 73 47 75Z" />
		<ellipse class="white line" cx="29" cy="84" rx="6" ry="2.8" />
		<ellipse class="white line" cx="59" cy="84" rx="6" ry="2.8" />
		<ellipse class="white line" cx="44" cy="87" rx="13" ry="13" />
		<path class="dark" d="M44 74Q54 75 56.5 84Q51 85 47 81Q44 78 44 74Z" />
		<path class="dark" d="M33 92Q38 90 40 96Q38 100 33 99Q31.5 96 33 92Z" />

		<path class="white line" d="M99 100L101 92L115 92L117 100Z" />
		<path class="white line" d="M101 78L98 64L106 74Z" />
		<path class="white line" d="M115 78L118 64L110 74Z" />
		<ellipse class="white line" cx="108" cy="86" rx="10" ry="12" />
		<path
			class="open line stripe"
			d="M99.5 81Q108 85 116.5 81M98.5 89Q108 93 117.5 89M100.5 96Q108 99 115.5 96"
		/>
		<rect class="dark line" x="105.5" y="68" width="5" height="32" rx="2" />
	</g>
{:else if art === 'zoo-giraffe'}
	<g data-story-art="zoo-giraffe">
		<rect class="sky" x="0" y="0" width="160" height="100" />
		<rect class="grass line" x="-2" y="84" width="164" height="18" />
		<rect class="wood line" x="22" y="90" width="7" height="12" />
		<rect class="wood line" x="131" y="90" width="7" height="12" />
		<rect class="wood line" x="16" y="78" width="128" height="13" rx="2" />
		<rect class="metal line" x="74" y="72" width="12" height="7" />
		<rect class="metal line" x="65" y="76" width="30" height="4" rx="1.5" />
		<rect class="dark line" x="44" y="32" width="72" height="42" rx="3" />
		<rect class="page" x="48" y="36" width="64" height="34" rx="1.5" />
		<path class="open line bold" d="M55 44L96 44M55 51L103 51M55 58L80 58" />
		<path class="open line bold" d="M85 55L85 61" />
		<rect class="metal line" x="44" y="81" width="72" height="11" rx="2" />
		{#each KEYS as [keyX, keyY] (`${keyX}-${keyY}`)}
			<rect class="white line" x={keyX} y={keyY} width="5.5" height="3" rx="0.8" />
		{/each}
		<path class="fur-light line" d="M101 14Q110 4 115 -2L135 -2Q122 22 108 30Z" />
		<ellipse class="spot" cx="114" cy="12" rx="3.4" ry="2.6" transform="rotate(-40 114 12)" />
		<ellipse class="spot" cx="123" cy="2" rx="3.4" ry="2.4" transform="rotate(-40 123 2)" />
		<ellipse class="spot" cx="113" cy="23" rx="2.4" ry="2" />
		<g transform="translate(102 22) rotate(-35)">
			{@render giraffeHead()}
		</g>
	</g>
{:else if art === 'zoo-cow'}
	<g data-story-art="zoo-cow">
		<rect class="night" x="0" y="0" width="160" height="100" />
		<path class="beam" d="M70 0L90 0L118 88L42 88Z" />
		<rect class="wood line" x="-2" y="74" width="164" height="28" />
		<path class="open line" d="M-2 10Q40 24 80 12Q120 0 162 14" />
		{#each BULBS as bulb (bulb.x)}
			<circle class="{bulb.paint} line" cx={bulb.x} cy={bulb.y} r="2.6" />
		{/each}
		<ellipse class="star line" cx="80" cy="87" rx="30" ry="6.5" />

		<g transform="translate(20 90) scale(0.76)">
			{@render zebra(false)}
		</g>
		<g transform="translate(150 92) scale(0.74)">
			{@render giraffe()}
		</g>

		<path class="open line" d="M93 62Q104 64 103 75" />
		<path class="dark line" d="M101 74L105 74L104.5 79L101.5 79Z" />
		<rect class="white line" x="71" y="66" width="7" height="20" rx="2" />
		<rect
			class="white line"
			x="82"
			y="66"
			width="7"
			height="18"
			rx="2"
			transform="rotate(-14 85 66)"
		/>
		<rect class="dark line" x="71" y="83" width="7" height="4" rx="1.2" />
		<rect
			class="dark line"
			x="82"
			y="81"
			width="7"
			height="4"
			rx="1.2"
			transform="rotate(-14 85 66)"
		/>
		<g transform="translate(69 46) rotate(-28)">
			<rect class="white line" x="-3.2" y="-18" width="6.4" height="20" rx="3" />
			<rect class="dark line" x="-3.2" y="-21" width="6.4" height="4" rx="1.2" />
		</g>
		<g transform="translate(91 47) rotate(72)">
			<rect class="white line" x="-3.2" y="-18" width="6.4" height="20" rx="3" />
			<rect class="dark line" x="-3.2" y="-21" width="6.4" height="4" rx="1.2" />
		</g>
		<ellipse class="white line" cx="80" cy="57" rx="14" ry="17" />
		<path class="dark" d="M70 50Q74 45 78 50Q79 56 73 57Q69 55 70 50Z" />
		<path class="dark" d="M84 63Q90 60 92 66Q90 71 86 70Q82 68 84 63Z" />
		<path class="star line" d="M76.5 42L83.5 42L85 48L75 48Z" />
		<path class="sand line" d="M73 25Q69 22 69 16Q72 20 76 21Z" />
		<path class="sand line" d="M87 25Q91 22 91 16Q88 20 84 21Z" />
		<ellipse class="white line" cx="68" cy="29" rx="5" ry="2.6" transform="rotate(15 68 29)" />
		<ellipse class="white line" cx="92" cy="29" rx="5" ry="2.6" transform="rotate(-15 92 29)" />
		<ellipse class="white line" cx="80" cy="30" rx="10" ry="9" />
		<path class="dark" d="M83 22Q90 23 89.5 30Q86 32 83.5 28Z" />
		<ellipse class="tone-f line" cx="80" cy="37.5" rx="8" ry="5" />
		<circle class="dark" cx="77" cy="37.5" r="1" />
		<circle class="dark" cx="83" cy="37.5" r="1" />
		<path class="open line" d="M74 29Q76 31 78 29M82 29Q84 31 86 29" />
		<path class="open line" d="M52 72Q80 84 108 72M58 60Q54 66 58 72M102 60Q106 66 102 72" />
	</g>
{:else if art === 'zoo-yak'}
	<g data-story-art="zoo-yak">
		<rect class="sky" x="0" y="0" width="160" height="100" />
		<rect class="grass line" x="-2" y="74" width="164" height="28" />
		{#each [96, 108, 144, 156] as hoofX (hoofX)}
			<rect class="dark line" x={hoofX - 3} y="84" width="6" height="6" rx="1.5" />
		{/each}
		<path
			class="fur line"
			d="M84 50Q86 22 106 18Q122 16 136 26Q156 26 166 40L166 84L160 88L154 82L148 88L142 82L136 88L130 82L124 88L118 82L112 88L106 82L100 88L94 82L88 86Z"
		/>
		<path
			class="open line thin"
			d="M112 30Q108 42 112 54M126 34Q122 48 126 62M142 36Q138 50 142 66M100 56Q98 66 102 76M154 50Q150 62 154 74"
		/>
		<path class="sand line" d="M68 36Q56 36 54 24Q61 31 70 32Z" />
		<path class="sand line" d="M86 34Q96 32 97 20Q92 28 84 30Z" />
		<path
			class="fur line"
			d="M64 58Q76 66 92 58L94 80L90 86L86 80L82 87L78 80L74 86L70 79L66 83Z"
		/>
		<g transform="rotate(-12 70 66.5)">
			<rect class="white line" x="64" y="60.5" width="12" height="11" rx="2" />
			<rect class="open line" x="66.5" y="62.2" width="7" height="6" rx="1.4" />
		</g>
		<path class="fur line" d="M64 69Q70 72 76 68L76 78L72 74L68 79L66 74Z" />
		<ellipse class="fur line" cx="76" cy="47" rx="13" ry="14" />
		<path class="spot line" d="M63 42Q76 32 89 42L87 52L83 47L80 53L76 47L72 53L69 47L65 52Z" />
		<ellipse class="rock line" cx="74" cy="58" rx="8" ry="5.5" />
		<circle class="dark" cx="70.5" cy="57.5" r="1.1" />
		<circle class="dark" cx="77.5" cy="57.5" r="1.1" />

		<StoryDino x={4} y={39} size={54} mood="idle" flip />
		<rect
			class="wood line"
			x="0"
			y="-1.8"
			width="15"
			height="3.6"
			rx="1.8"
			transform="translate(47 79) rotate(-28.5)"
		/>
		<circle class="glass" cx="70" cy="66.5" r="10" />
		<path
			class="metal line"
			fill-rule="evenodd"
			d="M58 66.5a12 12 0 1 0 24 0a12 12 0 1 0 -24 0ZM60.5 66.5a9.5 9.5 0 1 0 19 0a9.5 9.5 0 1 0 -19 0Z"
		/>
	</g>
{:else if art === 'zoo-zebra'}
	<g data-story-art="zoo-zebra">
		<rect class="sky" x="0" y="0" width="160" height="100" />
		<circle class="leaf line" cx="18" cy="56" r="14" />
		<circle class="leaf line" cx="34" cy="62" r="10" />
		<rect class="grass line" x="-2" y="70" width="164" height="32" />
		<g transform="translate(58 92) scale(1.65)">
			{@render zebra(true)}
		</g>
	</g>
{:else if art === 'zoo-ending'}
	<g data-story-art="zoo-ending">
		<rect class="wood" x="0" y="0" width="160" height="100" />
		<g transform="rotate(-3 80 50)">
			<rect class="page-edge line" x="24" y="10" width="116" height="86" rx="3" />
			<rect class="page line" x="21" y="7" width="116" height="86" rx="3" />
			{#each [24, 34, 44, 54, 64, 74, 84] as ruleY (ruleY)}
				<path class="open ruled" d="M28 {ruleY}L130 {ruleY}" />
			{/each}
			{#each PRINTS as print (`${print.x}-${print.y}`)}
				<path
					class={print.paint}
					d={PRINT_PATHS[print.kind]}
					transform="translate({print.x} {print.y}) rotate({print.turn})"
				/>
			{/each}
			<path class="star-fill line" d={STICKER} />
			{#each RING_XS as ringX (ringX)}
				<circle class="dark" cx={ringX} cy="12" r="1.4" />
				<rect class="metal line" x={ringX - 1.6} y="2" width="3.2" height="11" rx="1.6" />
			{/each}
		</g>
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

	.thin {
		stroke-width: var(--dd-border-width-thin);
	}

	.open {
		fill: none;
	}

	.stripe {
		stroke: var(--dd-color-story-dark);
		stroke-width: var(--dd-border-width-drawing-bold);
	}

	.ruled {
		stroke: var(--dd-color-story-page-edge);
		stroke-width: var(--dd-border-width-thick);
		vector-effect: non-scaling-stroke;
	}

	.glass {
		fill: var(--dd-color-story-white);
		opacity: var(--dd-opacity-overlay);
	}

	.beam {
		fill: var(--dd-color-story-star);
		opacity: var(--dd-opacity-hand);
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

	.grass-shade {
		fill: var(--dd-color-story-leaf);
	}

	.leaf {
		fill: var(--dd-color-story-leaf);
	}

	.sand {
		fill: var(--dd-color-story-sand);
	}

	.rock {
		fill: var(--dd-color-story-rock);
	}

	.wood {
		fill: var(--dd-color-story-wood);
	}

	.metal {
		fill: var(--dd-color-story-metal);
	}

	.page {
		fill: var(--dd-color-story-page);
	}

	.page-edge {
		fill: var(--dd-color-story-page-edge);
	}

	.white {
		fill: var(--dd-color-story-white);
	}

	.dark {
		fill: var(--dd-color-story-dark);
	}

	.fur {
		fill: var(--dd-color-story-fur);
	}

	.fur-light {
		fill: var(--dd-color-story-fur-light);
	}

	.spot {
		fill: var(--dd-color-story-spot);
	}

	.star {
		fill: var(--dd-color-story-star);
	}

	.star-fill {
		fill: var(--dd-color-star-fill);
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
</style>
