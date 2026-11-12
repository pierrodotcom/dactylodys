import { m } from '$lib/paraglide/messages.js';

/** What the companion says when it has fished an object out, in this order. */
export const QUIPS: readonly (() => string)[] = [
	m.game_river_quip_1,
	m.game_river_quip_2,
	m.game_river_quip_3,
	m.game_river_quip_4,
	m.game_river_quip_5,
	m.game_river_quip_6,
	m.game_river_quip_7,
	m.game_river_quip_8,
	m.game_river_quip_9,
	m.game_river_quip_10,
	m.game_river_quip_11,
	m.game_river_quip_12
];

/** The name of each object of the river, said when the companion catches it; same order as the drawings. */
export const OBJECT_NAMES: readonly (() => string)[] = [
	m.game_river_object_1,
	m.game_river_object_2,
	m.game_river_object_3,
	m.game_river_object_4,
	m.game_river_object_5,
	m.game_river_object_6,
	m.game_river_object_7,
	m.game_river_object_8,
	m.game_river_object_9,
	m.game_river_object_10,
	m.game_river_object_11,
	m.game_river_object_12
];
