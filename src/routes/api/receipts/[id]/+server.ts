import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { categories, products, receiptItems, receipts } from '$lib/server/schema';
import { requireUser } from '$lib/server/session';
import { parseJson } from '$lib/server/utils';
import { idParamSchema, receiptUpdateSchema } from '$lib/server/validation';
import { deleteReceiptAndRecalculate, onReceiptStoreOrDateChange } from '$lib/server/services/receipts';
import { json } from '@sveltejs/kit';

export async function GET(event) {
	requireUser(event);
	const { id } = idParamSchema.parse(event.params);
	const receipt = await db.query.receipts.findFirst({ where: eq(receipts.id, id) });
	if (!receipt) {
		return json({ error: { code: 'NOT_FOUND', message: 'Receipt not found' } }, { status: 404 });
	}
	const items = await db.query.receiptItems.findMany({
		where: eq(receiptItems.receiptId, id)
	});
	const categoryRows = await db.select().from(categories);
	const productRows = await db.select().from(products);
	return json({ data: { receipt, items, categories: categoryRows, products: productRows } });
}

export async function PATCH(event) {
	requireUser(event);
	const { id } = idParamSchema.parse(event.params);
	const payload = await parseJson(event, receiptUpdateSchema);
	const existing = await db.query.receipts.findFirst({ where: eq(receipts.id, id) });
	if (!existing) {
		return json({ error: { code: 'NOT_FOUND', message: 'Receipt not found' } }, { status: 404 });
	}

	const [updated] = await db
		.update(receipts)
		.set({
			storeId: payload.storeId,
			purchasedAt: payload.purchasedAt,
			note: payload.note ?? null,
			updatedAt: new Date()
		})
		.where(eq(receipts.id, id))
		.returning();

	if (
		existing.storeId !== payload.storeId ||
		new Date(existing.purchasedAt).getTime() !== new Date(payload.purchasedAt).getTime()
	) {
		await onReceiptStoreOrDateChange({
			receiptId: id,
			oldStoreId: existing.storeId,
			newStoreId: payload.storeId
		});
	}

	return json({ data: updated });
}

export async function DELETE(event) {
	requireUser(event);
	const { id } = idParamSchema.parse(event.params);
	await deleteReceiptAndRecalculate(id);
	return json({ ok: true });
}
