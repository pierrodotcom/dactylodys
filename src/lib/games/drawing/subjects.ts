/**
 * The six subjects of the magic drawing, in the 200 x 200 box, lit from the top left. Strokes are
 * listed in drawing order: the shape that says what the subject is comes first, then its features,
 * then the details and the setting, so that the drawing reads at every step.
 */
import { roundedStarPath } from '$lib/ui/companion/geometry';
import { ellipsePath, mirrorPath, rotatePath, shiftPath, type XY } from './geometry';
import type { Mark, PictureSpec, StrokeSpec } from './shapes';

const oval = ellipsePath;

/** The same stroke on the other side of the drawing. */
function mirrored(stroke: StrokeSpec): StrokeSpec {
	return {
		...stroke,
		d: mirrorPath(stroke.d),
		fill: stroke.fill === undefined ? undefined : mirrorPath(stroke.fill),
		marks: stroke.marks?.map((mark) => ({ ...mark, d: mirrorPath(mark.d) }))
	};
}

function both(d: string): string {
	return d + mirrorPath(d);
}

/* ------------------------------------------------------------------ The cat */

const CAT_EYE: StrokeSpec = {
	d: 'M68 82C71 72 86 70 92 79C89 89 73 91 68 82Z',
	tone: 'iris',
	layer: 'front',
	flat: true,
	marks: [{ d: 'M64 84C69 69 89 67 95 80C87 75 73 75 64 84Z', tone: 'shade' }]
};

const CAT_PUPIL: StrokeSpec = {
	d: 'M80.5 73C84 77 84 85 80.5 89C77 85 77 77 80.5 73Z',
	tone: 'ink',
	layer: 'front',
	fine: true,
	flat: true
};

const CAT_GLINTS = oval(84.4, 77.4, 2.2, 2.2) + oval(77.4, 85.4, 1.1, 1.1);

const CAT_EAR: StrokeSpec = {
	d: 'M63.5 34C63.5 30 66 29 68.5 31.5L80 42.5C73 45.5 67.5 51 64.5 57.5C62.5 50 62.5 42 63.5 34Z',
	tone: 'pink',
	layer: 'front',
	fine: true
};

const CAT_PAW: StrokeSpec = {
	d: 'M69 189C67.5 181.5 72.5 177 82 177C91.5 177 96.5 181.5 95 189Z',
	tone: 'cream',
	layer: 'front'
};

const CAT: PictureSpec = {
	id: 'cat',
	ground: oval(102, 189, 70, 6.5),
	touches: [{ d: CAT_GLINTS + shiftPath(CAT_GLINTS, 39, 0), tone: 'white' }],
	strokes: [
		{
			d: 'M57 86C53 66 52 44 57 27C58 21 64 19 68 23L85 41C95 37 105 37 115 41L132 23C136 19 142 21 143 27C148 44 147 66 143 86C150 91 151 99 145 103C138 118 120 126 100 126C80 126 62 118 55 103C49 99 50 91 57 86Z',
			tone: 'fur',
			layer: 'front',
			marks: [
				{
					d: 'M80 106C80 96 92 94 100 99C108 94 120 96 120 106C120 117 110 122 100 122C90 122 80 117 80 106Z',
					tone: 'cream'
				},
				{ d: 'M100 42C103.5 48 103.5 54 100 60C96.5 54 96.5 48 100 42Z', tone: 'fur-dark' },
				{ d: both('M88 44C91 49 92 54 90 58C87 54 86 49 88 44Z'), tone: 'fur-dark' },
				{
					d: both(
						'M48 91C55 90 62 91 67 94.5C61 96.5 54 96.5 48 95.5ZM50 101C56 101 61.5 103 65.5 106C59.5 107 54 106.5 50 105.5Z'
					),
					tone: 'fur-dark'
				},
				{ d: oval(69.5, 109, 6.5, 3.6) + oval(130.5, 109, 6.5, 3.6), tone: 'pink' }
			]
		},
		CAT_EAR,
		mirrored(CAT_EAR),
		CAT_EYE,
		mirrored(CAT_EYE),
		CAT_PUPIL,
		mirrored(CAT_PUPIL),
		{
			d: 'M93 96C93 92 107 92 107 96C107 99 103 102 100 103C97 102 93 99 93 96Z',
			tone: 'pink',
			layer: 'front',
			marks: [{ d: oval(97.5, 95.2, 2, 1.2), tone: 'white' }]
		},
		{ d: 'M100 103L100 107C99 112 92 113 89 109M100 107C101 112 108 113 111 109', fine: true },
		{ d: 'M76 108C65 105 53 105 41 108M76 113C65 113 55 116 45 121', fine: true },
		{ d: mirrorPath('M76 108C65 105 53 105 41 108M76 113C65 113 55 116 45 121'), fine: true },
		{
			d: 'M68 112C55 132 49 158 55 175C59 186 72 189 100 189C128 189 141 186 145 175C151 158 145 132 132 112Z',
			tone: 'fur',
			marks: [
				{
					d: 'M78 122C86 134 114 134 122 122C120 146 112 166 100 171C88 166 80 146 78 122Z',
					tone: 'cream'
				},
				{
					d: both(
						'M50 146C58 145 66 147 71 151C65 154 57 154 50 153ZM51 161C58 160 65 162 69 166C63 168 57 168 51 167Z'
					),
					tone: 'fur-dark'
				},
				{ d: 'M48 108C70 148 130 148 152 108Z', tone: 'shade' }
			]
		},
		{ d: both('M85.5 150C83.5 161 82.5 170 82.5 178'), fine: true },
		CAT_PAW,
		mirrored(CAT_PAW),
		{ d: both('M78.5 183L78.5 188.5M86 183L86 188.5'), fine: true },
		{
			d: 'M142 180C168 186 186 168 182 142C180 128 170 121 163 126C158 130 161 136 166 138C172 143 171 160 158 168C152 172 146 172 140 170Z',
			tone: 'fur',
			layer: 'back',
			marks: [
				{
					d: 'M166 170L182 161L185 167L170 176ZM173 150L189 146L190 152L174 156ZM150 116L178 116L178 133L172 136C168 133 164 132 160 133Z',
					tone: 'fur-dark'
				}
			]
		}
	]
};

