import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { shoppingListItems, shoppingLists, storeProductPrices, stores } from '$lib/server/schema';
import { requireUser } from '$lib/server/session';
import { idParamSchema } from '$lib/server/validation';
import { json } from '@sveltejs/kit';

export async function GET(event) {
	requireUser(event);
	const { id } = idParamSchema.parse(event.params);
	const list = await db.query.shoppingLists.findFirst({ where: eq(shoppingLists.id, id) });
	if (!list) {
		return json({ error: { code: 'NOT_FOUND', message: 'List not found' } }, { status: 404 });
	}

	const items = await db.query.shoppingListItems.findMany({
		where: eq(shoppingListItems.listId, id)
	});

	const groupedStores = new Map<
		string,
		{ storeId: string; storeName: string; items: Array<{ id: string; name: string; quantity: string | null; unit: string | null }> }
	>();
	const unknown: Array<{ id: string; name: string }> = [];
	const newItems: Array<{ id: string; name: string }> = [];

	for (const item of items) {
		if (!item.productId) {
			newItems.push({ id: item.id, name: item.rawName });
			continue;
		}

		const priceRows = await db
			.select({
				storeId: storeProductPrices.storeId,
				storeName: stores.name,
				lastUnitPrice: storeProductPrices.lastUnitPrice
			})
			.from(storeProductPrices)
			.innerJoin(stores, eq(stores.id, storeProductPrices.storeId))
			.where(eq(storeProductPrices.productId, item.productId))
			.orderBy(asc(storeProductPrices.lastUnitPrice));

		if (priceRows.length === 0) {
			unknown.push({ id: item.id, name: item.rawName });
			continue;
		}

		const cheapest = priceRows[0];
		const bucket = groupedStores.get(cheapest.storeId) ?? {
			storeId: cheapest.storeId,
			storeName: cheapest.storeName,
			items: []
		};
		bucket.items.push({
			id: item.id,
			name: item.rawName,
			quantity: item.quantity,
			unit: item.unit
		});
		groupedStores.set(cheapest.storeId, bucket);
	}

	return json({
		data: {
			stores: [...groupedStores.values()],
			unknown,
			newItems
		}
	});
}
