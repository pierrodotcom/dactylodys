export function computeAccuracy(correctKeystrokes: number, totalKeystrokes: number): number {
	if (!Number.isInteger(correctKeystrokes) || !Number.isInteger(totalKeystrokes)) {
		throw new RangeError('Keystroke counts must be integers');
	}
	if (correctKeystrokes < 0 || totalKeystrokes < 0) {
		throw new RangeError('Keystroke counts must not be negative');
	}
	if (correctKeystrokes > totalKeystrokes) {
		throw new RangeError('Correct keystrokes must not exceed total keystrokes');
	}
	if (totalKeystrokes === 0) {
		return 100;
	}
	return (correctKeystrokes / totalKeystrokes) * 100;
}
