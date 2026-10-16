import type { ProgressionDefinition } from '$lib/engine/progression/types';
import {
	parseHelpQuestRules,
	parseRewardCatalogue,
	type HelpQuestRules,
	type RewardCatalogue
} from '$lib/engine/rewards';
import helpQuestData from '../../../content/common/help-quest.json';
import catalogueData from '../../../content/fr/rewards/azerty-decouverte.json';

/** The rewards of the shipped progression and what they ask: data, never constants in the code. */
export const REWARD_CATALOGUE: RewardCatalogue = parseRewardCatalogue(catalogueData);

/** When the companion asks for help on a key that became hard again. */
export const HELP_QUEST_RULES: HelpQuestRules = parseHelpQuestRules(helpQuestData);

/** The catalogue written for this progression, or `undefined` when there is none. */
export function rewardCatalogueFor(
	progression: ProgressionDefinition
): RewardCatalogue | undefined {
	return REWARD_CATALOGUE.progressionId === progression.id ? REWARD_CATALOGUE : undefined;
}
