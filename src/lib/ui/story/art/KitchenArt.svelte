<script lang="ts">
	import { checkerPath, starPath } from '$lib/ui/companion/geometry';
	import StoryDino from '../StoryDino.svelte';

	interface Props {
		/** One of `STORY_ART_GROUPS.kitchen`. */
		art: string;
	}

	type ToastMood = 'stern' | 'puzzled';
	type Tone = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';

	const WIDTH = 160;
	const HEIGHT = 100;
	const TILE = 10;
	const CHECK = 8;
	/** The companion's own drawing is 120 units wide (`Companion.svelte`). */
	const DINO_BOX = 120;

	const OPENING_DINO = { x: 44, y: 8, size: 70 } as const;
	const SPICES_DINO = { x: 2, y: 22, size: 72 } as const;
	const ENDING_DINO = { x: 2, y: -2, size: 70 } as const;

	/** The toast, its bottom centre at (0, 0). */
	const TOAST_BODY =
		'M-20 0L-20 -32Q-30 -36 -27 -45Q-23 -54 -11 -51Q0 -58 11 -51Q23 -54 27 -45Q30 -36 20 -32L20 0Z';
	const TOAST_CRUMB =
		'M-16 -4L-16 -35Q-24 -38 -22 -44Q-19 -49 -10 -47Q0 -53 10 -47Q19 -49 22 -44Q24 -38 16 -35L16 -4Z';
	/** The chef's hat, the bottom centre of its band at (0, 0). */
	const TOQUE_PUFF =
		'M-12 -10Q-21 -13 -19 -20Q-16 -27 -8 -24Q0 -30 8 -24Q16 -27 19 -20Q21 -13 12 -10Z';

	const CAKE_CENTER = 80;
	const CAKE_BASE = 89;
	const CEILING = 9;
	const CAKE_LEAN = 0.22;
	const CAKE_TIERS = [
		{ bottom: 89, top: 73, half: 26, sponge: 'sponge-pink' },
		{ bottom: 73, top: 58, half: 23, sponge: 'sponge-yellow' },
		{ bottom: 58, top: 43, half: 21, sponge: 'sponge-pink' },
		{ bottom: 43, top: 28, half: 19, sponge: 'sponge-yellow' }
	] as const;

	const SNEEZE_STARS: readonly { x: number; y: number; r: number; tone: Tone; tips: number }[] = [
		{ x: 50, y: 61, r: 3, tone: 'c', tips: 4 },
		{ x: 58, y: 54, r: 4, tone: 'a', tips: 4 },
		{ x: 59, y: 67, r: 3.5, tone: 'd', tips: 4 },
		{ x: 70, y: 47, r: 6, tone: 'b', tips: 4 },
		{ x: 72, y: 64, r: 5, tone: 'g', tips: 5 },
		{ x: 68, y: 77, r: 4, tone: 'h', tips: 4 },
		{ x: 86, y: 36, r: 7, tone: 'c', tips: 4 },
		{ x: 88, y: 57, r: 8, tone: 'a', tips: 4 },
		{ x: 86, y: 78, r: 6, tone: 'e', tips: 4 },
		{ x: 103, y: 24, r: 6, tone: 'f', tips: 5 },
		{ x: 106, y: 45, r: 9, tone: 'd', tips: 4 },
		{ x: 107, y: 68, r: 7, tone: 'c', tips: 4 },
		{ x: 123, y: 16, r: 7, tone: 'g', tips: 4 },
		{ x: 125, y: 36, r: 6, tone: 'h', tips: 5 },
		{ x: 127, y: 57, r: 9, tone: 'b', tips: 4 },
		{ x: 123, y: 79, r: 6, tone: 'a', tips: 4 },
		{ x: 144, y: 26, r: 8, tone: 'e', tips: 4 },
		{ x: 146, y: 48, r: 6, tone: 'c', tips: 5 },
		{ x: 146, y: 71, r: 8, tone: 'f', tips: 4 }
	];
	const SNEEZE_DOTS: readonly { x: number; y: number; tone: Tone }[] = [
		{ x: 64, y: 58, tone: 'h' },
		{ x: 78, y: 53, tone: 'e' },
		{ x: 79, y: 70, tone: 'b' },
		{ x: 95, y: 47, tone: 'g' },
		{ x: 97, y: 67, tone: 'h' },
		{ x: 115, y: 29, tone: 'a' },
		{ x: 116, y: 56, tone: 'e' },
		{ x: 115, y: 75, tone: 'd' },
		{ x: 135, y: 45, tone: 'f' },
		{ x: 136, y: 67, tone: 'g' },
		{ x: 153, y: 37, tone: 'b' },
		{ x: 154, y: 59, tone: 'd' }
	];
	const SPARK_INNER = { 4: 0.38, 5: 0.45 } as const;

	const PLATE_STACK = [0, 1, 2, 3, 4, 5];

	let { art }: Props = $props();

	function dinoFrame(dino: { x: number; y: number; size: number }): string {
		return `translate(${dino.x} ${dino.y}) scale(${dino.size / DINO_BOX})`;
	}

	function tileGrid(top: number, bottom: number): string {
		const rows = Array.from(
			{ length: Math.round((bottom - top) / TILE) },
			(_, i) => `M0 ${top + i * TILE}H${WIDTH}`
		);
		const columns = Array.from(
			{ length: WIDTH / TILE - 1 },
			(_, i) => `M${(i + 1) * TILE} ${top}V${bottom}`
		);
		return [...rows, ...columns].join('');
	}

	/** Bumps along a line from `fromX` leftwards to `toX`, like the fluted edge of a pie crust. */
	function scallop(fromX: number, toX: number, y: number, step: number, depth: number): string {
		const bumps: string[] = [];
		for (let x = fromX; x > toX; x -= step)
			bumps.push(`Q${x - step / 2} ${y - depth} ${x - step} ${y}`);
		return bumps.join('');
	}

	function leanX(y: number): number {
		return CAKE_CENTER + (CAKE_BASE - y) * CAKE_LEAN;
	}

	function tierPath(bottom: number, top: number, half: number): string {
		return `M${leanX(bottom) - half} ${bottom}L${leanX(bottom) + half} ${bottom}L${leanX(top) + half} ${top}L${leanX(top) - half} ${top}Z`;
	}

	function creamPath(bottom: number, top: number, half: number): string {
		const middle = (bottom + top) / 2;
		return `M${leanX(middle) - half + 2} ${middle}H${leanX(middle) + half - 2}`;
	}

	const SQUASH_BOTTOM = 28;
	const SQUASH_HALF = 19;
	const squashTop = leanX(CEILING);
	const squashMiddle = leanX((SQUASH_BOTTOM + CEILING) / 2);
	const squashBottom = leanX(SQUASH_BOTTOM);
	const SQUASHED_TIER = `M${squashBottom - SQUASH_HALF} ${SQUASH_BOTTOM}Q${squashMiddle - 31} ${(SQUASH_BOTTOM + CEILING) / 2} ${squashTop - 27} ${CEILING}L${squashTop + 27} ${CEILING}Q${squashMiddle + 31} ${(SQUASH_BOTTOM + CEILING) / 2} ${squashBottom + SQUASH_HALF} ${SQUASH_BOTTOM}Z`;
	const SPLAT = `M${squashTop - 38} ${CEILING}Q${squashTop - 36} 15 ${squashTop - 32} 12Q${squashTop - 29} 18 ${squashTop - 25} 13L${squashTop + 25} 13Q${squashTop + 29} 18 ${squashTop + 32} 12Q${squashTop + 36} 15 ${squashTop + 38} ${CEILING}Z`;

	const QUICHE_CRUST = `M54 80L106 80L110 64${scallop(110, 50, 64, 6, 3)}Z`;
