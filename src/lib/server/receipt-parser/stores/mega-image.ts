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

export const megaImageParser: StoreParser = {
	detect(text) {
		const upper = text.toUpperCase();
		if (upper.includes('MEGA IMAGE') || upper.includes('MEGA-IMAGE')) return 0.95;
		// CUI Mega Image Romania
		if (upper.includes('RO10794309') || upper.includes('10794309')) return 0.9;
		return 0;
	},

	parse(text) {
		const ls = lines(text);
		const items: ParsedItem[] = [];
		let total: number | null = null;
		let pendingQty: number | null = null;
		let pendingName: string | null = null;
		let pendingRaw: string | null = null;

		for (const line of ls) {
			const stripped = stripTvaCode(line);

			if (TOTAL_LINE_RE.test(line)) {
				const m = PRICE_AT_END_RE.exec(stripped);
				if (m) total = parseRomanianPrice(m[1]);
				continue;
			}

			if (/REDUCERE|DISCOUNT|STORNO|PROMOTIE|^[-*]/i.test(line)) {
				if (items.length > 0) items[items.length - 1].confidence = 'low';
				continue;
			}

			if (QTY_LINE_RE.test(stripped)) {
				const m = QTY_LINE_RE.exec(stripped)!;
				pendingQty = parseRomanianPrice(m[1]);
				continue;
			}

			const priceMatch = PRICE_AT_END_RE.exec(stripped);
			if (priceMatch) {
				const price = parseRomanianPrice(priceMatch[1]);
				if (price !== null) {
					const namePart = normaliseWhitespace(stripped.slice(0, priceMatch.index));
					const fullName = pendingName ? `${pendingName} ${namePart}`.trim() : namePart;

					if (fullName.length >= 2) {
						items.push({
							name: normaliseWhitespace(fullName),
							price,
							quantity: pendingQty ?? 1,
							unit: null,
							confidence: fullName.length > 3 ? 'high' : 'low',
							rawLine: pendingRaw ? `${pendingRaw}\n${line}` : line
						});
					}
					pendingQty = null;
					pendingName = null;
					pendingRaw = null;
				}
			} else {
				const cleaned = normaliseWhitespace(stripped);
				if (cleaned.length >= 2 && !/^\d/.test(cleaned)) {
					pendingName = cleaned;
					pendingRaw = line;
				}
			}
		}

		return { items, total, storeName: 'Mega Image' };
	}
};
