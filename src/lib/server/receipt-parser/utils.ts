// Romanian receipts use comma as decimal separator, e.g. "12,99"
export function parseRomanianPrice(raw: string): number | null {
	const cleaned = raw.trim().replace(',', '.').replace(/\s/g, '');
	const n = parseFloat(cleaned);
	return isNaN(n) || n < 0 ? null : n;
}

// Strip trailing TVA group code (A/B/C) that Romanian receipts append to price lines
export function stripTvaCode(s: string): string {
	return s.replace(/\s+[ABC]$/, '').trimEnd();
}

// Collapse multiple spaces, trim
export function normaliseWhitespace(s: string): string {
	return s.replace(/\s+/g, ' ').trim();
}

// Split OCR text into non-empty lines
export function lines(text: string): string[] {
	return text
		.split('\n')
		.map((l) => l.trim())
		.filter(Boolean);
}

// Match "2 x 5,99" or "2x5,99" or "2 X 5.99" quantity lines
export const QTY_LINE_RE = /^(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+(?:[.,]\d+)?)$/;

// Price at end of line, optionally followed by TVA code: "Lapte 1L    5,99 B"
export const PRICE_AT_END_RE = /(\d+(?:[.,]\d{2}))\s*[ABC]?\s*$/;

// Total/subtotal keywords
export const TOTAL_LINE_RE = /^(TOTAL|DE\s+PLATA|SUBTOTAL|SUMA\s+DE\s+PLATA)/i;
