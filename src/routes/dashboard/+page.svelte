<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import Table from '$lib/components/Table.svelte';
	import Select from '$lib/components/Select.svelte';
	import TopBar from '$lib/components/TopBar.svelte';

	let receipts: any[] = $state([]);
	let stores: any[] = $state([]);
	let storeId = $state('');
	let from = $state('');
	let to = $state('');
	let showFilters = $state(false);

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
	<TopBar title="Dashboard">
		{#snippet actions()}
			<a href="/receipts/new"><Button>Create</Button></a>
		{/snippet}
	</TopBar>

	<button class="btn btnGhost filters-btn" type="button" onclick={() => (showFilters = !showFilters)}>
		{showFilters ? 'Hide filters' : 'Show filters'}
	</button>
	<div class="card row" class:hideMobile={!showFilters}>
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

	<div class="mobile-list stack">
		{#each receipts as receipt}
			<a class="card receipt-card" href={`/receipts/${receipt.id}`}>
				<div class="row" style="justify-content: space-between; align-items: center;">
					<strong>{receipt.storeName}</strong>
					<span class="badge">{Number(receipt.total).toFixed(2)}</span>
				</div>
				<p class="muted">{new Date(receipt.purchasedAt).toLocaleString()}</p>
			</a>
		{/each}
	</div>

	<div class="desktop-table">
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
	</div>
</section>

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.filters-btn {
		display: block;
	}
	.hideMobile {
		display: none;
	}
	.receipt-card {
		text-decoration: none;
		color: inherit;
	}
	.muted {
		color: var(--muted);
		font-size: 0.9rem;
	}
	.desktop-table {
		display: none;
	}
	@media (min-width: 768px) {
		.filters-btn {
			display: none;
		}
		.hideMobile {
			display: flex;
		}
		.mobile-list {
			display: none;
		}
		.desktop-table {
			display: block;
		}
	}
</style>