/* ----------------------------------------------------------------- The fish */

const FISH_BODY =
	'M30 100C30 76 56 60 88 60C116 60 136 78 142 100C136 122 116 140 88 140C56 140 30 124 30 100Z';

function rays(from: XY, tips: readonly XY[], width: number): string {
	return tips
		.map(
			([x, y]) =>
				`M${from[0] - width} ${from[1]}L${x} ${y}L${x + width * 0.6} ${y + width * 0.6}L${from[0] + width} ${from[1]}Z`
		)
		.join('');
}

const FISH: PictureSpec = {
	id: 'fish',
	touches: [{ d: oval(50.4, 89.8, 1.9, 1.9), tone: 'white' }],
	strokes: [
		{
			d: FISH_BODY,
			tone: 'sea',
			marks: [
				{ d: 'M30 113C52 130 100 138 142 106L142 150L30 150Z', tone: 'cream' },
				{
					d: 'M55 56C63 80 63 120 55 144L69 144C77 120 77 80 69 56ZM100 54C106 80 106 120 100 146L111 146C117 120 117 80 111 54Z',
					tone: 'stripe'
				}
			]
		},
		{
			d: oval(46, 91, 9.5, 9.5),
			tone: 'white',
			layer: 'front',
			flat: true,
			marks: [{ d: 'M35 90C36 78 56 78 57 90C51 84 41 84 35 90Z', tone: 'shade' }]
		},
		{ d: oval(48, 92.5, 5.2, 5.6), tone: 'ink', layer: 'front', fine: true, flat: true },
		{ d: 'M31 105C35 108.5 40 108.5 43.5 104.5', fine: true },
		{ d: 'M66 68C56 84 56 116 66 132', fine: true },
		{
			d: 'M128 100C140 84 156 70 178 60C172 80 171 92 176 100C171 108 172 120 178 140C156 130 140 116 128 100Z',
			tone: 'fin',
			layer: 'back',
			marks: [
				{
					d: rays(
						[140, 100],
						[
							[172, 70],
							[170, 100],
							[172, 130]
						],
						1.4
					),
					tone: 'gold-dark'
				}
			]
		},
		{
			d: 'M62 68C64 46 90 32 124 36C116 46 113 58 116 72Z',
			tone: 'fin',
			layer: 'back',
			marks: [
				{
					d: rays(
						[90, 66],
						[
							[80, 46],
							[96, 40],
							[110, 42]
						],
						1.3
					),
					tone: 'gold-dark'
				}
			]
		},
		{
			d: 'M80 132C84 150 98 158 114 156C108 150 108 142 112 128Z',
			tone: 'fin',
			layer: 'back'
		},
		{
			d: 'M76 114C84 104 96 100 106 100C108.5 103.5 106 107 108.5 110C111 114 107.5 116.5 109.5 120C111 124 107.5 126.5 106 129C96 129 84 124 76 114Z',
			tone: 'fin',
			layer: 'front',
			marks: [
				{
					d: rays(
						[80, 114],
						[
							[105, 102],
							[107, 111],
							[107, 120],
							[106, 127]
						],
						0.9
					),
					tone: 'gold-dark'
				}
			]
		},
		{
			d: 'M124 82C128 86 128 92 124 96M124 98C128 102 128 108 124 112M124 114C128 118 128 124 124 128',
			fine: true
		},
		{
			d: oval(22, 62, 7.5, 7.5) + oval(31, 40, 5, 5) + oval(22, 22, 4, 4),
			tone: 'bubble',
			fine: true,
			marks: [
				{
					d: oval(19.5, 59, 2, 2) + oval(29.5, 38.3, 1.3, 1.3) + oval(20.8, 20.8, 1, 1),
					tone: 'white'
				}
			]
		},
		{
			d: 'M178 198C171 184 182 176 178 166C175 159 179 153 188 150C185 157 185 162 188 168C194 180 186 188 190 198Z',
			tone: 'leaf',
			layer: 'back',
			marks: [
				{
					d: 'M183 198C178 184 188 176 183 166C181 160 183 155 188 150L196 198Z',
					tone: 'leaf-dark'
				}
			]
		},
		{
			d: 'M130 198C126 188 134 182 132 174C131 169 134 165 140 163C138 168 138 172 140 176C143 184 138 190 140 198Z',
			tone: 'leaf',
			layer: 'back'
		},
		{
			d: 'M22 198C16 184 26 174 22 162C20 154 26 148 32 146C30 154 30 160 32 166C36 178 30 188 32 198Z',
			tone: 'leaf',
			layer: 'back'
		}
	]
};

