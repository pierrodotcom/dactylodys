import { repairToErase } from '../shared/announce';
import { isRewarded, pickCyclic, type GameView } from '../shared/game-view';

/** How Floup looks: asking while the answer is typed, then one of its three reactions. */
export type HostFace = 'asking' | 'delighted' | 'puzzled' | 'laughing';
export type ReactionFace = Exclude<HostFace, 'asking'>;

/** What Floup says once the companion has answered, and the face that goes with it. */
export interface Reaction {
	readonly line: () => string;
	readonly face: ReactionFace;
}

/**
 * The question of the current group: one after the other from the first play of the child, so that
 * a replayed game goes on with new questions (ADR-059). Never chosen by chance.
 */
export function questionOf<T>(questions: readonly T[], view: GameView): T | undefined {
	return pickCyclic(questions, view.rewardIndex);
}

/** The reaction to the current group, in the same order as the questions. */
export function reactionOf(reactions: readonly Reaction[], view: GameView): Reaction | undefined {
	return pickCyclic(reactions, view.rewardIndex);
}

/** Floup asks while the group is typed, and reacts once it is done. */
export function hostFace(reactions: readonly Reaction[], view: GameView): HostFace {
	if (!isRewarded(view)) return 'asking';
	return reactionOf(reactions, view)?.face ?? 'delighted';
}

/** The sentences a screen reader hears when Floup asks, given by the caller. */
export interface QuestionWords {
	/** The question, then the answer to type. */
	readonly question: (question: string, text: string) => string;
	/** The same for an answer that arrives begun (lesson of repairs): the wrong character to erase first. */
	readonly repair: (question: string, text: string, char: string) => string;
	/** How a single character is said, e.g. a space as a word. */
	readonly spoken: (grapheme: string) => string;
}

/**
 * What a screen reader hears when Floup asks: the question and the answer to type, said once, the
 * moment they appear, with what to erase first when the answer arrives begun with a mistake.
 */
export function questionAnnouncement(
	view: GameView,
	question: string,
	words: QuestionWords
): string {
	if (view.phase !== 'typing' || !view.untouched) return '';
	const text = view.group.length === 1 ? words.spoken(view.group[0] ?? '') : view.group.join('');
	const toErase = repairToErase(view, words.spoken);
	return toErase === null ? words.question(question, text) : words.repair(question, text, toErase);
}

/**
 * What the companion has said so far: the good keys of the group, never a wrong one, and the whole
 * group once it is typed.
 */
export function answerSoFar(view: GameView): string {
	const shown = isRewarded(view) ? view.group.length : view.position;
	return view.group.slice(0, shown).join('');
}
