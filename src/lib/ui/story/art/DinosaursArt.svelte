<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import StoryDino from '../StoryDino.svelte';

	interface Props {
		/** One of `STORY_ART_GROUPS.dinosaurs`. */
		art: string;
	}

	let { art }: Props = $props();

	/** A row of triangles along the segment from a to b, pointing to its left side (`side` 1) or right (-1). */
	function teethPath(
		ax: number,
		ay: number,
		bx: number,
		by: number,
		count: number,
		length: number,
		side: 1 | -1
	): string {
		const dx = bx - ax;
		const dy = by - ay;
		const span = Math.hypot(dx, dy);
		const ux = dx / span;
		const uy = dy / span;
		const half = span / count / 2;
		const nx = -uy * side * length;
		const ny = ux * side * length;
		return Array.from({ length: count }, (_, i) => {
			const cx = ax + ux * half * (2 * i + 1);
			const cy = ay + uy * half * (2 * i + 1);
			return `M${cx - ux * half} ${cy - uy * half}L${cx + nx} ${cy + ny}L${cx + ux * half} ${cy + uy * half}Z`;
		}).join('');
	}

	const BABIES = [
		{ x: 26, tilt: -6, fill: 'baby-a' },
		{ x: 77, tilt: 0, fill: 'baby-b' },
		{ x: 127, tilt: 6, fill: 'baby-c' }
	] as const;
	const BABY_SCALE = 1.25;
	const SHELL_CAPS = [
		{ x: 58, y: 93, tilt: -20 },
		{ x: 104, y: 94, tilt: 15 },
		{ x: 148, y: 92, tilt: -8 }
	] as const;

	const STEGO_PLATES = [
		{ x: 62, y: 56, tilt: -50, height: 11 },
		{ x: 71, y: 47, tilt: -30, height: 14 },
		{ x: 83, y: 43, tilt: -5, height: 16 },
		{ x: 96, y: 45, tilt: 20, height: 14 },
		{ x: 106, y: 53, tilt: 45, height: 11 }
	] as const;
	const POND_STONES = [
		{ x: 36, y: 80 },
		{ x: 46, y: 75 },
		{ x: 114, y: 75 },
		{ x: 125, y: 80 }
	] as const;
	const FLYING_DROPS = [
		{ x: 14, y: 46, tilt: -40 },
		{ x: 26, y: 30, tilt: -20 },
		{ x: 46, y: 20, tilt: -10 },
		{ x: 120, y: 22, tilt: 15 },
		{ x: 140, y: 34, tilt: 30 },
		{ x: 150, y: 54, tilt: 45 },
		{ x: 66, y: 34, tilt: -5 },
		{ x: 128, y: 76, tilt: 0 }
	] as const;
	const PUDDLES = [
		{ x: 14, y: 88, rx: 20, ry: 6 },
		{ x: 146, y: 89, rx: 20, ry: 6 },
		{ x: 18, y: 74, rx: 12, ry: 3 },
		{ x: 140, y: 74, rx: 11, ry: 3 }
	] as const;

	const TREX_UPPER_TEETH = teethPath(55, 33, 94, 42, 6, 4.5, 1);
	const TREX_LOWER_TEETH = teethPath(60, 53.5, 94, 46.5, 5, 4, -1);
</script>

