/*
 * Contract of the rewards and of the companion (J4, ADR-022). Types only: the functions below
 * are written by the "rewards" work package, in this folder, against these types.
 *
 *   parseRewardCatalogue(data: unknown): RewardCatalogue
 *   validateRewardCatalogue(catalogue, progression): string[]   (problems; empty when coherent)
 *   unlockedRewards(catalogue, progression, progress): ReadonlySet<string>
 *   newlyUnlocked(catalogue, progression, before, after): readonly RewardDefinition[]
 *   rewardsOfLesson(catalogue, lessonId): readonly RewardDefinition[]
 *   resolveCompanion(catalogue, unlocked, choice): CompanionLook
 *
 * with `progression: ProgressionDefinition`, `progress`, `before`, `after: ProgressState`,
 * `unlocked: ReadonlySet<string>` (reward identifiers) and `choice: CompanionChoice`.
 *
 * A reward is never stored. What a child has unlocked is a pure function of the progress and of
 * a catalogue kept as data: nothing can be lost, a profile older than the rewards receives what
 * it has already earned, and everything can be announced before it is earned. The profile keeps
 * only what the child chose (`CompanionChoice`).
 */

import type { StarCount } from '../progression/types';

/** A reward is never tied to zero stars: that would reward taking part, not mastering. */
export type RewardStars = Exclude<StarCount, 0>;

/**
 * What must be true of the progress for a reward to be unlocked.
 *
 * Every kind reads accuracy only. There is on purpose no condition on time, days, number of plays
 * or speed: rewarding attendance or speed is ruled out by the project (CLAUDE.md § 2), so such a
 * kind must not be added here.
 */
export type RewardCondition =
	/** The lesson has reached the accuracy that opens the next one. */
	| { readonly kind: 'lesson-passed'; readonly lessonId: string }
	| { readonly kind: 'lesson-stars'; readonly lessonId: string; readonly stars: RewardStars }
	/** Every lesson of the world is passed. */
	| { readonly kind: 'world-passed'; readonly worldId: string }
	/** Every lesson of the world has at least this number of stars. */
	| { readonly kind: 'world-stars'; readonly worldId: string; readonly stars: RewardStars }
	/**
	 * Each of these characters has been typed at least `minAttempts` times with an error rate
	 * (errors / attempts, 0 to 1) of at most `maxErrorRate`: a key that was hard has been tamed.
	 * Both are read on the recent results of the character (`recentCharStats`), never on its
	 * lifetime totals, which a key that was hard for long would keep out of reach.
	 */
	| {
			readonly kind: 'chars-mastered';
			readonly chars: readonly string[];
			readonly minAttempts: number;
			readonly maxErrorRate: number;
	  };

/**
 * `item`: something the companion can wear; `skill`: something the companion has learned, shown
 * but not worn; `trophy`: a mark of a higher mastery, kept in the collection.
 */
export type RewardKind = 'item' | 'skill' | 'trophy';

export interface RewardDefinition {
	/** `<language>.reward.<slug>`. */
	readonly id: string;
	readonly kind: RewardKind;
	readonly title: string;
	/** Says what to master to get it, so that the child knows it beforehand. */
	readonly description: string;
	/** Identifier of the drawing; it does not depend on the language, so catalogues share drawings. */
	readonly artId: string;
	/** Where an `item` goes on the companion. */
	readonly slot?: string;
	readonly condition: RewardCondition;
}

/** A colour the companion can take. It has no condition: it is a choice, not a reward. */
export interface CompanionColor {
	readonly id: string;
	readonly title: string;
}

export interface RewardCatalogue {
	readonly schemaVersion: 1;
	/** `<language>.rewards.<slug>`. */
	readonly id: string;
	readonly locale: string;
	/** The progression whose lessons and worlds the conditions name. */
	readonly progressionId: string;
	readonly colors: readonly CompanionColor[];
	readonly rewards: readonly RewardDefinition[];
}

/**
 * What the child decided about the companion, as stored in the profile. The identifiers are not
 * checked when they are stored: a choice may name something the catalogue no longer has, or that
 * is not unlocked, and `resolveCompanion` then leaves it out.
 */
export interface CompanionChoice {
	/** Empty until the child has named the companion; otherwise bound like a nickname. */
	readonly name: string;
	/** `null`: the colour the companion comes with. */
	readonly colorId: string | null;
	readonly wornItemIds: readonly string[];
}

/** What is really drawn: the choices of the child, filtered by what the catalogue has and what is unlocked. */
export interface CompanionLook {
	/** Empty when the companion has no name yet. */
	readonly name: string;
	readonly colorId: string | null;
	readonly items: readonly RewardDefinition[];
}
