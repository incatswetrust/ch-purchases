import { and, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { receiptItems, receipts, storeProductPrices } from '$lib/server/schema';

type TxLike = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function upsertStoreProductPrice(
	tx: TxLike,
	input: { storeId: string; productId: string; unitPrice: string; lastSeenAt: Date }
) {
	await tx
		.insert(storeProductPrices)
		.values({
			storeId: input.storeId,
			productId: input.productId,
			lastUnitPrice: input.unitPrice,
			lastSeenAt: input.lastSeenAt,
			updatedAt: new Date()
		})
		.onConflictDoUpdate({
			target: [storeProductPrices.storeId, storeProductPrices.productId],
			set: {
				lastUnitPrice: input.unitPrice,
				lastSeenAt: input.lastSeenAt,
				updatedAt: new Date()
			}
		});
}

export async function recalculateStoreProductPrice(tx: TxLike, storeId: string, productId: string) {
	const latest = await tx
		.select({
			unitPrice: receiptItems.unitPrice,
			purchasedAt: receipts.purchasedAt
		})
		.from(receiptItems)
		.innerJoin(receipts, eq(receiptItems.receiptId, receipts.id))
		.where(and(eq(receipts.storeId, storeId), eq(receiptItems.productId, productId)))
		.orderBy(desc(receipts.purchasedAt), desc(receiptItems.createdAt))
		.limit(1);

	if (latest.length === 0) {
		await tx
			.delete(storeProductPrices)
			.where(and(eq(storeProductPrices.storeId, storeId), eq(storeProductPrices.productId, productId)));
		return;
	}

	await upsertStoreProductPrice(tx, {
		storeId,
		productId,
		unitPrice: latest[0].unitPrice,
		lastSeenAt: latest[0].purchasedAt
	});
}
