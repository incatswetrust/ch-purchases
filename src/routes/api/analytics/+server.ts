import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { categories, receiptItems, receipts, stores, storeProductPrices, products } from '$lib/server/schema';
import { requireUser } from '$lib/server/session';
import { parseQuery } from '$lib/server/utils';
import { z } from 'zod';
import { json } from '@sveltejs/kit';

const querySchema = z.object({
	from: z.coerce.date(),
	to: z.coerce.date()
});

export async function GET(event) {
	requireUser(event);
	const { from, to } = parseQuery(event, querySchema);

	const byStore = await db
		.select({
			storeId: stores.id,
			storeName: stores.name,
			total: sql<string>`coalesce(sum(${receiptItems.totalPrice}), 0)`
		})
		.from(receipts)
		.innerJoin(stores, eq(receipts.storeId, stores.id))
		.leftJoin(receiptItems, eq(receipts.id, receiptItems.receiptId))
		.where(and(gte(receipts.purchasedAt, from), lte(receipts.purchasedAt, to)))
		.groupBy(stores.id, stores.name);

	const byCategory = await db
		.select({
			categoryId: categories.id,
			categoryName: categories.name,
			total: sql<string>`coalesce(sum(${receiptItems.totalPrice}), 0)`
		})
		.from(receipts)
		.innerJoin(receiptItems, eq(receipts.id, receiptItems.receiptId))
		.leftJoin(categories, eq(receiptItems.categoryId, categories.id))
		.where(and(gte(receipts.purchasedAt, from), lte(receipts.purchasedAt, to)))
		.groupBy(categories.id, categories.name);

	const latestPrices = await db
		.select({
			storeId: storeProductPrices.storeId,
			storeName: stores.name,
			productId: storeProductPrices.productId,
			productName: products.name,
			lastUnitPrice: storeProductPrices.lastUnitPrice,
			lastSeenAt: storeProductPrices.lastSeenAt
		})
		.from(storeProductPrices)
		.innerJoin(stores, eq(stores.id, storeProductPrices.storeId))
		.innerJoin(products, eq(products.id, storeProductPrices.productId))
		.limit(500);

	return json({
		data: {
			byStore,
			byCategory,
			latestPrices
		}
	});
}
