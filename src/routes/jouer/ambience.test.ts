import { describe, expect, it } from 'vitest';
import { isAmbienceScreen } from './ambience';
import type { Screen } from './flow';

const GAME: Screen = { name: 'game', lessonId: 'l1' };

describe('isAmbienceScreen', () => {
	it.each<Screen>([GAME, { name: 'help-game' }, { name: 'free-game' }])(
		'plays during a game ($name) that is not paused',
		(screen) => {
			expect(isAmbienceScreen(screen, false)).toBe(true);
			expect(isAmbienceScreen(screen, true)).toBe(false);
		}
	);

	it.each<Screen>([
		{ name: 'map' },
		{ name: 'intro', lessonId: 'l1' },
		{ name: 'result', lessonId: 'l1' },
		{ name: 'companion', back: { name: 'map' } },
		{ name: 'help-done' },
		{ name: 'story', moments: [], index: 0, then: { name: 'map' } },
		{ name: 'story-so-far' },
		{ name: 'free-intro' },
		{ name: 'free-done' },
		{ name: 'settings', back: { name: 'map' } }
	])('goes on between two games ($name)', (screen) => {
		expect(isAmbienceScreen(screen, false)).toBe(true);
	});

	it.each<Screen>([
		{ name: 'loading' },
		{ name: 'players' },
		{ name: 'new-player' },
		{ name: 'keyboard-check' },
		{ name: 'break' },
		{ name: 'settings', back: { name: 'break' } },
		{ name: 'settings', back: GAME },
		{ name: 'settings', back: { name: 'free-game' } }
	])(
		'stops at the break, out of the play and in the settings of a paused game ($name)',
		(screen) => {
			expect(isAmbienceScreen(screen, false)).toBe(false);
		}
	);
});
