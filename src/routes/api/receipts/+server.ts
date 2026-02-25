import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { receiptItems, receipts, stores } from '$lib/server/schema';
import { requireUser } from '$lib/server/session';
import { parseJson, parseQuery } from '$lib/server/utils';
import { receiptCreateSchema, receiptsQuerySchema } from '$lib/server/validation';
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
	const [created] = await db
		.insert(receipts)
		.values({
			storeId: payload.storeId,
			purchasedAt: payload.purchasedAt,
			note: payload.note ?? null
		})
		.returning();

	return json({ data: created }, { status: 201 });
}