</script>

{#snippet room(counterY: number, tileRows: number)}
	<rect class="wall" width={WIDTH} height={HEIGHT} />
	<rect class="tiles" y={counterY - tileRows * TILE} width={WIDTH} height={tileRows * TILE} />
	<path class="grout" d={tileGrid(counterY - tileRows * TILE, counterY)} />
	<rect class="line worktop" x="-4" y={counterY} width={WIDTH + 8} height="5" />
	<rect class="line wood" x="-4" y={counterY + 5} width={WIDTH + 8} height={HEIGHT} />
	<path
		class="line open"
		d="M40 {counterY + 5}V{HEIGHT}M80 {counterY + 5}V{HEIGHT}M120 {counterY + 5}V{HEIGHT}"
	/>
{/snippet}

{#snippet table(tableY: number)}
	<rect class="line white" x="-4" y={tableY} width={WIDTH + 8} height={HEIGHT} />
	<path
		class="check"
		d={checkerPath(0, tableY, WIDTH / CHECK, Math.ceil((HEIGHT - tableY) / CHECK), CHECK)}
	/>
	<path class="line open" d="M-4 {tableY}H{WIDTH + 4}" />
{/snippet}

{#snippet toque()}
	<path class="line white" d={TOQUE_PUFF} />
	<rect class="line white" x="-12" y="-12" width="24" height="12" />
	<path class="line open" d="M-5 -13L-6 -20M5 -13L6 -20" />
{/snippet}

<!-- In the companion's own 120-unit square: a napkin tied under its chin. -->
{#snippet napkin(stained: boolean)}
	<path class="line white" d="M45 77L33 65L51 73ZM75 77L87 65L69 73Z" />
	<path class="line white" d="M41 75Q60 83 79 75L60 107Z" />
	<path class="line open" d="M46 82Q60 88 74 82" />
	{#if stained}
		<path class="sauce" d="M55 90Q58 86 62 89Q67 89 64 94Q63 98 58 96Q53 96 55 90Z" />
	{/if}
{/snippet}

{#snippet cutlery()}
	<g transform="rotate(-18 27 89)">
		<rect class="line metal" x="25" y="58" width="4" height="42" rx="2" />
		<path
			class="line metal"
			d="M19 38L22.5 38L22.5 50L25.5 50L25.5 38L28.5 38L28.5 50L31.5 50L31.5 38L35 38L35 52Q35 60 27 60Q19 60 19 52Z"
		/>
	</g>
	<g transform="rotate(18 93 89)">
		<path class="line metal" d="M89 88L89 42Q98 44 97 62L97 88Z" />
		<rect class="line wood" x="88" y="84" width="10" height="20" rx="3" />
	</g>
{/snippet}

<!-- The toast, its bottom centre at (0, 0). -->
{#snippet toast(mood: ToastMood)}
	{#if mood === 'stern'}
		<rect class="line wood" x="28.5" y="-52" width="3" height="32" rx="1.5" />
		<ellipse class="line wood" cx="30" cy="-56" rx="4.5" ry="6.5" />
	{/if}
	<path class="line crust" d={TOAST_BODY} />
	<path class="crumb" d={TOAST_CRUMB} />
	<circle class="hole" cx="-10" cy="-8" r="1.3" />
	<circle class="hole" cx="11" cy="-9" r="1.1" />
	<circle class="hole" cx="-13" cy="-40" r="1.1" />
	<path class="line bold open" d="M-8 0V5H-12M8 0V5H12" />
	{#if mood === 'stern'}
		<path class="line bold open" d="M-20 -28L-29 -21L-20 -13M20 -28L30 -33" />
		<circle class="line crumb" cx="30" cy="-33" r="2.4" />
		{#each [-8, 8] as eye (eye)}
			<circle class="line white" cx={eye} cy="-24" r="4.2" />
			<circle class="ink" cx={eye} cy="-23" r="2" />
			<path class="line crumb" d="M{eye - 4.2} -24A4.2 4.2 0 0 1 {eye + 4.2} -24Z" />
		{/each}
		<path class="line bold open" d="M-13 -32L-4 -30M4 -30L13 -32M-5 -13H5" />
	{:else}
		<path class="line bold open" d="M-20 -27L-26 -13M20 -27L26 -13" />
		{#each [-8, 8] as eye (eye)}
			<circle class="line white" cx={eye} cy="-24" r="4.5" />
			<circle class="ink" cx={eye + 2} cy="-24" r="2.2" />
		{/each}
		<path class="line bold open" d="M-13 -33Q-8 -38 -3 -33M4 -32H13M-4 -12L5 -15" />
	{/if}
	<g transform="translate(0 -50)">{@render toque()}</g>
{/snippet}

{#snippet note(x: number, y: number, tone: Tone, stem: string)}
	<path class="line bold open" d={stem} />
	<ellipse
		class="line tone-{tone}"
		cx={x}
		cy={y}
		rx="4.4"
		ry="3.3"
		transform="rotate(-25 {x} {y})"
	/>
{/snippet}

{#if art === 'kitchen-opening'}
	<g data-story-art="kitchen-opening">
		<rect class="wall" width={WIDTH} height={HEIGHT} />
		<rect class="tiles" y="30" width={WIDTH} height="40" />
		<path class="grout" d={tileGrid(30, 70)} />
		<StoryDino {...OPENING_DINO} />
		<g transform={dinoFrame(OPENING_DINO)}>
			{@render napkin(false)}
			{@render cutlery()}
		</g>
		{@render table(70)}
		<ellipse class="line white" cx="79" cy="78" rx="18" ry="4.5" />
		<ellipse class="line open" cx="79" cy="78" rx="11" ry="2.4" />
		<path class="line white" d="M115 61L126 61L124.5 79L116.5 79Z" />
		<path class="water" d="M115.6 67H125.4L124.3 78H116.7Z" />
		<path class="line open" d="M115 61L126 61L124.5 79L116.5 79Z" />
	</g>
{:else if art === 'kitchen-toast'}
	<g data-story-art="kitchen-toast">
		{@render room(88, 5)}
		<ellipse class="shadow" cx="80" cy="90" rx="22" ry="2" />
		<g transform="translate(80 85)">{@render toast('stern')}</g>
	</g>
{:else if art === 'kitchen-cake'}
	<g data-story-art="kitchen-cake">
		{@render room(90, 4)}
		<rect class="line ceiling" x="-4" y="-4" width={WIDTH + 8} height={CEILING + 4} />
		<path class="line open" d="M92 0L95 4L91 6L95 {CEILING}" />
		<ellipse class="line white" cx={CAKE_CENTER} cy={CAKE_BASE} rx="32" ry="3.5" />
		{#each CAKE_TIERS as tier (tier.bottom)}
			<path class="line {tier.sponge}" d={tierPath(tier.bottom, tier.top, tier.half)} />
			<path class="cream" d={creamPath(tier.bottom, tier.top, tier.half)} />
		{/each}
		<path class="line white" d={SPLAT} />
		<path class="line sponge-pink" d={SQUASHED_TIER} />
		<path
			class="cream"
			d="M{squashMiddle - 24} {(SQUASH_BOTTOM + CEILING) / 2}H{squashMiddle + 24}"
		/>
		<path
			class="line bold open"
			d="M{squashTop - 42} 14L{squashTop - 48} 18M{squashTop - 40} 21L{squashTop -
				46} 27M{squashTop + 42} 14L{squashTop + 48} 18M{squashTop + 40} 21L{squashTop + 46} 27"
		/>
		<path class="line bold open" d="M38 86Q38 80 43 78" />
		<circle class="line cherry" cx="37" cy="87.5" r="3.5" />
	</g>
{:else if art === 'kitchen-quiche'}
	<g data-story-art="kitchen-quiche">
		{@render room(84, 4)}
		<g transform="translate(24 86) scale(0.6)">{@render toast('puzzled')}</g>
		<ellipse class="line white" cx="80" cy="85" rx="34" ry="3.5" />
		<g transform="rotate(-12 54 82)">
			<path class="line filling" d="M51 66Q80 50 109 66Z" />
			<circle class="leaf" cx="68" cy="61" r="1.6" />
			<circle class="spot" cx="80" cy="58" r="1.6" />
			<circle class="leaf" cx="92" cy="60" r="1.6" />
			<path class="line crust" d={QUICHE_CRUST} />
			<path class="line bold open" d="M68 67L74 70L68 73M92 67L86 70L92 73" />
			<path class="line ink" d="M73 74H87Q87 81 80 81Q73 81 73 74Z" />
			<path
				class="water line"
				d="M62 66Q58 62 61 58Q64 62 62 66ZM98 66Q102 62 99 58Q96 62 98 66Z"
			/>
		</g>
		<path
			class="line bold open"
			d="M47 64L42 63M48 71L43 73M50 57L46 52M113 46L118 40M117 53L124 51M110 39L112 32"
		/>
		<ellipse class="line white" cx="136" cy="85" rx="17" ry="3" />
		<path class="line jelly" d="M121 84L123 67Q136 51 149 67L151 84Z" />
		<path class="line open" d="M128 82L129 66M144 82L143 66" />
		<circle class="line white" cx="131" cy="71" r="3.4" />
		<circle class="line white" cx="141" cy="71" r="3.4" />
		<circle class="ink" cx="129.6" cy="71" r="1.7" />
		<circle class="ink" cx="139.6" cy="71" r="1.7" />
		<path
			class="line bold open"
			d="M127 65Q131 61 134 64M138 66H144M132 79Q134 77 136 79Q138 81 140 79"
		/>
	</g>
{:else if art === 'kitchen-pan'}
	<g data-story-art="kitchen-pan">
		{@render room(82, 4)}
		<path class="line wood" d="M24 60L5 57Q1 57 1 60.5Q1 64 5 64L24 64Z" />
		<path class="line metal" d="M25 59L75 59L73 78Q73 82 69 82L31 82Q27 82 27 78Z" />
		<rect class="line metal" x="21" y="56" width="58" height="4" rx="2" />
		<path class="line bold open" d="M36 67Q40 63 44 67M56 67Q60 63 64 67M35 62L43 60M57 60L65 62" />
		<ellipse class="line ink" cx="50" cy="75" rx="4.5" ry="5" />
		<g transform="translate(54 47) rotate(-16)">
			<path class="line pot" d="M-28 2Q-28 -6 0 -8Q28 -6 28 2Z" />
			<rect class="line metal" x="-4" y="-12" width="8" height="5" rx="1.5" />
		</g>
		{@render note(86, 52, 'd', 'M90 50Q94 44 90 39Q86 34 91 28Q97 30 96 35')}
		{@render note(96, 30, 'a', 'M100 28Q103 21 101 17Q99 13 105 12L108 15')}
		{@render note(106, 50, 'b', 'M110 48L108 43L112 39L109 34Q115 33 114 38')}
		<path class="line white" d="M120 100L122 76Q124 64 136 64Q148 64 150 76L152 100Z" />
		<path class="line apron" d="M127 76L145 76L148 100L124 100Z" />
		<circle class="line skin" cx="136" cy="52" r="11" />
		<path class="line bold open" d="M131 48L134 50.5L131 53M141 48L138 50.5L141 53" />
		<path class="line open" d="M132 57.5L134 56.5L136 57.5L138 56.5L140 57.5" />
		<g transform="translate(136 44) scale(0.8)">{@render toque()}</g>
		<ellipse
			class="line white"
			cx="120.5"
			cy="64"
			rx="3.6"
			ry="6"
			transform="rotate(-41 120.5 64)"
		/>
		<ellipse class="line white" cx="121" cy="56" rx="3.4" ry="6" transform="rotate(45 121 56)" />
		<ellipse
			class="line white"
			cx="151.5"
			cy="64"
			rx="3.6"
			ry="6"
			transform="rotate(41 151.5 64)"
		/>
		<ellipse class="line white" cx="151" cy="56" rx="3.4" ry="6" transform="rotate(-45 151 56)" />
		<circle class="line skin" cx="125" cy="52" r="3.6" />
		<circle class="line skin" cx="147" cy="52" r="3.6" />
	</g>
{:else if art === 'kitchen-spices'}
	<g data-story-art="kitchen-spices">
		{@render room(86, 4)}
		<StoryDino {...SPICES_DINO} />
		<g transform={dinoFrame(SPICES_DINO)}>
			<rect class="line tone-a" x="20" y="80" width="14" height="18" rx="2" />
			<rect class="line white" x="20" y="86" width="14" height="6" />
			<rect class="line ink" x="19" y="74" width="16" height="7" rx="2" />
			{#each [23, 27, 31] as hole (hole)}
				<circle class="white" cx={hole} cy="77.5" r="1.1" />
			{/each}
		</g>
		<path class="line bold open" d="M23 36L19 32M33 30L31 25M18 44L13 42" />
		{#each SNEEZE_STARS as spark (`${spark.x} ${spark.y}`)}
			<path
				class="line tone-{spark.tone}"
				d={starPath(
					spark.x,
					spark.y,
					spark.r,
					spark.r * SPARK_INNER[spark.tips as 4 | 5],
					spark.tips
				)}
			/>
		{/each}
		{#each SNEEZE_DOTS as dot (`${dot.x} ${dot.y}`)}
			<circle class="line tone-{dot.tone}" cx={dot.x} cy={dot.y} r="2" />
		{/each}
	</g>
{:else if art === 'kitchen-ending'}
	<g data-story-art="kitchen-ending">
		<rect class="wall" width={WIDTH} height={HEIGHT} />
		<rect class="tiles" y="24" width={WIDTH} height="40" />
		<path class="grout" d={tileGrid(24, 64)} />
		<StoryDino {...ENDING_DINO} />
		<g transform={dinoFrame(ENDING_DINO)}>{@render napkin(true)}</g>
		{@render table(64)}
		{#each PLATE_STACK as plate (plate)}
			<ellipse class="line white" cx="68" cy={74 - plate * 2.6} rx="14" ry="3.2" />
		{/each}
		<circle class="crumbs" cx="64" cy="60" r="1" />
		<circle class="crumbs" cx="71" cy="59.6" r="1.2" />
		<circle class="crumbs" cx="50" cy="80" r="1.2" />
		<circle class="crumbs" cx="58" cy="86" r="1" />
		<circle class="crumbs" cx="42" cy="78" r="1" />
		<path class="line cover" d="M86 70L158 70L161 99L83 99Z" />
		<path class="line page" d="M89 71Q106 67 122 72L122 97Q104 93 86 97Z" />
		<path class="line page" d="M122 72Q138 67 155 71L158 97Q140 93 122 97Z" />
		<path
			class="writing"
			d="M93 76Q105 73 118 77M92 81Q104 78 118 82M91 86Q103 83 118 87M90 91Q100 88 110 91"
		/>
		<path
			class="writing"
			d="M126 77Q138 73 151 76M126 82Q138 78 152 81M126 87Q139 83 153 86M126 92Q139 88 154 91"
		/>
		<path
			class="line sauce"
			d="M134 80Q136 74 141 77Q146 74 147 80Q152 83 147 87Q146 92 140 90Q134 93 133 87Q129 83 134 80Z"
		/>
		<circle class="sauce" cx="151" cy="76" r="1.4" />
		<circle class="sauce" cx="129" cy="92" r="1.1" />
		<circle class="sauce" cx="153" cy="90" r="1.2" />
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

	.wall {
		fill: var(--dd-color-story-sand);
	}

	.tiles,
	.white {
		fill: var(--dd-color-story-white);
	}

	.grout {
		fill: none;
		stroke: var(--dd-color-story-page-edge);
		stroke-width: var(--dd-border-width-thick);
		vector-effect: non-scaling-stroke;
	}

	.worktop,
	.ceiling {
		fill: var(--dd-color-story-rock);
	}

	.wood {
		fill: var(--dd-color-story-wood);
	}

	.check {
		fill: var(--dd-color-story-a);
	}

	.metal {
		fill: var(--dd-color-story-metal);
	}

	.pot {
		fill: var(--dd-color-pot-body);
	}

	.water {
		fill: var(--dd-color-story-water);
	}

	.ink {
		fill: var(--dd-color-story-ink);
	}

	.shadow {
		fill: var(--dd-color-story-page-edge);
	}

	.crust {
		fill: var(--dd-color-story-g);
	}

	.crumb,
	.crumbs {
		fill: var(--dd-color-food-a);
	}

	.crumbs {
		stroke: var(--dd-color-story-wood);
		stroke-width: var(--dd-border-width-thin);
		vector-effect: non-scaling-stroke;
	}

	.hole {
		fill: var(--dd-color-story-g);
	}

	.sponge-pink {
		fill: var(--dd-color-food-b);
	}

	.sponge-yellow {
		fill: var(--dd-color-food-c);
	}

	.cream {
		fill: none;
		stroke: var(--dd-color-story-white);
		stroke-width: var(--dd-border-width-drawing-bold);
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.cherry,
	.sauce,
	.apron {
		fill: var(--dd-color-story-a);
	}

	.filling {
		fill: var(--dd-color-food-c);
	}

	.leaf {
		fill: var(--dd-color-story-leaf);
	}

	.spot {
		fill: var(--dd-color-story-spot);
	}

	.jelly {
		fill: var(--dd-color-story-f);
	}

	.skin {
		fill: var(--dd-color-story-sand);
	}

	.cover {
		fill: var(--dd-color-story-h);
	}

	.page {
		fill: var(--dd-color-story-page);
	}

	.writing {
		fill: none;
		stroke: var(--dd-color-story-soil);
		stroke-width: var(--dd-border-width-thick);
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
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
</style>