/* ---------------------------------------------------------------- The house */

/** Rows of round tiles along the roof, as little shaded crescents. */
function tileRows(): string {
	const rows: { y: number; from: number; to: number }[] = [
		{ y: 58, from: 52, to: 148 },
		{ y: 70, from: 44, to: 156 },
		{ y: 82, from: 36, to: 164 }
	];
	return rows
		.flatMap(({ y, from, to }, row) => {
			const parts: string[] = [];
			for (let x = from + (row % 2) * 6; x + 12 <= to; x += 12) {
				parts.push(
					`M${x} ${y}C${x} ${y + 9} ${x + 12} ${y + 9} ${x + 12} ${y}C${x + 9} ${y + 5} ${x + 3} ${y + 5} ${x} ${y}Z`
				);
			}
			return parts;
		})
		.join('');
}

const HOUSE_WINDOW: StrokeSpec = {
	d: 'M54 114C54 112 56 110 58 110L78 110C80 110 82 112 82 114L82 138L54 138Z',
	tone: 'glass',
	layer: 'front',
	flat: true,
	marks: [
		{
			d: 'M54 110L65 110C63 119 60 129 54 135ZM82 110L71 110C73 119 76 129 82 135Z',
			tone: 'curtain'
		},
		{ d: 'M54 110L82 110L82 115L54 115Z', tone: 'shade' },
		{ d: 'M63 128L75 116L77 118L65 130Z', tone: 'light' }
	]
};

const HOUSE_SILL: StrokeSpec = {
	d: 'M50 138L86 138L86 142.5C86 143.9 84.9 145 83.5 145L52.5 145C51.1 145 50 143.9 50 142.5Z',
	tone: 'wood',
	layer: 'front'
};

