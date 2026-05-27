import type { ParsedItem, StoreParser } from '../types.js';
import {
	PRICE_AT_END_RE,
	QTY_LINE_RE,
	TOTAL_LINE_RE,
	lines,
	normaliseWhitespace,
	parseRomanianPrice,
	stripTvaCode
} from '../utils.js';

// Fallback parser used when no store-specific parser matches.
// Heuristic: any line with a price-looking token at the end is a product line.
export const genericParser: StoreParser = {
	detect: () => 0.1, // always available as last resort

	parse(text) {
		const ls = lines(text);
		const items: ParsedItem[] = [];
		let total: number | null = null;
		let pendingName: string | null = null;
		let pendingRaw: string | null = null;

		for (let i = 0; i < ls.length; i++) {
			const line = ls[i];
			const stripped = stripTvaCode(line);

			// Total line
			if (TOTAL_LINE_RE.test(line)) {
				const m = PRICE_AT_END_RE.exec(stripped);
				if (m) total = parseRomanianPrice(m[1]);
				pendingName = null;
				continue;
			}

			// Quantity × unit-price continuation: "2 x 5,99"
			if (QTY_LINE_RE.test(stripped)) {
				const m = QTY_LINE_RE.exec(stripped)!;
				const qty = parseRomanianPrice(m[1]);
				// The previous item already captured total price; update quantity if we have one pending
				if (items.length > 0 && qty !== null) {
					items[items.length - 1].quantity = qty;
				}
				pendingName = null;
				continue;
			}

			const priceMatch = PRICE_AT_END_RE.exec(stripped);
			if (priceMatch) {
				const price = parseRomanianPrice(priceMatch[1]);
				if (price !== null) {
					// Everything before the price is the product name
					const namePart = normaliseWhitespace(stripped.slice(0, priceMatch.index));

					if (namePart.length >= 2) {
						const fullName = pendingName ? `${pendingName} ${namePart}` : namePart;
						items.push({
							name: normaliseWhitespace(fullName),
							price,
							quantity: 1,
							unit: null,
							confidence: namePart.length > 2 ? 'high' : 'low',
							rawLine: pendingRaw ? `${pendingRaw}\n${line}` : line
						});
						pendingName = null;
						pendingRaw = null;
					} else if (pendingName) {
						// Short name on price line — combine with pending
						items.push({
							name: normaliseWhitespace(pendingName),
							price,
							quantity: 1,
							unit: null,
							confidence: 'low',
							rawLine: `${pendingRaw}\n${line}`
						});
						pendingName = null;
						pendingRaw = null;
					}
				}
			} else {
				// No price — might be the first line of a wrapped product name
				const cleaned = normaliseWhitespace(stripped);
				if (cleaned.length >= 2 && !/^\d+$/.test(cleaned)) {
					pendingName = cleaned;
					pendingRaw = line;
				}
			}
		}

		return { items, total, storeName: 'Unknown store' };
	}
};
