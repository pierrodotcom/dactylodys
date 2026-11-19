import type { VoiceReminder } from './voice-texts';

/*
 * The messages of the interface the voice says (audit P-12), in the order of their use to a child
 * who reads little: the questions of Floup and his answers, the result of a play, the request of the
 * companion, the break, the check of the keyboard, the help about Caps Lock. A message is said only
 * as it is written: one with a parameter cannot be recorded once for all, so the voice says a
 * sentence of its own beside it, without the parameter (`*_spoken`).
 *
 * `/dev/voix` and `tools/voice/import.js` read them here, from the messages of the language: what
 * the page asks to record, what the tool keeps and what the screens say are the same sentences.
 */

/** Where a message is said, as the page of the recordings names it. */
export type SpokenMessageGroupId =
	'game.dialogue' | 'play.result' | 'play.help' | 'play.break' | 'play.check' | 'game.caps-lock';

export interface SpokenMessageGroup {
	readonly id: SpokenMessageGroupId;
	/** Keys of `messages/<language>.json`; a pattern stands for a numbered series, said in its order. */
	readonly keys: readonly (string | RegExp)[];
}

export const SPOKEN_MESSAGE_GROUPS: readonly SpokenMessageGroup[] = [
	{
		id: 'game.dialogue',
		keys: [/^game_dialogue_question_(\d+)$/, /^game_dialogue_quip_(\d+)$/]
	},
	{
		id: 'play.result',
		keys: [
			/^play_result_headline_(\d+)$/,
			/^play_result_note_(\d+)$/,
			'play_result_note_perfect',
			'play_result_almost',
			'play_result_retry_close',
			'play_result_retry',
			'play_result_world_done',
			'play_result_race_child',
			'play_result_race_child_neutral',
			'play_result_race_ghost',
			'play_result_tour_open'
		]
	},
	{ id: 'play.help', keys: ['play_help_ask_spoken', 'play_help_thanks'] },
	{
		id: 'play.break',
		keys: ['play_break_suggest', 'play_break_suggest_detail', 'play_break_text']
	},
	{
		id: 'play.check',
		keys: [
			'play_check_layout_intro',
			'play_check_prompt_spoken',
			'play_check_ok_title',
			'play_check_ok_text',
			'play_check_diff_title',
			'play_check_diff_text',
			'play_check_diff_adult'
		]
	},
	{ id: 'game.caps-lock', keys: ['game_shared_caps_lock'] }
];

const PARAMETER = /\{\w+\}/;

function seriesNumber(pattern: RegExp, key: string): number {
	return Number(pattern.exec(key)?.[1] ?? Number.NaN);
}

/** The keys a group names, a series in the order of its numbers. */
export function spokenKeys(
	group: SpokenMessageGroup,
	messages: Readonly<Record<string, unknown>>
): string[] {
	return group.keys.flatMap((key) => {
		if (typeof key === 'string') return [key];
		const series = Object.keys(messages).filter((candidate) => key.test(candidate));
		if (series.length === 0) throw new Error(`No message matches ${String(key)}`);
		return series.sort((a, b) => seriesNumber(key, a) - seriesNumber(key, b));
	});
}

/**
 * The messages the voice says, read from the messages of one language, each with the place it is
 * said: a key that is missing, or a message with a parameter, is an error of these lists.
 */
export function spokenMessages(messages: Readonly<Record<string, unknown>>): VoiceReminder[] {
	return SPOKEN_MESSAGE_GROUPS.flatMap((group) =>
		spokenKeys(group, messages).map((key) => {
			const text = messages[key];
			if (typeof text !== 'string') throw new Error(`No message "${key}"`);
			if (PARAMETER.test(text)) throw new Error(`The message "${key}" has a parameter`);
			return { id: group.id, text };
		})
	);
}
