import { describe, expect, it } from 'vitest';
import {
	explainMicrophoneError,
	findSupportProblem,
	isLasting,
	type MicrophoneSupport
} from './microphone';

const FULL_SUPPORT: MicrophoneSupport = {
	isSecureContext: true,
	hasGetUserMedia: true,
	hasMediaRecorder: true,
	hasDecoder: true
};

function named(name: string): Error {
	const error = new Error('refused by the browser');
	error.name = name;
	return error;
}

describe('findSupportProblem', () => {
	it('finds nothing wrong with a browser that has everything', () => {
		expect(findSupportProblem(FULL_SUPPORT)).toBeNull();
	});

	it('blames the address, not the browser, on a page opened without HTTPS', () => {
		expect(
			findSupportProblem({ ...FULL_SUPPORT, isSecureContext: false, hasGetUserMedia: false })
		).toBe('insecure');
	});

	it.each(['hasGetUserMedia', 'hasMediaRecorder', 'hasDecoder'] as const)(
		'says the browser cannot record when %s is missing',
		(feature) => {
			expect(findSupportProblem({ ...FULL_SUPPORT, [feature]: false })).toBe('unsupported');
		}
	);
});

describe('explainMicrophoneError', () => {
	it.each([
		['NotAllowedError', 'denied'],
		['SecurityError', 'denied'],
		['NotFoundError', 'missing'],
		['OverconstrainedError', 'missing'],
		['NotReadableError', 'failed'],
		['AbortError', 'failed']
	])('reads %s as "%s"', (name, problem) => {
		expect(explainMicrophoneError(named(name))).toBe(problem);
	});

	it('reads anything that is not an error as a failure', () => {
		expect(explainMicrophoneError(undefined)).toBe('failed');
		expect(explainMicrophoneError('refused')).toBe('failed');
		expect(explainMicrophoneError({ name: 42 })).toBe('failed');
	});
});

describe('isLasting', () => {
	it('tells the problems that trying again cannot solve', () => {
		expect(isLasting('insecure')).toBe(true);
		expect(isLasting('unsupported')).toBe(true);
		expect(isLasting('denied')).toBe(false);
		expect(isLasting('missing')).toBe(false);
		expect(isLasting('failed')).toBe(false);
		expect(isLasting(null)).toBe(false);
	});
});