const HOUSE: PictureSpec = {
	id: 'house',
	strokes: [
		{
			d: 'M30 100C28 100 27 98 28 96L56 52C57 50 59 49 61 49L139 49C141 49 143 50 144 52L172 96C173 98 172 100 170 100Z',
			tone: 'roof',
			layer: 'front',
			marks: [{ d: tileRows(), tone: 'roof-dark' }]
		},
		{
			d: 'M44 178L44 96L156 96L156 178Z',
			tone: 'wall',
			marks: [
				{ d: 'M40 96L160 96L160 105C120 108 80 108 40 105Z', tone: 'shade' },
				{
					d: 'M68 156L80 156L80 161L68 161ZM72 165L84 165L84 170L72 170ZM138 116L150 116L150 121L138 121ZM142 154L154 154L154 159L142 159Z',
					tone: 'brick'
				}
			]
		},
		{
			d: 'M88 178L88 142C88 129 112 129 112 142L112 178Z',
			tone: 'wood',
			layer: 'front',
			marks: [{ d: 'M88 132L112 132L112 140C104 136 96 136 88 140Z', tone: 'shade' }]
		},
		{ d: 'M96 134L96 178M104 134L104 178', fine: true },
		HOUSE_WINDOW,
		mirrored(HOUSE_WINDOW),
		{ d: both('M68 110L68 138M54 124L82 124'), fine: true },
		HOUSE_SILL,
		mirrored(HOUSE_SILL),
		{
			d: 'M119 60L119 27C119 24.8 120.8 23 123 23L139 23C141.2 23 143 24.8 143 27L143 60Z',
			tone: 'brick',
			layer: 'back',
			marks: [{ d: 'M119 32L143 32L143 35L119 35ZM119 42L143 42L143 45L119 45Z', tone: 'shade' }]
		},
		{
			d: oval(107, 158, 2.4, 2.4),
			tone: 'gold',
			layer: 'front',
			fine: true,
			flat: true
		},
		{
			d: 'M24 178C16 178 12 170 16 164C14 156 24 150 30 154C34 146 46 146 50 154C56 152 62 158 60 166C64 170 62 178 56 178Z',
			tone: 'leaf',
			layer: 'front',
			marks: [{ d: oval(26, 170, 7, 4) + oval(46, 168, 6, 4), tone: 'leaf-dark' }]
		},
		{
			d: 'M174 140C164 142 158 134 162 126C158 118 164 108 174 110C178 102 192 104 192 114C200 118 198 132 190 134C190 142 180 144 174 140Z',
			tone: 'leaf',
			layer: 'back',
			marks: [{ d: oval(180, 132, 10, 6), tone: 'leaf-dark' }]
		},
		{
			d: 'M176 136L176 177L184 177L184 136Z',
			tone: 'wood',
			layer: 'back'
		},
		{
			d: 'M8 182C8 176 40 174 100 174C160 174 192 176 192 182C192 189 160 192 100 192C40 192 8 189 8 182Z',
			tone: 'grass',
			layer: 'back',
			marks: [{ d: 'M90 174L110 174L122 192L78 192Z', tone: 'stone' }]
		},
		{
			d: oval(30, 30, 12, 12),
			tone: 'gold',
			layer: 'back'
		},
		{
			d: 'M30 10L30 13M30 47L30 50M10 30L13 30M47 30L50 30M16 16L18 18M42 42L44 44M44 16L42 18M16 44L18 42',
			fine: true
		}
	],
	touches: [
		{ d: oval(148, 13, 6.5, 5) + oval(158, 6, 4.5, 3.5) + oval(140, 17, 4, 3.4), tone: 'smoke' }
	]
};

/* --------------------------------------------------------------- The flower */

const PETAL = 'M100 64C88 50 87 28 100 17C113 28 112 50 100 64Z';
const PETAL_BACK = 'M100 64C91 52 90 34 100 26C110 34 109 52 100 64Z';
const FLOWER_CENTER: XY = [100, 64];

function petal(d: string, angle: number, front: boolean): StrokeSpec {
	return {
		d: rotatePath(d, angle, ...FLOWER_CENTER),
		tone: front ? 'petal' : 'petal-dark',
		layer: front ? 'middle' : 'back',
		marks: front
			? [
					{ d: rotatePath(oval(100, 50, 7, 10), angle, ...FLOWER_CENTER), tone: 'petal-dark' },
					{
						d: rotatePath(
							'M99.4 52C99 40 99.2 32 100 26C100.8 32 101 40 100.6 52Z',
							angle,
							...FLOWER_CENTER
						),
						tone: 'light'
					}
				]
			: []
	};
}

function seeds(): string {
	return Array.from({ length: 9 }, (_, i) => {
		const a = (i * 40 * Math.PI) / 180;
		return oval(100 + 9.5 * Math.cos(a), 64 + 9.5 * Math.sin(a), 1.6, 1.6);
	}).join('');
}

