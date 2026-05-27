export type ParseConfidence = 'high' | 'low';

export interface ParsedItem {
	name: string;
	price: number;
	quantity: number;
	unit: string | null;
	confidence: ParseConfidence;
	rawLine: string;
}

export interface ParsedReceiptDraft {
	store: {
		name: string | null; // null = not recognised, user must choose
		confidence: ParseConfidence | 'unknown';
	};
	items: ParsedItem[];
	total: number | null; // receipt total for cross-check
	rawText: string;
	ocrConfidence: number; // 0–100 from Tesseract
}

export interface StoreParser {
	/** Returns a confidence 0–1 score for whether this parser matches the text. */
	detect(text: string): number;
	parse(text: string): { items: ParsedItem[]; total: number | null; storeName: string };
}
