import { m } from '$lib/paraglide/messages.js';

interface GameTexts {
	readonly title: () => string;
	readonly description: () => string;
}

/** What the child reads about each game when choosing one. */
const GAME_TEXTS: Readonly<Record<string, GameTexts>> = {
	hatching: { title: m.game_hatching_title, description: m.game_hatching_description },
	rocket: { title: m.game_rocket_title, description: m.game_rocket_description },
	recipe: { title: m.game_recipe_title, description: m.game_recipe_description },
	drawing: { title: m.game_drawing_title, description: m.game_drawing_description },
	train: { title: m.game_train_title, description: m.game_train_description },
	tower: { title: m.game_tower_title, description: m.game_tower_description }
};

/** Name of the game; its identifier when it has no text, so that a missing text is seen. */
export function gameTitle(id: string): string {
	return Object.hasOwn(GAME_TEXTS, id) ? (GAME_TEXTS[id]?.title() ?? id) : id;
}

export function gameDescription(id: string): string {
	return Object.hasOwn(GAME_TEXTS, id) ? (GAME_TEXTS[id]?.description() ?? '') : '';
}
