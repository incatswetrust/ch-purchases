import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { products, receiptItems, receipts } from '$lib/server/schema';
import { requireUser } from '$lib/server/session';
import { parseJson } from '$lib/server/utils';
import {
	idParamSchema,
	normalizeProductName,
	receiptItemCreateSchema
} from '$lib/server/validation';
import { addReceiptItem } from '$lib/server/services/receipts';
import { getOrCreateCategoryByName } from '$lib/server/services/catalog';
import { json } from '@sveltejs/kit';
import { z } from 'zod';

const itemWithOptionalProductSchema = receiptItemCreateSchema.extend({
	productName: z.string().trim().min(1).max(200).optional()
});

export async function POST(event) {
	requireUser(event);
	const { id } = idParamSchema.parse(event.params);
	const payload = await parseJson(event, itemWithOptionalProductSchema);
	const receipt = await db.query.receipts.findFirst({ where: eq(receipts.id, id) });
	if (!receipt) {
		return json({ error: { code: 'NOT_FOUND', message: 'Receipt not found' } }, { status: 404 });
	}

	let productId = payload.productId;
	let categoryId = payload.categoryId ?? null;
	if (payload.productName) {
		const normalized = normalizeProductName(payload.productName);
		const existing = await db.query.products.findFirst({ where: eq(products.normalizedName, normalized) });
		if (existing) {
			productId = existing.id;
		} else {
			const [createdProduct] = await db
				.insert(products)
				.values({
					name: payload.productName.trim(),
					normalizedName: normalized
				})
				.returning();
			productId = createdProduct.id;
		}
	}
	if (!categoryId && payload.categoryName) {
		categoryId = await getOrCreateCategoryByName(payload.categoryName);
	}
	if (!categoryId) {
		return json(
			{ error: { code: 'BAD_REQUEST', message: 'Category is required' } },
			{ status: 400 }
		);
	}

	const created = await addReceiptItem({
		receiptId: id,
		productId,
		categoryId,
		quantity: payload.quantity,
		unit: payload.unit ?? null,
		totalPrice: payload.totalPrice
	});
	return json({ data: created }, { status: 201 });
}
