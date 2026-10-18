<script lang="ts">
	/*
	 * A trophy in a 120 × 120 view box (lot R2): a medal with the symbol of its world, or keycaps
	 * of the keyboard with the keys they are about, read from the catalogue (`keys`): three keys on
	 * a podium for a row, a cluster of keys on a cushion for accents and punctuation. An unknown
	 * `artId` draws nothing. Under an ancestor with `data-silhouette`, it is one flat shape with its
	 * letters or symbol cut out.
	 */
	import type { Snippet } from 'svelte';
	import { checkerPath, ovalPath, roundedStarPath, type XY } from './geometry';
	import { TROPHY_ARTS } from './items';

	interface Props {
		artId: string;
		/** For a trophy of keys: the keys written on its keycaps (`trophyKeys`). */
		keys?: readonly string[];
	}

	/** How a piece is modelled, as in `CompanionItem`; negative offsets light a hollow. */
	interface Look {
		shade?: number;
		deep?: number;
		rim?: number;
		shades?: string;
		lights?: string;
		gloss?: string;
	}

	interface Keycap {
		cx: number;
		skirt: string;
		top: string;
		gloss: string;
		cast: string;
		/** Where the letter stands, and how big it is. */
		letter: { y: number; size: number };
	}

	let { artId, keys = [] }: Props = $props();

	const uid = $props.id();

	const art = $derived(TROPHY_ARTS[artId]);
	const isRow = $derived(art?.kind === 'key' && art.sign.endsWith('-row'));

	/** Far around any drawing: with `fill-rule="evenodd"` and a form, everything outside it. */
	const AROUND = 'M-200 -200L320 -200L320 320L-200 320Z';

	function round(value: number): number {
		return Math.round(value * 100) / 100;
	}

	function circlePath(cx: number, cy: number, r: number): string {
		return ovalPath(cx, cy, r, r);
	}

	/** A band along the segment `a` → `b`, between two offsets to its side. */
	function band(a: XY, b: XY, from: number, to: number): string {
		const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
		const nx = (b[1] - a[1]) / length;
		const ny = -(b[0] - a[0]) / length;
		const p = (q: XY, o: number) => `${round(q[0] + nx * o)} ${round(q[1] + ny * o)}`;
		return `M${p(a, from)}L${p(b, from)}L${p(b, to)}L${p(a, to)}Z`;
	}

	/* ---------- Medal ---------- */

	const MEDAL = { cx: 60, cy: 82, r: 30.4, field: 23 } as const;
	const RIBBON_FRONT = 'M34 -2L49 -2C54 12 59.4 28 64.6 42L56.2 46.6C50 31 42.4 13 34 -2Z';
	const RIBBON_BACK = 'M86 -2L71 -2C66 12 60.6 28 55.4 42L63.8 46.6C70 31 77.6 13 86 -2Z';
	const RIBBON_FRONT_STRIPES =
		band([41.5, -2], [60.4, 44.3], 3.2, 4.8) + band([41.5, -2], [60.4, 44.3], -4.8, -3.2);
	const RIBBON_BACK_STRIPES =
		band([78.5, -2], [59.6, 44.3], 3.2, 4.8) + band([78.5, -2], [59.6, 44.3], -4.8, -3.2);
	const RIBBON_FRONT_LIGHT = band([34, -2], [56.2, 46.6], -2.2, -0.6);
	const RIBBON_LOOP =
		'M53.4 41.6C56.6 39.6 63.4 39.6 66.6 41.6L65.4 49.4C62.4 48 57.6 48 54.6 49.4Z';
	const BAIL = 'M55.4 51.4C55.4 48.6 64.6 48.6 64.6 51.4L64.6 55.4C64.6 57 55.4 57 55.4 55.4Z';
	const MEDAL_RIM = (() => {
		const bumps = 32;
		const step = (2 * Math.PI) / bumps;
		const at = (radius: number, angle: number) =>
			`${round(MEDAL.cx + radius * Math.cos(angle))} ${round(MEDAL.cy + radius * Math.sin(angle))}`;
		const arcs = Array.from({ length: bumps }, (_, i) => {
			const a = -Math.PI / 2 + i * step;
			return `C${at(MEDAL.r + 2.2, a + step * 0.2)} ${at(MEDAL.r + 2.2, a + step * 0.8)} ${at(MEDAL.r, a + step)}`;
		});
		return `M${at(MEDAL.r, -Math.PI / 2)}${arcs.join('')}Z`;
	})();
	const MEDAL_BEADS = Array.from({ length: 36 }, (_, i) => {
		const a = (i * 2 * Math.PI) / 36;
		return [round(MEDAL.cx + 26.6 * Math.cos(a)), round(MEDAL.cy + 26.6 * Math.sin(a))] as const;
	});
	const BEAD_LIGHTS = MEDAL_BEADS.map(([x, y]) => circlePath(x - 0.2, y - 0.2, 0.85)).join('');
	const BEAD_SHADES = MEDAL_BEADS.map(([x, y]) => circlePath(x + 0.45, y + 0.45, 0.85)).join('');
	const MEDAL_SHEEN = 'M26 74L48 50L58 53L32 84ZM36 90L64 54L67 56L40 94Z';
	const GLINT = roundedStarPath(85.4, 57.4, 6.4, 1.5, 4, 0.15);
	const GLINT_SMALL = roundedStarPath(37.4, 60, 3.2, 0.9, 4, 0.15);

	const FOOTPRINT =
		'M51.4 87.2C50.4 81.8 54.4 78.2 60 78.2C65.6 78.2 69.6 81.8 68.6 87.2C67.8 91.6 64.2 95.2 60 95.2C55.8 95.2 52.2 91.6 51.4 87.2ZM56.4 77.2C55.8 72.4 57.4 68.2 60 65.2C62.6 68.2 64.2 72.4 63.6 77.2C61.4 78 58.6 78 56.4 77.2ZM53.8 80.2C50.2 78.2 47.8 74.6 47 70.4C51.6 70.6 55.6 73.4 57.8 77.4C57 78.8 55.4 79.8 53.8 80.2ZM66.2 80.2C69.8 78.2 72.2 74.6 73 70.4C68.4 70.6 64.4 73.4 62.2 77.4C63 78.8 64.6 79.8 66.2 80.2Z';
	const FOOTPRINT_GLOSS =
		'M54.8 85C55.2 82.4 57 80.6 59.4 80.2C57.8 81.4 56.8 83.2 56.4 85.4C56.2 86.2 54.8 86 54.8 85Z';
	const TOQUE =
		'M51 80.8C46.4 80.6 44.6 75 48.6 72.6C48.8 67.8 54.2 65.8 57.6 68.4C60.2 65.2 66.6 65.8 67.8 70.6C72.6 70.8 74 77.2 69.4 80.8C64 79.8 56 79.8 51 80.8ZM51.8 82.6C56 81.6 64 81.6 68.2 82.6L68.6 91C64 92.4 56 92.4 51.4 91Z';
	const TOQUE_DETAIL =
		'M55.2 84.2L55 89.6L56 89.7L56.2 84.1ZM59.5 83.8L59.5 90.4L60.5 90.4L60.5 83.8ZM63.8 84.1L64 89.7L65 89.6L64.8 84.2Z';
	const TOQUE_GLOSS = 'M50.4 75.2C50.6 73.4 51.8 72.2 53.4 71.8C52.6 72.8 52 74 51.8 75.4Z';
	const PAW =
		ovalPath(60, 85.6, 8.8, 7.4) +
		'M47.4 71.4C49.6 70.4 52.4 72.4 52.8 75.6C53.2 78.6 51.6 81 49.4 81C47.2 81 45.4 78.8 45.2 76C45 73.8 45.8 72 47.4 71.4Z' +
		'M54.6 63.8C57.2 63.4 59 66.4 58.8 69.8C58.6 73 56.6 75 54.4 74.6C52.2 74.2 51 71.4 51.4 68.4C51.8 65.8 53 64 54.6 63.8Z' +
		'M65.4 63.8C62.8 63.4 61 66.4 61.2 69.8C61.4 73 63.4 75 65.6 74.6C67.8 74.2 69 71.4 68.6 68.4C68.2 65.8 67 64 65.4 63.8Z' +
		'M72.6 71.4C70.4 70.4 67.6 72.4 67.2 75.6C66.8 78.6 68.4 81 70.6 81C72.8 81 74.6 78.8 74.8 76C75 73.8 74.2 72 72.6 71.4Z';
	const PAW_GLOSS =
		'M54.6 84C55.4 81.6 57.4 80 59.8 79.8C58 81 56.8 82.6 56.4 84.6C56.2 85.4 54.4 85 54.6 84Z';
	const STAR = roundedStarPath(60, 84, 17.4, 7.6, 5, 0.18);
	const STAR_SPARK = roundedStarPath(74.4, 68.4, 4.8, 1.4, 4, 0.2);
	const STAR_GLOSS = 'M55.4 79.4L58.6 71.2C59 70.2 59.8 70.4 59.8 71.4L59 79Z';
	const FLAG_POLE = 'M46.6 66C46.6 64.4 49.4 64.4 49.4 66L49.4 98C49.4 99.6 46.6 99.6 46.6 98Z';
	const FLAG_KNOB = circlePath(48, 64, 2.2);
	const FLAG =
		'M49.4 66.4C54 63.8 58.8 68.6 63.6 66.2C67.4 64.2 70.6 64.6 73.8 66.2L73.8 84.4C70.6 82.8 67.4 82.4 63.6 84.4C58.8 86.8 54 82 49.4 84.6Z';
	const FLAG_CHECKS = checkerPath(49.4, 62, 6, 6, 4.4);

	/* ---------- Keys ---------- */

	/** A keycap standing on `bottom`: its skirt, wider below, and its top, slightly hollow. */
	function keycap(cx: number, bottom: number, width: number, height: number): Keycap {
		const p = (x: number, y: number) => `${round(x)} ${round(y)}`;
		const top = bottom - height;
		const half = width / 2;
		const narrow = half - 2.6;
		const r = 2.8;
		const skirt =
			`M${p(cx - narrow + r, top)}L${p(cx + narrow - r, top)}Q${p(cx + narrow, top)} ${p(cx + narrow + 0.3, top + r)}` +
			`L${p(cx + half - 0.2, bottom - r)}Q${p(cx + half, bottom)} ${p(cx + half - r, bottom)}` +
			`L${p(cx - half + r, bottom)}Q${p(cx - half, bottom)} ${p(cx - half + 0.2, bottom - r)}` +
			`L${p(cx - narrow - 0.3, top + r)}Q${p(cx - narrow, top)} ${p(cx - narrow + r, top)}Z`;
		const tTop = top + 2.2;
		const tBottom = top + height * 0.68;
		const tHalfTop = narrow - 3;
		const tHalfBottom = narrow - 2;
		const q = 3.2;
		const face =
			`M${p(cx - tHalfTop + q, tTop)}L${p(cx + tHalfTop - q, tTop)}Q${p(cx + tHalfTop, tTop)} ${p(cx + tHalfTop + 0.1, tTop + q)}` +
			`L${p(cx + tHalfBottom - 0.1, tBottom - q)}Q${p(cx + tHalfBottom, tBottom)} ${p(cx + tHalfBottom - q, tBottom)}` +
			`L${p(cx - tHalfBottom + q, tBottom)}Q${p(cx - tHalfBottom, tBottom)} ${p(cx - tHalfBottom + 0.1, tBottom - q)}` +
			`L${p(cx - tHalfTop - 0.1, tTop + q)}Q${p(cx - tHalfTop, tTop)} ${p(cx - tHalfTop + q, tTop)}Z`;
		const gloss =
			`M${p(cx - tHalfTop + 1.6, tTop + 3.6)}Q${p(cx - tHalfTop + 1.6, tTop + 1.6)} ${p(cx - tHalfTop + 4.6, tTop + 1.4)}` +
			`L${p(cx - tHalfTop + 4.6, tTop + 2.2)}Q${p(cx - tHalfTop + 2.4, tTop + 2.4)} ${p(cx - tHalfTop + 2.4, tTop + 3.6)}Z`;
		return {
			cx,
			skirt,
			top: face,
			gloss,
			cast: ovalPath(cx + 0.8, bottom + 0.2, half + 0.6, 1.9),
			letter: { y: round((tTop + tBottom) / 2 + width * 0.17), size: round(width * 0.48) }
		};
	}

	/** Three steps of a podium, the middle one the highest, and the keycap standing on each. */
	const PODIUM = [
		{ x: 3, w: 38, top: 80, star: 4.2 },
		{ x: 41, w: 38, top: 70, star: 5.6 },
		{ x: 79, w: 38, top: 88, star: 3.6 }
	].map((step) => {
		const right = step.x + step.w;
		const p = (x: number, y: number) => `${round(x)} ${round(y)}`;
		const cx = step.x + step.w / 2;
		return {
			front: `M${p(step.x, step.top + 3)}L${p(right, step.top + 3)}L${p(right, 113)}C${p(right, 114.4)} ${p(right - 1, 115)} ${p(right - 2.4, 115)}L${p(step.x + 2.4, 115)}C${p(step.x + 1, 115)} ${p(step.x, 114.4)} ${p(step.x, 113)}Z`,
			top: `M${p(step.x, step.top + 3)}C${p(step.x, step.top + 1)} ${p(step.x + 1.6, step.top)} ${p(step.x + 3.6, step.top)}L${p(right - 3.6, step.top)}C${p(right - 1.6, step.top)} ${p(right, step.top + 1)} ${p(right, step.top + 3)}C${p(right, step.top + 4.4)} ${p(right - 1, step.top + 5)} ${p(right - 2.4, step.top + 5)}L${p(step.x + 2.4, step.top + 5)}C${p(step.x + 1, step.top + 5)} ${p(step.x, step.top + 4.4)} ${p(step.x, step.top + 3)}Z`,
			star: roundedStarPath(
				cx,
				round(step.top + 5 + (113 - step.top - 5) / 2),
				step.star,
				step.star * 0.45,
				5,
				0.22
			),
			key: keycap(cx, step.top + 3.4, 36, 37)
		};
	});

	/** Two keys behind, one in front, on a cushion: accents and punctuation. */
	const CLUSTER = [keycap(32, 85, 34, 33), keycap(88, 85, 34, 33), keycap(60, 99, 40, 39)];
	const CUSHION =
		'M9.4 92C7.6 86 11.6 80.6 19.6 80C40 78.4 80 78.4 100.4 80C108.4 80.6 112.4 86 110.6 92C109.2 97.6 102.4 101 94.4 101.4C72 102.6 48 102.6 25.6 101.4C17.6 101 10.8 97.6 9.4 92Z';
	const CUSHION_SEAM =
		'M12.6 90.6C14 94.6 19 97.4 26 97.8C48 99 72 99 94 97.8C101 97.4 106 94.6 107.4 90.6';
	const CUSHION_LIGHT =
		'M13.4 86C15 83.2 18.6 81.8 23 81.6C40 80.4 60 80.2 74 80.6C58 81.6 38 82.4 24 83.6C19.6 84 16 85 13.4 86Z';
	const TASSELS = [
		[11, 95.4],
		[109, 95.4]
	] as const;
	const BASE =
		'M14 104.6C14 100 34.6 97.2 60 97.2C85.4 97.2 106 100 106 104.6L106 109.8C106 114.4 85.4 117.2 60 117.2C34.6 117.2 14 114.4 14 109.8Z';
	const BASE_TOP =
		'M14 104.6C14 100 34.6 97.2 60 97.2C85.4 97.2 106 100 106 104.6C106 109.2 85.4 112 60 112C34.6 112 14 109.2 14 104.6Z';
	const BASE_BAND = 'M14 108.4C14 112.6 34.6 115.4 60 115.4C85.4 115.4 106 112.6 106 108.4';
	const KEY_GLINT = roundedStarPath(98.4, 30, 5.6, 1.3, 4, 0.15);
	const KEY_GLINT_SMALL = roundedStarPath(16.6, 40.6, 3.2, 0.9, 4, 0.15);