const FLOWER: PictureSpec = {
	id: 'flower',
	ground: oval(100, 196, 44, 3.6),
	strokes: [
		{
			d: oval(100, 64, 17, 17),
			tone: 'pollen',
			layer: 'front',
			marks: [
				{ d: oval(101, 65.5, 6.5, 6.5), tone: 'gold-dark' },
				{ d: seeds(), tone: 'wood' }
			]
		},
		...[30, 90, 150, 210, 270, 330].map((angle) => petal(PETAL, angle, true)),
		{
			d: 'M97 72C95 100 99 124 97 146L103 146C105 124 101 100 103 72Z',
			tone: 'leaf'
		},
		{
			d: 'M98 126C84 130 70 124 62 110C78 104 92 112 98 126Z',
			tone: 'leaf',
			marks: [{ d: 'M98 126C86 120 74 116 62 110C70 124 84 130 98 126Z', tone: 'leaf-dark' }]
		},
		{ d: 'M97 125C86 120 76 116 66 111.5', fine: true },
		{
			d: 'M102 112C116 116 130 110 138 96C122 90 108 98 102 112Z',
			tone: 'leaf',
			marks: [{ d: 'M102 112C114 106 126 101 138 96C130 110 116 116 102 112Z', tone: 'leaf-dark' }]
		},
		{ d: 'M103 111C114 106 124 102 134 98', fine: true },
		{
			d: 'M62 146C62 143.8 63.8 142 66 142L134 142C136.2 142 138 143.8 138 146L138 156C138 158.2 136.2 160 134 160L66 160C63.8 160 62 158.2 62 156Z',
			tone: 'brick',
			layer: 'front'
		},
		{
			d: 'M68 156L132 156L124 192C123.5 194.5 121.5 196 119 196L81 196C78.5 196 76.5 194.5 76 192Z',
			tone: 'brick',
			marks: [
				{ d: 'M60 160L140 160L140 166L60 166Z', tone: 'shade' },
				{ d: 'M60 174L140 174L140 180L60 180Z', tone: 'cream' }
			]
		},
		...[0, 60, 120, 240, 300].map((angle) => petal(PETAL_BACK, angle, false)),
		{
			d: 'M30 36C22 24 10 24 11 34C12 40 20 43 28 40C20 44 18 52 24 54C30 55 31 47 30 41C31 47 32 55 38 54C44 52 42 44 34 40C42 43 50 40 51 34C52 24 40 24 32 36Z',
			tone: 'lilac',
			layer: 'front',
			fine: true,
			marks: [{ d: oval(20, 33, 3.2, 3) + oval(42, 33, 3.2, 3), tone: 'white' }]
		},
		{ d: 'M31 32L31 50M31 33C29 27 25 24 22 23M31 33C33 27 37 24 40 23', fine: true }
	]
};

/* ----------------------------------------------------------------- The boat */

const BOAT: PictureSpec = {
	id: 'boat',
	strokes: [
		{
			d: 'M26 122C40 128 160 128 178 118C172 140 160 154 146 160L58 160C44 154 32 140 26 122Z',
			tone: 'hull',
			layer: 'front',
			marks: [
				{
					d: 'M20 129C60 137 140 137 184 125L184 132C140 145 60 145 20 137Z',
					tone: 'cream'
				}
			]
		},
		{
			d: 'M97 130L97 16C97 13.5 103 13.5 103 16L103 130Z',
			tone: 'wood'
		},
		{
			d: 'M100 22C84 50 64 90 46 116L100 116Z',
			tone: 'white',
			layer: 'back',
			marks: [
				{
					d: 'M56 102L100 98L100 100L56 104ZM68 84L100 80L100 82L68 86ZM80 64L100 62L100 64L80 66Z',
					tone: 'shade'
				}
			]
		},
		{
			d: 'M100 26C116 52 134 84 152 112L100 112Z',
			tone: 'white',
			layer: 'back',
			marks: [
				{
					d: 'M90 46L160 46L160 56L90 56ZM90 70L160 70L160 80L90 80ZM90 94L160 94L160 104L90 104Z',
					tone: 'hull'
				}
			]
		},
		{
			d: 'M44 116C44 114.3 45.3 113 47 113L104 113C105.7 113 107 114.3 107 116L107 118C107 119.7 105.7 121 104 121L47 121C45.3 121 44 119.7 44 118Z',
			tone: 'wood',
			layer: 'front'
		},
		{
			d: oval(70, 140, 4.5, 4.5) + oval(100, 141.5, 4.5, 4.5) + oval(130, 140, 4.5, 4.5),
			tone: 'glass',
			layer: 'front',
			fine: true,
			marks: [
				{
					d: oval(68.5, 138.5, 1.4, 1.4) + oval(98.5, 140, 1.4, 1.4) + oval(128.5, 138.5, 1.4, 1.4),
					tone: 'white'
				}
			]
		},
		{
			d: 'M100 18C110 13 118 22 130 16C126 22 126 26 130 31C118 36 110 27 100 31Z',
			tone: 'gold',
			layer: 'back'
		},
		{
			d: 'M6 150C22 144 38 144 54 150C70 156 86 156 102 150C118 144 134 144 150 150C166 156 182 156 194 150L194 188C194 192 191 195 187 195L13 195C9 195 6 192 6 188Z',
			tone: 'water',
			layer: 'front',
			marks: [
				{
					d: 'M10 160C40 154 60 166 100 160C140 154 160 166 190 160L190 168C160 174 140 162 100 168C60 174 40 162 10 168Z',
					tone: 'light'
				}
			]
		},
		{
			d: 'M22 172C30 168 38 168 46 172M118 178C126 174 134 174 142 178M66 186C74 182 82 182 90 186M152 166C158 163 164 163 170 166',
			fine: true
		},
		{
			d: oval(34, 40, 12, 12),
			tone: 'gold'
		},
		{
			d: 'M144 52C148 47 153 47 157 52C161 47 166 47 170 52M156 74C159 71 162 71 164 74C166 71 169 71 172 74',
			fine: true
		}
	]
};

