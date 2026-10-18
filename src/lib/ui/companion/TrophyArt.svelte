<script lang="ts">
	/*
	 * A trophy in a 120 × 120 view box (lot R2): a medal with the symbol of its world, or keys of
	 * the keyboard on a podium, with the row or the sign they are about. An unknown `artId` draws
	 * nothing. Under an ancestor with `data-silhouette`, it is one flat shape with its letters or
	 * symbol cut out.
	 */
	import type { Snippet } from 'svelte';
	import { checkerPath, roundedStarPath } from './geometry';
	import { TROPHY_ARTS } from './items';

	interface Props {
		artId: string;
		/** For a trophy of a row: the keys written on its big keycaps (`trophyKeys`). */
		keys?: readonly string[];
	}

	let { artId, keys = [] }: Props = $props();

	const uid = $props.id();

	const art = $derived(TROPHY_ARTS[artId]);
	const isRow = $derived(art?.kind === 'key' && art.sign.endsWith('-row') && keys.length > 0);

	/** Far around any drawing: with `fill-rule="evenodd"` and a circle, everything outside it. */
	const AROUND = 'M-200 -200H320V320H-200Z';

	function circlePath(cx: number, cy: number, r: number, sweep = 0): string {
		return `M${cx - r} ${cy}a${r} ${r} 0 1 ${sweep} ${2 * r} 0a${r} ${r} 0 1 ${sweep} ${-2 * r} 0Z`;
	}

	function outside(cx: number, cy: number, r: number): string {
		return AROUND + circlePath(cx, cy, r, 1);
	}

	/* Medal: a disc on a ribbon, hung from a ring. */
	const MEDAL = { cx: 60, cy: 80, r: 31, field: 24.6 } as const;
	const KNURL = Array.from({ length: 48 }, (_, i) => {
		const angle = (i * Math.PI) / 24;
		const c = Math.cos(angle);
		const s = Math.sin(angle);
		const at = (r: number) =>
			`${Math.round((MEDAL.cx + r * c) * 100) / 100} ${Math.round((MEDAL.cy + r * s) * 100) / 100}`;
		return `M${at(MEDAL.r - 1.6)}L${at(MEDAL.r)}`;
	}).join('');
	const GLINT = roundedStarPath(38.6, 62.6, 4.4, 1, 4, 0.15);
	const STAR = roundedStarPath(60, 81, 16.6, 7.4, 5, 0.18);
	const SPARKLE = roundedStarPath(73.4, 66.6, 5, 1.6, 4, 0.2);
	const FLAG =
		'M49.4 65C54 62.6 58.6 67.4 63.2 65C66.8 63.2 70 63.6 73 65L73 83C70 81.6 66.8 81.2 63.2 83C58.6 85.4 54 80.6 49.4 83Z';
	const FLAG_CHECKS = checkerPath(49.4, 61, 6, 6, 4.6);

	/* Keys: a keycap stands on a podium. */
	const BADGE_ONE = roundedStarPath(88, 18, 11, 5.2, 5, 0.2);
	const BADGE_ROW = roundedStarPath(106, 38, 9.4, 4.4, 5, 0.2);
	/** Big keycaps of a row trophy, standing on a podium: x of each, from the left. */
	const BIG_KEYS = [8, 44, 80] as const;
	const BIG_KEY_WIDTH = 32;
	/** In units of the view box, so that the letter keeps its place whatever the text size setting. */
	const LETTER_SIZE = 27;
	const LETTER_BASELINE = 68.4;

	function keycap(x: number): { skirt: string; top: string } {
		return {
			skirt: `M${x + 3} 42C${x + 3} 39.6 ${x + 5} 38 ${x + 7.4} 38L${x + 24.6} 38C${x + 27} 38 ${x + 29} 39.6 ${x + 29} 42L${x + 31.6} 82.6C${x + 31.8} 85.6 ${x + 29.8} 88 ${x + 26.8} 88L${x + 5.2} 88C${x + 2.2} 88 ${x + 0.2} 85.6 ${x + 0.4} 82.6Z`,
			top: `M${x + 5.2} 42C${x + 5.2} 40.6 ${x + 6.4} 39.6 ${x + 7.8} 39.6L${x + 24.2} 39.6C${x + 25.6} 39.6 ${x + 26.8} 40.6 ${x + 26.8} 42L${x + 27.6} 74C${x + 27.6} 76 ${x + 26.2} 77.4 ${x + 24.4} 77.4L${x + 7.6} 77.4C${x + 5.8} 77.4 ${x + 4.4} 76 ${x + 4.4} 74Z`
		};
	}

	const MINI_KEYS = [35, 45.5, 56, 66.5, 77] as const;
	const MINI_ROWS = { 'top-row': 34, 'home-row': 45, 'bottom-row': 56 } as const;
	const MINI_KEY_SIZE = 8;