</script>

<!-- A piece with its own modelling, as in `CompanionItem`. -->
{#snippet piece(id: string, d: string, fill: string, look: Look = {}, detail?: Snippet)}
	{@const shade = look.shade ?? 1.6}
	{@const deep = look.deep ?? shade * 0.42}
	{@const rim = look.rim ?? 0.7}
	<clipPath id="{uid}-{id}"><path {d} clip-rule="evenodd" /></clipPath>
	<path class={fill} {d} fill-rule="evenodd" />
	<g clip-path="url(#{uid}-{id})">
		{@render detail?.()}
		{#if look.shades}<path class="shade" d={look.shades} fill-rule="evenodd" />{/if}
		{#if shade !== 0}
			<path
				class="shade"
				d={AROUND + d}
				fill-rule="evenodd"
				transform="translate({-shade} {-shade})"
			/>
		{/if}
		{#if deep !== 0}
			<path
				class="shade"
				d={AROUND + d}
				fill-rule="evenodd"
				transform="translate({-deep} {-deep})"
			/>
		{/if}
		{#if look.lights}<path class="light" d={look.lights} fill-rule="evenodd" />{/if}
		{#if rim !== 0}
			<path class="light" d={AROUND + d} fill-rule="evenodd" transform="translate({rim} {rim})" />
		{/if}
		{#if look.gloss}<path class="glint" d={look.gloss} />{/if}
	</g>
	<path class="line open" {d} />
{/snippet}

<!-- A keycap: its cast shadow, its skirt, its hollow top, the key written on it. -->
{#snippet key(id: string, cap: Keycap, letter: string | undefined)}
	<path class="shade" d={cap.cast} />
	{@render piece(`${id}-skirt`, cap.skirt, 'key-side', { shade: 1.8, deep: 0.7, rim: 0.8 })}
	{@render piece(`${id}-top`, cap.top, 'key-top', {
		shade: -1.2,
		deep: 0,
		rim: -0.8,
		gloss: cap.gloss
	})}
	{#if letter !== undefined}
		<text
			class="letter"
			x={cap.cx}
			y={cap.letter.y}
			font-size={cap.letter.size}
			text-anchor="middle">{letter}</text
		>
	{/if}
{/snippet}

<!-- A small four-pointed star of light, outlined so that it shows on a pale background. -->
{#snippet glint(d: string)}
	<path class="glint line" {d} />
{/snippet}

<g class="trophy" data-art={artId}>
	{#if art?.kind === 'medal'}
		{@const ribbon = `ribbon-${art.world}`}
		{#snippet backStripes()}<path class="ribbon-stripe" d={RIBBON_BACK_STRIPES} />{/snippet}
		{@render piece(
			'ribbon-back',
			RIBBON_BACK,
			ribbon,
			{ shade: 1.4, shades: RIBBON_BACK + RIBBON_BACK },
			backStripes
		)}
		{#snippet frontStripes()}<path class="ribbon-stripe" d={RIBBON_FRONT_STRIPES} />{/snippet}
		{@render piece(
			'ribbon-front',
			RIBBON_FRONT,
			ribbon,
			{
				shade: 1.4,
				lights: RIBBON_FRONT_LIGHT,
				shades: 'M50 30L70 30L70 50L50 50Z'
			},
			frontStripes
		)}
		{@render piece('ribbon-loop', RIBBON_LOOP, ribbon, { shade: 1.2, deep: 0.5 })}
		{@render piece('ring', circlePath(60, 50, 4.4) + circlePath(60, 50, 2.4), 'disc', {
			shade: 0.9,
			deep: 0.4,
			rim: 0.4
		})}
		{@render piece('bail', BAIL, 'disc', { shade: 1, deep: 0.4, rim: 0.5 })}
		{#snippet rim()}
			<path class="shade" d={BEAD_SHADES} />
			<path class="light" d={BEAD_LIGHTS} />
			<path class="light" d={MEDAL_SHEEN} />
		{/snippet}
		{@render piece('disc', MEDAL_RIM, 'disc', { shade: 2.6, deep: 1.1, rim: 1 }, rim)}
		{@render piece('field', circlePath(MEDAL.cx, MEDAL.cy, MEDAL.field), 'disc-inner', {
			shade: 1.8,
			deep: 0.7,
			rim: 0.9,
			lights: 'M42 76L58 60L64 62L46 82Z'
		})}
		<path class="open engraving" d={circlePath(MEDAL.cx, MEDAL.cy, MEDAL.field - 2.4)} />
		<g class="emblem">
			{#if art.world === 'dinosaurs'}
				<path class="symbol" d={FOOTPRINT} />
				<path class="symbol-gloss" d={FOOTPRINT_GLOSS} />
			{:else if art.world === 'kitchen'}
				<path class="symbol" d={TOQUE} />
				<path class="symbol-detail" d={TOQUE_DETAIL} />
				<path class="symbol-gloss" d={TOQUE_GLOSS} />
			{:else if art.world === 'zoo'}
				<path class="symbol" d={PAW} />
				<path class="symbol-gloss" d={PAW_GLOSS} />
			{:else if art.world === 'stars'}
				<path class="symbol" d={STAR} />
				<path class="symbol" d={STAR_SPARK} />
				<path class="symbol-gloss" d={STAR_GLOSS} />
			{:else}
				<path class="symbol" d={FLAG_POLE} />
				<path class="symbol" d={FLAG_KNOB} />
				<clipPath id="{uid}-flag"><path d={FLAG} /></clipPath>
				<path class="symbol" d={FLAG} />
				<path class="symbol-detail" clip-path="url(#{uid}-flag)" d={FLAG_CHECKS} />
			{/if}
		</g>
		{@render glint(GLINT)}
		{@render glint(GLINT_SMALL)}
	{:else if art?.kind === 'key'}
		{#if isRow}
			<!-- Three keys on a podium: the rows differ by their keys (porteur's choice, ADR-041). -->
			{#each PODIUM as step, i (i)}
				{#snippet emblem()}<path class="light" d={step.star} />{/snippet}
				{@render piece(`step-${i}`, step.front, 'disc', { shade: 2, deep: 0.8, rim: 0.8 }, emblem)}
				<path class="open engraving" d={step.star} />
				{@render piece(`step-top-${i}`, step.top, 'disc-inner', { shade: 0.8, deep: 0, rim: 0.4 })}
			{/each}
			{#each PODIUM as step, i (i)}
				{@render key(`key-${i}`, step.key, keys[i])}
			{/each}
			{@render glint(KEY_GLINT)}
			{@render glint(KEY_GLINT_SMALL)}
		{:else}
			{@render piece('base', BASE, 'disc', { shade: 2, deep: 0.8, rim: 0.6 })}
			<path class="open engraving" d={BASE_BAND} />
			{@render piece('base-top', BASE_TOP, 'disc-inner', { shade: 1, deep: 0, rim: 0.5 })}
			{#snippet seam()}<path class="open seam" d={CUSHION_SEAM} />{/snippet}
			{@render piece(
				'cushion',
				CUSHION,
				'cushion',
				{ shade: 2.6, deep: 1.1, rim: 0.8, lights: CUSHION_LIGHT },
				seam
			)}
			{#each TASSELS as [x, y], i (i)}
				{@render piece(`tassel-${i}`, circlePath(x, y, 2.6), 'disc', {
					shade: 1,
					deep: 0.4,
					rim: 0.4
				})}
			{/each}
			{#each CLUSTER as cap, i (i)}
				{@render key(`key-${i}`, cap, keys[i])}
			{/each}
			{@render glint(KEY_GLINT)}
			{@render glint(KEY_GLINT_SMALL)}
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

	.light {
		fill: var(--dd-color-companion-light);
		fill-opacity: var(--dd-opacity-companion-light);
	}

	.glint,
	.symbol-gloss {
		fill: var(--dd-color-companion-light);
	}

	.symbol-gloss {
		fill-opacity: var(--dd-opacity-companion-light);
	}

	.engraving,
	.seam {
		stroke-width: var(--dd-border-width-thin);
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.engraving {
		stroke: var(--dd-color-companion-shade);
		stroke-opacity: var(--dd-opacity-companion-light);
	}

	.seam {
		stroke: var(--dd-color-trophy-disc);
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

	.cushion {
		fill: var(--dd-color-trophy-key-lit);
	}

	.letter {
		fill: var(--dd-color-trophy-symbol);
		font-family: var(--dd-font-family-base);
		font-weight: var(--dd-font-weight-bold);
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
		fill-opacity: 1;
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

	:global([data-silhouette]) .trophy .glint,
	:global([data-silhouette]) .trophy .symbol-gloss,
	:global([data-silhouette]) .trophy .symbol-detail {
		visibility: hidden;
	}
</style>