/* ----------------------------------------------------------------- The star */

const STAR_CENTER: XY = [100, 106];
const STAR_OUTER = 80;
const STAR_INNER = 38;

function starCorner(index: number): XY {
	const radius = index % 2 === 0 ? STAR_OUTER : STAR_INNER;
	const angle = (Math.PI * index) / 5 - Math.PI / 2;
	return [STAR_CENTER[0] + radius * Math.cos(angle), STAR_CENTER[1] + radius * Math.sin(angle)];
}

/** The darker half of each arm: from the centre to the tip and the inner corner after it. */
function starFacets(): string {
	const p = ([x, y]: XY) => `${Math.round(x * 100) / 100} ${Math.round(y * 100) / 100}`;
	return Array.from({ length: 5 }, (_, arm) => {
		const tip = starCorner(arm * 2);
		const corner = starCorner(arm * 2 + 1);
		return `M${p(STAR_CENTER)}L${p(tip)}L${p(corner)}Z`;
	}).join('');
}

function sparkle(cx: number, cy: number, r: number): string {
	return roundedStarPath(cx, cy, r, r * 0.3, 4, 0.12);
}

const STAR_EYE: StrokeSpec = {
	d: oval(88, 100, 5.5, 10),
	tone: 'ink',
	layer: 'front',
	flat: true,
	marks: [{ d: oval(89.6, 95, 2.2, 3), tone: 'white' }]
};

const STAR_MARKS: readonly Mark[] = [
	{ d: starFacets(), tone: 'gold-dark' },
	{ d: oval(78, 118, 6, 3.4) + oval(122, 118, 6, 3.4), tone: 'pink' }
];

const STAR: PictureSpec = {
	id: 'star',
	strokes: [
		{
			d: roundedStarPath(...STAR_CENTER, STAR_OUTER, STAR_INNER, 5, 0.16),
			tone: 'gold',
			marks: STAR_MARKS
		},
		STAR_EYE,
		{
			...STAR_EYE,
			d: oval(112, 100, 5.5, 10),
			marks: [{ d: oval(113.6, 95, 2.2, 3), tone: 'white' }]
		},
		{ d: 'M94 118C97 122 103 122 106 118', fine: true },
		{
			d: 'M72 106C52 115 30 128 12 146C9 149.5 13 153.5 16.5 150.5C34 135 54 125 76 121Z',
			tone: 'lilac',
			layer: 'back'
		},
		{
			d: 'M78 128C60 144 44 160 31 180C28.5 184 32.5 187 35 183.5C49 166 65 152 86 140Z',
			tone: 'petal',
			layer: 'back'
		},
		{
			d: 'M70 96C50 98 32 102 13 109C8.5 110.8 10 115.6 14.6 114.6C33 110.5 51 109 72 109Z',
			tone: 'sea',
			layer: 'back'
		},
		{ d: sparkle(164, 40, 15), tone: 'gold' },
		{ d: sparkle(176, 152, 10), tone: 'lilac' },
		{ d: sparkle(30, 50, 11), tone: 'petal' }
	]
};

export const SUBJECTS: readonly [PictureSpec, ...PictureSpec[]] = [
	CAT,
	FISH,
	HOUSE,
	FLOWER,
	BOAT,
	STAR
];
