import { m } from '$lib/paraglide/messages.js';
import type { Reaction } from './talk';

/** What Floup asks the companion, one question per group, in this order. */
export const QUESTIONS: readonly (() => string)[] = [
	m.game_dialogue_question_1,
	m.game_dialogue_question_2,
	m.game_dialogue_question_3,
	m.game_dialogue_question_4,
	m.game_dialogue_question_5,
	m.game_dialogue_question_6,
	m.game_dialogue_question_7,
	m.game_dialogue_question_8,
	m.game_dialogue_question_9,
	m.game_dialogue_question_10,
	m.game_dialogue_question_11,
	m.game_dialogue_question_12,
	m.game_dialogue_question_13,
	m.game_dialogue_question_14,
	m.game_dialogue_question_15,
	m.game_dialogue_question_16,
	m.game_dialogue_question_17,
	m.game_dialogue_question_18,
	m.game_dialogue_question_19,
	m.game_dialogue_question_20,
	m.game_dialogue_question_21,
	m.game_dialogue_question_22,
	m.game_dialogue_question_23,
	m.game_dialogue_question_24,
	m.game_dialogue_question_25,
	m.game_dialogue_question_26,
	m.game_dialogue_question_27,
	m.game_dialogue_question_28,
	m.game_dialogue_question_29,
	m.game_dialogue_question_30
];

/** How Floup takes each answer, in this order: the face matches the words. */
export const REACTIONS: readonly Reaction[] = [
	{ line: m.game_dialogue_quip_1, face: 'laughing' },
	{ line: m.game_dialogue_quip_2, face: 'delighted' },
	{ line: m.game_dialogue_quip_3, face: 'puzzled' },
	{ line: m.game_dialogue_quip_4, face: 'laughing' },
	{ line: m.game_dialogue_quip_5, face: 'delighted' },
	{ line: m.game_dialogue_quip_6, face: 'puzzled' },
	{ line: m.game_dialogue_quip_7, face: 'laughing' },
	{ line: m.game_dialogue_quip_8, face: 'delighted' },
	{ line: m.game_dialogue_quip_9, face: 'puzzled' },
	{ line: m.game_dialogue_quip_10, face: 'laughing' },
	{ line: m.game_dialogue_quip_11, face: 'delighted' },
	{ line: m.game_dialogue_quip_12, face: 'puzzled' },
	{ line: m.game_dialogue_quip_13, face: 'laughing' },
	{ line: m.game_dialogue_quip_14, face: 'delighted' },
	{ line: m.game_dialogue_quip_15, face: 'puzzled' }
];
