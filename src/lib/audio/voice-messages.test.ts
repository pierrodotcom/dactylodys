import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { QUESTIONS, REACTIONS } from '$lib/games/dialogue/texts';
import { m } from '$lib/paraglide/messages.js';
import { SPOKEN_MESSAGE_GROUPS, spokenKeys, spokenMessages } from './voice-messages';

const messages = JSON.parse(readFileSync('messages/fr.json', 'utf8')) as Record<string, string>;
/** The messages as the screens show them: the functions compiled from the same file. */
const shown = m as unknown as Record<string, () => string>;

function textsOf(id: string): string[] {
	return spokenMessages(messages)
		.filter((item) => item.id === id)
		.map((item) => item.text);
}

describe('spokenMessages', () => {
	it('says the questions of Floup and his answers, in the order the game asks them', () => {
		expect(textsOf('game.dialogue')).toEqual([
			...QUESTIONS.map((question) => question()),
			...REACTIONS.map((reaction) => reaction.line())
		]);
	});

	it('says, in the order of their use, what a child must understand to play', () => {
		expect(SPOKEN_MESSAGE_GROUPS.map((group) => group.id)).toEqual([
			'game.dialogue',
			'play.result',
			'play.help',
			'play.break',
			'play.check',
			'game.caps-lock'
		]);
		expect(textsOf('play.result')).toContain(messages['play_result_headline_0']);
		expect(textsOf('play.result')).toContain(messages['play_result_retry']);
		expect(textsOf('game.caps-lock')).toEqual([messages['game_shared_caps_lock']]);
	});

	it('takes every series in the order of its numbers, not of the file', () => {
		const series = { quip_10: 'Dix.', quip_2: 'Deux.', quip_1: 'Un.' };
		expect(spokenKeys({ id: 'game.dialogue', keys: [/^quip_(\d+)$/] }, series)).toEqual([
			'quip_1',
			'quip_2',
			'quip_10'
		]);
	});

	it('only names messages that exist, without a parameter, as the screens show them', () => {
		for (const group of SPOKEN_MESSAGE_GROUPS) {
			for (const key of spokenKeys(group, messages)) {
				expect(messages[key], key).toBeTypeOf('string');
				expect(messages[key], key).not.toMatch(/\{\w+\}/);
				expect(shown[key]?.(), key).toBe(messages[key]);
			}
		}
	});

	it('refuses a message with a parameter, or one that is missing', () => {
		const withName = { ...messages, game_shared_caps_lock: 'Bonjour {name}.' };
		expect(() => spokenMessages(withName)).toThrow(/game_shared_caps_lock.*parameter/);
		const missing = { ...messages, play_help_thanks: undefined };
		expect(() => spokenMessages(missing)).toThrow(/play_help_thanks/);
	});

	it('gives the spoken sentence of a screen whose message has a parameter', () => {
		expect(messages['play_help_ask']).toMatch(/\{key\}/);
		expect(textsOf('play.help')).toContain(messages['play_help_ask_spoken']);
		expect(messages['play_check_prompt']).toMatch(/\{key\}/);
		expect(textsOf('play.check')).toContain(messages['play_check_prompt_spoken']);
	});
});
