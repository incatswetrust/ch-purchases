<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import Table from '$lib/components/Table.svelte';
	import Select from '$lib/components/Select.svelte';

	let receipts: any[] = $state([]);
	let stores: any[] = $state([]);
	let storeId = $state('');
	let from = $state('');
	let to = $state('');

	async function loadStores() {
		const response = await fetch('/api/stores');
		const result = await response.json();
		stores = result.data ?? [];
	}

	async function loadReceipts() {
		const params = new URLSearchParams();
		if (storeId) params.set('storeId', storeId);
		if (from) params.set('from', from);
		if (to) params.set('to', to);
		const response = await fetch(`/api/receipts?${params.toString()}`);
		const result = await response.json();
		receipts = result.data ?? [];
	}

	$effect.pre(() => {
		loadStores();
		loadReceipts();
	});
</script>

<section class="stack">
	<div class="row" style="justify-content: space-between; align-items: center;">
		<h1>Dashboard</h1>
		<a href="/receipts/new"><Button>New receipt</Button></a>
	</div>

	<div class="card row">
		<Select id="store" label="Store" bind:value={storeId} options={stores.map((s) => ({ value: s.id, label: s.name }))} />
		<label class="field">
			<span>From</span>
			<input type="date" bind:value={from} />
		</label>
		<label class="field">
			<span>To</span>
			<input type="date" bind:value={to} />
		</label>
		<Button variant="secondary" onclick={loadReceipts}>Apply filters</Button>
	</div>

	<Table headers={['Date', 'Store', 'Total', 'Actions']}>
		{#each receipts as receipt}
			<tr>
				<td>{new Date(receipt.purchasedAt).toLocaleString()}</td>
				<td>{receipt.storeName}</td>
				<td>{Number(receipt.total).toFixed(2)}</td>
				<td><a href={`/receipts/${receipt.id}`}>Open</a></td>
			</tr>
		{/each}
	</Table>
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
