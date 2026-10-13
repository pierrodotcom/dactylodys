import type { CompanionChoice, CompanionLook, RewardCatalogue, RewardDefinition } from './types';

/** What is really drawn: the choice of the child, minus whatever is missing or not yet earned. */
export function resolveCompanion(
	catalogue: RewardCatalogue,
	unlocked: ReadonlySet<string>,
	choice: CompanionChoice
): CompanionLook {
	const colorId =
		choice.colorId !== null && catalogue.colors.some((color) => color.id === choice.colorId)
			? choice.colorId
			: null;

	const worn: RewardDefinition[] = [];
	for (const id of choice.wornItemIds) {
		const reward = catalogue.rewards.find((candidate) => candidate.id === id);
		if (reward !== undefined && reward.kind === 'item' && unlocked.has(reward.id))
			worn.push(reward);
	}
	// A slot holds one item: the last one chosen wins, and the others keep the order of the choice.
	const place = (reward: RewardDefinition): string => reward.slot ?? reward.id;
	const items = worn.filter(
		(reward, index) => worn.findLastIndex((other) => place(other) === place(reward)) === index
	);

	return { name: choice.name, colorId, items };
}
