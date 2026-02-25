import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { products, shoppingListItems, shoppingLists } from '$lib/server/schema';
import { requireUser } from '$lib/server/session';
import { parseJson } from '$lib/server/utils';
import { normalizeProductName, shoppingListCreateSchema } from '$lib/server/validation';
import { json } from '@sveltejs/kit';

export async function GET(event) {
	requireUser(event);
	const lists = await db.select().from(shoppingLists);
	return json({ data: lists });
}

export async function POST(event) {
	requireUser(event);
	const payload = await parseJson(event, shoppingListCreateSchema);

	const created = await db.transaction(async (tx) => {
		const [list] = await tx
			.insert(shoppingLists)
			.values({
				title: payload.title
			})
			.returning();

		for (const item of payload.items) {
			let productId = item.productId ?? null;
			if (!productId) {
				const maybeProduct = await tx.query.products.findFirst({
					where: eq(products.normalizedName, normalizeProductName(item.rawName))
				});
				productId = maybeProduct?.id ?? null;
			}
			await tx.insert(shoppingListItems).values({
				listId: list.id,
				productId,
				rawName: item.rawName,
				quantity: item.quantity?.toString() ?? null,
				unit: item.unit ?? null
			});
		}

		return list;
	});

	return json({ data: created }, { status: 201 });
}
