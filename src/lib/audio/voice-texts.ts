import type { ProgressionDefinition } from '../engine/progression/types';
import type { StoryDefinition } from '../engine/story/types';
import { LAYOUT_PLATFORMS } from '../keyboard/layout';
import type { LayoutPlatform } from '../keyboard/types';
import { voiceKey } from './voice-key';

/** The instruction written for the keyboards of one platform (`introByPlatform`): `intro-mac`. */
export type PlatformIntroKind = `intro-${LayoutPlatform}`;

/**
 * `intro`: said before a lesson, `intro-<platform>` on a keyboard of that platform; `step`: one
 * short sentence of the instruction, said while the hand shows its key (audit P-13); `opening`,
 * `line`, `ending`: the three moments of the story; `reminder`: said by the games between two
 * groups; `message`: a message of the interface (audit P-12, `voice-messages.ts`).
 */
export type VoiceTextKind =
	'intro' | PlatformIntroKind | 'step' | 'opening' | 'line' | 'ending' | 'reminder' | 'message';

export interface VoiceText {
	/** `voiceKey(text)`: the name of the file that says it. */
	readonly key: string;
	readonly text: string;
	/** `<lesson, world or place identifier>#<kind>`: where the text is first said. */
	readonly origin: string;
	/**
	 * The whole instruction of a lesson that says it in short sentences: heard only while one of
	 * them has no recording, so recording it is not needed.
	 */
	readonly fallback?: true;
}

export interface VoiceOrigin {
	readonly id: string;
	readonly kind: VoiceTextKind;
}

const ORIGIN_SEPARATOR = '#';
const PLATFORM_INTRO_KINDS: readonly PlatformIntroKind[] = LAYOUT_PLATFORMS.map(
	(platform) => `intro-${platform}` as const
);
const KINDS: readonly VoiceTextKind[] = [
	'intro',
	...PLATFORM_INTRO_KINDS,
	'step',
	'opening',
	'line',
	'ending',
	'reminder',
	'message'
];

/** Where the reminders to look at the screen come from, in the list of the texts to record. */
export const LOOK_REMINDER_ID = 'game.look-reminder';
/**
 * Message keys of those reminders in `messages/<language>.json`, in the order the games say them
 * (audit P-20): the import tool reads them there; the page lists the same sentences, as the games
 * show them (`LOOK_REMINDERS`, a test keeps the two in step).
 */
export const LOOK_REMINDER_MESSAGES = [
	'game_shared_look_reminder_touch',
	'game_shared_look_reminder'
] as const;

/** A sentence of the games that the voice says, apart from the content: `id` names where it comes from. */
export interface VoiceReminder {
	readonly id: string;
	readonly text: string;
}

/** The reminders to look at the screen, read from the messages of one language. */
export function lookReminders(messages: Readonly<Record<string, unknown>>): VoiceReminder[] {
	return LOOK_REMINDER_MESSAGES.flatMap((key) => {
		const text = messages[key];
		return typeof text === 'string' ? [{ id: LOOK_REMINDER_ID, text }] : [];
	});
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
 * Every text the voice has to say, once each, in the order a child meets them: for a lesson, its
 * short sentences, then its whole instruction and the one of each platform (`fallback` when it has
 * short sentences). A story world that the progression does not have comes last rather than being
 * forgotten; then the reminders of the games and the messages of the interface (`spokenMessages`).
 */
export function voiceTexts(
	progression: ProgressionDefinition,
	story?: StoryDefinition,
	reminders: readonly VoiceReminder[] = [],
	messages: readonly VoiceReminder[] = []
): readonly VoiceText[] {
	const texts = new Map<string, VoiceText>();

	function add(text: string, id: string, kind: VoiceTextKind, fallback = false) {
		if (text.trim() === '') return;
		const key = voiceKey(text);
		if (texts.has(key)) return;
		const origin = voiceOrigin(id, kind);
		texts.set(key, fallback ? { key, text, origin, fallback: true } : { key, text, origin });
	}

	for (const world of progression.worlds) {
		const told = story?.worlds.find((item) => item.worldId === world.id);
		if (told) add(told.opening, world.id, 'opening');
		for (const lesson of world.lessons) {
			const stepped = (lesson.steps?.length ?? 0) > 0;
			for (const step of lesson.steps ?? []) add(step.text, lesson.id, 'step');
			add(lesson.intro, lesson.id, 'intro', stepped);
			for (const platform of LAYOUT_PLATFORMS) {
				const intro = lesson.introByPlatform?.[platform];
				if (intro !== undefined) add(intro, lesson.id, `intro-${platform}`, stepped);
			}
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
	for (const message of messages) add(message.text, message.id, 'message');
	return [...texts.values()];
}

/** The kinds recorded first (ADR-042): the opening and the ending of each world. */
const RECORDED_FIRST: readonly VoiceTextKind[] = ['opening', 'ending'];
/**
 * The kinds recorded after what is said before and during a lesson: the lines of the lessons, then
 * the messages of the interface (audit P-12).
 */
const RECORDED_AFTER: readonly VoiceTextKind[] = ['line', 'message'];
/** A whole instruction told in short sentences comes last: it is heard only while one is missing. */
const FALLBACK_RANK = RECORDED_AFTER.length + 2;

function recordingRank(text: VoiceText): number {
	if (text.fallback) return FALLBACK_RANK;
	const kind = parseVoiceOrigin(text.origin)?.kind;
	if (kind === undefined) return 1;
	if (RECORDED_FIRST.includes(kind)) return 0;
	const after = RECORDED_AFTER.indexOf(kind);
	return after < 0 ? 1 : after + 2;
}

/**
 * The texts in the order to record them: the openings and endings of the story, then the
 * instructions and reminders, then the lines of the lessons, then the messages of the interface,
 * then the whole instructions told in short sentences; each part in the order of the course.
 */
export function inRecordingOrder(texts: readonly VoiceText[]): readonly VoiceText[] {
	return texts
		.map((text, index) => ({ text, index, rank: recordingRank(text) }))
		.sort((a, b) => a.rank - b.rank || a.index - b.index)
		.map((entry) => entry.text);
}
