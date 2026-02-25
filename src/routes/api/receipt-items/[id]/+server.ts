import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { receiptItems } from '$lib/server/schema';
import { requireUser } from '$lib/server/session';
import { parseJson } from '$lib/server/utils';
import { idParamSchema, receiptItemUpdateSchema } from '$lib/server/validation';
import { deleteReceiptItem, updateReceiptItem } from '$lib/server/services/receipts';
import { getOrCreateCategoryByName } from '$lib/server/services/catalog';
import { json } from '@sveltejs/kit';

export async function PATCH(event) {
	requireUser(event);
	const { id } = idParamSchema.parse(event.params);
	const payload = await parseJson(event, receiptItemUpdateSchema);
	const existing = await db.query.receiptItems.findFirst({ where: eq(receiptItems.id, id) });
	if (!existing) {
		return json({ error: { code: 'NOT_FOUND', message: 'Receipt item not found' } }, { status: 404 });
	}
	let categoryId = payload.categoryId ?? null;
	if (!categoryId && payload.categoryName) {
		categoryId = await getOrCreateCategoryByName(payload.categoryName);
	}
	if (!categoryId) {
		return json(
			{ error: { code: 'BAD_REQUEST', message: 'Category is required' } },
			{ status: 400 }
		);
	}
	const updated = await updateReceiptItem(id, {
		productId: payload.productId,
		categoryId,
		quantity: payload.quantity,
		unit: payload.unit ?? null,
		totalPrice: payload.totalPrice
	});
	return json({ data: updated });
}

export async function DELETE(event) {
	requireUser(event);
	const { id } = idParamSchema.parse(event.params);
	await deleteReceiptItem(id);
	return json({ ok: true });
}
