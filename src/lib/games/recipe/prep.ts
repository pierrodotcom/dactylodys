import { isRewarded, type GameView } from '../shared/game-view';
import { stageFor } from '../shared/stage';

/** How many cuts (or how much pouring) an ingredient takes from whole to ready. */
export const PREP_STAGES = 4;

/** Number of different ingredients: they follow one another in this order. */
export const INGREDIENT_VARIANTS = 5;

/** The ingredient that is a liquid, poured instead of cut. */
export const POURED_VARIANT = 4;

export function ingredientVariant(index: number): number {
	return ((index % INGREDIENT_VARIANTS) + INGREDIENT_VARIANTS) % INGREDIENT_VARIANTS;
}

/** Cuts made (or pouring done) on the ingredient being prepared; the last one comes with the end of the group. */
export function prepStage(view: GameView): number {
	if (isRewarded(view)) return PREP_STAGES;
	return Math.min(PREP_STAGES - 1, stageFor(view.position, view.group.length, PREP_STAGES));
}

/** Level of the liquid in the jug: full at stage 0, empty at the last stage. */
const LIQUID_TOP_FULL = -12;
const LIQUID_STEP = 10.5;
const JUG_BOTTOM = 32;
const JUG_TOP = -24;
const JUG_HALF_WIDTH_TOP = 22;
const JUG_HALF_WIDTH_BOTTOM = 25.6;

/** Shape of the liquid left in the jug, `null` once it is empty. */
export function liquidPath(stage: number): string | null {
	if (stage >= PREP_STAGES) return null;
	const top = LIQUID_TOP_FULL + stage * LIQUID_STEP;
	const slope = (JUG_HALF_WIDTH_BOTTOM - JUG_HALF_WIDTH_TOP) / (JUG_BOTTOM - JUG_TOP);
	const half = Number((JUG_HALF_WIDTH_TOP + (top - JUG_TOP) * slope).toFixed(1));
	return `M${-half} ${top}L${half} ${top}L${JUG_HALF_WIDTH_BOTTOM} ${JUG_BOTTOM}L${-JUG_HALF_WIDTH_BOTTOM} ${JUG_BOTTOM}Z`;
}

/** The poured liquid falls while the jug is being emptied. */
export function isPouring(stage: number): boolean {
	return stage > 0 && stage < PREP_STAGES;
}

/** Where the ingredient is: on the board while typed, in the pot once its group is done. */
export type IngredientPlace = 'board' | 'pot' | 'none';

export function ingredientPlace(view: GameView): IngredientPlace {
	if (view.phase === 'typing') return 'board';
	return view.phase === 'celebrating' ? 'pot' : 'none';
}

/** The pot has been filled: the dish is ready. */
export function isDishReady(view: GameView): boolean {
	return view.phase === 'finale' || view.phase === 'complete';
}
