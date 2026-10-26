import { describe, expect, it } from 'vitest';
import type { StoryMoment } from '$lib/engine/story';
import {
	INITIAL_SCREEN,
	transition,
	type FlowEvent,
	type Screen,
	type SettingsOrigin
} from './flow';

const LESSON = 'fr.lesson.one';
const NEXT = 'fr.lesson.two';
const LINE: StoryMoment = {
	kind: 'line',
	text: 'Line.',
	art: 'line',
	worldId: 'fr.world.one',
	lessonId: LESSON
};
const ENDING: StoryMoment = {
	kind: 'ending',
	text: 'End.',
	art: 'end',
	worldId: 'fr.world.one',
	lessonId: null
};
const OPENING: StoryMoment = {
	kind: 'opening',
	text: 'Open.',
	art: 'open',
	worldId: 'fr.world.two',
	lessonId: null
};
const RESULT: Screen = { name: 'result', lessonId: LESSON };

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
			{ name: 'break' },
			{ name: 'help-done' }
		];
		for (const origin of origins) {
			const screen = transition(origin, { type: 'open-settings' });
			expect(screen).toEqual({ name: 'settings', back: origin });
			expect(transition(screen, { type: 'close-settings' })).toEqual(origin);
		}
	});

	it('leaves a paused game for the settings, and comes back to the game', () => {
		const screen = transition({ name: 'game', lessonId: LESSON }, { type: 'open-settings' });
		expect(screen).toEqual({ name: 'settings', back: { name: 'game', lessonId: LESSON } });
		expect(transition(screen, { type: 'close-settings' })).toEqual({
			name: 'game',
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
			{ name: 'keyboard-check' },
			{ name: 'companion', back: { name: 'map' } },
			{ name: 'help-done' }
		];
		for (const screen of allowed) {
			expect(transition(screen, { type: 'change-player' })).toEqual({ name: 'players' });
		}
		for (const game of [{ name: 'game', lessonId: LESSON }, { name: 'help-game' }] as Screen[]) {
			expect(transition(game, { type: 'change-player' })).toBe(game);
		}
	});

	it('opens the companion from every screen with the bar at the top, and comes back there', () => {
		const origins: SettingsOrigin[] = [
			{ name: 'map' },
			{ name: 'intro', lessonId: LESSON },
			{ name: 'result', lessonId: LESSON },
			{ name: 'break' },
			{ name: 'help-done' }
		];
		for (const origin of origins) {
			const screen = transition(origin, { type: 'open-companion' });
			expect(screen).toEqual({ name: 'companion', back: origin });
			expect(transition(screen, { type: 'close-companion' })).toEqual(origin);
		}
	});

	it('does not open the companion during a game, before a player is chosen, or from the settings', () => {
		for (const screen of [
			INITIAL_SCREEN,
			{ name: 'players' },
			{ name: 'new-player' },
			{ name: 'keyboard-check' },
			{ name: 'game', lessonId: LESSON },
			{ name: 'help-game' },
			{ name: 'settings', back: { name: 'map' } }
		] as Screen[]) {
			expect(transition(screen, { type: 'open-companion' })).toBe(screen);
		}
	});

	it('plays a help quest from the map up to the thanks, then goes back to the map', () => {
		const game = transition({ name: 'map' }, { type: 'start-help' });
		expect(game).toEqual({ name: 'help-game' });
		const thanks = transition(game, { type: 'completed' });
		expect(thanks).toEqual({ name: 'help-done' });
		expect(transition(thanks, { type: 'back-to-map' })).toEqual({ name: 'map' });
	});

	it('leaves a help quest for the map when the child quits it', () => {
		expect(transition({ name: 'help-game' }, { type: 'quit' })).toEqual({ name: 'map' });
	});

	it('leaves a paused help quest for the settings, and comes back to it', () => {
		const screen = transition({ name: 'help-game' }, { type: 'open-settings' });
		expect(screen).toEqual({ name: 'settings', back: { name: 'help-game' } });
		expect(transition(screen, { type: 'close-settings' })).toEqual({ name: 'help-game' });
	});

	it('starts a help quest from the map only', () => {
		for (const screen of [
			{ name: 'intro', lessonId: LESSON },
			{ name: 'result', lessonId: LESSON },
			{ name: 'break' },
			{ name: 'help-done' },
			{ name: 'companion', back: { name: 'map' } }
		] as Screen[]) {
			expect(transition(screen, { type: 'start-help' })).toBe(screen);
		}
	});

	it('ignores an event that makes no sense on the current screen', () => {
		const players: Screen = { name: 'players' };
		const map: Screen = { name: 'map' };

		expect(transition(players, { type: 'start' })).toBe(players);
		expect(transition(map, { type: 'completed' })).toBe(map);
		expect(transition(INITIAL_SCREEN, { type: 'start' })).toBe(INITIAL_SCREEN);
	});

	describe('story between two exercises', () => {
		it('tells the opening of a world before the lesson screen', () => {
			const screen = transition(
				{ name: 'map' },
				{
					type: 'tell',
					moments: [OPENING],
					then: { name: 'intro', lessonId: NEXT }
				}
			);
			expect(screen).toEqual({
				name: 'story',
				moments: [OPENING],
				index: 0,
				then: { name: 'intro', lessonId: NEXT }
			});
			expect(transition(screen, { type: 'story-next' })).toEqual({ name: 'intro', lessonId: NEXT });
		});

		it('goes straight to the lesson when there is nothing to tell', () => {
			expect(
				transition(
					{ name: 'map' },
					{ type: 'tell', moments: [], then: { name: 'intro', lessonId: LESSON } }
				)
			).toEqual({ name: 'intro', lessonId: LESSON });
		});

		it('tells each moment in turn after the result, then goes where the child chose', () => {
			const told = run(
				[
					{
						type: 'tell',
						moments: [LINE, ENDING, OPENING],
						then: { name: 'intro', lessonId: NEXT }
					},
					{ type: 'story-next' }
				],
				RESULT
			);
			expect(told).toMatchObject({ name: 'story', index: 1 });
			expect(run([{ type: 'story-next' }, { type: 'story-next' }], told)).toEqual({
				name: 'intro',
				lessonId: NEXT
			});
		});

		it('goes straight to the map: the line won waits in the notebook (ADR-051)', () => {
			expect(transition(RESULT, { type: 'tell', moments: [LINE], then: { name: 'map' } })).toEqual({
				name: 'map'
			});
		});

		it('goes straight to the break: a child who asked for a break is not told the story first', () => {
			expect(
				transition(RESULT, { type: 'tell', moments: [LINE], then: { name: 'break' } })
			).toEqual({ name: 'break' });
		});

		it('ignores a replay while the story is told', () => {
			const story = run(
				[{ type: 'tell', moments: [LINE], then: { name: 'intro', lessonId: NEXT } }],
				RESULT
			);
			expect(transition(story, { type: 'replay' })).toEqual(story);
		});

		it('does not tell from the map what leads anywhere but a lesson', () => {
			const map: Screen = { name: 'map' };
			expect(transition(map, { type: 'tell', moments: [LINE], then: { name: 'break' } })).toEqual(
				map
			);
		});

		it('opens the story so far from the map and comes back to it', () => {
			const notebook = transition({ name: 'map' }, { type: 'open-story-so-far' });
			expect(notebook).toEqual({ name: 'story-so-far' });
			expect(transition(notebook, { type: 'back-to-map' })).toEqual({ name: 'map' });
			expect(transition(notebook, { type: 'change-player' })).toEqual({ name: 'players' });
		});

		it('opens neither settings nor the companion over the story', () => {
			const story = run(
				[{ type: 'tell', moments: [LINE], then: { name: 'intro', lessonId: NEXT } }],
				RESULT
			);
			expect(story).toMatchObject({ name: 'story' });
			expect(transition(story, { type: 'open-settings' })).toEqual(story);
			expect(transition(story, { type: 'open-companion' })).toEqual(story);
			expect(transition(story, { type: 'change-player' })).toEqual(story);
		});
	});
});
