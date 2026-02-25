<script lang="ts">
	import Table from '$lib/components/Table.svelte';

	let month = $state(new Date().toISOString().slice(0, 7));
	let byCategory: Array<{ category: string; total: number }> = $state([]);
	let byStore: Array<{ store: string; total: number }> = $state([]);
	let prices: Array<{ store: string; product: string; unitPrice: number; lastSeenAt: string }> =
		$state([]);

	async function loadData() {
		const [y, m] = month.split('-').map(Number);
		const from = new Date(Date.UTC(y, m - 1, 1)).toISOString();
		const to = new Date(Date.UTC(y, m, 0, 23, 59, 59)).toISOString();
		const response = await fetch(
			`/api/analytics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
		);
		const result = await response.json();
		const data = result.data ?? { byStore: [], byCategory: [], latestPrices: [] };
		byStore = data.byStore.map((row: any) => ({
			store: row.storeName,
			total: Number(row.total)
		}));
		byCategory = data.byCategory.map((row: any) => ({
			category: row.categoryName ?? 'Uncategorized',
			total: Number(row.total)
		}));
		prices = data.latestPrices.map((row: any) => ({
			store: row.storeName,
			product: row.productName,
			unitPrice: Number(row.lastUnitPrice),
			lastSeenAt: row.lastSeenAt
		}));
	}

	$effect.pre(() => {
		loadData();
	});
</script>

<section class="stack">
	<div class="row" style="justify-content: space-between; align-items: center;">
		<h1>Analytics</h1>
		<label class="field">
			<span>Month</span>
			<input type="month" bind:value={month} onchange={loadData} />
		</label>
	</div>

	<div class="card stack">
		<h2>Totals by category</h2>
		<Table headers={['Category', 'Total']}>
			{#each byCategory as row}
				<tr>
					<td>{row.category}</td>
					<td>{row.total.toFixed(2)}</td>
				</tr>
			{/each}
		</Table>
	</div>

	<div class="card stack">
		<h2>Totals by store</h2>
		<Table headers={['Store', 'Total']}>
			{#each byStore as row}
				<tr>
					<td>{row.store}</td>
					<td>{row.total.toFixed(2)}</td>
				</tr>
			{/each}
		</Table>
	</div>

	<div class="card stack">
		<h2>Recent prices snapshot</h2>
		<Table headers={['Store', 'Product', 'Unit price', 'Last seen']}>
			{#each prices as row}
				<tr>
					<td>{row.store}</td>
					<td>{row.product}</td>
					<td>{row.unitPrice.toFixed(4)}</td>
					<td>{new Date(row.lastSeenAt).toLocaleString()}</td>
				</tr>
			{/each}
		</Table>
	</div>
</section>

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	input {
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		padding: 0.5rem;
	}
</style>
