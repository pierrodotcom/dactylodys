import type { ProgressionDefinition } from '../engine/progression/types';
import type { StoryDefinition } from '../engine/story/types';
import { voiceKey } from './voice-key';

/**
 * `intro`: said before a lesson; `opening`, `line`, `ending`: the three moments of the story;
 * `reminder`: said by the games between two groups.
 */
export type VoiceTextKind = 'intro' | 'opening' | 'line' | 'ending' | 'reminder';

export interface VoiceText {
	/** `voiceKey(text)`: the name of the file that says it. */
	readonly key: string;
	readonly text: string;
	/** `<lesson or world identifier>#<kind>`: where the text is first said. */
	readonly origin: string;
}

export interface VoiceOrigin {
	readonly id: string;
	readonly kind: VoiceTextKind;
}

const ORIGIN_SEPARATOR = '#';
const KINDS: readonly VoiceTextKind[] = ['intro', 'opening', 'line', 'ending', 'reminder'];

/** Where the reminder to look at the screen comes from, in the list of the texts to record. */
export const LOOK_REMINDER_ID = 'game.look-reminder';

/** A sentence of the games that the voice says, apart from the content: `id` names where it comes from. */
export interface VoiceReminder {
	readonly id: string;
	readonly text: string;
}

export function voiceOrigin(id: string, kind: VoiceTextKind): string {
	return `${id}${ORIGIN_SEPARATOR}${kind}`;
}

export function parseVoiceOrigin(origin: string): VoiceOrigin | null {
	const cut = origin.lastIndexOf(ORIGIN_SEPARATOR);
	const kind = KINDS.find((item) => item === origin.slice(cut + 1));
	return cut > 0 && kind !== undefined ? { id: origin.slice(0, cut), kind } : null;
}

/**
 * The language of the content, as in `content/<language>/` and in the identifiers
 * `<language>.progression.<slug>`: the voice of a language is published in `static/voice/<language>/`.
 */
export function voiceLocale(progression: ProgressionDefinition): string {
	return progression.id.slice(0, progression.id.indexOf('.'));
}

/**
 * Every text the voice has to say, once each, in the order a child meets them. A story world that
 * the progression does not have comes last rather than being forgotten.
 */
export function voiceTexts(
	progression: ProgressionDefinition,
	story?: StoryDefinition,
	reminders: readonly VoiceReminder[] = []
): readonly VoiceText[] {
	const texts = new Map<string, VoiceText>();

	function add(text: string, id: string, kind: VoiceTextKind) {
		if (text.trim() === '') return;
		const key = voiceKey(text);
		if (!texts.has(key)) texts.set(key, { key, text, origin: voiceOrigin(id, kind) });
	}

	for (const world of progression.worlds) {
		const told = story?.worlds.find((item) => item.worldId === world.id);
		if (told) add(told.opening, world.id, 'opening');
		for (const lesson of world.lessons) {
			add(lesson.intro, lesson.id, 'intro');
			for (const item of told?.lessons ?? []) {
				if (item.lessonId === lesson.id) add(item.line, lesson.id, 'line');
			}
		}
		if (told) add(told.ending, world.id, 'ending');
	}
	for (const told of story?.worlds ?? []) {
		add(told.opening, told.worldId, 'opening');
		for (const item of told.lessons) add(item.line, item.lessonId, 'line');
		add(told.ending, told.worldId, 'ending');
	}
	for (const reminder of reminders) add(reminder.text, reminder.id, 'reminder');
	return [...texts.values()];
}

/** The kinds recorded first (ADR-042): the opening and the ending of each world. */
const RECORDED_FIRST: readonly VoiceTextKind[] = ['opening', 'ending'];
/** The kinds recorded last: the line of each lesson waits, written, for its recording. */
const RECORDED_LAST: readonly VoiceTextKind[] = ['line'];

function recordingRank(text: VoiceText): number {
	const kind = parseVoiceOrigin(text.origin)?.kind;
	if (kind === undefined) return 1;
	if (RECORDED_FIRST.includes(kind)) return 0;
	return RECORDED_LAST.includes(kind) ? 2 : 1;
}

/**
 * The texts in the order to record them: the openings and endings of the story, then the
 * instructions and reminders, then the lines of the lessons; each part in the order of the course.
 */
export function inRecordingOrder(texts: readonly VoiceText[]): readonly VoiceText[] {
	return texts
		.map((text, index) => ({ text, index, rank: recordingRank(text) }))
		.sort((a, b) => a.rank - b.rank || a.index - b.index)
		.map((entry) => entry.text);
}
