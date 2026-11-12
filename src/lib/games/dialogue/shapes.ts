/**
 * Floup, the creature who asks the questions, in a 120 x 120 frame where it stands on y = 112, and
 * the props of its reactions. Every face is drawn here; the component only picks one.
 */
import { capsulePath, ovalPath } from '$lib/ui/companion/geometry';
import { dotPath, twinkleShape } from '../shared/decor-art';
import type { HostFace } from './talk';

export const HOST_FRAME = { width: 120, height: 120 } as const;

/** Where the antenna leaves the head: it turns around this point in the whirl scene. */
export const ANTENNA_ROOT = { x: 60, y: 31 } as const;
const BALL = { x: 70, y: 11, r: 6 } as const;

export const BODY = {
	outline: 'M60 30C81 30 93 48 95 70C97 94 84 110 60 110C36 110 23 94 25 70C27 48 39 30 60 30Z',
	shade: 'M84 44C92 54 95 66 95 76C95 96 82 110 60 110C75 104 87 92 88 76C89 64 88 54 84 44Z',
	light: ovalPath(42, 45, 6, 3.4) + ovalPath(51, 38, 2.4, 1.6),
	belly: ovalPath(60, 92, 20, 13.5),
	bellyShade: 'M80 92C80 99.5 71 105.5 60 105.5C49 105.5 40 99.5 40 92C46 99 74 99 80 92Z',
	feet: ovalPath(45, 110, 11, 5.5) + ovalPath(75, 110, 11, 5.5),
	shadow: ovalPath(60, 113, 33, 4.5)
} as const;

export const ANTENNA = {
	stem: `M${ANTENNA_ROOT.x} ${ANTENNA_ROOT.y}C58 22 61 16 ${BALL.x - 3} ${BALL.y + 3}`,
	ball: dotPath(BALL.x, BALL.y, BALL.r),
	shine: ovalPath(BALL.x - 2, BALL.y - 2.4, 2, 1.3)
} as const;

export const EYES = {
	whites: ovalPath(47, 60, 9, 11) + ovalPath(73, 60, 9, 11),
	cheeks: ovalPath(35, 74, 5.4, 3.2) + ovalPath(85, 74, 5.4, 3.2)
} as const;

function pupils(dx: number, dy: number): { pupil: string; shine: string } {
	return {
		pupil: dotPath(47 + dx, 60 + dy, 4.4) + dotPath(73 + dx, 60 + dy, 4.4),
		shine: dotPath(48.4 + dx, 58.4 + dy, 1.4) + dotPath(74.4 + dx, 58.4 + dy, 1.4)
	};
}

const ARM_RADIUS = 4.2;

function arm(x1: number, y1: number, x2: number, y2: number): string {
	return capsulePath(x1, y1, x2, y2, ARM_RADIUS);
}

/** One face of Floup: what changes from one reaction to the next. */
export interface FaceArt {
	/** Open eyes (whites and pupils), or closed ones drawn as lines. */
	readonly eyes:
		| { readonly kind: 'open'; readonly pupil: string; readonly shine: string }
		| { readonly kind: 'closed'; readonly lines: string };
	readonly brows: string;
	/** A filled mouth (with its tongue), or a line. */
	readonly mouth:
		| { readonly kind: 'open'; readonly shape: string; readonly tongue: string }
		| { readonly kind: 'line'; readonly line: string };
	/** The arms, behind the body or held in front of it. */
	readonly arms: string;
	readonly armsInFront: boolean;
}

export const FACES: Readonly<Record<HostFace, FaceArt>> = {
	asking: {
		eyes: { kind: 'open', ...pupils(3, 1) },
		brows: 'M39 45Q46 40 54 44M66 41Q73 34 81 39',
		mouth: { kind: 'open', shape: ovalPath(60, 80, 4.2, 5.2), tongue: '' },
		arms: arm(29, 76, 19, 91) + arm(91, 72, 105, 54),
		armsInFront: false
	},
	delighted: {
		eyes: { kind: 'closed', lines: 'M39 63Q47 52 55 63M65 63Q73 52 81 63' },
		brows: 'M39 44Q46 38 54 42M66 42Q74 38 81 44',
		mouth: {
			kind: 'open',
			shape: 'M46 75Q60 95 74 75Q60 80 46 75Z',
			tongue: 'M53 85Q60 80.5 67 85Q60 89.5 53 85Z'
		},
		arms: arm(29, 72, 14, 53) + arm(91, 72, 106, 53),
		armsInFront: false
	},
	puzzled: {
		eyes: { kind: 'open', ...pupils(-1.5, -4) },
		brows: 'M39 42L54 47M66 40Q73 32 81 38',
		mouth: { kind: 'line', line: 'M49 81Q54.5 76 60 81Q65.5 86 71 81' },
		arms: arm(29, 76, 19, 91) + arm(91, 72, 98, 49),
		armsInFront: false
	},
	laughing: {
		eyes: { kind: 'closed', lines: 'M40 54L52 60L40 66M80 54L68 60L80 66' },
		brows: 'M39 47Q46 42 54 46M66 46Q74 42 81 47',
		mouth: {
			kind: 'open',
			shape: 'M44 71Q60 101 76 71Q60 77 44 71Z',
			tongue: 'M51 87Q60 81 69 87Q60 93 51 87Z'
		},
		arms: arm(30, 78, 45, 94) + arm(90, 78, 75, 94),
		armsInFront: true
	}
};

/** What goes with a reaction: a question mark, tears of laughter, or sparkles of joy. */
export const MARKS = {
	question: {
		hook: 'M101 17C101 9.5 112 9.5 112 17C112 22 106.5 22.5 106.5 28.5',
		dot: dotPath(106.5, 34, 2.2)
	},
	tears:
		'M36 66C38.6 69.4 39.6 71.6 37.6 73.4C35.8 75 33.2 73.4 33.8 71C34.2 69.6 35 68 36 66Z' +
		'M84 66C81.4 69.4 80.4 71.6 82.4 73.4C84.2 75 86.8 73.4 86.2 71C85.8 69.6 85 68 84 66Z',
	sparkles: twinkleShape(14, 32, 7) + twinkleShape(108, 26, 6) + twinkleShape(100, 44, 3.6)
} as const;

/** A heart of the "hearts" scene, its point at the bottom, around (cx, cy). */
function heartPath(cx: number, cy: number, r: number): string {
	return (
		`M${cx} ${cy + r}C${cx - r * 1.6} ${cy - r * 0.1} ${cx - r * 1.1} ${cy - r * 1.4} ${cx} ${cy - r * 0.5}` +
		`C${cx + r * 1.1} ${cy - r * 1.4} ${cx + r * 1.6} ${cy - r * 0.1} ${cx} ${cy + r}Z`
	);
}

export const HEARTS = [heartPath(34, 26, 6), heartPath(60, 12, 7.4), heartPath(88, 22, 5.4)];

/** A daisy that pops out of the ball of the antenna. */
export const ANTENNA_FLOWER = {
	petals: [0, 72, 144, 216, 288]
		.map((degrees) => {
			const angle = ((degrees - 90) * Math.PI) / 180;
			return dotPath(BALL.x + Math.cos(angle) * 6.4, BALL.y + Math.sin(angle) * 6.4, 4.4);
		})
		.join(''),
	heart: dotPath(BALL.x, BALL.y, 4)
} as const;

/** The whirl of the antenna: two arcs that turn with it. */
export const WHIRL = 'M44 14Q60 4 76 14M46 20Q60 12 74 20';
