import type { Screen } from './flow';

type ScreenName = Screen['name'];

const GAMES: ReadonlySet<ScreenName> = new Set(['game', 'help-game', 'free-game']);

/**
 * The screens of the child between two games, where the background sound goes on. Not the
 * choice of the player, nor the keyboard check, nor the break the game proposes: there it stops.
 */
const BETWEEN_GAMES: ReadonlySet<ScreenName> = new Set([
	'map',
	'intro',
	'result',
	'companion',
	'help-done',
	'story',
	'story-so-far',
	'free-intro',
	'free-done'
]);

/**
 * Whether the background sound may be heard on this screen: during a game that is not paused,
 * and between two games. The settings opened from a game pause it; from elsewhere, they are
 * a screen between two games. Whether the page is shown is the route's to add.
 */
export function isAmbienceScreen(screen: Screen, gamePaused: boolean): boolean {
	if (GAMES.has(screen.name)) return !gamePaused;
	if (screen.name === 'settings') return BETWEEN_GAMES.has(screen.back.name);
	return BETWEEN_GAMES.has(screen.name);
}
