<script lang="ts">
	import { checkerPath, starPath } from '$lib/ui/companion/geometry';
	import StoryDino from '../StoryDino.svelte';

	const uid = $props.id();

	interface Props {
		/** One of `STORY_ART_GROUPS.space`. */
		art: string;
	}

	/** Fixed stars of the night sky, shared by every picture of the world. */
	const STARS = [
		{ x: 8, y: 10, r: 0.9 },
		{ x: 22, y: 44, r: 0.7 },
		{ x: 34, y: 8, r: 1.1 },
		{ x: 46, y: 30, r: 0.7 },
		{ x: 58, y: 14, r: 0.9 },
		{ x: 62, y: 52, r: 0.6 },
		{ x: 104, y: 10, r: 1 },
		{ x: 114, y: 34, r: 0.7 },
		{ x: 126, y: 18, r: 1.1 },
		{ x: 140, y: 6, r: 0.8 },
		{ x: 150, y: 30, r: 1 },
		{ x: 136, y: 50, r: 0.7 },
		{ x: 12, y: 64, r: 0.8 },
		{ x: 152, y: 62, r: 0.7 }
	] as const;
	const SPARKLES = [starPath(18, 24, 3, 0.9, 4), starPath(144, 40, 2.6, 0.8, 4)] as const;

	/** Inhabitants of the comma planet, sitting around the top of its head (center 78, 54). */
	const RESTING = [
		{ x: 61.7, y: 37.7, angle: -45, tone: 'e', cup: -1 },
		{ x: 78, y: 31, angle: 0, tone: 'f', cup: -1 },
		{ x: 94.3, y: 37.7, angle: 45, tone: 'h', cup: 1 }
	] as const;

	let { art }: Props = $props();

	const windowClip = `${uid}-window`;
	const leftGiantClip = `${uid}-giant-left`;
	const rightGiantClip = `${uid}-giant-right`;
</script>

