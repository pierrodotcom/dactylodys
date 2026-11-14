import { toGraphemes } from '../graphemes';
import type {
	DrillPatternRules,
	ExerciseMix,
	HandGuideRules,
	LessonDefinition,
	LessonUnlock,
	MasteryRules,
	ProgressionDefinition,
	ProgressionRules,
	RepairRules,
	WarmUpReserve,
	WeakCharRules,
	WordWarmUpRules,
	WorldDefinition
} from './types';

const SPACE = ' ';
/** Enter: the only control character a lesson can bring, typed at the end of a line. */
export const LINE_BREAK = '\n';
const SLUG = '[a-z0-9]+(?:-[a-z0-9]+)*';
const SLUG_PATTERN = new RegExp(`^${SLUG}$`);
const LAYOUT_ID_PATTERN = /^[a-z]{2,3}-[a-z]{2}-[a-z0-9]+-[a-z]+$/;
const CONTROL_PATTERN = /\p{Cc}/u;
const PLAIN_LETTER_PATTERN = /^[a-z]$/;
const CAPITAL_PATTERN = /^[A-Z]$/;
const MAX_PERCENT = 100;
const MIN_SPACE_GROUP_LENGTH = 3;
const MAX_IDENTICAL_IN_A_ROW = 2;
const KNOWN_UNLOCKS: readonly LessonUnlock[] = ['uppercase'];
const MIX_KEYS = ['drills', 'words', 'phrases'] as const;

interface Introduced {
	readonly chars: Set<string>;
	uppercase: boolean;
}