</script>

<!-- A flat shape with its own shadow, light and details clipped inside it, under its outline. -->
{#snippet piece(id: string, d: string, fill: string, shade = '', light = '', detail?: Snippet)}
	<clipPath id="{uid}-{id}"><path {d} clip-rule="evenodd" /></clipPath>
	<path class={fill} {d} fill-rule="evenodd" />
	<g clip-path="url(#{uid}-{id})">
		{@render detail?.()}
		{#if shade}<path class="shade" d={shade} fill-rule="evenodd" />{/if}
		{#if light}<path class="light" d={light} fill-rule="evenodd" />{/if}
	</g>
	<path class="line open" {d} />
{/snippet}

{#snippet badge(d: string, cx: number, cy: number, r: number)}
	{@render piece(
		'badge',
		d,
		'disc',
		outside(cx - 1.6, cy - 1.6, r),
		outside(cx + 1.4, cy + 1.6, r)
	)}
{/snippet}

<g class="trophy" data-art={artId}>
	{#if art?.kind === 'medal'}
		{@const ribbon = `ribbon-${art.world}`}
		{#snippet rightStripe()}
			<path
				class="ribbon-stripe"
				d="M78.4 2L74 2C69.4 16.6 64.6 32 60.4 47.4L62.4 48.2C67.4 33.2 73 17.4 78.4 2Z"
			/>
		{/snippet}
		{@render piece(
			'ribbon-right',
			'M83.6 2L68 2C64 16 59.4 32 55.4 46.4L63.8 49.6C69.6 34 76.6 17 83.6 2Z',
			ribbon,
			'M40 0L90 0L90 60L40 60Z',
			'',
			rightStripe
		)}
		{#snippet leftStripe()}
			<path
				class="ribbon-stripe"
				d="M41.6 2L46 2C50.6 16.6 55.4 32 59.6 47.4L57.6 48.2C52.6 33.2 47 17.4 41.6 2Z"
			/>
		{/snippet}
		{@render piece(
			'ribbon-left',
			'M36.4 2L52 2C56 16 60.6 32 64.6 46.4L56.2 49.6C50.4 34 43.4 17 36.4 2Z',
			ribbon,
			'M50 0L60 0L66 50L56 50C52 34 50 16 50 0Z',
			'M37.6 2L39.4 2C45 16 50.6 31 55.8 46L54.8 46.6C49 32 43 17 37.6 2Z',
			leftStripe
		)}
		{@render piece(
			'ring',
			circlePath(60, 45, 4.6) + circlePath(60, 45, 2.4, 1),
			'disc',
			outside(59.2, 44.2, 4.6),
			''
		)}
		{#snippet rim()}
			<path class="open knurl" d={KNURL} />
		{/snippet}
		{@render piece(
			'disc',
			circlePath(MEDAL.cx, MEDAL.cy, MEDAL.r),
			'disc',
			outside(MEDAL.cx - 1.8, MEDAL.cy - 1.8, MEDAL.r),
			outside(MEDAL.cx + 1.6, MEDAL.cy + 1.8, MEDAL.r),
			rim
		)}
		{@render piece(
			'field',
			circlePath(MEDAL.cx, MEDAL.cy, MEDAL.field),
			'disc-inner',
			outside(MEDAL.cx + 1.6, MEDAL.cy + 1.8, MEDAL.field),
			outside(MEDAL.cx - 1.4, MEDAL.cy - 1.6, MEDAL.field)
		)}
		<path class="open engraving" d={circlePath(MEDAL.cx, MEDAL.cy, MEDAL.field - 2.6)} />
		{#if art.world === 'dinosaurs'}
			<path
				class="symbol"
				d="M50.6 83.6C49.6 77.6 54.4 73.6 60 73.6C65.6 73.6 70.4 77.6 69.4 83.6C68.6 89 64.6 93 60 93C55.4 93 51.4 89 50.6 83.6ZM57 74.4C56.4 69 57.4 63.6 60 59.4C62.6 63.6 63.6 69 63 74.4ZM52.6 77.6C48.6 73.8 46.4 69.4 45.4 65C49.6 66.4 53.8 70 56.2 74.4ZM67.4 77.6C71.4 73.8 73.6 69.4 74.6 65C70.4 66.4 66.2 70 63.8 74.4Z"
			/>
			<path class="symbol-detail" d="M54.4 82.6C55 79.6 57.4 78 60 78C57.8 79 56.2 80.6 55.6 83Z" />
		{:else if art.world === 'kitchen'}
			<path
				class="symbol"
				d="M51.4 82.6C45.4 82.4 44 75 49 72.6C49.4 67.4 55.6 65.4 59.4 68.4C62.6 64.8 69.6 65.8 70.6 71C76.4 72 75.6 81.4 68.6 82.6ZM51.6 84C56 83 64 83 68.4 84C68.4 86.6 68.6 88.6 69 90.4C64 91.8 56 91.8 51 90.4C51.4 88.6 51.6 86.6 51.6 84Z"
			/>
			<path
				class="symbol-detail"
				d="M55.6 85L55.4 89.6L56.4 89.7L56.6 85ZM59.5 85L59.5 90.2L60.5 90.2L60.5 85ZM63.4 85L63.6 89.7L64.6 89.6L64.4 85Z"
			/>
		{:else if art.world === 'zoo'}
			<path
				class="symbol"
				d="M51.4 86.6C51.4 81.2 55.4 77.8 60 77.8C64.6 77.8 68.6 81.2 68.6 86.6C68.6 90.6 65 91.6 62.2 90.6C60.8 90.2 59.2 90.2 57.8 90.6C55 91.6 51.4 90.6 51.4 86.6Z"
			/>
			<ellipse
				class="symbol"
				cx="47.6"
				cy="75.4"
				rx="3.4"
				ry="4.4"
				transform="rotate(-25 47.6 75.4)"
			/>
			<ellipse
				class="symbol"
				cx="54.6"
				cy="68.8"
				rx="3.6"
				ry="4.8"
				transform="rotate(-8 54.6 68.8)"
			/>
			<ellipse
				class="symbol"
				cx="65.4"
				cy="68.8"
				rx="3.6"
				ry="4.8"
				transform="rotate(8 65.4 68.8)"
			/>
			<ellipse
				class="symbol"
				cx="72.4"
				cy="75.4"
				rx="3.4"
				ry="4.4"
				transform="rotate(25 72.4 75.4)"
			/>
		{:else if art.world === 'stars'}
			<path class="symbol" d={STAR} />
			<path class="symbol" d={SPARKLE} />
		{:else}
			<path
				class="symbol"
				d="M47.4 64.6C47.4 63.4 49.6 63.4 49.6 64.6L49.6 97C49.6 98.2 47.4 98.2 47.4 97Z"
			/>
			<circle class="symbol" cx="48.5" cy="62.4" r="2" />
			<clipPath id="{uid}-flag"><path d={FLAG} /></clipPath>
			<path class="symbol" d={FLAG} />
			<path class="symbol-detail" clip-path="url(#{uid}-flag)" d={FLAG_CHECKS} />
		{/if}
		<path class="glint" d={GLINT} />
	{:else if art?.kind === 'key'}
		{#if isRow}
			<!-- Three big keys on a podium: the rows differ by their letters (porteur's choice, ADR-041). -->
			{@render piece(
				'base',
				'M2 100C2 96 28 93.4 60 93.4C92 93.4 118 96 118 100L118 106C118 110 92 112.6 60 112.6C28 112.6 2 110 2 106Z',
				'disc',
				'M0 104C20 108 100 108 120 104L120 116L0 116ZM96 90L120 90L120 116L100 116Z',
				'M3.4 101C10 98 40 96.6 60 96.6C40 97.6 14 99 4.6 102.4Z'
			)}
			{@render piece(
				'tier',
				'M7 89C7 85.2 31 82.6 60 82.6C89 82.6 113 85.2 113 89L113 95.4C113 99.2 89 101.8 60 101.8C31 101.8 7 99.2 7 95.4Z',
				'disc',
				'M0 94C20 99 100 99 120 94L120 104L0 104ZM92 80L120 80L120 104L96 104Z',
				''
			)}
			{@render piece(
				'tier-top',
				'M7 89C7 85.2 31 82.6 60 82.6C89 82.6 113 85.2 113 89C113 92.8 89 95.4 60 95.4C31 95.4 7 92.8 7 89Z',
				'disc-inner',
				'M0 80L120 80L120 86C90 84 30 84 0 86Z',
				'M10 90.6C20 93.4 40 94.6 60 94.6C80 94.6 100 93.4 110 90.6L110 96L10 96Z'
			)}
			{#each keys.slice(0, BIG_KEYS.length) as key, i (i)}
				{@const x = BIG_KEYS[i] ?? 0}
				{@const cap = keycap(x)}
				<ellipse class="shade" cx={x + BIG_KEY_WIDTH / 2} cy="89.4" rx="17.6" ry="2.6" />
				{@render piece(
					`skirt-${i}`,
					cap.skirt,
					'key-side',
					`M${x + 27} 36C${x + 29} 56 ${x + 30} 72 ${x + 29} 90L${x + 36} 90L${x + 36} 36ZM${x - 2} 80C${x + 10} 82 ${x + 22} 82 ${x + 34} 80L${x + 34} 90L${x - 2} 90Z`,
					`M${x + 1.6} 82C${x + 2.2} 68 ${x + 3} 54 ${x + 4} 41.6L${x + 5} 41.6C${x + 4.2} 54 ${x + 3.4} 68 ${x + 2.8} 82Z`
				)}
				{@render piece(
					`top-${i}`,
					cap.top,
					'key-top',
					`M${x} 36L${x + 32} 36L${x + 32} 45C${x + 22} 42.4 ${x + 10} 42.4 ${x} 45Z`,
					`M${x} 72C${x + 10} 75 ${x + 22} 75 ${x + 32} 72L${x + 32} 80L${x} 80Z`
				)}
				<text
					class="letter"
					x={x + BIG_KEY_WIDTH / 2}
					y={LETTER_BASELINE}
					font-size={LETTER_SIZE}
					text-anchor="middle">{key}</text
				>
			{/each}
			{@render badge(BADGE_ROW, 106, 38, 9.4)}
		{:else}
			{@render piece(
				'podium',
				'M14 101C14 97.4 34.6 95 60 95C85.4 95 106 97.4 106 101L106 106.4C106 110 85.4 112.4 60 112.4C34.6 112.4 14 110 14 106.4Z',
				'disc',
				'M10 104C30 109 90 109 110 104L110 116L10 116ZM88 92L110 92L110 116L92 116Z',
				''
			)}
			{@render piece(
				'podium-top',
				'M14 101C14 97.4 34.6 95 60 95C85.4 95 106 97.4 106 101C106 104.6 85.4 107 60 107C34.6 107 14 104.6 14 101Z',
				'disc-inner',
				'M10 92L110 92L110 98.4C86 96.6 34 96.6 10 98.4Z',
				'M16 102C30 105.4 90 105.4 104 102L104 108L16 108Z'
			)}
			<ellipse class="shade" cx="60" cy="101.6" rx="34" ry="3" />
			{#if art.sign === 'accents' || art.sign === 'punctuation'}
				{@render piece(
					'skirt',
					'M30.4 22C30.4 18.4 33 16 36.8 16L83.2 16C87 16 89.6 18.4 89.6 22L92.6 92C92.8 96 90 99 86 99L34 99C30 99 27.2 96 27.4 92Z',
					'key-side',
					'M86 10C88 40 90 70 88 100L100 100L100 10ZM20 88C40 91 80 91 100 88L100 104L20 104Z',
					'M28.8 90C29.8 70 30.8 45 31.8 22L33 22C32 45 31 70 30 90Z'
				)}
				{@render piece(
					'top',
					'M35 21.6C35 19.6 36.6 18.2 38.6 18.2L81.4 18.2C83.4 18.2 85 19.6 85 21.6L86 79.4C86 82 84.2 83.8 81.6 83.8L38.4 83.8C35.8 83.8 34 82 34 79.4Z',
					'key-top',
					'M30 14L90 14L90 26C76 22 44 22 30 26Z',
					'M30 76C46 80.6 74 80.6 90 76L90 88L30 88Z'
				)}
				{#if art.sign === 'accents'}
					<path
						class="open stroke-symbol"
						d="M46 60H74Q74 46 60 46Q46 46 46 60Q46 74 60 74Q68 74 72 69"
					/>
					<path class="open stroke-symbol" d="M56 39L65 30" />
				{:else}
					<path class="open stroke-symbol" d="M42 37Q42 29 51 29Q60 29 60 37Q60 43 51 47V54" />
					<circle class="symbol" cx="51" cy="65" r="3.6" />
					<path class="open stroke-symbol" d="M73 29V54" />
					<circle class="symbol" cx="73" cy="65" r="3.6" />
				{/if}
			{:else}
				{@render piece(
					'keyboard',
					'M27 30C27 27 29.4 25 32.4 25L87.6 25C90.6 25 93 27 93 30L94 92C94 95.6 91.4 98 88 98L32 98C28.6 98 26 95.6 26 92Z',
					'key-side',
					'M86 20C88 50 90 80 88 100L100 100L100 20Z',
					'M28.4 90C28.8 70 29.2 50 29.6 30L30.8 30C30.4 50 30 70 29.6 90Z'
				)}
				{#each Object.entries(MINI_ROWS) as [row, y] (row)}
					{#each MINI_KEYS as x (x)}
						<rect
							class="line {row === art.sign ? 'key-lit' : 'key-top'}"
							{x}
							{y}
							width={MINI_KEY_SIZE}
							height={MINI_KEY_SIZE}
							rx="1.5"
						/>
					{/each}
				{/each}
				<rect class="key-top line" x="45.5" y="67" width="29" height="8" rx="1.5" />
			{/if}
			{@render badge(BADGE_ONE, 88, 18, 11)}
		{/if}
	{/if}
</g>

<style>
	.line {
		stroke: var(--dd-color-companion-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.open {
		fill: transparent;
	}

	.shade {
		fill: var(--dd-color-companion-shade);
		fill-opacity: var(--dd-opacity-companion-shade);
	}

	.light,
	.glint {
		fill: var(--dd-color-companion-light);
	}

	.light {
		fill-opacity: var(--dd-opacity-companion-light);
	}

	.knurl,
	.engraving {
		stroke: var(--dd-color-companion-shade);
		stroke-opacity: var(--dd-opacity-companion-light);
		stroke-width: var(--dd-border-width-thin);
		vector-effect: non-scaling-stroke;
	}

	.stroke-symbol {
		stroke: var(--dd-color-trophy-symbol);
		stroke-width: var(--dd-border-width-drawing-bold);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.symbol {
		fill: var(--dd-color-trophy-symbol);
	}

	.symbol-detail {
		fill: var(--dd-color-trophy-disc-inner);
	}

	.disc {
		fill: var(--dd-color-trophy-disc);
	}

	.disc-inner {
		fill: var(--dd-color-trophy-disc-inner);
	}

	.key-top {
		fill: var(--dd-color-trophy-key-top);
	}

	.key-side {
		fill: var(--dd-color-trophy-key-side);
	}

	.letter {
		fill: var(--dd-color-trophy-symbol);
		font-family: var(--dd-font-family-base);
		font-weight: var(--dd-font-weight-bold);
	}

	.key-lit {
		fill: var(--dd-color-trophy-key-lit);
	}

	.ribbon-stripe {
		fill: var(--dd-color-trophy-key-top);
	}

	.ribbon-dinosaurs {
		fill: var(--dd-color-trophy-ribbon-dinosaurs);
	}

	.ribbon-kitchen {
		fill: var(--dd-color-trophy-ribbon-kitchen);
	}

	.ribbon-zoo {
		fill: var(--dd-color-trophy-ribbon-zoo);
	}

	.ribbon-stars {
		fill: var(--dd-color-trophy-ribbon-stars);
	}

	.ribbon-racing {
		fill: var(--dd-color-trophy-ribbon-racing);
	}

	:global([data-silhouette]) .trophy :not(.open) {
		fill: var(--dd-color-silhouette);
	}

	:global([data-silhouette]) .trophy * {
		stroke: var(--dd-color-silhouette);
	}

	/* After the flat silhouette: letters and symbols stay, cut out, so each trophy is recognisable. */
	:global([data-silhouette]) .trophy .letter,
	:global([data-silhouette]) .trophy .symbol {
		fill: var(--dd-color-reward-backdrop);
		stroke: none;
	}

	:global([data-silhouette]) .trophy .stroke-symbol {
		stroke: var(--dd-color-reward-backdrop);
	}

	:global([data-silhouette]) .trophy .glint,
	:global([data-silhouette]) .trophy .symbol-detail {
		visibility: hidden;
	}
</style>
