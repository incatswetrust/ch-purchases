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
	let filtersOpen = $state(false);

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
			<a href="/receipts/scan"><Button variant="secondary">Scan</Button></a>
			<a href="/receipts/new"><Button>Create</Button></a>
		{/snippet}
	</TopBar>

	<button
		class="btn btnGhost filters-btn"
		type="button"
		aria-expanded={filtersOpen}
		aria-controls="dashboard-filters"
		onclick={() => (filtersOpen = !filtersOpen)}
	>
		{filtersOpen ? 'Hide filters' : 'Show filters'}
	</button>
	<div id="dashboard-filters" class="card filters" class:open={filtersOpen}>
		<div class="filter-store">
			<Select id="store" label="Store" bind:value={storeId} options={stores.map((s) => ({ value: s.id, label: s.name }))} />
		</div>
		<div class="filter-dates">
			<label class="field">
				<span>From</span>
				<input type="date" bind:value={from} />
			</label>
			<label class="field">
				<span>To</span>
				<input type="date" bind:value={to} />
			</label>
		</div>
		<div class="filter-actions">
			<Button variant="secondary" onclick={loadReceipts}>Apply filters</Button>
		</div>
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
	.filters {
		display: none;
		gap: 0.6rem;
	}
	.filters.open {
		display: grid;
	}
	.filter-store {
		min-width: 0;
	}
	.filter-dates {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.6rem;
	}
	@media (min-width: 390px) {
		.filter-dates {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	.filter-actions :global(.btn) {
		min-height: 40px;
		padding: 0.45rem 0.8rem;
		width: 100%;
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
		.filters {
			display: grid;
			grid-template-columns: repeat(4, minmax(0, 1fr));
			align-items: end;
		}
		.filter-dates {
			grid-column: span 2;
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.filter-actions {
			display: flex;
			align-items: end;
		}
		.mobile-list {
			display: none;
		}
		.desktop-table {
			display: block;
		}
	}
</style>
