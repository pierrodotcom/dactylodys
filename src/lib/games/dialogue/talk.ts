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

/**
 * What the companion has said so far: the good keys of the group, never a wrong one, and the whole
 * group once it is typed.
 */
export function answerSoFar(view: GameView): string {
	const shown = isRewarded(view) ? view.group.length : view.position;
	return view.group.slice(0, shown).join('');
}