{#snippet sky()}
	<rect class="night" width="160" height="100" />
	{#each STARS as star (star.x)}
		<circle class="star" cx={star.x} cy={star.y} r={star.r} />
	{/each}
	{#each SPARKLES as sparkle (sparkle)}
		<path class="star" d={sparkle} />
	{/each}
{/snippet}

{#snippet curiousFace(x: number, y: number, angle: number, lookX: number, lookY: number)}
	<g transform="translate({x} {y}) rotate({angle}) scale(1.3)">
		<path class="ln bold none" d="M-13 -12Q-8 -17 -3 -13" />
		<path class="ln bold none" d="M3 -13Q8 -17 13 -12" />
		<circle class="ln white" cx="-7" cy="-2" r="5.5" />
		<circle class="ln white" cx="7" cy="-2" r="5.5" />
		<circle class="ink" cx={-7 + lookX} cy={-2 + lookY} r="2.6" />
		<circle class="ink" cx={7 + lookX} cy={-2 + lookY} r="2.6" />
		<ellipse class="ln ink" cx="0" cy="9" rx="2.6" ry="2" />
	</g>
{/snippet}

{#if art === 'space-opening'}
	<g data-story-art="space-opening">
		{@render sky()}
		<path class="ln rock" d="M0 90Q80 84 160 90L160 100L0 100Z" />
		<circle class="ln smoke" cx="24" cy="96" r="6" />
		<circle class="ln smoke" cx="36" cy="93" r="7" />
		<circle class="ln smoke" cx="49" cy="90" r="9" />
		<circle class="ln smoke" cx="62" cy="88" r="8" />
		<circle class="ln smoke" cx="136" cy="96" r="6" />
		<circle class="ln smoke" cx="124" cy="93" r="7" />
		<circle class="ln smoke" cx="111" cy="90" r="9" />
		<circle class="ln smoke" cx="98" cy="88" r="8" />
		<path class="ln flame-outer" d="M67 70Q80 104 93 70Z" />
		<path class="ln flame-inner" d="M72 70Q80 92 88 70Z" />
		<path class="ln fin" d="M65 46L49 76L66 68Z" />
		<path class="ln fin" d="M95 46L111 76L94 68Z" />
		<path class="ln hull" d="M80 4C100 16 101 50 96 70L64 70C59 50 60 16 80 4Z" />
		<path class="ln none" d="M62.5 58L97.5 58" />
		<circle class="ln window" cx="80" cy="32" r="14" />
		<clipPath id={windowClip}>
			<circle cx="80" cy="32" r="14" />
		</clipPath>
		<g clip-path="url(#{windowClip})">
			<StoryDino x={63} y={12} size={34} />
			<g transform="rotate(-10 80 39)">
				<rect class="ln page" x="73" y="35.5" width="16" height="10" rx="1" />
				<rect class="ln notebook" x="71.5" y="37" width="16" height="10" rx="1" />
			</g>
		</g>
		<circle class="ln bold none" cx="80" cy="32" r="14" />
	</g>
{:else if art === 'space-moon'}
	<g data-story-art="space-moon">
		{@render sky()}
		<circle class="ln water-deep" cx="26" cy="22" r="11" />
		<path class="leaf" d="M19 17Q23 13 27 16Q26 21 21 21Q18 20 19 17Z" />
		<path class="leaf" d="M27 25Q32 23 33 27Q30 31 27 29Z" />
		<path class="ln rock" d="M0 74Q80 60 160 74L160 100L0 100Z" />
		<ellipse class="ln soil" cx="26" cy="88" rx="10" ry="3" />
		<ellipse class="ln soil" cx="134" cy="92" rx="12" ry="3.5" />
		<ellipse class="ln soil" cx="98" cy="80" rx="6" ry="2" />
		<ellipse class="ln white" cx="62" cy="78" rx="19" ry="3.5" />
		<path class="ln bold none" d="M75 57Q87 56 86 64Q85 71 73 70" />
		<path class="ln white" d="M47 52L51 73Q52 77 56 77L68 77Q72 77 73 73L77 52Z" />
		<ellipse class="ln coffee" cx="62" cy="52" rx="15" ry="3.2" />
		<path class="ln coffee" d="M57 52Q58 46 62 46Q66 46 67 52Z" />
		<circle class="ln coffee" cx="66" cy="38" r="4.6" />
		<circle class="ln coffee" cx="57" cy="27" r="3.8" />
		<circle class="ln coffee" cx="65" cy="17" r="3.1" />
		<circle class="ln coffee" cx="56" cy="9" r="2.4" />
		<circle class="shine" cx="64.4" cy="36.4" r="1.2" />
		<circle class="shine" cx="55.7" cy="25.7" r="1" />
		<circle class="shine" cx="63.9" cy="15.9" r="0.8" />
		<StoryDino x={100} y={28} size={46} flip />
	</g>
{:else if art === 'space-comet'}
	<g data-story-art="space-comet">
		{@render sky()}
		<g transform="rotate(-18 134 82)">
			<ellipse class="ln none" cx="134" cy="82" rx="18" ry="4.5" />
			<circle class="ln astre-d" cx="134" cy="82" r="10" />
			<path class="ln none" d="M116 82A18 4.5 0 0 0 152 82" />
		</g>
		<g transform="translate(74 54) rotate(-16)">
			<path
				class="ln star-fill"
				d="M2 -12Q-24 -14 -70 -17Q-42 -7 -76 -2Q-42 3 -68 13Q-24 14 2 12A12 12 0 0 1 2 -12Z"
			/>
			<path class="ln none" d="M-14 -6Q-34 -8 -52 -11M-16 0Q-36 -1 -56 -2M-14 6Q-34 8 -50 9" />
			<path class="ln none" d="M24 -7L30 -7" />
			<path class="ln none" d="M20 0L29 0" />
			<path class="ln none" d="M24 7L30 7" />
			<circle class="ln ice" cx="44" cy="0" r="12" />
			<circle class="ln white" cx="44" cy="-3" r="3.6" />
			<circle class="ln white" cx="52" cy="-3" r="3.6" />
			<circle class="ink" cx="45.6" cy="-3" r="1.8" />
			<circle class="ink" cx="53.6" cy="-3" r="1.8" />
			<path class="ln none" d="M45 6Q49 8 53 6" />
		</g>
	</g>
{:else if art === 'space-giants'}
	<g data-story-art="space-giants">
		{@render sky()}
		<clipPath id={leftGiantClip}>
			<circle cx="0" cy="60" r="48" />
		</clipPath>
		<clipPath id={rightGiantClip}>
			<circle cx="160" cy="58" r="46" />
		</clipPath>
		<circle class="ln astre-c" cx="80" cy="-2" r="30" />
		<circle class="ln soil" cx="62" cy="4" r="3" />
		<circle class="ln soil" cx="99" cy="8" r="2.4" />
		{@render curiousFace(80, 12, 0, 0, 1.6)}
		<circle class="ln astre-a" cx="0" cy="60" r="48" />
		<g clip-path="url(#{leftGiantClip})">
			<path class="ln none" d="M-40 26L50 72" />
			<path class="ln none" d="M-40 58L40 99" />
		</g>
		{@render curiousFace(28, 52, -35, 1.4, 1)}
		<circle class="ln astre-d" cx="160" cy="58" r="46" />
		<g clip-path="url(#{rightGiantClip})">
			<circle class="ln h" cx="146" cy="90" r="5" />
			<circle class="ln h" cx="152" cy="22" r="4" />
		</g>
		{@render curiousFace(132, 50, 35, -1.4, 1)}
	</g>
{:else if art === 'space-comma'}
	<g data-story-art="space-comma">
		{@render sky()}
		<circle class="ln astre-b" cx="138" cy="74" r="7" />
		<path
			class="ln astre-a"
			d="M78 31A23 23 0 0 1 101 54C101 74 90 88 64 97C76 88 80 82 78 77A23 23 0 0 1 78 31Z"
		/>
		<circle class="ln water" cx="70" cy="60" r="4" />
		<circle class="ln water" cx="88" cy="52" r="3" />
		<circle class="ln water" cx="86" cy="84" r="2.4" />
		{#each RESTING as being (being.x)}
			<g transform="translate({being.x} {being.y}) rotate({being.angle}) scale(1.3)">
				<path class="ln none" d="M-2.5 -14L-5 -20M2.5 -14L5 -20" />
				<circle class="star" cx="-5" cy="-20" r="1.5" />
				<circle class="star" cx="5" cy="-20" r="1.5" />
				<path class="ln {being.tone}" d="M-7 1C-7 -9 -4 -15 0 -15C4 -15 7 -9 7 1Z" />
				<path class="ln none" d="M-4.5 -8Q-3 -6 -1.5 -8M1.5 -8Q3 -6 4.5 -8" />
				<path class="ln none" d="M-2 -4Q0 -2.5 2 -4" />
				<g transform="scale({being.cup} 1)">
					<path class="ln none" d="M12.5 -7Q15 -7 14.5 -5Q14 -3 12 -3.5" />
					<path class="ln white" d="M6 -9L6.8 -2Q7 -1 8 -1L11 -1Q12 -1 12.2 -2L13 -9Z" />
					<ellipse class="ln coffee" cx="9.5" cy="-9" rx="3.5" ry="1" />
					<path class="steam" d="M9.5 -12Q8 -14 9.5 -16Q11 -18 9.5 -20" />
				</g>
			</g>
		{/each}
	</g>
{:else if art === 'space-ending'}
	<g data-story-art="space-ending">
		{@render sky()}
		<rect class="ln a" x="8" y="14" width="144" height="80" rx="4" />
		<path class="ln page" d="M14 18Q46 12 80 18L80 90Q46 84 14 90Z" />
		<path class="ln page" d="M80 18Q114 12 146 18L146 90Q114 84 80 90Z" />
		<path class="ln thin none" d="M22 28Q36 26 52 28Q62 27 70 28" />
		<path class="ln thin none" d="M22 37Q34 35 46 37Q58 36 70 37" />
		<path class="ln thin none" d="M22 46Q38 44 58 46" />
		<g transform="translate(36 58) rotate(-6)">
			<path class="ln bold none" d="M0 0L0 22" />
			<rect class="ln white" x="0" y="0" width="15" height="10" />
			<path class="ink" d={checkerPath(0, 0, 3, 2, 5)} />
		</g>
		<g transform="translate(113 52) rotate(6)">
			<rect class="ln white" x="-22" y="-26" width="44" height="50" rx="1" />
			<rect class="ln night" x="-18" y="-22" width="36" height="34" />
			<circle class="star" cx="-13" cy="-17" r="0.8" />
			<circle class="star" cx="13" cy="6" r="0.8" />
			<circle class="star" cx="12" cy="-18" r="0.6" />
			<circle class="ln water-deep" cx="0" cy="-5" r="12" />
			<path class="leaf" d="M-7 -11Q-2 -15 2 -11Q0 -6 -5 -6Q-8 -8 -7 -11Z" />
			<path class="leaf" d="M2 -1Q8 -3 8 2Q5 6 2 3Z" />
			<rect class="ln tape" x="-27" y="-30" width="14" height="6" transform="rotate(-38 -20 -27)" />
			<rect class="ln tape" x="13" y="-30" width="14" height="6" transform="rotate(38 20 -27)" />
		</g>
	</g>
{/if}

<style>
	.ln {
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

	.none {
		fill: none;
	}

	.steam {
		fill: none;
		stroke: var(--dd-color-story-white);
		stroke-width: var(--dd-border-width-thick);
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.night {
		fill: var(--dd-color-story-night);
	}

	.star {
		fill: var(--dd-color-story-star);
	}

	.ink {
		fill: var(--dd-color-story-ink);
	}

	.white,
	.hull {
		fill: var(--dd-color-story-white);
	}

	.shine {
		fill: var(--dd-color-story-white);
	}

	.rock {
		fill: var(--dd-color-story-rock);
	}

	.soil {
		fill: var(--dd-color-story-soil);
	}

	.smoke {
		fill: var(--dd-color-rocket-smoke);
	}

	.fin {
		fill: var(--dd-color-rocket-fin);
	}

	.window {
		fill: var(--dd-color-rocket-window);
	}

	.flame-outer {
		fill: var(--dd-color-rocket-flame-outer);
	}

	.flame-inner {
		fill: var(--dd-color-rocket-flame-inner);
	}

	.notebook,
	.a {
		fill: var(--dd-color-story-a);
	}

	.coffee {
		fill: var(--dd-color-story-wood);
	}

	.water {
		fill: var(--dd-color-story-water);
	}

	.water-deep {
		fill: var(--dd-color-story-water-deep);
	}

	.leaf,
	.e {
		fill: var(--dd-color-story-leaf);
	}

	.ice {
		fill: var(--dd-color-story-sky);
	}

	.star-fill {
		fill: var(--dd-color-star-fill);
	}

	.f {
		fill: var(--dd-color-story-f);
	}

	.h {
		fill: var(--dd-color-story-h);
	}

	.astre-a {
		fill: var(--dd-color-astre-a);
	}

	.astre-b {
		fill: var(--dd-color-astre-b);
	}

	.astre-c {
		fill: var(--dd-color-astre-c);
	}

	.astre-d {
		fill: var(--dd-color-astre-d);
	}

	.page {
		fill: var(--dd-color-story-page);
	}

	.tape {
		fill: var(--dd-color-story-c);
		fill-opacity: var(--dd-opacity-overlay);
	}
</style>
