/** Drawing data of the egg and the baby dino, in a 120 x 150 box. */

export const EGG_PATH =
	'M60 6C88 6 110 52 110 92C110 126 88 146 60 146C32 146 10 126 10 92C10 52 32 6 60 6Z';

export const SHELL_BOTTOM_PATH =
	'M10 92L26 78L40 94L56 76L70 94L86 78L98 92L110 90C110 126 88 146 60 146C32 146 10 126 10 92Z';

export const SHELL_TOP_PATH =
	'M10 92C10 52 32 6 60 6C88 6 110 52 110 90L98 92L86 78L70 94L56 76L40 94L26 78Z';

export const SPOTS = [
	{ x: 38, y: 62, radius: 7 },
	{ x: 82, y: 98, radius: 9 },
	{ x: 50, y: 120, radius: 5 },
	{ x: 80, y: 50, radius: 5 }
] as const;

/** One stroke per stage, drawn from the top of the egg downwards. */
export const CRACKS = [
	'M60 30L51 48L63 60',
	'M63 60L49 78L61 90',
	'M61 90L73 102L65 118',
	'M49 78L30 84M73 102L92 96'
] as const;

export const CRACK_COUNT = CRACKS.length;

/** Number of colors of the baby dinos: they follow one another in this order. */
export const BABY_VARIANTS = 4;

export const BABY_PLATES = [
	'M44 44L48 30L56 42Z',
	'M54 38L60 24L66 38Z',
	'M64 42L72 30L76 44Z'
] as const;

/** Pieces of shell that fly away when an egg bursts, around the middle of the egg. */
export const SHARDS = [
	{ angle: -150, path: 'M54 70L62 62L66 74Z' },
	{ angle: -30, path: 'M58 66L68 70L60 78Z' },
	{ angle: 40, path: 'M56 84L66 80L64 92Z' },
	{ angle: 140, path: 'M52 76L60 86L50 88Z' }
] as const;

/** The bit of shell a baby keeps on its head, like a hat, once its egg has burst. */
export const HAT_PATH = 'M44 34L50 24L56 32L62 20L68 32L74 24L78 34Z';

/** Little stars that turn around the head of a baby that fell out of its egg. */
export const DIZZY_STARS = [
	'M60 34L62 39L67 39L63 42L65 47L60 44L55 47L57 42L53 39L58 39Z',
	'M38 46L40 50L44 50L41 53L42 57L38 55L34 57L35 53L32 50L36 50Z',
	'M82 46L84 50L88 50L85 53L86 57L82 55L78 57L79 53L76 50L80 50Z'
] as const;

/** The two small babies that come out of one egg: the usual baby, shrunk and moved aside. */
export const TWINS = [
	{ side: 'left', transform: 'translate(-1.6 16.8) scale(0.66)' },
	{ side: 'right', transform: 'translate(42.4 16.8) scale(0.66)' }
] as const;

/** Arms a baby raises above its head, drawn behind the head. */
export const ARMS = [
	{ side: 'left', path: 'M33 80C30 64 27 46 26 30C26 24 34 24 34 30C35 46 38 62 41 78Z' },
	{ side: 'right', path: 'M87 80C90 64 93 46 94 30C94 24 86 24 86 30C85 46 82 62 79 78Z' }
] as const;

/** Feet that show under the bit of shell a baby walks in, like pants. */
export const FEET = [
	{ side: 'left', cx: 46, cy: 148 },
	{ side: 'right', cx: 74, cy: 148 }
] as const;

/** The little spoon a baby rows with, and the hand that holds it. */
export const SPOON_PATH =
	'M86 80L90 78L118 118L114 120ZM116 116C123 115 127 126 123 133C119 139 111 134 111 126C111 120 112 117 116 116Z';

export const SPOON_HAND = { cx: 89, cy: 81, radius: 5 } as const;

/** Ripples in front of a shell that floats like a boat. */
export const WAVES = [
	'M-6 134Q4 128 14 134T34 134T54 134T74 134T94 134T114 134T134 134',
	'M4 146Q14 140 24 146T44 146T64 146T84 146T104 146T124 146'
] as const;
