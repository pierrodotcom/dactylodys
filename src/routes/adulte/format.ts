const MS_PER_MINUTE = 60_000;
const UTC = 'UTC';

/** How the adult space writes numbers and dates in the language of the page (`Intl`). */
export interface Formatters {
	readonly number: (value: number, fractionDigits: number) => string;
	/** The local day of a play, as the device saw it then. */
	readonly sessionDate: (at: number, utcOffsetMinutes: number) => string;
	/** A day written `YYYY-MM-DD`. */
	readonly day: (day: string) => string;
	/** The day of a moment, in the time zone of this device. */
	readonly date: (at: number) => string;
	/** A moment, in the time zone of this device. */
	readonly dateTime: (at: number) => string;
	readonly list: (items: readonly string[]) => string;
	/** A length of time in whole minutes, its unit written out (« 12 minutes »). */
	readonly minutes: (value: number) => string;
}

export function createFormatters(locale: string): Formatters {
	const numbers = new Map<number, Intl.NumberFormat>();
	const dayFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: UTC });
	const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'long' });
	const dateTimeFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' });
	const listFormat = new Intl.ListFormat(locale, { type: 'conjunction' });
	const minutesFormat = new Intl.NumberFormat(locale, {
		style: 'unit',
		unit: 'minute',
		unitDisplay: 'long'
	});
	return {
		number(value, fractionDigits) {
			let format = numbers.get(fractionDigits);
			if (!format) {
				format = new Intl.NumberFormat(locale, {
					maximumFractionDigits: fractionDigits,
					useGrouping: false
				});
				numbers.set(fractionDigits, format);
			}
			return format.format(value);
		},
		sessionDate: (at, utcOffsetMinutes) =>
			dayFormat.format(new Date(at + utcOffsetMinutes * MS_PER_MINUTE)),
		day: (day) => dayFormat.format(new Date(`${day}T00:00:00Z`)),
		date: (at) => dateFormat.format(new Date(at)),
		dateTime: (at) => dateTimeFormat.format(new Date(at)),
		list: (items) => listFormat.format(items),
		minutes: (value) => minutesFormat.format(value)
	};
}
