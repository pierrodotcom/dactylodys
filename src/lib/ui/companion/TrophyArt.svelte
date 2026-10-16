<script lang="ts">
	/*
	 * A trophy in a 120 × 120 view box (lot R2): a medal with the symbol of its world, or a key of
	 * the keyboard with the row or the sign it is about. An unknown `artId` draws nothing. Under an
	 * ancestor with `data-silhouette`, it is one flat shape with its letters or symbol cut out.
	 */
	import { checkerPath, starPath } from './geometry';
	import { TROPHY_ARTS } from './items';

	interface Props {
		artId: string;
		/** For a trophy of a row: the keys written on its big keycaps (`trophyKeys`). */
		keys?: readonly string[];
	}

	let { artId, keys = [] }: Props = $props();

	const art = $derived(TROPHY_ARTS[artId]);

	const MINI_KEYS = [35, 45.5, 56, 66.5, 77] as const;
	const MINI_ROWS = { 'top-row': 40, 'home-row': 51, 'bottom-row': 62 } as const;
	const MINI_KEY_SIZE = 8;
	const STAR = starPath(60, 78, 19, 8.5);
	const BADGE = starPath(94, 24, 13, 6.5);
	const FLAG_CHECKS = checkerPath(48, 63, 4, 3, 6);
	/** Big keycaps of a row trophy, standing on a podium: x of each, from the left. */
	const BIG_KEYS = [7, 43, 79] as const;
	/** In units of the view box, so that the letter keeps its place whatever the text size setting. */
	const LETTER_SIZE = 27;
	const BIG_KEY = { y: 36, width: 34, height: 44, top: 37, inset: 3, baseline: 29 } as const;
	const isRow = $derived(art?.kind === 'key' && art.sign.endsWith('-row') && keys.length > 0);
</script>

<g class="trophy" data-art={artId}>
	{#if art?.kind === 'medal'}
		<path class="ribbon-{art.world} line" d="M82 4L66 4L57 50L71 55Z" />
		<path class="ribbon-{art.world} line" d="M38 4L54 4L63 50L49 55Z" />
		<circle class="disc line" cx="60" cy="78" r="34" />
		<circle class="disc-inner line" cx="60" cy="78" r="26" />
		{#if art.world === 'dinosaurs'}
			<path class="symbol" d="M60 57Q65 65 63.5 74L56.5 74Q55 65 60 57Z" />
			<path class="symbol" d="M43 63Q51 68 54.5 76L50 80.5Q44.5 73 43 63Z" />
			<path class="symbol" d="M77 63Q69 68 65.5 76L70 80.5Q75.5 73 77 63Z" />
			<path class="symbol" d="M51 77Q60 70 69 77Q71 89 60 94Q49 89 51 77Z" />
		{:else if art.world === 'kitchen'}
			<path class="symbol" d="M48 77C39 76 40 64 50 66C52 59 68 59 70 66C80 64 81 76 72 77Z" />
			<path class="symbol" d="M49 90L71 90L72 79L48 79Z" />
		{:else if art.world === 'zoo'}
			<ellipse class="symbol" cx="60" cy="85" rx="10" ry="8" />
			<circle class="symbol" cx="46.5" cy="73" r="4.2" />
			<circle class="symbol" cx="54" cy="65.5" r="4.2" />
			<circle class="symbol" cx="66" cy="65.5" r="4.2" />
			<circle class="symbol" cx="73.5" cy="73" r="4.2" />
		{:else if art.world === 'stars'}
			<path class="symbol" d={STAR} />
		{:else}
			<path class="open stroke-symbol" d="M47 62V96" />
			<rect class="disc-inner line" x="48" y="63" width="24" height="18" />
			<path class="symbol" d={FLAG_CHECKS} />
		{/if}
	{:else if art?.kind === 'key'}
		{#if !isRow}
			<rect class="key-side line" x="22" y="22" width="76" height="82" rx="12" />
			<rect class="key-top line" x="30" y="26" width="60" height="66" rx="8" />
		{/if}
		{#if art.sign === 'accents'}
			<path
				class="open stroke-symbol"
				d="M46 70H74Q74 56 60 56Q46 56 46 70Q46 84 60 84Q68 84 72 79"
			/>
			<path class="open stroke-symbol" d="M56 49L65 40" />
		{:else if art.sign === 'punctuation'}
			<path class="open stroke-symbol" d="M42 47Q42 39 51 39Q60 39 60 47Q60 53 51 57V64" />
			<circle class="symbol" cx="51" cy="75" r="3.6" />
			<path class="open stroke-symbol" d="M73 39V64" />
			<circle class="symbol" cx="73" cy="75" r="3.6" />
		{:else if isRow}
			<!-- Three big keys on a podium: the rows differ by their letters (porteur's choice). -->
			<rect class="disc line" x="8" y="84" width="104" height="14" rx="4" />
			<rect class="disc-inner line" x="20" y="98" width="80" height="10" rx="3" />
			{#each keys.slice(0, BIG_KEYS.length) as key, i (i)}
				{@const x = BIG_KEYS[i] ?? 0}
				<rect
					class="key-side line"
					{x}
					y={BIG_KEY.y}
					width={BIG_KEY.width}
					height={BIG_KEY.height}
					rx="6"
				/>
				<rect
					class="key-top line"
					x={x + BIG_KEY.inset}
					y={BIG_KEY.y + 1}
					width={BIG_KEY.width - 2 * BIG_KEY.inset}
					height={BIG_KEY.top}
					rx="4"
				/>
				<text
					class="letter"
					x={x + BIG_KEY.width / 2}
					y={BIG_KEY.y + BIG_KEY.baseline}
					font-size={LETTER_SIZE}
					text-anchor="middle">{key}</text
				>
			{/each}
		{:else}
			{#each Object.entries(MINI_ROWS) as [row, y] (row)}
				{#each MINI_KEYS as x (x)}
					<rect
						class="line {row === art.sign ? 'key-lit' : 'key-dim'}"
						{x}
						{y}
						width={MINI_KEY_SIZE}
						height={MINI_KEY_SIZE}
						rx="1.5"
					/>
				{/each}
			{/each}
			<rect class="key-dim line" x="45.5" y="73" width="29" height="8" rx="1.5" />
		{/if}
		<path class="disc line" d={BADGE} />
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

	.key-dim {
		fill: var(--dd-color-trophy-key-dim);
	}

	.letter {
		fill: var(--dd-color-trophy-symbol);
		font-family: var(--dd-font-family-base);
		font-weight: var(--dd-font-weight-bold);
	}

	.key-lit {
		fill: var(--dd-color-trophy-key-lit);
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
</style>
