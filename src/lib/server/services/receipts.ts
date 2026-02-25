import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { receiptItems, receipts } from '$lib/server/schema';
import { recalculateStoreProductPrice, upsertStoreProductPrice } from '$lib/server/services/prices';

function asMoney(value: number): string {
	return value.toFixed(4);
}

export function computeUnitPrice(quantity: number, totalPrice: number): string {
	if (quantity <= 0) {
		throw new Error('Quantity must be greater than 0');
	}
	if (totalPrice < 0) {
		throw new Error('Total price cannot be negative');
	}
	return asMoney(totalPrice / quantity);
}

export async function addReceiptItem(input: {
	receiptId: string;
	productId: string;
	categoryId: string | null;
	quantity: number;
	unit: string | null;
	totalPrice: number;
}) {
	return db.transaction(async (tx) => {
		const receipt = await tx.query.receipts.findFirst({ where: eq(receipts.id, input.receiptId) });
		if (!receipt) throw new Error('Receipt not found');
		const unitPrice = computeUnitPrice(input.quantity, input.totalPrice);

		const [created] = await tx
			.insert(receiptItems)
			.values({
				receiptId: input.receiptId,
				productId: input.productId,
				categoryId: input.categoryId,
				quantity: input.quantity.toString(),
				unit: input.unit,
				totalPrice: input.totalPrice.toFixed(2),
				unitPrice,
				updatedAt: new Date()
			})
			.returning();

		await upsertStoreProductPrice(tx, {
			storeId: receipt.storeId,
			productId: input.productId,
			unitPrice,
			lastSeenAt: receipt.purchasedAt
		});

		return created;
	});
}

export async function updateReceiptItem(
	itemId: string,
	input: {
		productId: string;
		categoryId: string | null;
		quantity: number;
		unit: string | null;
		totalPrice: number;
	}
) {
	return db.transaction(async (tx) => {
		const item = await tx.query.receiptItems.findFirst({ where: eq(receiptItems.id, itemId) });
		if (!item) throw new Error('Item not found');
		const receipt = await tx.query.receipts.findFirst({ where: eq(receipts.id, item.receiptId) });
		if (!receipt) throw new Error('Receipt not found');

		const oldProductId = item.productId;
		const unitPrice = computeUnitPrice(input.quantity, input.totalPrice);
		const [updated] = await tx
			.update(receiptItems)
			.set({
				productId: input.productId,
				categoryId: input.categoryId,
				quantity: input.quantity.toString(),
				unit: input.unit,
				totalPrice: input.totalPrice.toFixed(2),
				unitPrice,
				updatedAt: new Date()
			})
			.where(eq(receiptItems.id, itemId))
			.returning();

		await upsertStoreProductPrice(tx, {
			storeId: receipt.storeId,
			productId: input.productId,
			unitPrice,
			lastSeenAt: receipt.purchasedAt
		});

		if (oldProductId !== input.productId) {
			await recalculateStoreProductPrice(tx, receipt.storeId, oldProductId);
		}

		return updated;
	});
}

export async function deleteReceiptItem(itemId: string) {
	return db.transaction(async (tx) => {
		const item = await tx.query.receiptItems.findFirst({ where: eq(receiptItems.id, itemId) });
		if (!item) return;
		const receipt = await tx.query.receipts.findFirst({ where: eq(receipts.id, item.receiptId) });
		if (!receipt) return;
		await tx.delete(receiptItems).where(eq(receiptItems.id, itemId));
		await recalculateStoreProductPrice(tx, receipt.storeId, item.productId);
	});
}

export async function onReceiptStoreOrDateChange(input: {
	receiptId: string;
	oldStoreId: string;
	newStoreId: string;
}) {
	return db.transaction(async (tx) => {
		const items = await tx.query.receiptItems.findMany({
			where: eq(receiptItems.receiptId, input.receiptId)
		});
		for (const item of items) {
			await recalculateStoreProductPrice(tx, input.oldStoreId, item.productId);
			await recalculateStoreProductPrice(tx, input.newStoreId, item.productId);
		}
	});
}

export async function deleteReceiptAndRecalculate(receiptId: string) {
	return db.transaction(async (tx) => {
		const receipt = await tx.query.receipts.findFirst({ where: eq(receipts.id, receiptId) });
		if (!receipt) return;
		const items = await tx.query.receiptItems.findMany({ where: eq(receiptItems.receiptId, receiptId) });
		await tx.delete(receipts).where(eq(receipts.id, receiptId));
		for (const item of items) {
			await recalculateStoreProductPrice(tx, receipt.storeId, item.productId);
		}
	});
}
