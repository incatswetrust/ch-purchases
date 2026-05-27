// Preprocessing pipeline: greyscale → normalise contrast → upscale.
// These steps consistently improve Tesseract accuracy on receipt photos.
export async function preprocessReceiptImage(input: Buffer): Promise<Buffer> {
	const sharp = (await import('sharp')).default;

	const { width, height } = await sharp(input).metadata();
	const w = width ?? 0;
	const h = height ?? 0;

	// Upscale to at least 2400px on the longer side — Tesseract needs ~150–200 dpi equivalent.
	const longerSide = Math.max(w, h);
	const scale = longerSide < 2400 ? 2400 / longerSide : 1;

	return sharp(input)
		.greyscale()
		.normalise() // stretches the histogram → better contrast
		.sharpen({ sigma: 1 }) // recover edges lost in JPEG compression
		.resize(Math.round(w * scale), Math.round(h * scale), {
			kernel: 'lanczos3',
			withoutEnlargement: false
		})
		.toFormat('png') // lossless for OCR
		.toBuffer();
}
