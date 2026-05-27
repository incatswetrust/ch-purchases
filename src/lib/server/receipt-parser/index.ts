import type { ParsedReceiptDraft, StoreParser } from './types.js';
import { genericParser } from './stores/generic.js';
import { kauflandParser } from './stores/kaufland.js';
import { lidlParser } from './stores/lidl.js';
import { megaImageParser } from './stores/mega-image.js';
import { pennyParser } from './stores/penny.js';
import { profiParser } from './stores/profi.js';

export type { ParsedItem, ParsedReceiptDraft } from './types.js';

// Add new store parsers here — detect() score determines priority.
const PARSERS: StoreParser[] = [
	lidlParser,
	kauflandParser,
	megaImageParser,
	profiParser,
	pennyParser,
	genericParser
];

export function parseReceiptText(text: string, ocrConfidence: number): ParsedReceiptDraft {
	// Pick the parser with the highest detection score
	let bestParser = genericParser;
	let bestScore = 0;

	for (const parser of PARSERS) {
		const score = parser.detect(text);
		if (score > bestScore) {
			bestScore = score;
			bestParser = parser;
		}
	}

	const { items, total, storeName } = bestParser.parse(text);

	const storeRecognised = bestScore >= 0.5;

	return {
		store: {
			name: storeRecognised ? storeName : null,
			confidence: storeRecognised ? 'high' : 'unknown'
		},
		items,
		total,
		rawText: text,
		ocrConfidence
	};
}
