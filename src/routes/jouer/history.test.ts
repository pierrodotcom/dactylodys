import { describe, expect, it } from 'vitest';
import type { Screen } from './flow';
import { answerToBrowser, isPlayGuard, needsEntry, PLAY_GUARD, wayBackOf } from './history';

const LESSON = 'fr.lesson.one';
const MAP: Screen = { name: 'map' };
const INTRO: Screen = { name: 'intro', lessonId: LESSON };
const GAME: Screen = { name: 'game', lessonId: LESSON };

describe('wayBackOf', () => {
	it('has no way back where the Back button of the browser leaves the game', () => {
		expect(wayBackOf({ name: 'loading' })).toBeNull();
		expect(wayBackOf({ name: 'players' })).toBeNull();
		expect(wayBackOf(MAP)).toBeNull();
	});

	it('does what the way out at the top of each screen does', () => {
		expect(wayBackOf({ name: 'new-player' })).toBe('cancel-new-player');
		expect(wayBackOf({ name: 'keyboard-check' })).toBe('change-player');
		expect(wayBackOf({ name: 'settings', back: MAP })).toBe('close-settings');
		expect(wayBackOf({ name: 'settings', back: GAME })).toBe('close-settings');
		expect(wayBackOf({ name: 'companion', back: MAP })).toBe('close-companion');
		expect(wayBackOf({ name: 'hideout' })).toBe('close-hideout');
		expect(wayBackOf(INTRO)).toBe('back-to-map');
		expect(wayBackOf({ name: 'story-so-far' })).toBe('back-to-map');
		expect(wayBackOf({ name: 'free-intro' })).toBe('back-to-map');
	});

	it('goes back to the map from what follows a game, and from the story', () => {
		expect(wayBackOf({ name: 'result', lessonId: LESSON })).toBe('back-to-map');
		expect(wayBackOf({ name: 'break' })).toBe('back-to-map');
		expect(wayBackOf({ name: 'help-done' })).toBe('back-to-map');
		expect(wayBackOf({ name: 'free-done' })).toBe('back-to-map');
		expect(wayBackOf({ name: 'story', moments: [], index: 0, then: INTRO })).toBe('back-to-map');
	});

	it('pauses a game instead of leaving it', () => {
		expect(wayBackOf(GAME)).toBe('pause-game');
		expect(wayBackOf({ name: 'help-game' })).toBe('pause-game');
		expect(wayBackOf({ name: 'free-game' })).toBe('pause-game');
	});
});

describe('needsEntry', () => {
	it('adds one entry when a screen with a way back opens', () => {
		expect(needsEntry(INTRO, false)).toBe(true);
		expect(needsEntry(GAME, false)).toBe(true);
	});

	it('adds nothing more from one such screen to the next', () => {
		expect(needsEntry(GAME, true)).toBe(false);
		expect(needsEntry({ name: 'result', lessonId: LESSON }, true)).toBe(false);
	});

	it('adds none on a screen the Back button leaves', () => {
		expect(needsEntry(MAP, false)).toBe(false);
		expect(needsEntry(MAP, true)).toBe(false);
		expect(needsEntry({ name: 'players' }, false)).toBe(false);
	});
});

describe('answerToBrowser', () => {
	it('says nothing about the moves the app made itself', () => {
		expect(answerToBrowser(INTRO, true, true)).toBe('none');
		expect(answerToBrowser(MAP, false, false)).toBe('none');
	});

	it('takes the way back of the screen when the browser went back', () => {
		expect(answerToBrowser(INTRO, true, false)).toBe('leave');
		expect(answerToBrowser(GAME, true, false)).toBe('leave');
	});

	it('leaves the game when the browser went back under a screen without a way back', () => {
		expect(answerToBrowser(MAP, true, false)).toBe('exit');
		expect(answerToBrowser({ name: 'players' }, true, false)).toBe('exit');
	});

	it('undoes a Forward onto an entry no screen is waiting for: nothing is played again', () => {
		expect(answerToBrowser(MAP, false, true)).toBe('undo');
		expect(answerToBrowser({ name: 'players' }, false, true)).toBe('undo');
	});

	it('keeps an entry that a screen with a way back can use', () => {
		expect(answerToBrowser(INTRO, false, true)).toBe('none');
	});
});

describe('isPlayGuard', () => {
	it('knows the entry of the route from any other state of a page', () => {
		expect(isPlayGuard(PLAY_GUARD)).toBe(true);
		expect(isPlayGuard({})).toBe(false);
	});
});