function fail(path: string, message: string): never {
	throw new Error(`${path}: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function expectRecord(value: unknown, path: string): Record<string, unknown> {
	if (!isRecord(value)) fail(path, 'expected an object');
	return value;
}

function expectArray(value: unknown, path: string): unknown[] {
	if (!Array.isArray(value)) fail(path, 'expected an array');
	return value as unknown[];
}

function expectString(value: unknown, path: string): string {
	if (typeof value !== 'string' || value.trim() === '') fail(path, 'expected a non-empty string');
	return value;
}

function expectNumber(value: unknown, path: string): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) fail(path, 'expected a finite number');
	return value;
}

function expectPercent(value: unknown, path: string): number {
	const number = expectNumber(value, path);
	if (number < 0 || number > MAX_PERCENT)
		fail(path, `expected a number between 0 and ${MAX_PERCENT}`);
	return number;
}

function expectNonNegative(value: unknown, path: string): number {
	const number = expectNumber(value, path);
	if (number < 0) fail(path, 'expected a number of at least 0');
	return number;
}

function expectInteger(value: unknown, path: string): number {
	const number = expectNumber(value, path);
	if (!Number.isInteger(number)) fail(path, 'expected an integer');
	return number;
}

function rejectUnknown(record: Record<string, unknown>, allowed: readonly string[], path: string) {
	for (const name of Object.keys(record)) {
		if (!allowed.includes(name)) fail(`${path}.${name}`, 'unknown property');
	}
}

function expectId(value: unknown, type: string, language: string | null, path: string): string {
	const id = expectString(value, path);
	const match = new RegExp(`^([a-z]{2,3})\\.${type}\\.${SLUG}$`).exec(id);
	if (match === null) fail(path, `expected <language>.${type}.<slug>`);
	if (language !== null && match[1] !== language) {
		fail(path, `expected the language prefix "${language}"`);
	}
	return id;
}

function expectSlug(value: unknown, path: string): string {
	const slug = expectString(value, path);
	if (!SLUG_PATTERN.test(slug)) fail(path, 'expected lowercase words separated by hyphens');
	return slug;
}

function expectGrapheme(value: unknown, path: string): string {
	if (typeof value !== 'string' || value === '') fail(path, 'expected a non-empty string');
	const text = value.normalize('NFC');
	if (toGraphemes(text).length !== 1) fail(path, 'expected exactly one character');
	if (text !== LINE_BREAK && CONTROL_PATTERN.test(text)) {
		fail(path, 'expected a printable character or a line break');
	}
	return text;
}

function capitalsOf(chars: Iterable<string>): string[] {
	const capitals = new Set<string>();
	for (const char of chars) {
		if (PLAIN_LETTER_PATTERN.test(char)) capitals.add(char.toUpperCase());
	}
	return [...capitals];
}

function knownChars(introduced: Introduced): Set<string> {
	const known = new Set(introduced.chars);
	if (introduced.uppercase) for (const capital of capitalsOf(known)) known.add(capital);
	return known;
}

function parseRules(value: unknown, path: string): ProgressionRules {
	const record = expectRecord(value, path);
	rejectUnknown(
		record,
		[
			'unlockAccuracy',
			'starThresholds',
			'newCharWeight',
			'weakCharBoost',
			'themeBoost',
			'newCharMinCount',
			'recentCharWindow',
			'lengthSlack',
			'handGuide',
			'starAlmostMargin',
			'storyPhraseEvery',
			'keyboardFade',
			'textGroupLength',
			'wordWarmUp',
			'writtenWarmUpMinCount',
			'warmUpReserveSlack',
			'drillPatterns',
			'suiteFreeMinWords',
			'uppercaseMinCount',
			'weakChars',
			'phraseEnd'
		],
		path
	);
	const unlockAccuracy = expectPercent(record['unlockAccuracy'], `${path}.unlockAccuracy`);
	const rawThresholds = expectArray(record['starThresholds'], `${path}.starThresholds`);
	if (rawThresholds.length !== 3) fail(`${path}.starThresholds`, 'expected exactly 3 thresholds');
	const thresholds = rawThresholds.map((threshold, i) =>
		expectPercent(threshold, `${path}.starThresholds[${i}]`)
	);
	thresholds.forEach((threshold, i) => {
		const previous = thresholds[i - 1];
		if (previous !== undefined && threshold <= previous) {
			fail(`${path}.starThresholds[${i}]`, 'expected thresholds in strictly ascending order');
		}
	});
	const newCharWeight = expectNumber(record['newCharWeight'], `${path}.newCharWeight`);
	if (newCharWeight < 0 || newCharWeight > 1) {
		fail(`${path}.newCharWeight`, 'expected a number between 0 and 1');
	}
	const newCharMinCount = expectInteger(record['newCharMinCount'], `${path}.newCharMinCount`);
	if (newCharMinCount < 0) fail(`${path}.newCharMinCount`, 'expected an integer of at least 0');
	const recentCharWindow = expectInteger(record['recentCharWindow'], `${path}.recentCharWindow`);
	if (recentCharWindow < 1) fail(`${path}.recentCharWindow`, 'expected an integer of at least 1');
	const lengthSlack =
		record['lengthSlack'] === undefined
			? undefined
			: expectInteger(record['lengthSlack'], `${path}.lengthSlack`);
	if (lengthSlack !== undefined && lengthSlack < 0) {
		fail(`${path}.lengthSlack`, 'expected an integer of at least 0');
	}
	const handGuide =
		record['handGuide'] === undefined
			? undefined
			: parseHandGuide(record['handGuide'], `${path}.handGuide`);
	const starAlmostMargin =
		record['starAlmostMargin'] === undefined
			? undefined
			: expectNonNegative(record['starAlmostMargin'], `${path}.starAlmostMargin`);
	const storyPhraseEvery =
		record['storyPhraseEvery'] === undefined
			? undefined
			: expectInteger(record['storyPhraseEvery'], `${path}.storyPhraseEvery`);
	if (storyPhraseEvery !== undefined && storyPhraseEvery < 1) {
		fail(`${path}.storyPhraseEvery`, 'expected an integer of at least 1');
	}
	const keyboardFade =
		record['keyboardFade'] === undefined
			? undefined
			: parseMasteryRules(record['keyboardFade'], `${path}.keyboardFade`);
	const textGroupLength =
		record['textGroupLength'] === undefined
			? undefined
			: expectAtLeastOne(record['textGroupLength'], `${path}.textGroupLength`);
	const wordWarmUp =
		record['wordWarmUp'] === undefined
			? undefined
			: parseWordWarmUp(record['wordWarmUp'], `${path}.wordWarmUp`);
	const writtenWarmUpMinCount =
		record['writtenWarmUpMinCount'] === undefined
			? undefined
			: expectAtLeastOne(record['writtenWarmUpMinCount'], `${path}.writtenWarmUpMinCount`);
	const warmUpReserveSlack =
		record['warmUpReserveSlack'] === undefined
			? undefined
			: expectInteger(record['warmUpReserveSlack'], `${path}.warmUpReserveSlack`);
	if (warmUpReserveSlack !== undefined && warmUpReserveSlack < 0) {
		fail(`${path}.warmUpReserveSlack`, 'expected an integer of at least 0');
	}
	const drillPatterns =
		record['drillPatterns'] === undefined
			? undefined
			: parseDrillPatterns(record['drillPatterns'], `${path}.drillPatterns`);
	const suiteFreeMinWords =
		record['suiteFreeMinWords'] === undefined
			? undefined
			: expectAtLeastOne(record['suiteFreeMinWords'], `${path}.suiteFreeMinWords`);
	const uppercaseMinCount =
		record['uppercaseMinCount'] === undefined
			? undefined
			: expectInteger(record['uppercaseMinCount'], `${path}.uppercaseMinCount`);
	if (uppercaseMinCount !== undefined && uppercaseMinCount < 0) {
		fail(`${path}.uppercaseMinCount`, 'expected an integer of at least 0');
	}
	const weakChars =
		record['weakChars'] === undefined
			? undefined
			: parseWeakChars(record['weakChars'], `${path}.weakChars`);
	const phraseEnd =
		record['phraseEnd'] === undefined
			? undefined
			: expectGrapheme(record['phraseEnd'], `${path}.phraseEnd`);
	if (phraseEnd !== undefined && (phraseEnd === SPACE || phraseEnd === LINE_BREAK)) {
		fail(`${path}.phraseEnd`, 'expected a punctuation mark');
	}
	return {
		unlockAccuracy,
		starThresholds: [thresholds[0] ?? 0, thresholds[1] ?? 0, thresholds[2] ?? 0],
		newCharWeight,
		weakCharBoost: expectNonNegative(record['weakCharBoost'], `${path}.weakCharBoost`),
		themeBoost: expectNonNegative(record['themeBoost'], `${path}.themeBoost`),
		newCharMinCount,
		recentCharWindow,
		...(lengthSlack === undefined ? {} : { lengthSlack }),
		...(handGuide === undefined ? {} : { handGuide }),
		...(starAlmostMargin === undefined ? {} : { starAlmostMargin }),
		...(storyPhraseEvery === undefined ? {} : { storyPhraseEvery }),
		...(keyboardFade === undefined ? {} : { keyboardFade }),
		...(textGroupLength === undefined ? {} : { textGroupLength }),
		...(wordWarmUp === undefined ? {} : { wordWarmUp }),
		...(writtenWarmUpMinCount === undefined ? {} : { writtenWarmUpMinCount }),
		...(warmUpReserveSlack === undefined ? {} : { warmUpReserveSlack }),
		...(drillPatterns === undefined ? {} : { drillPatterns }),
		...(suiteFreeMinWords === undefined ? {} : { suiteFreeMinWords }),
		...(uppercaseMinCount === undefined ? {} : { uppercaseMinCount }),
		...(weakChars === undefined ? {} : { weakChars }),
		...(phraseEnd === undefined ? {} : { phraseEnd })
	};
}

function parseWordWarmUp(value: unknown, path: string): WordWarmUpRules {
	const record = expectRecord(value, path);
	rejectUnknown(record, ['minWords', 'maxWordLength', 'scoreShare'], path);
	const scoreShare =
		record['scoreShare'] === undefined
			? undefined
			: expectRate(record['scoreShare'], `${path}.scoreShare`);
	if (scoreShare !== undefined && scoreShare <= 0) {
		fail(`${path}.scoreShare`, 'expected a number above 0 and up to 1');
	}
	return {
		minWords: expectAtLeastOne(record['minWords'], `${path}.minWords`),
		maxWordLength: expectAtLeastOne(record['maxWordLength'], `${path}.maxWordLength`),
		...(scoreShare === undefined ? {} : { scoreShare })
	};
}

const SHAPE_PATTERN = /^[CDVW]+(?: [CDVW]+)*$/;

function parseDrillPatterns(value: unknown, path: string): DrillPatternRules {
	const record = expectRecord(value, path);
	rejectUnknown(record, ['vowels', 'shapes'], path);
	const vowels: string[] = [];
	expectArray(record['vowels'], `${path}.vowels`).forEach((raw, i) => {
		const vowel = expectGrapheme(raw, `${path}.vowels[${i}]`);
		if (vowels.includes(vowel)) fail(`${path}.vowels[${i}]`, `duplicate vowel "${vowel}"`);
		vowels.push(vowel);
	});
	const shapes: string[] = [];
	expectArray(record['shapes'], `${path}.shapes`).forEach((raw, i) => {
		const shape = expectString(raw, `${path}.shapes[${i}]`);
		if (!SHAPE_PATTERN.test(shape)) {
			fail(
				`${path}.shapes[${i}]`,
				'expected C and D (consonants), V and W (vowels), and single spaces inside'
			);
		}
		if (shapes.includes(shape)) fail(`${path}.shapes[${i}]`, `duplicate shape "${shape}"`);
		shapes.push(shape);
	});
	if (shapes.length === 0) fail(`${path}.shapes`, 'expected at least one shape');
	return { vowels, shapes };
}

function parseWeakChars(value: unknown, path: string): WeakCharRules {
	const record = expectRecord(value, path);
	rejectUnknown(record, ['minCount', 'maxChars', 'minAttempts', 'minErrorRate'], path);
	return {
		minCount: expectAtLeastOne(record['minCount'], `${path}.minCount`),
		maxChars: expectAtLeastOne(record['maxChars'], `${path}.maxChars`),
		minAttempts: expectAtLeastOne(record['minAttempts'], `${path}.minAttempts`),
		minErrorRate: expectRate(record['minErrorRate'], `${path}.minErrorRate`)
	};
}

function expectRate(value: unknown, path: string): number {
	const rate = expectNumber(value, path);
	if (rate < 0 || rate > 1) fail(path, 'expected a number between 0 and 1');
	return rate;
}

function expectAtLeastOne(value: unknown, path: string): number {
	const count = expectInteger(value, path);
	if (count < 1) fail(path, 'expected an integer of at least 1');
	return count;
}

function parseMasteryRules(value: unknown, path: string): MasteryRules {
	const record = expectRecord(value, path);
	rejectUnknown(
		record,
		['acquiredMinAttempts', 'acquiredMaxErrorRate', 'fragileMinAttempts', 'fragileMinErrorRate'],
		path
	);
	return {
		acquiredMinAttempts: expectAtLeastOne(
			record['acquiredMinAttempts'],
			`${path}.acquiredMinAttempts`
		),
		acquiredMaxErrorRate: expectRate(
			record['acquiredMaxErrorRate'],
			`${path}.acquiredMaxErrorRate`
		),
		fragileMinAttempts: expectAtLeastOne(
			record['fragileMinAttempts'],
			`${path}.fragileMinAttempts`
		),
		fragileMinErrorRate: expectRate(record['fragileMinErrorRate'], `${path}.fragileMinErrorRate`)
	};
}

function parseHandGuide(value: unknown, path: string): HandGuideRules {
	const record = expectRecord(value, path);
	rejectUnknown(record, ['everyKeyUntil', 'newKeysUntil', 'hesitationMs'], path);
	const everyKeyUntil = expectInteger(record['everyKeyUntil'], `${path}.everyKeyUntil`);
	const newKeysUntil = expectInteger(record['newKeysUntil'], `${path}.newKeysUntil`);
	if (everyKeyUntil < 0) fail(`${path}.everyKeyUntil`, 'expected an integer of at least 0');
	if (newKeysUntil < everyKeyUntil) {
		fail(`${path}.newKeysUntil`, 'expected at least everyKeyUntil');
	}
	const hesitationMs =
		record['hesitationMs'] === undefined
			? undefined
			: expectInteger(record['hesitationMs'], `${path}.hesitationMs`);
	if (hesitationMs !== undefined && hesitationMs < 0) {
		fail(`${path}.hesitationMs`, 'expected an integer of at least 0');
	}
	return { everyKeyUntil, newKeysUntil, ...(hesitationMs === undefined ? {} : { hesitationMs }) };
}

function parseMix(value: unknown, path: string): ExerciseMix {
	const record = expectRecord(value, path);
	rejectUnknown(record, MIX_KEYS, path);
	const [drills, words, phrases] = MIX_KEYS.map((key) =>
		expectNonNegative(record[key], `${path}.${key}`)
	) as [number, number, number];
	if (drills + words + phrases <= 0) fail(path, 'expected at least one positive weight');
	return { drills, words, phrases };
}

function parseUnlocks(value: unknown, path: string): LessonUnlock[] {
	const unlocks: LessonUnlock[] = [];
	expectArray(value, path).forEach((raw, i) => {
		const unlock = KNOWN_UNLOCKS.find((known) => known === raw);
		if (unlock === undefined) fail(`${path}[${i}]`, `expected one of: ${KNOWN_UNLOCKS.join(', ')}`);
		if (unlocks.includes(unlock)) fail(`${path}[${i}]`, `duplicate unlock "${unlock}"`);
		unlocks.push(unlock);
	});
	return unlocks;
}

function parseWord(value: unknown, known: ReadonlySet<string>, path: string): string {
	const word = expectString(value, path).normalize('NFC');
	const graphemes = toGraphemes(word);
	if (word.startsWith(SPACE) || word.endsWith(SPACE)) {
		fail(path, 'a word must not start or end with a space');
	}
	graphemes.forEach((grapheme, i) => {
		if (CONTROL_PATTERN.test(grapheme)) fail(path, 'a word must only contain printable characters');
		if (!known.has(grapheme)) fail(path, `character "${grapheme}" is not learned at this stage`);
		if (grapheme === SPACE && graphemes[i - 1] === SPACE) {
			fail(path, 'a word must not contain two spaces in a row');
		}
		if (
			i >= MAX_IDENTICAL_IN_A_ROW &&
			graphemes.slice(i - MAX_IDENTICAL_IN_A_ROW, i).every((g) => g === grapheme)
		) {
			fail(path, `character "${grapheme}" appears three times in a row`);
		}
	});
	return word;
}

/**
 * A warm-up group holds once each new character still below the minimum, so the minimum needs as
 * many groups; a single known character fills its groups, which must then differ in length.
 */
function checkMinimumFits(
	lesson: LessonDefinition,
	typable: number,
	newCharMinCount: number,
	path: string
): void {
	if (lesson.newChars.length === 0 || newCharMinCount === 0) return;
	if (newCharMinCount > lesson.groupCount) {
		fail(
			`${path}.groupCount`,
			`expected at least ${newCharMinCount} groups to ask each new character ${newCharMinCount} times (rules.newCharMinCount)`
		);
	}
	const [min, max] = lesson.groupLength;
	if (typable < 2 && min === max && newCharMinCount > max) {
		fail(
			`${path}.groupCount`,
			`asking the only known character ${newCharMinCount} times (rules.newCharMinCount) needs identical consecutive groups`
		);
	}
}

function checkGeneratable(
	lesson: LessonDefinition,
	learned: ReadonlySet<string>,
	newCharMinCount: number,
	path: string
): void {
	const [min, max] = lesson.groupLength;
	const typable = [...learned].filter((char) => char !== SPACE && char !== LINE_BREAK).length;
	if (typable === 0) fail(`${path}.newChars`, 'no typable character is known at this stage');
	if (typable < 2 && max > MAX_IDENTICAL_IN_A_ROW) {
		fail(`${path}.groupLength`, 'a single known character cannot fill groups longer than 2');
	}
	if (typable < 2 && lesson.groupCount > 1 && min === max && lesson.words.length === 0) {
		fail(`${path}.groupCount`, 'not enough variety to avoid identical consecutive groups');
	}
	if (lesson.newChars.includes(SPACE) && min < MIN_SPACE_GROUP_LENGTH) {
		fail(
			`${path}.groupLength`,
			`a lesson that introduces the space needs groups of at least ${MIN_SPACE_GROUP_LENGTH}`
		);
	}
	if (lesson.newChars.length > lesson.groupCount) {
		fail(`${path}.groupCount`, 'expected at least one group per new character');
	}
	if (lesson.newChars.length > max) {
		fail(`${path}.groupLength`, 'expected groups long enough to hold all the new characters');
	}
	checkMinimumFits(lesson, typable, newCharMinCount, path);
}

/**
 * A warm-up written by hand: groups typed as they are, each one like a word of the lesson, at
 * least as long as its shortest group and no longer than a whole exercise, two in a row never the
 * same, asking each new character at least `minCount` times in all (`rule` names where it comes
 * from).
 */
function parseWarmUp(
	value: unknown,
	newChars: readonly string[],
	unlocksCapitals: boolean,
	known: ReadonlySet<string>,
	[minLength, maxLength]: readonly [number, number],
	{ minCount, rule }: { readonly minCount: number; readonly rule: string },
	path: string
): string[] {
	if (newChars.length === 0 && !unlocksCapitals) {
		fail(path, 'only a lesson with new characters, or that unlocks capitals, has a warm-up');
	}
	const raw = expectArray(value, path);
	if (raw.length === 0) fail(path, 'expected at least one group');
	const groups: string[] = [];
	raw.forEach((item, i) => {
		const group = parseWarmUpGroup(item, known, [minLength, maxLength], `${path}[${i}]`);
		if (group === groups.at(-1)) fail(`${path}[${i}]`, 'the same group twice in a row');
		groups.push(group);
	});
	const counts = new Map<string, number>();
	for (const group of groups) {
		for (const char of toGraphemes(group)) counts.set(char, (counts.get(char) ?? 0) + 1);
	}
	for (const char of newChars) {
		if ((counts.get(char) ?? 0) < minCount) {
			fail(path, `expected "${char}" at least ${minCount} times (rules.${rule})`);
		}
	}
	return groups;
}

function parseWarmUpGroup(
	value: unknown,
	known: ReadonlySet<string>,
	[minLength, maxLength]: readonly [number, number],
	path: string
): string {
	const group = parseWord(value, known, path);
	const length = toGraphemes(group).length;
	if (length < minLength || length > maxLength) {
		fail(
			path,
			`expected ${minLength} to ${maxLength} characters: a group of the lesson at least, a whole exercise at most`
		);
	}
	return group;
}

function isCapital(char: string): boolean {
	return CAPITAL_PATTERN.test(char);
}

function countOf(group: string, matches: (char: string) => boolean): number {
	return toGraphemes(group).filter(matches).length;
}

/**
 * The reserve of a warm-up written by hand. Whatever the draw (one group for each place, the
 * written one or one of its alternatives), no group comes twice, each new character is asked
 * `minCount` times at least, the capitals of a lesson that unlocks them are as many as written,
 * and the length stays within `slack` characters of the warm-up as written.
 */
function parseWarmUpReserve(
	value: unknown,
	warmUp: readonly string[],
	newChars: readonly string[],
	unlocksCapitals: boolean,
	known: ReadonlySet<string>,
	lengths: readonly [number, number],
	{ minCount, rule }: { readonly minCount: number; readonly rule: string },
	slack: number | undefined,
	path: string
): WarmUpReserve {
	const record = expectRecord(value, path);
	rejectUnknown(record, ['alternatives', 'keepFirst'], path);
	const keepFirst = record['keepFirst'];
	if (keepFirst !== undefined && typeof keepFirst !== 'boolean') {
		fail(`${path}.keepFirst`, 'expected true or false');
	}
	const seen = new Set<string>();
	warmUp.forEach((group) => {
		if (seen.has(group)) fail(path, `"${group}" is written twice: a draw could type it twice`);
		seen.add(group);
	});

	let alternatives: string[][] | undefined;
	if (record['alternatives'] !== undefined) {
		const here = `${path}.alternatives`;
		const raw = expectArray(record['alternatives'], here);
		if (raw.length !== warmUp.length) {
			fail(here, `expected ${warmUp.length} lists, one for each group of the warm-up`);
		}
		alternatives = raw.map((list, place) =>
			expectArray(list, `${here}[${place}]`).map((item, i) => {
				const at = `${here}[${place}][${i}]`;
				const group = parseWarmUpGroup(item, known, lengths, at);
				if (seen.has(group)) fail(at, `duplicate group "${group}"`);
				seen.add(group);
				const written = warmUp[place] as string;
				if (unlocksCapitals && countOf(group, isCapital) < countOf(written, isCapital)) {
					fail(at, `expected at least as many capitals as "${written}"`);
				}
				return group;
			})
		);
	}

	const options = warmUp.map((group, place) => [group, ...(alternatives?.[place] ?? [])]);
	for (const char of newChars) {
		const least = options.reduce(
			(sum, list) => sum + Math.min(...list.map((group) => countOf(group, (c) => c === char))),
			0
		);
		if (least < minCount) {
			fail(path, `expected "${char}" at least ${minCount} times whatever the draw (rules.${rule})`);
		}
	}
	if (slack !== undefined) {
		const lengthOf = (group: string) => toGraphemes(group).length;
		const total = (pick: (list: readonly number[]) => number) =>
			options.reduce((sum, list) => sum + pick(list.map(lengthOf)), 0);
		const written = warmUp.reduce((sum, group) => sum + lengthOf(group), 0);
		const longest = total((list) => Math.max(...list));
		const shortest = total((list) => Math.min(...list));
		if (longest - written > slack || written - shortest > slack) {
			fail(
				path,
				`a draw has ${shortest} to ${longest} characters, more than ${slack} away from the ${written} written (rules.warmUpReserveSlack)`
			);
		}
	}
	return {
		...(alternatives === undefined ? {} : { alternatives }),
		...(keepFirst === true ? { keepFirst: true } : {})
	};
}

/** A group arrives begun after at least one right grapheme, and leaves at least one to type. */
const MIN_REPAIR_GROUP_LENGTH = 2;

function parseRepair(value: unknown, minGroupLength: number, path: string): RepairRules {
	const record = expectRecord(value, path);
	rejectUnknown(record, ['share', 'maxPending'], path);
	const share = expectRate(record['share'], `${path}.share`);
	const maxPending = expectAtLeastOne(record['maxPending'], `${path}.maxPending`);
	if (minGroupLength < MIN_REPAIR_GROUP_LENGTH) {
		fail(
			path,
			`expected groups of at least ${MIN_REPAIR_GROUP_LENGTH} characters (groupLength), to arrive begun`
		);
	}
	return { share, maxPending };
}

function parseLesson(
	value: unknown,
	introduced: Introduced,
	lessonIds: Set<string>,
	language: string,
	rules: ProgressionRules,
	path: string
): LessonDefinition {
	const record = expectRecord(value, path);
	rejectUnknown(
		record,
		[
			'id',
			'title',
			'intro',
			'newChars',
			'words',
			'mix',
			'unlocks',
			'groupCount',
			'targetLength',
			'groupLength',
			'warmUp',
			'warmUpReserve',
			'repair'
		],
		path
	);
	const id = expectId(record['id'], 'lesson', language, `${path}.id`);
	if (lessonIds.has(id)) fail(`${path}.id`, `duplicate lesson id "${id}"`);
	lessonIds.add(id);
	const title = expectString(record['title'], `${path}.title`);
	const intro = expectString(record['intro'], `${path}.intro`);

	const newChars = expectArray(record['newChars'], `${path}.newChars`).map((raw, i) => {
		const char = expectGrapheme(raw, `${path}.newChars[${i}]`);
		if (knownChars(introduced).has(char)) {
			fail(`${path}.newChars[${i}]`, `character "${char}" is already introduced`);
		}
		introduced.chars.add(char);
		return char;
	});

	const mix = parseMix(record['mix'], `${path}.mix`);
	const unlocks = parseUnlocks(record['unlocks'], `${path}.unlocks`);
	if (unlocks.includes('uppercase')) introduced.uppercase = true;

	const groupCount = expectInteger(record['groupCount'], `${path}.groupCount`);
	if (groupCount < 1) fail(`${path}.groupCount`, 'expected at least 1');
	const targetLength = expectInteger(record['targetLength'], `${path}.targetLength`);
	if (targetLength < 1) fail(`${path}.targetLength`, 'expected at least 1');
	const rawLength = expectArray(record['groupLength'], `${path}.groupLength`);
	if (rawLength.length !== 2) fail(`${path}.groupLength`, 'expected [min, max]');
	const min = expectInteger(rawLength[0], `${path}.groupLength[0]`);
	const max = expectInteger(rawLength[1], `${path}.groupLength[1]`);
	if (min < 1) fail(`${path}.groupLength[0]`, 'expected at least 1');
	if (max < min) fail(`${path}.groupLength[1]`, 'expected a value not below the minimum');

	const known = knownChars(introduced);
	const words: string[] = [];
	expectArray(record['words'], `${path}.words`).forEach((raw, i) => {
		const word = parseWord(raw, known, `${path}.words[${i}]`);
		if (words.includes(word)) fail(`${path}.words[${i}]`, `duplicate word "${word}"`);
		words.push(word);
	});

	const writtenLengths = [min, Math.max(max, targetLength)] as const;
	const writtenMinimum =
		rules.writtenWarmUpMinCount === undefined
			? { minCount: rules.newCharMinCount, rule: 'newCharMinCount' }
			: { minCount: rules.writtenWarmUpMinCount, rule: 'writtenWarmUpMinCount' };
	const warmUp =
		record['warmUp'] === undefined
			? undefined
			: parseWarmUp(
					record['warmUp'],
					newChars,
					unlocks.includes('uppercase'),
					known,
					writtenLengths,
					writtenMinimum,
					`${path}.warmUp`
				);
	if (record['warmUpReserve'] !== undefined && warmUp === undefined) {
		fail(`${path}.warmUpReserve`, 'only a warm-up written by hand has a reserve');
	}
	const warmUpReserve =
		record['warmUpReserve'] === undefined || warmUp === undefined
			? undefined
			: parseWarmUpReserve(
					record['warmUpReserve'],
					warmUp,
					newChars,
					unlocks.includes('uppercase'),
					known,
					writtenLengths,
					writtenMinimum,
					rules.warmUpReserveSlack,
					`${path}.warmUpReserve`
				);

	const repair =
		record['repair'] === undefined
			? undefined
			: parseRepair(record['repair'], min, `${path}.repair`);

	const lesson: LessonDefinition = {
		id,
		title,
		intro,
		newChars,
		words,
		mix,
		unlocks,
		groupCount,
		targetLength,
		groupLength: [min, max],
		...(warmUp === undefined ? {} : { warmUp }),
		...(warmUpReserve === undefined ? {} : { warmUpReserve }),
		...(repair === undefined ? {} : { repair })
	};
	checkGeneratable(lesson, known, rules.newCharMinCount, path);
	if (warmUp !== undefined && warmUp.length > groupCount) {
		fail(`${path}.warmUp`, `expected at most ${groupCount} groups (groupCount)`);
	}
	const warmUpGroups = warmUp?.length ?? (newChars.length === 0 ? 0 : rules.newCharMinCount);
	if (rules.storyPhraseEvery !== undefined && warmUpGroups >= groupCount) {
		fail(
			`${path}.groupCount`,
			`expected more than ${warmUpGroups} groups to leave room for a story phrase after the warm-up (rules.storyPhraseEvery)`
		);
	}
	return lesson;
}

function parseWorld(
	value: unknown,
	introduced: Introduced,
	lessonIds: Set<string>,
	worldIds: Set<string>,
	language: string,
	rules: ProgressionRules,
	path: string
): WorldDefinition {
	const record = expectRecord(value, path);
	rejectUnknown(record, ['id', 'title', 'themeId', 'gameIds', 'lessons'], path);
	const id = expectId(record['id'], 'world', language, `${path}.id`);
	if (worldIds.has(id)) fail(`${path}.id`, `duplicate world id "${id}"`);
	worldIds.add(id);

	const rawGames = expectArray(record['gameIds'], `${path}.gameIds`);
	if (rawGames.length === 0) fail(`${path}.gameIds`, 'expected at least one game');
	const gameIds: string[] = [];
	rawGames.forEach((raw, i) => {
		const gameId = expectSlug(raw, `${path}.gameIds[${i}]`);
		if (gameIds.includes(gameId)) fail(`${path}.gameIds[${i}]`, `duplicate game id "${gameId}"`);
		gameIds.push(gameId);
	});

	const rawLessons = expectArray(record['lessons'], `${path}.lessons`);
	if (rawLessons.length === 0) fail(`${path}.lessons`, 'expected at least one lesson');
	return {
		id,
		title: expectString(record['title'], `${path}.title`),
		themeId: expectString(record['themeId'], `${path}.themeId`),
		gameIds,
		lessons: rawLessons.map((lesson, i) =>
			parseLesson(lesson, introduced, lessonIds, language, rules, `${path}.lessons[${i}]`)
		)
	};
}

export function parseProgression(data: unknown): ProgressionDefinition {
	const root = expectRecord(data, 'progression');
	rejectUnknown(
		root,
		['schemaVersion', 'id', 'locale', 'layoutIds', 'rules', 'worlds'],
		'progression'
	);
	if (root['schemaVersion'] !== 1) fail('progression.schemaVersion', 'expected 1');

	const locale = expectString(root['locale'], 'progression.locale');
	let language: string;
	try {
		Intl.getCanonicalLocales(locale);
		language = new Intl.Locale(locale).language;
	} catch {
		fail('progression.locale', 'expected a BCP 47 language tag');
	}
	const id = expectId(root['id'], 'progression', language, 'progression.id');

	const rawLayouts = expectArray(root['layoutIds'], 'progression.layoutIds');
	if (rawLayouts.length === 0) fail('progression.layoutIds', 'expected at least one layout');
	const layoutIds: string[] = [];
	rawLayouts.forEach((raw, i) => {
		const path = `progression.layoutIds[${i}]`;
		const layoutId = expectString(raw, path);
		if (!LAYOUT_ID_PATTERN.test(layoutId)) fail(path, 'invalid layout id');
		if (layoutIds.includes(layoutId)) fail(path, `duplicate layout id "${layoutId}"`);
		layoutIds.push(layoutId);
	});

	const rules = parseRules(root['rules'], 'progression.rules');

	const rawWorlds = expectArray(root['worlds'], 'progression.worlds');
	if (rawWorlds.length === 0) fail('progression.worlds', 'expected at least one world');
	const introduced: Introduced = { chars: new Set<string>(), uppercase: false };
	const lessonIdSet = new Set<string>();
	const worldIdSet = new Set<string>();
	const worlds = rawWorlds.map((world, i) =>
		parseWorld(
			world,
			introduced,
			lessonIdSet,
			worldIdSet,
			language,
			rules,
			`progression.worlds[${i}]`
		)
	);

	return { schemaVersion: 1, id, locale, layoutIds, rules, worlds };
}

export function lessonIds(progression: ProgressionDefinition): string[] {
	return progression.worlds.flatMap((world) => world.lessons.map((lesson) => lesson.id));
}

export function findLesson(
	progression: ProgressionDefinition,
	lessonId: string
): LessonDefinition | undefined {
	for (const world of progression.worlds) {
		const lesson = world.lessons.find((candidate) => candidate.id === lessonId);
		if (lesson !== undefined) return lesson;
	}
	return undefined;
}

export function learnedChars(progression: ProgressionDefinition, lessonId: string): string[] {
	const learned: string[] = [];
	let uppercase = false;
	for (const world of progression.worlds) {
		for (const lesson of world.lessons) {
			learned.push(...lesson.newChars);
			if (lesson.unlocks.includes('uppercase')) uppercase = true;
			if (lesson.id === lessonId) {
				if (!uppercase) return learned;
				const present = new Set(learned);
				return [...learned, ...capitalsOf(learned).filter((capital) => !present.has(capital))];
			}
		}
	}
	throw new RangeError(`Unknown lesson: ${lessonId}`);
}

/** Characters a lesson brings: its new characters, and the capitals it unlocks. */
export function freshChars(progression: ProgressionDefinition, lessonId: string): string[] {
	const lesson = findLesson(progression, lessonId);
	if (lesson === undefined) throw new RangeError(`Unknown lesson: ${lessonId}`);
	const capitals = lesson.unlocks.includes('uppercase')
		? learnedChars(progression, lessonId).filter((char) => CAPITAL_PATTERN.test(char))
		: [];
	return [...lesson.newChars, ...capitals];
}
