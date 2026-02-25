import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { receiptItems, receipts, stores } from '$lib/server/schema';
import { requireUser } from '$lib/server/session';
import { parseJson, parseQuery } from '$lib/server/utils';
import { receiptCreateSchema, receiptsQuerySchema } from '$lib/server/validation';
import {
	getOrCreateCategoryByName,
	getOrCreateProductByName,
	getOrCreateStoreByName
} from '$lib/server/services/catalog';
import { computeUnitPrice } from '$lib/server/services/receipts';
import { upsertStoreProductPrice } from '$lib/server/services/prices';
import { json } from '@sveltejs/kit';

export async function GET(event) {
	requireUser(event);
	const query = parseQuery(event, receiptsQuerySchema);
	const filters = [
		query.storeId ? eq(receipts.storeId, query.storeId) : undefined,
		query.from ? gte(receipts.purchasedAt, query.from) : undefined,
		query.to ? lte(receipts.purchasedAt, query.to) : undefined
	].filter(Boolean);

	const rows = await db
		.select({
			id: receipts.id,
			storeId: receipts.storeId,
			storeName: stores.name,
			purchasedAt: receipts.purchasedAt,
			note: receipts.note,
			createdAt: receipts.createdAt,
			updatedAt: receipts.updatedAt,
			total: sql<string>`coalesce(sum(${receiptItems.totalPrice}), 0)`
		})
		.from(receipts)
		.innerJoin(stores, eq(receipts.storeId, stores.id))
		.leftJoin(receiptItems, eq(receipts.id, receiptItems.receiptId))
		.where(filters.length > 0 ? and(...filters) : undefined)
		.groupBy(receipts.id, stores.name)
		.orderBy(desc(receipts.purchasedAt), desc(receipts.createdAt));

	return json({ data: rows });
}

export async function POST(event) {
	requireUser(event);
	const payload = await parseJson(event, receiptCreateSchema);

	let storeId = payload.storeId;
	if (!storeId && payload.storeName) {
		storeId = await getOrCreateStoreByName(payload.storeName);
	}
	if (!storeId) {
		return json(
			{ error: { code: 'BAD_REQUEST', message: 'Provide storeId or storeName' } },
			{ status: 400 }
		);
	}

	const created = await db.transaction(async (tx) => {
		const [receipt] = await tx
			.insert(receipts)
			.values({
				storeId,
				purchasedAt: payload.purchasedAt,
				note: payload.note ?? null
			})
			.returning();

		if (payload.items?.length) {
			for (const item of payload.items) {
				const productId = await getOrCreateProductByName(item.productName);
				let categoryId = item.categoryId ?? null;
				if (!categoryId && item.categoryName) {
					categoryId = await getOrCreateCategoryByName(item.categoryName);
				}
				if (!categoryId) {
					throw new Error('Category is required for each item');
				}
				const unitPrice = computeUnitPrice(item.quantity, item.totalPrice);
				await tx.insert(receiptItems).values({
					receiptId: receipt.id,
					productId,
					categoryId,
					quantity: item.quantity.toString(),
					unit: item.unit ?? null,
					totalPrice: item.totalPrice.toFixed(2),
					unitPrice,
					updatedAt: new Date()
				});
				await upsertStoreProductPrice(tx, {
					storeId,
					productId,
					unitPrice,
					lastSeenAt: payload.purchasedAt
				});
			}
		}
		return receipt;
	});

	return json({ data: created }, { status: 201 });
}
