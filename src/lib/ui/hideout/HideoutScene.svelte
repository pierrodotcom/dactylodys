<script lang="ts">
	/*
	 * The hideout (ADR-057, proposal 18): the inside of a cabin up in a tree, its round window open
	 * on the leaves, the trunk going through the floor, and the companion in the middle of its rug.
	 * Each place has its furniture (a ceiling hook, a nail, pegs, the window sill, a shelf, a coat
	 * stand, a chest, a desk, the rug, a mat by the desk) and shows the object set down there. An
	 * empty place is only its furniture: nothing to win is shown. Decorative for screen readers:
	 * the places are named by the buttons that change them. In the dark theme, night falls outside
	 * and the lamp lights the room; the lights breathe and the leaves sway, unless motion is
	 * reduced or `still` is set (while the child chooses).
	 */
	import StoryDino from '$lib/ui/story/StoryDino.svelte';
	import { DECORATION_ARTS, fitScale } from './decorations';
	import HideoutDecoration from './HideoutDecoration.svelte';
	import {
		COMPANION_SPOT,
		markOf,
		PLACE_SPOTS,
		SCENE_HEIGHT,
		SCENE_WIDTH,
		type PlaceSpot
	} from './places';

	export interface SceneObject {
		readonly artId: string;
		/** For a trophy of keys: its keys (`trophyKeys`). */
		readonly keys?: readonly string[];
	}

	interface Props {
		/** What is set down, by place identifier. */
		objects: Readonly<Record<string, SceneObject>>;
		/** The place being chosen, outlined; `null`: none. */
		marked?: string | null;
		/** No movement at all: the child is choosing. */
		still?: boolean;
	}

	let { objects, marked = null, still = false }: Props = $props();

	const uid = $props.id();

	type XY = readonly [number, number];

	/** Places drawn behind the companion; the mat by the desk is in front of it. */
	const BEHIND = [
		'ceiling',
		'wall',
		'pegs',
		'window',
		'shelf',
		'coat-stand',
		'chest',
		'desk',
		'rug'
	];
	const IN_FRONT = ['corner'];
	const MARK_MARGIN = 5;

	const WINDOW = { cx: 290, cy: 98, inner: 46, outer: 56 } as const;
	const PLANK = 35;
	const FLOOR_Y = 250;

	function round(value: number): number {
		return Math.round(value * 100) / 100;
	}

	function circlePath(cx: number, cy: number, r: number): string {
		return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
	}

	/** A leaf from its stalk at (x, y), `length` long, pointing at `angle` degrees. */
	function leaf(x: number, y: number, length: number, angle: number, width = 0.32): string {
		const a = (angle * Math.PI) / 180;
		const dx = Math.cos(a) * length;
		const dy = Math.sin(a) * length;
		const nx = -Math.sin(a) * length * width;
		const ny = Math.cos(a) * length * width;
		const mid = (t: number, side: number) =>
			`${round(x + dx * t + nx * side)} ${round(y + dy * t + ny * side)}`;
		const tip = `${round(x + dx)} ${round(y + dy)}`;
		return `M${round(x)} ${round(y)}Q${mid(0.5, 1)} ${tip}Q${mid(0.5, -1)} ${round(x)} ${round(y)}Z`;
	}

	/** The vein of a leaf, from its stalk to near its tip. */
	function vein(x: number, y: number, length: number, angle: number): string {
		const a = (angle * Math.PI) / 180;
		return `M${round(x)} ${round(y)}L${round(x + Math.cos(a) * length * 0.8)} ${round(y + Math.sin(a) * length * 0.8)}`;
	}

	/** Leaves along a twig, alternately on each side. */
	function twig(
		from: XY,
		to: XY,
		count: number,
		length: number
	): { path: string; leaves: { x: number; y: number; length: number; angle: number }[] } {
		const angle = (Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI;
		const leaves = Array.from({ length: count }, (_, i) => {
			const t = (i + 1) / (count + 1);
			return {
				x: round(from[0] + (to[0] - from[0]) * t),
				y: round(from[1] + (to[1] - from[1]) * t),
				length: length * (1 - i * 0.06),
				angle: angle + (i % 2 === 0 ? -48 : 48)
			};
		});
		leaves.push({ x: to[0], y: to[1], length: length * 0.9, angle });
		return { path: `M${from[0]} ${from[1]}L${to[0]} ${to[1]}`, leaves };
	}

	const OUTSIDE_TWIGS = [
		twig([232, 60], [272, 92], 5, 15),
		twig([240, 44], [262, 74], 3, 13),
		twig([252, 46], [286, 56], 3, 12),
		twig([348, 118], [312, 110], 4, 14),
		twig([346, 136], [316, 140], 3, 13),
		twig([340, 60], [322, 80], 2, 12)
	];
	const INSIDE_TWIG = twig([512, 72], [462, 40], 4, 12);

	const SEAMS = Array.from({ length: Math.floor(SCENE_WIDTH / PLANK) }, (_, i) => (i + 1) * PLANK);
	/** Long grain lines of the wall planks: x of the line, and how it bends. */
	const GRAIN = SEAMS.flatMap((x, i) => [
		`M${x - 24} 30C${x - 20} 90 ${x - 27} 150 ${x - 22} 246`,
		`M${x - 11} ${40 + (i % 3) * 20}C${x - 8} 120 ${x - 14} 180 ${x - 10} 246`
	]);
	const KNOTS: readonly XY[] = [
		[52, 196],
		[158, 128],
		[226, 214],
		[368, 160],
		[440, 92],
		[90, 40]
	];
	const STARS: readonly XY[] = [
		[262, 70],
		[278, 58],
		[318, 98],
		[300, 78],
		[256, 96]
	];
	/** The little lights along the beam, and the colour of each, in turn. */
	const FAIRY_PINS = [64, 152, 240, 328, 420];
	const FAIRY_SAG = 14;
	const fairyPath = FAIRY_PINS.slice(1)
		.map((x, i) => {
			const from = FAIRY_PINS[i] ?? 0;
			return `${i === 0 ? `M${from} 20` : ''}Q${(from + x) / 2} ${20 + FAIRY_SAG * 2} ${x} 20`;
		})
		.join('');
	const FAIRY_BULBS = FAIRY_PINS.slice(1).flatMap((x, i) => {
		const from = FAIRY_PINS[i] ?? 0;
		return [0.25, 0.5, 0.75].map((t, j) => ({
			x: round(from + (x - from) * t),
			y: round(20 + FAIRY_SAG * 2 * 2 * t * (1 - t)),
			tone: (i * 3 + j) % 3
		}));
	});
	const FLOOR_LINES = [262, 277, 296];
	const FLOOR_JOINTS: readonly XY[] = [
		[60, 250],
		[210, 250],
		[380, 250],
		[130, 262],
		[300, 262],
		[470, 262],
		[40, 277],
		[250, 277],
		[420, 277],
		[160, 296],
		[350, 296],
		[520, 296]
	];

	function placeTransform(spot: PlaceSpot, artId: string): string {
		const art = DECORATION_ARTS[artId];
		if (!art) return '';
		const scale = round(fitScale(art, spot.room));
		return `translate(${spot.point[0]} ${spot.point[1]}) scale(${scale})`;
	}

	const mark = $derived.by(() => {
		const spot = marked === null ? undefined : PLACE_SPOTS[marked];
		return spot ? markOf(spot, MARK_MARGIN) : null;
	});
</script>

{#snippet objectIn(place: string)}
	{@const spot = PLACE_SPOTS[place]}
	{@const object = objects[place]}
	{@const art = object ? DECORATION_ARTS[object.artId] : undefined}
	{#if spot && object && art}
		<g transform={placeTransform(spot, object.artId)} data-place-object={place}>
			<HideoutDecoration artId={object.artId} {art} keys={object.keys ?? []} />
		</g>
	{/if}
{/snippet}

<svg
	class="hideout"
	viewBox="0 0 {SCENE_WIDTH} {SCENE_HEIGHT}"
	aria-hidden="true"
	focusable="false"
	data-still={still || undefined}
>
	<defs>
		<linearGradient id="{uid}-sky" x1="0" y1="0" x2="0" y2="1">
			<stop class="sky-high" offset="0" />
			<stop class="sky-low" offset="1" />
		</linearGradient>
		<radialGradient id="{uid}-glow">
			<stop class="glow-stop" offset="0" />
			<stop class="glow-stop end" offset="1" />
		</radialGradient>
		<linearGradient id="{uid}-beam" x1="0" y1="0" x2="0" y2="1">
			<stop class="glow-stop" offset="0" />
			<stop class="glow-stop end" offset="1" />
		</linearGradient>
		<clipPath id="{uid}-glass">
			<circle cx={WINDOW.cx} cy={WINDOW.cy} r={WINDOW.inner} />
		</clipPath>
	</defs>

	<!-- The wall: planks of honey wood, their seams, grain and knots. -->
	<rect class="wall" x="0" y="0" width={SCENE_WIDTH} height={FLOOR_Y} />
	{#each SEAMS as x, index (x)}
		{#if index % 2 === 0}
			<rect class="plank-tint" x={x - PLANK} y="0" width={PLANK} height={FLOOR_Y} />
		{/if}
	{/each}
	<path class="grain" d={GRAIN.join('')} />
	{#each SEAMS as x (x)}
		<path class="seam" d="M{x} 18V{FLOOR_Y}" />
	{/each}
	{#each KNOTS as [x, y] (`${x}-${y}`)}
		<ellipse class="knot" cx={x} cy={y} rx="4.4" ry="2.6" />
		<ellipse class="knot-heart" cx={x + 0.6} cy={y} rx="1.6" ry="0.9" />
	{/each}

	<!-- The round window, open on the leaves of the tree: day outside, or night with stars. -->
	<g clip-path="url(#{uid}-glass)">
		<rect
			x={WINDOW.cx - WINDOW.inner}
			y={WINDOW.cy - WINDOW.inner}
			width={WINDOW.inner * 2}
			height={WINDOW.inner * 2}
			fill="url(#{uid}-sky)"
		/>
		<g class="stars">
			{#each STARS as [x, y], index (index)}
				<path
					class="star"
					d="M{x} {y - 2.6}Q{x + 0.5} {y - 0.5} {x + 2.6} {y}Q{x + 0.5} {y + 0.5} {x} {y + 2.6}Q{x -
						0.5} {y + 0.5} {x - 2.6} {y}Q{x - 0.5} {y - 0.5} {x} {y - 2.6}Z"
				/>
			{/each}
		</g>
		<circle class="sky-halo" cx="314" cy="72" r="17" data-effect />
		<circle class="sky-light" cx="314" cy="72" r="9" />
		<path class="moon-shade" d="M318.5 64.4A9 9 0 1 1 309 80.6A7.4 7.4 0 0 0 318.5 64.4Z" />
		<path
			class="far-trees"
			d="M236 132Q246 114 260 122Q270 104 286 116Q298 102 312 116Q324 106 336 120Q346 116 350 128V150H236Z"
		/>
		<path class="far-trees-shade" d="M236 140Q262 130 286 136Q312 128 350 138V150H236Z" />
		<g class="sway" data-sway>
			{#each OUTSIDE_TWIGS as branch, index (index)}
				<path class="twig" d={branch.path} />
				{#each branch.leaves as l, j (j)}
					<path
						class={j % 2 === 0 ? 'leaf' : 'leaf leaf-dark'}
						d={leaf(l.x, l.y, l.length, l.angle)}
					/>
					<path class="leaf-vein" d={vein(l.x, l.y, l.length, l.angle)} />
				{/each}
			{/each}
		</g>
		<path class="glass-glint" d="M256 74Q262 60 276 54L278 57Q266 62 260 76Z" />
		<!-- The cross of the window. -->
		<rect
			class="mullion"
			x={WINDOW.cx - 3}
			y={WINDOW.cy - WINDOW.inner}
			width="6"
			height={WINDOW.inner * 2}
		/>
		<rect
			class="mullion"
			x={WINDOW.cx - WINDOW.inner}
			y={WINDOW.cy - 3}
			width={WINDOW.inner * 2}
			height="6"
		/>
		<path
			class="mullion-light"
			d="M{WINDOW.cx - 3} {WINDOW.cy - WINDOW.inner}V{WINDOW.cy - 3}M{WINDOW.cx -
				WINDOW.inner} {WINDOW.cy - 3}H{WINDOW.cx - 3}"
		/>
	</g>
	<path
		class="frame"
		fill-rule="evenodd"
		d="{circlePath(WINDOW.cx, WINDOW.cy, WINDOW.outer)}{circlePath(
			WINDOW.cx,
			WINDOW.cy,
			WINDOW.inner
		)}"
	/>
	<path
		class="frame-light"
		d="M{WINDOW.cx - 53} {WINDOW.cy + 10}A54 54 0 0 1 {WINDOW.cx + 12} {WINDOW.cy - 53}L{WINDOW.cx +
			11} {WINDOW.cy - 50}A51 51 0 0 0 {WINDOW.cx - 50} {WINDOW.cy + 9}Z"
	/>
	<circle class="frame-edge" cx={WINDOW.cx} cy={WINDOW.cy} r={WINDOW.outer} />
	<circle class="frame-edge" cx={WINDOW.cx} cy={WINDOW.cy} r={WINDOW.inner} />
	{#each [0, 45, 90, 135, 180, 225, 270, 315] as turn (turn)}
		<circle
			class="bolt"
			cx={round(WINDOW.cx + Math.cos((turn * Math.PI) / 180) * 51)}
			cy={round(WINDOW.cy + Math.sin((turn * Math.PI) / 180) * 51)}
			r="1.8"
		/>
	{/each}
	<!-- The sill, a little plant at its end. -->
	<path class="bracket" d="M244 159L244 170L254 159Z" />
	<path class="bracket" d="M336 159L336 170L326 159Z" />
	<rect class="furniture" x="226" y="151" width="128" height="8" rx="2" />
	<path class="furniture-light" d="M228 152.5H352" />
	<path class="pot" d="M339 151L337.4 141H350.6L349 151Z" />
	<path class="pot-rim" d="M336.6 140H351.4V143H336.6Z" />
	<path class="plant" d={leaf(344, 140, 12, -112, 0.4)} />
	<path class="plant plant-dark" d={leaf(344, 140, 10, -60, 0.42)} />
	<path class="plant" d={leaf(343, 140, 9, -150, 0.45)} />

	<!-- A drawing pinned on the wall: the cabin in its tree, by the child perhaps. -->
	<g transform="rotate(-4 418 50)">
		<rect class="cast" x="403" y="34" width="34" height="36" />
		<rect class="paper" x="400" y="31" width="34" height="36" />
		<circle class="sketch-sun" cx="426" cy="39" r="4" />
		<path
			class="sketch"
			d="M410 63V50M410 50Q404 46 406 41Q410 37 414 41Q417 46 410 50M408 47H413V44H408Z"
		/>
		<path class="sketch-ground" d="M402 63Q418 60 432 63" />
		<path class="sketch" d="M418 63Q418 58 421 57Q425 55 427 58Q429 61 428 63M424 58L425 55" />
		<rect class="tape" x="412" y="28" width="11" height="5" transform="rotate(6 417 30)" />
	</g>

	<!-- The ceiling: a beam, two struts, the hook, and a string of little lights. -->
	<path class="beam" d="M0 0H{SCENE_WIDTH}V20H0Z" />
	<path class="beam-shade" d="M0 16H{SCENE_WIDTH}V20H0Z" />
	<path class="beam-light" d="M0 2H{SCENE_WIDTH}" />
	<path class="beam" d="M0 58L0 72L56 20L42 20Z" />
	<path class="beam" d="M452 20L466 20L512 62L512 76Z" />
	<path class="iron-line" d="M192 19.5H200M196 20V24.6C196 29 201.6 29 201.6 25.4" />
	<path class="fairy-string" d={fairyPath} />
	{#each FAIRY_BULBS as bulb, index (index)}
		<path
			class="fairy-cap"
			d="M{bulb.x - 1.4} {bulb.y}H{bulb.x + 1.4}V{bulb.y + 2}H{bulb.x - 1.4}Z"
		/>
		<path
			class="fairy tone-{bulb.tone}"
			d="M{bulb.x} {bulb.y + 1.6}C{bulb.x + 3} {bulb.y + 3} {bulb.x + 2.6} {bulb.y +
				7.4} {bulb.x} {bulb.y + 8}C{bulb.x - 2.6} {bulb.y + 7.4} {bulb.x - 3} {bulb.y +
				3} {bulb.x} {bulb.y + 1.6}Z"
			data-index={index}
		/>
	{/each}

	<!-- The floor: boards, a skirting board, a trapdoor with its ring. -->
	<rect class="floor" x="0" y={FLOOR_Y} width={SCENE_WIDTH} height={SCENE_HEIGHT - FLOOR_Y} />
	<path class="floor-seam" d={FLOOR_LINES.map((y) => `M0 ${y}H${SCENE_WIDTH - 56}`).join('')} />
	<path
		class="floor-seam"
		d={FLOOR_JOINTS.map(
			([x, y]) => `M${x} ${y}V${y + (y === 296 ? 24 : y === 277 ? 19 : 12)}`
		).join('')}
	/>
	<path
		class="floor-light"
		d={FLOOR_LINES.map((y) => `M0 ${y + 1.4}H${SCENE_WIDTH - 56}`).join('')}
	/>
	<path class="skirting" d="M0 {FLOOR_Y - 5}H{SCENE_WIDTH - 52}V{FLOOR_Y + 1}H0Z" />
	<path class="trapdoor" d="M18 286H96L100 316H14Z" />
	<path class="trapdoor-line" d="M44 286L42 316M70 286L71 316" />
	<path class="iron-line" d="M57 300A4 3 0 1 0 57.1 300" />

	<!-- The trunk of the tree goes through the cabin; a twig of it sprouts inside. -->
	<path class="bark" d="M514 0C506 70 518 150 508 250C506 280 504 300 500 320H560V0Z" />
	<path
		class="bark-light"
		d="M514 0C506 70 518 150 508 250C506 280 504 300 500 320H507C511 300 513 280 515 250C524 150 512 70 520 0Z"
	/>
	<path
		class="bark-line"
		d="M528 0C522 60 532 120 524 190M540 10C536 80 546 160 538 250M552 0C548 90 556 170 550 320M532 214C530 250 526 290 522 320M520 96Q526 100 530 96M534 58Q540 62 546 58M526 236Q532 240 538 236M542 286Q548 290 554 286"
	/>
	<ellipse class="bark-knot" cx="536" cy="140" rx="5" ry="8" />
	<path class="twig twig-inside" d="M514 74Q490 62 462 40" />
	{#each INSIDE_TWIG.leaves as l, j (j)}
		<path class={j % 2 === 0 ? 'leaf' : 'leaf leaf-dark'} d={leaf(l.x, l.y, l.length, l.angle)} />
		<path class="leaf-vein" d={vein(l.x, l.y, l.length, l.angle)} />
	{/each}

	<!-- Light through the window on the floor (a soft moonbeam at night). -->
	<path class="sunbeam" d="M248 112L334 104L318 318L150 318Z" fill="url(#{uid}-beam)" data-effect />

	<!-- The rug, round and striped, with its fringe. -->
	<ellipse class="rug-edge" cx="270" cy="292" rx="160" ry="25" />
	<ellipse class="rug-base" cx="270" cy="291" rx="150" ry="21" />
	<ellipse class="rug-a" cx="270" cy="291" rx="124" ry="16" />
	<ellipse class="rug-base" cx="270" cy="291" rx="112" ry="13.4" />
	<ellipse class="rug-c" cx="270" cy="291" rx="84" ry="9.6" />
	<ellipse class="rug-b" cx="270" cy="291" rx="56" ry="6" />
	<path
		class="rug-fringe"
		d={[-1, 1]
			.flatMap((side) =>
				[-8, -4, 0, 4, 8].map((dy) => `M${270 + side * 160} ${292 + dy}l${side * 7} ${dy * 0.3}`)
			)
			.join('')}
	/>

	<!-- Pegs on a board, a nail, the shelf with its books. -->
	<rect class="furniture" x="88" y="56" width="80" height="11" rx="3" />
	<path class="furniture-light" d="M91 58H165" />
	{#each [104, 128, 152] as x (x)}
		<circle class="cast" cx={x + 1.2} cy="63.4" r="4.4" />
		<circle class="peg" cx={x} cy="62" r="4.2" />
		<circle class="peg-light" cx={x - 1.2} cy="60.8" r="1.4" />
	{/each}
	<circle class="cast" cx="373.2" cy="45.4" r="2" />
	<circle class="nail" cx="372" cy="44" r="2" />
	<path class="bracket" d="M404 140L404 152L416 140Z" />
	<path class="bracket" d="M454 140L454 152L442 140Z" />
	<rect class="furniture" x="392" y="132" width="78" height="8" rx="2" />
	<path class="furniture-light" d="M394 133.5H468" />
	<path class="book-a" d="M458 132V108H464V132Z" />
	<path class="book-c" d="M464.4 132L462 112L467 111.4L469.6 132Z" />

	<!-- The coat stand. -->
	<path
		class="furniture"
		d="M26 260Q32 250 38 246H42Q48 250 54 260L50 261Q45 254 40 252Q35 254 30 261Z"
	/>
	<rect class="furniture" x="37" y="122" width="6" height="128" rx="2" />
	<path class="furniture-light" d="M38.6 126V246" />
	<path class="coat-arm" d="M38 132Q26 130 22 120M42 132Q54 130 58 120" />
	<circle class="peg" cx="40" cy="117" r="5" />
	<circle class="peg-light" cx="38.4" cy="115.4" r="1.6" />

	<!-- The chest. -->
	<path class="cast" d="M96 258H180L176 262H100Z" />
	<rect class="furniture" x="98" y="214" width="76" height="44" rx="3" />
	<path class="furniture-seam" d="M100 229H172M100 244H172" />
	<rect class="lid" x="95" y="203" width="82" height="13" rx="3" />
	<path class="furniture-light" d="M98 205H174" />
	<path class="metal" d="M98 214H106V258H98ZM166 214H174V258H166Z" />
	<rect class="metal" x="129" y="212" width="14" height="14" rx="2" />
	<circle class="lock" cx="136" cy="220" r="2" />

	<!-- The desk and its lamp. -->
	<rect class="furniture" x="404" y="210" width="7" height="52" />
	<rect class="furniture" x="494" y="210" width="7" height="52" />
	<rect class="furniture-dark" x="418" y="211" width="70" height="17" rx="2" />
	<circle class="peg" cx="453" cy="219.5" r="2.4" />
	<rect class="furniture" x="398" y="204" width="110" height="8" rx="2" />
	<path class="furniture-light" d="M400 205.5H506" />
	<circle
		class="lamp-halo"
		cx="414"
		cy="178"
		r="34"
		fill="url(#{uid}-glow)"
		data-effect
		data-lamp
	/>
	<ellipse class="lamp" cx="414" cy="203" rx="9" ry="2.6" />
	<path class="lamp-arm" d="M414 202L408 186L416 176" />
	<path class="bulb" d="M406.4 182.6Q414 191 421.6 182.6Z" />
	<path class="lamp" d="M403 183L408 166Q414 162 420 166L425 183Q414 186 403 183Z" />
	<path class="lamp-light" d="M407 180L410.4 168.4Q412 167 413 167.4L410.4 180.6Z" />

	<!-- The mat by the desk. -->
	<ellipse class="mat" cx="482" cy="304" rx="36" ry="8" />
	<ellipse class="mat-ring" cx="482" cy="303.4" rx="27" ry="5.4" />

	{#each BEHIND as place (place)}
		{@render objectIn(place)}
	{/each}

	<g class="companion-spot">
		<ellipse
			class="cast"
			cx={COMPANION_SPOT.x + COMPANION_SPOT.size / 2}
			cy="294"
			rx="34"
			ry="4.4"
		/>
		<StoryDino x={COMPANION_SPOT.x} y={COMPANION_SPOT.y} size={COMPANION_SPOT.size} mood="happy" />
	</g>

	{#each IN_FRONT as place (place)}
		{@render objectIn(place)}
	{/each}

	<!-- Night falls on the whole room in the dark theme; the lights then glow above it. -->
	<rect class="night" x="0" y="0" width={SCENE_WIDTH} height={SCENE_HEIGHT} />
	<circle
		class="lamp-night"
		cx="414"
		cy="186"
		r="60"
		fill="url(#{uid}-glow)"
		data-effect
		data-lamp
	/>
	{#each FAIRY_BULBS as bulb, index (index)}
		<circle
			class="fairy-glow tone-{bulb.tone}"
			cx={bulb.x}
			cy={bulb.y + 5}
			r="6"
			data-effect
			data-twinkle={index % 3}
		/>
	{/each}

	{#if mark}
		<rect
			class="mark"
			x={mark[0]}
			y={mark[1]}
			width={mark[2]}
			height={mark[3]}
			rx="6"
			data-mark={marked}
		/>
	{/if}
</svg>

<style>
	.hideout {
		display: block;
		inline-size: 100%;
		block-size: auto;
	}

	.hideout path,
	.hideout rect,
	.hideout circle,
	.hideout ellipse {
		stroke-linejoin: round;
		stroke-linecap: round;
	}

	.wall {
		fill: var(--dd-color-hideout-wall);
	}

	.plank-tint {
		fill: var(--dd-color-hideout-shade);
		opacity: var(--dd-opacity-hideout-plank);
	}

	.grain {
		fill: transparent;
		stroke: var(--dd-color-hideout-wall-grain);
		stroke-width: var(--dd-border-width-thin);
		opacity: var(--dd-opacity-hideout-light);
		vector-effect: non-scaling-stroke;
	}

	.seam {
		stroke: var(--dd-color-hideout-wall-seam);
		stroke-width: var(--dd-border-width-thick);
		vector-effect: non-scaling-stroke;
	}

	.knot {
		fill: var(--dd-color-hideout-wall-grain);
	}

	.knot-heart {
		fill: var(--dd-color-hideout-wall-seam);
	}

	.sky-high {
		stop-color: var(--dd-color-hideout-sky-high);
	}

	.sky-low {
		stop-color: var(--dd-color-hideout-sky-low);
	}

	.glow-stop {
		stop-color: var(--dd-color-hideout-glow);
	}

	.glow-stop.end {
		stop-opacity: 0;
	}

	.stars {
		opacity: var(--dd-opacity-hideout-stars);
	}

	.star {
		fill: var(--dd-color-hideout-star);
	}

	.sky-light {
		fill: var(--dd-color-hideout-sky-light);
	}

	.sky-halo {
		fill: var(--dd-color-hideout-sky-light);
		opacity: var(--dd-opacity-hideout-light);
	}

	/* The sun is a full disc by day; at night a crescent moon: its shade is the night sky. */
	.moon-shade {
		fill: var(--dd-color-hideout-sky-high);
		opacity: var(--dd-opacity-hideout-stars);
	}

	.far-trees {
		fill: var(--dd-color-hideout-sky-far);
	}

	.far-trees-shade {
		fill: var(--dd-color-hideout-leaf-dark);
		opacity: var(--dd-opacity-hideout-light);
	}

	.twig {
		fill: transparent;
		stroke: var(--dd-color-hideout-bark);
		stroke-width: var(--dd-border-width-thick);
		vector-effect: non-scaling-stroke;
	}

	.twig-inside {
		stroke-width: var(--dd-border-width-target);
	}

	.leaf {
		fill: var(--dd-color-hideout-leaf);
		stroke: var(--dd-color-hideout-ink);
		stroke-width: var(--dd-border-width-thin);
		vector-effect: non-scaling-stroke;
	}

	.leaf-dark {
		fill: var(--dd-color-hideout-leaf-dark);
	}

	.leaf-vein {
		fill: transparent;
		stroke: var(--dd-color-hideout-leaf-light);
		stroke-width: var(--dd-border-width-thin);
		vector-effect: non-scaling-stroke;
	}

	.glass-glint {
		fill: var(--dd-color-hideout-light);
		opacity: var(--dd-opacity-hideout-light);
	}

	.mullion,
	.frame-edge,
	.furniture,
	.furniture-dark,
	.lid,
	.bracket,
	.beam,
	.bark,
	.floor,
	.skirting,
	.trapdoor,
	.paper,
	.peg,
	.nail,
	.metal,
	.pot,
	.pot-rim,
	.plant,
	.book-a,
	.book-c,
	.lamp,
	.bulb,
	.mat,
	.rug-edge,
	.fairy {
		stroke: var(--dd-color-hideout-ink);
		stroke-width: var(--dd-border-width-thick);
		vector-effect: non-scaling-stroke;
	}

	.mullion {
		fill: var(--dd-color-hideout-beam);
	}

	.mullion-light,
	.furniture-light,
	.beam-light,
	.floor-light {
		fill: transparent;
		stroke: var(--dd-color-hideout-light);
		stroke-width: var(--dd-border-width-thin);
		opacity: var(--dd-opacity-hideout-light);
		vector-effect: non-scaling-stroke;
	}

	.frame {
		fill: var(--dd-color-hideout-beam);
	}

	.frame-light {
		fill: var(--dd-color-hideout-beam-light);
		opacity: var(--dd-opacity-hideout-light);
	}

	.frame-edge {
		fill: transparent;
	}

	.bolt {
		fill: var(--dd-color-hideout-iron);
	}

	.furniture,
	.bracket,
	.lid {
		fill: var(--dd-color-hideout-furniture);
	}

	.furniture-dark {
		fill: var(--dd-color-hideout-furniture-dark);
	}

	.furniture-seam,
	.trapdoor-line,
	.floor-seam {
		fill: transparent;
		stroke: var(--dd-color-hideout-furniture-dark);
		stroke-width: var(--dd-border-width-thick);
		vector-effect: non-scaling-stroke;
	}

	.floor-seam {
		stroke: var(--dd-color-hideout-floor-seam);
	}

	.lid {
		fill: var(--dd-color-hideout-beam);
	}

	.coat-arm {
		fill: transparent;
		stroke: var(--dd-color-hideout-furniture-dark);
		stroke-width: var(--dd-border-width-target);
		vector-effect: non-scaling-stroke;
	}

	.peg {
		fill: var(--dd-color-hideout-furniture-dark);
	}

	.peg-light {
		fill: var(--dd-color-hideout-light);
		opacity: var(--dd-opacity-hideout-light);
	}

	.nail {
		fill: var(--dd-color-hideout-iron);
	}

	.metal {
		fill: var(--dd-color-hideout-metal);
	}

	.lock {
		fill: var(--dd-color-hideout-ink);
	}

	.iron-line {
		fill: transparent;
		stroke: var(--dd-color-hideout-iron);
		stroke-width: var(--dd-border-width-thick);
		vector-effect: non-scaling-stroke;
	}

	.cast {
		fill: var(--dd-color-hideout-shade);
		opacity: var(--dd-opacity-hideout-cast);
	}

	.pot,
	.pot-rim {
		fill: var(--dd-color-hideout-pot);
	}

	.plant {
		fill: var(--dd-color-hideout-plant);
	}

	.plant-dark {
		fill: var(--dd-color-hideout-plant-dark);
	}

	.book-a {
		fill: var(--dd-color-hideout-book-a);
	}

	.book-c {
		fill: var(--dd-color-hideout-book-c);
	}

	.paper {
		fill: var(--dd-color-hideout-paper);
	}

	.tape {
		fill: var(--dd-color-hideout-book-c);
		opacity: var(--dd-opacity-hideout-light);
	}

	.sketch,
	.sketch-ground {
		fill: transparent;
		stroke: var(--dd-color-hideout-book-b);
		stroke-width: var(--dd-border-width-thick);
		vector-effect: non-scaling-stroke;
	}

	.sketch-ground {
		stroke: var(--dd-color-hideout-plant-dark);
	}

	.sketch-sun {
		fill: var(--dd-color-hideout-book-c);
	}

	.beam {
		fill: var(--dd-color-hideout-beam);
	}

	.beam-shade {
		fill: var(--dd-color-hideout-beam-dark);
	}

	.fairy-string {
		fill: transparent;
		stroke: var(--dd-color-hideout-cord);
		stroke-width: var(--dd-border-width-thin);
		vector-effect: non-scaling-stroke;
	}

	.fairy-cap {
		fill: var(--dd-color-hideout-iron);
	}

	.fairy.tone-0,
	.fairy-glow.tone-0 {
		fill: var(--dd-color-hideout-fairy-a);
	}

	.fairy.tone-1,
	.fairy-glow.tone-1 {
		fill: var(--dd-color-hideout-fairy-b);
	}

	.fairy.tone-2,
	.fairy-glow.tone-2 {
		fill: var(--dd-color-hideout-fairy-c);
	}

	.fairy {
		stroke-width: var(--dd-border-width-thin);
	}

	.fairy-glow {
		opacity: var(--dd-opacity-hideout-fairy-glow);
	}

	.bark {
		fill: var(--dd-color-hideout-bark);
	}

	.bark-light {
		fill: var(--dd-color-hideout-bark-light);
	}

	.bark-line {
		fill: transparent;
		stroke: var(--dd-color-hideout-bark-dark);
		stroke-width: var(--dd-border-width-thick);
		vector-effect: non-scaling-stroke;
	}

	.bark-knot {
		fill: var(--dd-color-hideout-bark-dark);
	}

	.floor {
		fill: var(--dd-color-hideout-floor);
		stroke: none;
	}

	.skirting {
		fill: var(--dd-color-hideout-beam-dark);
	}

	.trapdoor {
		fill: var(--dd-color-hideout-furniture);
	}

	.sunbeam {
		opacity: var(--dd-opacity-hideout-beam);
	}

	.rug-edge {
		fill: var(--dd-color-hideout-rug-edge);
	}

	.rug-base {
		fill: var(--dd-color-hideout-rug-base);
	}

	.rug-a {
		fill: var(--dd-color-hideout-rug-a);
	}

	.rug-b {
		fill: var(--dd-color-hideout-rug-b);
	}

	.rug-c {
		fill: var(--dd-color-hideout-rug-c);
	}

	.rug-fringe {
		fill: transparent;
		stroke: var(--dd-color-hideout-rug-base);
		stroke-width: var(--dd-border-width-thick);
		vector-effect: non-scaling-stroke;
	}

	.lamp {
		fill: var(--dd-color-hideout-lamp);
	}

	.lamp-arm {
		fill: transparent;
		stroke: var(--dd-color-hideout-lamp-dark);
		stroke-width: var(--dd-border-width-target);
		vector-effect: non-scaling-stroke;
	}

	.lamp-light {
		fill: var(--dd-color-hideout-light);
		opacity: var(--dd-opacity-hideout-light);
	}

	.bulb {
		fill: var(--dd-color-hideout-bulb);
	}

	.lamp-halo {
		opacity: var(--dd-opacity-hideout-glow);
	}

	.lamp-night {
		opacity: var(--dd-opacity-hideout-stars);
	}

	.mat {
		fill: var(--dd-color-hideout-cushion);
	}

	.mat-ring {
		fill: transparent;
		stroke: var(--dd-color-hideout-cushion-dark);
		stroke-width: var(--dd-border-width-thick);
		vector-effect: non-scaling-stroke;
	}

	.night {
		fill: var(--dd-color-hideout-night);
		opacity: var(--dd-opacity-hideout-night);
		pointer-events: none;
	}

	.mark {
		fill: var(--dd-color-hideout-light);
		fill-opacity: var(--dd-opacity-hideout-plank);
		stroke: var(--dd-color-hideout-mark);
		stroke-width: var(--dd-border-width-focus);
		stroke-dasharray: 6 4;
		vector-effect: non-scaling-stroke;
	}

	/* A small, slow life: the leaves outside sway, the lamp and the little lights breathe. */
	@keyframes dd-hideout-sway {
		0%,
		100% {
			rotate: 0deg;
		}

		50% {
			rotate: 2.5deg;
		}
	}

	@keyframes dd-hideout-breathe {
		0%,
		100% {
			scale: 1;
		}

		50% {
			scale: 1.08;
		}
	}

	.sway {
		transform-box: view-box;
		transform-origin: 236px 52px;
		animation-name: dd-hideout-sway;
		animation-duration: var(--dd-duration-hideout-sway);
		animation-timing-function: var(--dd-easing-standard);
		animation-iteration-count: infinite;
	}

	[data-lamp],
	.fairy-glow {
		transform-box: fill-box;
		transform-origin: center;
		animation-name: dd-hideout-breathe;
		animation-duration: var(--dd-duration-hideout-glow);
		animation-timing-function: var(--dd-easing-standard);
		animation-iteration-count: infinite;
	}

	.fairy-glow[data-twinkle='1'] {
		animation-delay: calc(var(--dd-duration-hideout-glow) / -3);
	}

	.fairy-glow[data-twinkle='2'] {
		animation-delay: calc(var(--dd-duration-hideout-glow) / -1.5);
	}

	.hideout[data-still] * {
		animation: none;
	}
</style>
