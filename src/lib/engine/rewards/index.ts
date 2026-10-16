export { parseRewardCatalogue, validateRewardCatalogue } from './catalogue';
export { resolveCompanion } from './companion';
export { generateHelpExercise } from './help-exercise';
export { helpQuestFor, lessonPlays, parseHelpQuestRules } from './help-quest';
export { ownedRewards, rewardsToAnnounce, withNewlyEarned } from './owned';
export { newlyUnlocked, rewardsOfLesson, unlockedRewards } from './unlock';
export type {
	CompanionChoice,
	CompanionColor,
	CompanionLook,
	HelpQuest,
	HelpQuestRecord,
	HelpQuestRules,
	RewardCatalogue,
	RewardCondition,
	RewardDefinition,
	RewardKind,
	RewardStars
} from './types';
