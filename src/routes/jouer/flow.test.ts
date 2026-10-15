import { describe, expect, it } from 'vitest';
import {
	INITIAL_SCREEN,
	transition,
	type FlowEvent,
	type Screen,
	type SettingsOrigin
} from './flow';

const LESSON = 'fr.lesson.one';

function run(events: readonly FlowEvent[], from: Screen = INITIAL_SCREEN): Screen {
	return events.reduce(transition, from);
}

describe('screen automaton', () => {
	it('starts on the loading screen, then shows the players', () => {
		expect(INITIAL_SCREEN).toEqual({ name: 'loading' });
		expect(run([{ type: 'profiles-loaded' }])).toEqual({ name: 'players' });
	});

	it('sends a new player to the keyboard check, then to the map', () => {
		const screen = run([
			{ type: 'profiles-loaded' },
			{ type: 'new-player' },
			{ type: 'player-chosen', calibrated: false }
		]);
		expect(screen).toEqual({ name: 'keyboard-check' });
		expect(transition(screen, { type: 'keyboard-checked' })).toEqual({ name: 'map' });
	});

	it('skips the keyboard check for a player who has already done it', () => {
		const screen = run([{ type: 'profiles-loaded' }, { type: 'player-chosen', calibrated: true }]);
		expect(screen).toEqual({ name: 'map' });
	});

	it('resumes the last player straight from the loading screen', () => {
		expect(run([{ type: 'player-chosen', calibrated: true }])).toEqual({ name: 'map' });
		expect(run([{ type: 'player-chosen', calibrated: false }])).toEqual({
			name: 'keyboard-check'
		});
	});

	it('goes back from the new player form to the list', () => {
		const screen = run([
			{ type: 'profiles-loaded' },
			{ type: 'new-player' },
			{ type: 'cancel-new-player' }
		]);
		expect(screen).toEqual({ name: 'players' });
	});

	it('opens an unlocked lesson and refuses a locked one', () => {
		const map: Screen = { name: 'map' };

		expect(transition(map, { type: 'open-lesson', lessonId: LESSON, unlocked: true })).toEqual({
			name: 'intro',
			lessonId: LESSON
		});
		expect(transition(map, { type: 'open-lesson', lessonId: LESSON, unlocked: false })).toBe(map);
	});

	it('plays a lesson from the intro to the result', () => {
		const screen = run(
			[
				{ type: 'open-lesson', lessonId: LESSON, unlocked: true },
				{ type: 'start' },
				{ type: 'completed' }
			],
			{ name: 'map' }
		);
		expect(screen).toEqual({ name: 'result', lessonId: LESSON });
	});

	it('goes back to the map when the child quits the game', () => {
		const screen = run([{ type: 'quit' }], { name: 'game', lessonId: LESSON });
		expect(screen).toEqual({ name: 'map' });
	});

	it('offers the next lesson, a replay, the map and a break from the result', () => {
		const result: Screen = { name: 'result', lessonId: LESSON };

		expect(transition(result, { type: 'next-lesson', lessonId: 'fr.lesson.two' })).toEqual({
			name: 'intro',
			lessonId: 'fr.lesson.two'
		});
		expect(transition(result, { type: 'replay' })).toEqual({ name: 'game', lessonId: LESSON });
		expect(transition(result, { type: 'back-to-map' })).toEqual({ name: 'map' });
		expect(transition(result, { type: 'take-break' })).toEqual({ name: 'break' });
	});

	it('comes back from the break to the map', () => {
		expect(transition({ name: 'break' }, { type: 'back-to-map' })).toEqual({ name: 'map' });
	});

	it('opens the settings from the map, a lesson, a result and the break, and comes back there', () => {
		const origins: SettingsOrigin[] = [
			{ name: 'map' },
			{ name: 'intro', lessonId: LESSON },
			{ name: 'result', lessonId: LESSON },
			{ name: 'break' }
		];
		for (const origin of origins) {
			const screen = transition(origin, { type: 'open-settings' });
			expect(screen).toEqual({ name: 'settings', back: origin });
			expect(transition(screen, { type: 'close-settings' })).toEqual(origin);
		}
	});

	it('leaves a paused game for the settings, and comes back to its lesson', () => {
		const screen = transition({ name: 'game', lessonId: LESSON }, { type: 'open-settings' });
		expect(screen).toEqual({ name: 'settings', back: { name: 'intro', lessonId: LESSON } });
		expect(transition(screen, { type: 'close-settings' })).toEqual({
			name: 'intro',
			lessonId: LESSON
		});
	});

	it('does not open the settings before a player is chosen', () => {
		for (const screen of [
			INITIAL_SCREEN,
			{ name: 'players' },
			{ name: 'new-player' }
		] as Screen[]) {
			expect(transition(screen, { type: 'open-settings' })).toBe(screen);
		}
	});

	it('changes player from every screen except the game', () => {
		const allowed: Screen[] = [
			{ name: 'map' },
			{ name: 'settings', back: { name: 'map' } },
			{ name: 'intro', lessonId: LESSON },
			{ name: 'result', lessonId: LESSON },
			{ name: 'break' },
			{ name: 'keyboard-check' }
		];
		for (const screen of allowed) {
			expect(transition(screen, { type: 'change-player' })).toEqual({ name: 'players' });
		}
		const game: Screen = { name: 'game', lessonId: LESSON };
		expect(transition(game, { type: 'change-player' })).toBe(game);
	});

	it('ignores an event that makes no sense on the current screen', () => {
		const players: Screen = { name: 'players' };
		const map: Screen = { name: 'map' };

		expect(transition(players, { type: 'start' })).toBe(players);
		expect(transition(map, { type: 'completed' })).toBe(map);
		expect(transition(INITIAL_SCREEN, { type: 'start' })).toBe(INITIAL_SCREEN);
	});
});