{#if art === 'dino-opening'}
	<g data-story-art="dino-opening">
		<rect class="sky" width="160" height="100" />
		<circle class="star line" cx="140" cy="16" r="8" />
		<path class="rock line" d="M-2 82 L20 38 L36 38 L60 82 Z" />
		<path class="spark line" d="M20 38 L23 45 L27 41 L31 46 L36 38 Z" />
		<circle class="white line" cx="31" cy="29" r="5" />
		<circle class="white line" cx="37" cy="20" r="6" />
		<circle class="white line" cx="30" cy="11" r="4.5" />
		<path class="grass line" d="M-4 79 Q40 75 80 79 T164 78 V104 H-4 Z" />
		<path class="wood line" d="M142 82 Q139 62 145 42 L150 43 Q145 62 148 82 Z" />
		<path class="leaf line" d="M147 42 Q134 32 122 40 Q136 37 147 42 Z" />
		<path class="leaf line" d="M147 42 Q160 32 168 42 Q158 37 147 42 Z" />
		<path class="leaf line" d="M147 42 Q140 50 132 58 Q138 46 147 42 Z" />
		<path class="leaf line" d="M147 42 Q156 50 162 60 Q158 46 147 42 Z" />
		<rect class="b line" x="100" y="38" width="21" height="32" rx="6" />
		<rect class="b line" x="109" y="52" width="10" height="11" rx="3" />
		<rect class="a line" x="98" y="31" width="25" height="9" rx="4.5" />
		<path class="open line" d="M104 31 V40 M117 31 V40" />
		<StoryDino x={58} y={20} size={64} />
		<path class="b line" d="M99 45 Q106 55 104 71 L108 71 Q110 55 102 43 Z" />
		<path class="b line" d="M91 79 V90 L93.5 87.5 L96 90 V79 Z" />
		<path class="a line" d="M73 57 L90 60 L107 57 V79 L90 82 L73 79 Z" />
		<path class="paper line" d="M75 59 L90 62 V80 L75 77 Z" />
		<path class="paper line" d="M90 62 L105 59 V77 L90 80 Z" />
	</g>
{:else if art === 'dino-eggs'}
	<g data-story-art="dino-eggs">
		<rect class="sky" width="160" height="100" />
		<path class="grass line" d="M-4 72 Q40 68 80 72 T164 71 V104 H-4 Z" />
		<ellipse class="soil line" cx="80" cy="88" rx="74" ry="11" />
		<path
			class="wood-stroke"
			d="M14 86 L34 90 M40 94 L62 91 M98 93 L120 95 M126 89 L146 86 M24 92 L36 96"
		/>
		{#each BABIES as baby (baby.x)}
			<g transform="translate({baby.x} 88) rotate({baby.tilt}) scale({BABY_SCALE})">
				<path class="line {baby.fill}" d="M-9 -12 L-24 -20 L-15 -4 Z" />
				<ellipse class="line {baby.fill}" cx="0" cy="-16" rx="11" ry="12" />
				<path
					class="line {baby.fill}"
					d="M-9 -38 L-16 -38 L-11 -33 Z M-11 -31 L-17 -29 L-11 -26 Z"
				/>
				<path class="dark line" d="M1 -37 L18 -52 L21 -40 Z" />
				<ellipse class="f" cx="12" cy="-42" rx="4" ry="1.8" transform="rotate(-20 12 -42)" />
				<path
					class="line {baby.fill}"
					d="M-8 -25 Q-14 -36 -8 -45 Q-2 -51 6 -51 L14 -56 Q20 -56 18 -51 L2 -38 L20 -41 Q23 -37 18 -34 Q10 -27 -2 -24 Z"
				/>
				<circle class="dark" cx="14" cy="-53.5" r="0.8" />
				<circle class="white line" cx="-1" cy="-43" r="3.4" />
				<circle class="dark" cx="0" cy="-44" r="1.6" />
				<path class="white line" d="M-9 -29 L-14 -34 L-13 -26 Z" />
				<path class="white line" d="M-9 -28 Q2 -24 14 -32 L5 -12 Z" />
				<circle class="a" cx="0" cy="-24" r="1.5" />
				<circle class="a" cx="6" cy="-25" r="1.5" />
				<circle class="a" cx="3" cy="-19" r="1.5" />
				<path
					class="shell line"
					d="M-15 -15 L-10 -19 L-5 -14 L0 -20 L5 -14 L10 -19 L15 -15 Q15 1 0 1 Q-15 1 -15 -15 Z"
				/>
				<circle class="egg-spot" cx="-7" cy="-7" r="2" />
				<circle class="egg-spot" cx="6" cy="-9" r="1.5" />
				<circle class="egg-spot" cx="2" cy="-3" r="1.8" />
				<ellipse class="line {baby.fill}" cx="-13" cy="-15" rx="3" ry="2.5" />
				<ellipse class="line {baby.fill}" cx="13" cy="-15" rx="3" ry="2.5" />
				<path class="open line" d="M22 -55 L26 -59 M25 -47 L30 -48 M16 -59 L17 -64" />
			</g>
		{/each}
		{#each SHELL_CAPS as cap (cap.x)}
			<path
				class="shell line"
				transform="translate({cap.x} {cap.y}) rotate({cap.tilt})"
				d="M-8 0 Q-8 -9 0 -9 Q8 -9 8 0 L5 -2.5 L2 1 L-1 -2.5 L-4 1 Z"
			/>
		{/each}
	</g>
{:else if art === 'dino-diplodocus'}
	<g data-story-art="dino-diplodocus">
		<rect class="sky" width="160" height="100" />
		<rect class="water-deep" x="30" y="74" width="100" height="30" />
		<path class="e line" d="M76 40 Q52 44 54 92 L60 92 Q60 58 80 54 Z" />
		<rect class="water" x="30" y="79" width="100" height="25" />
		<path class="open line" d="M30 79 H130" />
		<path class="ripple" d="M64 87 Q70 85 76 87 M90 92 Q96 90 102 92 M38 94 Q44 92 50 94" />
		<ellipse class="ripple" cx="57" cy="80" rx="9" ry="2.2" />
		<ellipse class="ripple" cx="57" cy="81" rx="15" ry="4" />
		<path class="water line" d="M50 73 Q52 70 53 74 Q52 76 50 73 Z" />
		<path class="water line" d="M64 72 Q66 69 67 73 Q66 75 64 72 Z" />
		<path class="grass line" d="M-4 68 L34 68 Q44 70 46 104 L-4 104 Z" />
		<path class="grass line" d="M164 68 L126 68 Q116 70 114 104 L164 104 Z" />
		<circle class="leaf line" cx="148" cy="64" r="7" />
		<circle class="leaf line" cx="156" cy="62" r="6" />
		<path class="e line" d="M82 50 L91 53 L76 70 L70 65 Z" />
		<path class="e line" d="M101 53 L109 52 L124 68 L117 71 Z" />
		<ellipse class="e line" cx="95" cy="46" rx="25" ry="13" />
		<path class="e line" d="M88 52 L96 55 L82 72 L76 68 Z" />
		<path class="e line" d="M108 50 L116 49 L132 63 L126 67 Z" />
		<circle class="grass" cx="88" cy="40" r="3" />
		<circle class="grass" cx="99" cy="38" r="2.5" />
		<circle class="grass" cx="82" cy="46" r="2" />
		<path class="e line" d="M110 38 Q126 30 136 16 L143 20 Q132 40 116 54 Z" />
		<ellipse class="e line" cx="142" cy="17" rx="8.5" ry="5.5" transform="rotate(-10 142 17)" />
		<circle class="dark" cx="144" cy="15" r="1.4" />
		<path class="open line" d="M145 20 Q148 20 150 18" />
	</g>
{:else if art === 'dino-nest'}
	<g data-story-art="dino-nest">
		<rect class="sky" width="160" height="100" />
		<path class="grass line" d="M-4 76 Q40 72 80 76 T164 75 V104 H-4 Z" />
		<ellipse class="soil line" cx="134" cy="70" rx="25" ry="8" />
		<ellipse class="shell line" cx="126" cy="64" rx="6" ry="8" />
		<ellipse class="shell line" cx="139" cy="62" rx="6" ry="8" />
		<circle class="egg-spot" cx="124" cy="62" r="1.5" />
		<circle class="egg-spot" cx="141" cy="60" r="1.5" />
		<path class="wood line" d="M108 70 Q110 85 134 85 Q158 85 160 70 Q134 78 108 70 Z" />
		<path class="open line" d="M114 76 L126 80 M130 81 L144 79 M148 76 L156 72" />
		<rect class="wood line" x="21" y="44" width="5" height="40" rx="1" />
		<rect class="wood line" x="4" y="16" width="39" height="34" rx="3" />
		<rect class="sand line" x="7" y="19" width="33" height="28" rx="2" />
		<path
			class="metal line"
			d="M17 33 V29 A6.5 6.5 0 0 1 30 29 V33 L26.5 33 V29 A3 3 0 0 0 20.5 29 V33 Z"
		/>
		<rect class="star line" x="14" y="32" width="19" height="13" rx="2" />
		<circle class="dark" cx="23.5" cy="37" r="1.8" />
		<path class="dark" d="M22.5 38 H24.5 L25 42 H22 Z" />
		<path class="b line" d="M106 54 Q124 56 136 72 Q120 68 106 66 Z" />
		<rect class="b line" x="96" y="62" width="9" height="15" rx="3" />
		<rect class="b line" x="70" y="62" width="9" height="15" rx="3" />
		<ellipse class="b line" cx="88" cy="57" rx="22" ry="14" />
		<rect class="b line" x="100" y="63" width="10" height="17" rx="3" />
		<rect class="b line" x="76" y="63" width="10" height="17" rx="3" />
		<ellipse class="g line" cx="70" cy="45" rx="11" ry="17" transform="rotate(-20 70 45)" />
		<circle class="c" cx="66" cy="31" r="1.8" />
		<circle class="c" cx="75" cy="33" r="1.8" />
		<circle class="c" cx="80" cy="42" r="1.8" />
		<circle class="c" cx="80" cy="52" r="1.8" />
		<path class="white line" d="M62 45 L54 30 L66 43 Z" />
		<path class="b line" d="M72 46 Q77 58 66 64 L52 66 Q44 65 42 60 L48 52 Q54 44 72 46 Z" />
		<path class="soil line" d="M42 60 L48 56 L50 65 Q44 65 42 60 Z" />
		<path class="white line" d="M56 48 L43 34 L60 45 Z" />
		<path class="white line" d="M47 53 L43 45 L51 51 Z" />
		<circle class="white line" cx="61" cy="53" r="3" />
		<circle class="dark" cx="60" cy="54" r="1.4" />
		<path class="b line" d="M58 53 A3 3 0 0 1 64 53 Z" />
		<path class="open line" d="M49 62 Q54 63 58 61" />
	</g>
{:else if art === 'dino-pond'}
	<g data-story-art="dino-pond">
		<rect class="sky" width="160" height="100" />
		<path class="grass line" d="M-4 70 Q40 66 80 70 T164 69 V104 H-4 Z" />
		{#each PUDDLES as puddle (puddle.x)}
			<ellipse class="water line" cx={puddle.x} cy={puddle.y} rx={puddle.rx} ry={puddle.ry} />
		{/each}
		<ellipse class="soil line" cx="80" cy="85" rx="47" ry="11" />
		<path class="crack" d="M48 86 L56 83 L60 88 M100 90 L106 86 L114 88 M70 92 L76 90" />
		{#each POND_STONES as stone (stone.x)}
			<ellipse class="rock line" cx={stone.x} cy={stone.y} rx="5" ry="3.5" />
		{/each}
		<g transform="translate(44 88) rotate(-15)">
			<path class="g line" d="M5 0 L11 -4 L11 4 Z" />
			<ellipse class="g line" cx="0" cy="0" rx="6.5" ry="3.8" />
			<circle class="dark" cx="-3" cy="-1" r="1" />
		</g>
		<path class="c line" d="M60 66 Q40 60 22 52 Q36 66 60 77 Z" />
		<path class="white line" d="M28 55 L23 45 L33 57 Z" />
		<path class="white line" d="M35 58 L32 48 L40 60 Z" />
		{#each STEGO_PLATES as plate (plate.x)}
			<path
				class="a line"
				transform="translate({plate.x} {plate.y}) rotate({plate.tilt})"
				d="M-5 4 Q-6 -{plate.height / 2} 0 -{plate.height} Q6 -{plate.height / 2} 5 4 Z"
			/>
		{/each}
		<path class="c line" d="M56 80 Q54 46 84 43 Q110 43 114 76 Z" />
		<rect class="c line" x="62" y="72" width="10" height="12" rx="3" />
		<rect class="c line" x="98" y="72" width="10" height="12" rx="3" />
		<path class="c line" d="M106 56 Q118 56 122 60 L120 70 Q112 70 108 72 Z" />
		<ellipse class="c line" cx="124" cy="64" rx="9" ry="6" />
		<path class="open line" d="M123 62 Q125.5 60 128 62" />
		<path class="open line" d="M126 67 H131" />
		<path class="drip" d="M76 50 V56 M90 48 V55 M100 52 V58 M118 58 V62" />
		{#each FLYING_DROPS as drop (drop.x)}
			<path
				class="water line"
				transform="translate({drop.x} {drop.y}) rotate({drop.tilt})"
				d="M0 -4 Q3 0.5 0 2.5 Q-3 0.5 0 -4 Z"
			/>
		{/each}
	</g>
{:else if art === 'dino-raptor'}
	<g data-story-art="dino-raptor">
		<rect class="sky" width="160" height="100" />
		<path class="grass line" d="M-4 84 Q40 80 80 84 T164 83 V104 H-4 Z" />
		<path class="rock line" d="M4 88 Q0 52 20 40 Q42 30 64 40 Q82 54 80 88 Z" />
		<text class="word" x="40" y="70" text-anchor="middle">{m.story_art_miam()}</text>
		<path class="h line" d="M122 50 Q140 40 158 28 Q146 48 126 62 Z" />
		<path class="h line" d="M118 60 Q127 70 122 77 L127 88 H118 L116 77 Q110 68 112 62 Z" />
		<ellipse class="h line" cx="112" cy="56" rx="16" ry="11" transform="rotate(-25 112 56)" />
		<path class="open spot-stroke" d="M112 46 L115 51 M119 45 L121 50 M105 50 L109 54" />
		<path class="h line" d="M98 52 Q95 40 100 31 L108 33 Q106 44 108 54 Z" />
		<path class="h line" d="M108 30 Q106 21 96 21 L80 25 Q75 29 79 33 L98 38 Q106 38 108 30 Z" />
		<circle class="dark" cx="83" cy="27" r="0.9" />
		<path class="open line" d="M80 33 L94 35 Q97 35 98 33" />
		<circle class="white line" cx="98" cy="27" r="2.8" />
		<circle class="dark" cx="97" cy="27.8" r="1.3" />
		<path class="h line" d="M95.2 27 A2.8 2.8 0 0 1 100.8 27 Z" />
		<path class="h line" d="M108 62 Q101 70 108 77 L103 88 H115 L114 77 Q119 67 116 60 Z" />
		<path class="white line" d="M103 88 Q99 85 102 81 Q103 85 105 87 Z" />
		<g transform="translate(70 64) rotate(-24)">
			<path class="wood line" d="M0 0 L6 -2.4 V2.4 Z" />
			<path class="dark" d="M0 0 L2 -0.8 V0.8 Z" />
			<rect class="c line" x="6" y="-2.4" width="16" height="4.8" />
			<rect class="f line" x="22" y="-2.4" width="4" height="4.8" rx="1" />
		</g>
		<path class="h line" d="M103 51 L93 55 L91 60 L96 60 L104 57 Z" />
		<ellipse class="h line" cx="90" cy="57" rx="3" ry="2.6" />
	</g>
{:else if art === 'dino-trex'}
	<g data-story-art="dino-trex">
		<rect class="sky" width="160" height="100" />
		<path class="grass line" d="M-4 86 Q40 82 80 86 T164 85 V104 H-4 Z" />
		<path class="leaf line" d="M14 86 Q4 74 2 62 Q12 72 18 86 Z" />
		<path class="leaf line" d="M18 86 Q10 70 12 58 Q18 72 22 86 Z" />
		<path class="g line" d="M128 52 Q146 48 164 36 V52 Q146 62 130 68 Z" />
		<path class="g line" d="M116 66 L110 88 H120 L124 70 Z" />
		<ellipse class="g line" cx="116" cy="58" rx="22" ry="16" transform="rotate(-25 116 58)" />
		<path class="g line" d="M94 40 Q100 52 104 62 L116 50 Q108 40 100 33 Z" />
		<ellipse class="g line" cx="122" cy="70" rx="10" ry="12" />
		<path class="g line" d="M118 74 L112 86 L102 86 Q99 90 104 90 H118 L127 78 Z" />
		<path class="dark line" d="M52 32 L96 42 V46 L58 54 Q53 45 52 32 Z" />
		<path class="f" d="M64 51 Q76 45 92 46 L93 48 Q78 52 64 52 Z" />
		<path class="white line" d={TREX_UPPER_TEETH} />
		<path class="g line" d="M104 36 Q102 16 82 14 L54 18 Q46 20 48 28 L52 32 L96 42 Z" />
		<path class="g line" d="M96 46 L58 54 Q52 56 54 60 Q74 64 100 54 Z" />
		<path class="white line" d={TREX_LOWER_TEETH} />
		<circle class="dark" cx="53" cy="22" r="1" />
		<circle class="white line" cx="86" cy="25" r="3.2" />
		<circle class="dark" cx="85" cy="25.5" r="1.6" />
		<path class="open line bold" d="M79 19 L92 22" />
		<path class="g line" d="M104 58 Q96 60 94 66 L97 67 Q99 63 106 62 Z" />
		<path class="open line bold" d="M42 34 L30 30 M42 43 L27 43 M44 52 L32 57" />
		<path class="open line" d="M78 12 Q70 6 62 6 M84 13 Q78 4 70 1" />
		<g transform="translate(46 10) rotate(-28)">
			<path class="b line" d="M8 1 Q17 0 19 4 Q12 5 7 3 Z" />
			<path class="b line" d="M-8 2 Q-9 -9 0 -9 Q9 -9 9 2 Z" />
			<path class="open line" d="M0 -9 V2" />
			<circle class="b line" cx="0" cy="-9" r="1.5" />
		</g>
	</g>
{:else if art === 'dino-ending'}
	<g data-story-art="dino-ending">
		<rect class="sky" width="160" height="100" />
		<path class="rock line" d="M24 76 L42 42 L54 42 L74 76 Z" />
		<path class="spark line" d="M42 42 L45 48 L48 44 L51 49 L54 42 Z" />
		<circle class="white line" cx="50" cy="34" r="4.5" />
		<circle class="white line" cx="56" cy="26" r="5" />
		<path class="grass line" d="M-4 78 Q40 74 80 78 T164 77 V104 H-4 Z" />
		<path class="wood line" d="M146 80 Q143 62 148 44 L153 45 Q148 62 152 80 Z" />
		<path class="leaf line" d="M150 44 Q138 34 128 42 Q140 39 150 44 Z" />
		<path class="leaf line" d="M150 44 Q162 34 170 44 Q160 39 150 44 Z" />
		<path class="leaf line" d="M150 44 Q144 52 136 60 Q142 48 150 44 Z" />
		<path class="rock line" d="M4 96 L8 80 Q52 74 100 78 L106 96 Z" />
		<path class="a line" d="M14 65 L56 63 L98 65 L104 88 L56 86 L8 88 Z" />
		<path class="paper line" d="M16 66.5 L56 65 V84.5 L11 86.5 Z" />
		<path class="paper line" d="M56 65 L96 66.5 L101 86.5 L56 84.5 Z" />
		<path class="leaf line" d="M20 76 Q28 66 38 72 Q30 80 20 76 Z" />
		<path class="open line" d="M22 75 L36 72" />
		<rect class="c" x="31" y="68" width="8" height="3" transform="rotate(20 35 69.5)" />
		<path class="shell line" d="M40 82 L44 76 L48 79 L51 75 L53 82 Z" />
		<g class="dark">
			<ellipse cx="25" cy="83" rx="2.6" ry="2" />
			<circle cx="21" cy="79.5" r="1" />
			<circle cx="25" cy="78.5" r="1" />
			<circle cx="29" cy="79.5" r="1" />
		</g>
		<rect
			class="b line"
			x="4"
			y="88"
			width="14"
			height="5"
			rx="1.5"
			transform="rotate(-10 11 90.5)"
		/>
		<rect
			class="white line"
			x="16"
			y="86"
			width="5"
			height="5"
			rx="1"
			transform="rotate(-10 18.5 88.5)"
		/>
		<StoryDino x={86} y={20} size={64} />
		<g transform="translate(100.4 67.5) rotate(-8)">
			<rect class="white line" x="-30" y="-1" width="30" height="22" rx="1" />
			<rect class="sky line" x="-27" y="2" width="24" height="15" />
			<rect class="grass" x="-27" y="13" width="24" height="4" />
			<path class="e line" d="M-23 13 Q-23 8 -17 8 Q-12 8 -12 13 Z" />
			<path class="e line" d="M-14 9 Q-11 6 -9 3 L-7.5 4 Q-9 8 -12 11 Z" />
			<ellipse class="b line" cx="-7" cy="13" rx="3.5" ry="2.5" />
			<path class="white" d="M-10 11 L-12 9 L-9 10.5 Z" />
		</g>
	</g>
{/if}

<style>
	.line,
	.ripple,
	.crack,
	.drip,
	.wood-stroke,
	.spot-stroke {
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.line {
		stroke: var(--dd-color-story-line);
		stroke-width: var(--dd-border-width-thick);
	}

	.bold {
		stroke-width: var(--dd-border-width-drawing-bold);
	}

	.open,
	.ripple,
	.crack,
	.drip,
	.wood-stroke {
		fill: transparent;
	}

	.ripple {
		stroke: var(--dd-color-story-white);
		stroke-width: var(--dd-border-width-thick);
	}

	.crack {
		stroke: var(--dd-color-story-line);
		stroke-width: var(--dd-border-width-thick);
	}

	.drip {
		stroke: var(--dd-color-story-water);
		stroke-width: var(--dd-border-width-drawing-bold);
	}

	.wood-stroke {
		stroke: var(--dd-color-story-wood);
		stroke-width: var(--dd-border-width-thick);
	}

	.spot-stroke {
		stroke: var(--dd-color-story-spot);
		stroke-width: var(--dd-border-width-drawing-bold);
	}

	.sky {
		fill: var(--dd-color-story-sky);
	}

	.water {
		fill: var(--dd-color-story-water);
	}

	.water-deep {
		fill: var(--dd-color-story-water-deep);
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

	.rock {
		fill: var(--dd-color-story-rock);
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

	.paper {
		fill: var(--dd-color-story-paper);
	}

	.dark {
		fill: var(--dd-color-story-dark);
	}

	.star {
		fill: var(--dd-color-story-star);
	}

	.spark {
		fill: var(--dd-color-story-spark);
	}

	.shell {
		fill: var(--dd-color-egg-shell);
	}

	.egg-spot {
		fill: var(--dd-color-egg-spot);
	}

	.baby-a {
		fill: var(--dd-color-baby-a);
	}

	.baby-b {
		fill: var(--dd-color-baby-b);
	}

	.baby-c {
		fill: var(--dd-color-baby-c);
	}

	.a {
		fill: var(--dd-color-story-a);
	}

	.b {
		fill: var(--dd-color-story-b);
	}

	.c {
		fill: var(--dd-color-story-c);
	}

	.e {
		fill: var(--dd-color-story-e);
	}

	.f {
		fill: var(--dd-color-story-f);
	}

	.g {
		fill: var(--dd-color-story-g);
	}

	.h {
		fill: var(--dd-color-story-h);
	}

	.word {
		fill: var(--dd-color-story-ink);
		font-family: var(--dd-font-family-base);
		font-size: var(--dd-font-size-lg);
		font-weight: var(--dd-font-weight-bold);
	}
</style>
