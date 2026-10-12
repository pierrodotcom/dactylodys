import { m } from '$lib/paraglide/messages.js';
import type { DishTemplate } from './dish';

/** Names of the dish, as message templates with `{first}` and `{last}`. */
export const DISH_TEMPLATES: readonly DishTemplate[] = [
	m.game_recipe_dish_1,
	m.game_recipe_dish_2,
	m.game_recipe_dish_3,
	m.game_recipe_dish_4,
	m.game_recipe_dish_5,
	m.game_recipe_dish_6,
	m.game_recipe_dish_7,
	m.game_recipe_dish_8
];

/** What the kitchen says when an ingredient lands in the pot, in this order. */
export const QUIPS: readonly (() => string)[] = [
	m.game_recipe_quip_1,
	m.game_recipe_quip_2,
	m.game_recipe_quip_3,
	m.game_recipe_quip_4,
	m.game_recipe_quip_5,
	m.game_recipe_quip_6,
	m.game_recipe_quip_7,
	m.game_recipe_quip_8,
	m.game_recipe_quip_9,
	m.game_recipe_quip_10
];
