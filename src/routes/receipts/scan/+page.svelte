<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import Select from '$lib/components/Select.svelte';
	import TopBar from '$lib/components/TopBar.svelte';
	import BottomBar from '$lib/components/BottomBar.svelte';

	type ParsedItem = {
		name: string;
		price: number;
		quantity: number;
		unit: string | null;
		confidence: number; // 0..1 from Document AI
	};

	type Draft = {
		store: { name: string | null; confidence: number };
		items: ParsedItem[];
		total: number | null;
	};

	// ── State ────────────────────────────────────────────────────────────────────
	let phase: 'pick' | 'scanning' | 'confirm' | 'saving' = $state('pick');
	let error = $state('');
	let draft: Draft | null = $state(null);

	// Editable fields on the confirm screen
	let storeName = $state('');
	let storeId = $state('');
	let purchasedAt = $state(new Date().toISOString().slice(0, 16));
	let editableItems: Array<ParsedItem & { categoryName: string }> = $state([]);

	// Store list for the manual store selector
	let stores: Array<{ id: string; name: string }> = $state([]);

	$effect.pre(() => {
		fetch('/api/stores')
			.then((r) => r.json())
			.then((r) => (stores = r.data ?? []));
	});

	// ── Image pick & compress ────────────────────────────────────────────────────
	function handleFileChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (file) processImage(file);
	}

	async function processImage(file: File) {
		phase = 'scanning';
		error = '';
		try {
			const compressed = await compressImage(file);
			await scanReceipt(compressed);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error';
			phase = 'pick';
		}
	}

	// Compress on canvas before upload — keeps payload under Vercel's 4.5 MB limit.
	async function compressImage(file: File): Promise<Blob> {
		return new Promise((resolve, reject) => {
			const img = new Image();
			const url = URL.createObjectURL(file);
			img.onload = () => {
				URL.revokeObjectURL(url);
				const MAX = 1800;
				let { width: w, height: h } = img;
				if (w > MAX || h > MAX) {
					const ratio = MAX / Math.max(w, h);
					w = Math.round(w * ratio);
					h = Math.round(h * ratio);
				}
				const canvas = document.createElement('canvas');
				canvas.width = w;
				canvas.height = h;
				canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
				canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Canvas compression failed'))), 'image/jpeg', 0.88);
			};
			img.onerror = () => reject(new Error('Failed to load image'));
			img.src = url;
		});
	}

	async function scanReceipt(blob: Blob) {
		const fd = new FormData();
		fd.append('image', blob, 'receipt.jpg');

		const res = await fetch('/api/receipts/scan', { method: 'POST', body: fd });
		const result = await res.json();
		if (!res.ok) throw new Error(result.error?.message ?? 'Scan failed');

		draft = result.data as Draft;

		// Pre-fill editable state from draft
		storeName = draft.store.name ?? '';
		storeId = '';
		editableItems = draft.items.map((item) => ({ ...item, categoryName: '', unit: item.unit ?? null }));

		phase = 'confirm';
	}

	// ── Confirm & save ──────────────────────────────────────────────────────────
	async function save() {
		if (!storeName && !storeId) {
			error = 'Please choose or type a store name.';
			return;
		}
		phase = 'saving';
		error = '';

		const payload = {
			storeId: storeId || undefined,
			storeName: storeId ? undefined : storeName || undefined,
			purchasedAt: new Date(purchasedAt).toISOString(),
			items: editableItems
				.filter((i) => i.name.trim())
				.map((i) => ({
					productName: i.name.trim(),
					quantity: Number(i.quantity) || 1,
					unit: i.unit || null,
					totalPrice: Number(i.price) || 0,
					categoryName: i.categoryName.trim() || 'Uncategorised'
				}))
		};

		const res = await fetch('/api/receipts', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload)
		});
		const result = await res.json();
		if (!res.ok) {
			error = result.error?.message ?? 'Failed to save receipt';
			phase = 'confirm';
			return;
		}
		window.location.href = `/receipts/${result.data.id}`;
	}

	function addRow() {
		editableItems = [
			...editableItems,
			{ name: '', price: 0, quantity: 1, unit: null, confidence: 0, categoryName: '' }
		];
	}

	function removeRow(idx: number) {
		editableItems = editableItems.filter((_, i) => i !== idx);
	}

	// Derived cross-check: difference between sum of items and receipt total
	const itemsSum = $derived(editableItems.reduce((s, i) => s + (Number(i.price) || 0), 0));
	const totalMismatch = $derived(draft?.total != null && Math.abs(itemsSum - draft.total) > 0.02);
	const lowConfCount = $derived(editableItems.filter((i) => i.confidence < 0.8 && i.confidence > 0).length);
</script>

<!-- ── Pick phase ─────────────────────────────────────────────────────────── -->
{#if phase === 'pick'}
	<section class="stack">
		<TopBar title="Scan receipt" backHref="/dashboard" />
		<div class="card stack center">
			<p class="hint">Take a photo of your receipt or upload one from your gallery.</p>
			{#if error}<p class="error">{error}</p>{/if}
			<label class="uploadBtn">
				📷 Take photo
				<input type="file" accept="image/*" capture="environment" onchange={handleFileChange} hidden />
			</label>
			<label class="uploadBtn secondary">
				🖼 Choose from gallery
				<input type="file" accept="image/*" onchange={handleFileChange} hidden />
			</label>
			<a href="/receipts/new" class="manualLink">Enter manually instead</a>
		</div>
	</section>

<!-- ── Scanning phase ────────────────────────────────────────────────────── -->
{:else if phase === 'scanning'}
	<section class="stack">
		<TopBar title="Scanning…" backHref="/dashboard" />
		<div class="card stack center">
			<div class="spinner" aria-label="Processing…"></div>
			<p class="hint">Recognising text on receipt, please wait…</p>
		</div>
	</section>

<!-- ── Confirm phase ─────────────────────────────────────────────────────── -->
{:else if phase === 'confirm' && draft}
	<section class="stack">
		<TopBar title="Confirm receipt" backHref="/receipts/scan" />

		<div class="card stack">
			<h3>Store</h3>
			{#if draft.store.name}
				<p class="storeBadge high">✓ {draft.store.name}</p>
			{:else}
				<p class="storeBadge unknown">Store not recognised — please select:</p>
			{/if}
			<Select
				id="store-select"
				label="Select existing store"
				bind:value={storeId}
				options={stores.map((s) => ({ value: s.id, label: s.name }))}
			/>
			<label class="field">
				<span>Or type store name</span>
				<input type="text" bind:value={storeName} placeholder="e.g. Lidl, Kaufland…" />
			</label>
		</div>

		<div class="card stack">
			<label class="field">
				<span>Purchased at</span>
				<input type="datetime-local" bind:value={purchasedAt} />
			</label>
		</div>

		{#if lowConfCount > 0}
			<div class="banner warn">
				{lowConfCount} item{lowConfCount > 1 ? 's' : ''} flagged with low recognition confidence (marked ⚠). Check prices before saving.
			</div>
		{/if}

		{#if totalMismatch}
			<div class="banner warn">
				Items sum ({itemsSum.toFixed(2)} lei) differs from receipt total ({draft.total!.toFixed(2)} lei).
				Review highlighted rows.
			</div>
		{/if}

		<div class="card stack">
			<h3>Items ({editableItems.length})</h3>
			{#each editableItems as item, idx}
				<div class="itemRow" class:lowConf={item.confidence < 0.8 && item.confidence > 0}>
					<div class="itemFields">
						<label class="field">
							<span>Product{item.confidence > 0 && item.confidence < 0.8 ? ' ⚠' : ''}</span>
							<input type="text" bind:value={item.name} />
						</label>
						<div class="row3">
							<label class="field">
								<span>Qty</span>
								<input type="number" min="0.001" step="0.001" bind:value={item.quantity} />
							</label>
							<label class="field">
								<span>Unit</span>
								<input type="text" bind:value={item.unit} placeholder="pcs" />
							</label>
							<label class="field">
								<span>Price (lei)</span>
								<input type="number" min="0" step="0.01" bind:value={item.price} />
							</label>
						</div>
						<label class="field">
							<span>Category</span>
							<input type="text" bind:value={item.categoryName} placeholder="e.g. Dairy, Bread…" />
						</label>
					</div>
					<button class="removeBtn" type="button" onclick={() => removeRow(idx)} aria-label="Remove">✕</button>
				</div>
			{/each}
			<button class="btn btnGhost" type="button" onclick={addRow}>+ Add row</button>
		</div>

		{#if error}<p class="error">{error}</p>{/if}

		<BottomBar>
			<Button variant="secondary" onclick={() => (phase = 'pick')}>Rescan</Button>
			<Button variant="accent" onclick={save}>Save receipt</Button>
		</BottomBar>
	</section>

<!-- ── Saving phase ───────────────────────────────────────────────────────── -->
{:else if phase === 'saving'}
	<section class="stack">
		<TopBar title="Saving…" backHref="/dashboard" />
		<div class="card stack center">
			<div class="spinner"></div>
			<p class="hint">Saving receipt…</p>
		</div>
	</section>
{/if}

<style>
	.center {
		align-items: center;
		text-align: center;
	}
	.hint {
		color: var(--text-muted, #64748b);
		font-size: 0.9rem;
		max-width: 28ch;
	}
	.uploadBtn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		min-height: 44px;
		padding: 0.55rem 1.2rem;
		border-radius: 10px;
		border: 1px solid transparent;
		background: var(--primary);
		color: #fff;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		width: 100%;
	}
	.uploadBtn.secondary {
		background: var(--surface);
		border-color: var(--border);
		color: var(--text);
	}
	.manualLink {
		font-size: 0.85rem;
		color: var(--text-muted, #64748b);
		margin-top: 0.5rem;
	}
	.spinner {
		width: 36px;
		height: 36px;
		border: 4px solid var(--border);
		border-top-color: var(--primary);
		border-radius: 50%;
		animation: spin 0.9s linear infinite;
	}
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
	.storeBadge {
		font-weight: 600;
		padding: 0.35rem 0.65rem;
		border-radius: 8px;
		font-size: 0.9rem;
	}
	.storeBadge.high {
		background: #dcfce7;
		color: #166534;
	}
	.storeBadge.unknown {
		background: #fef9c3;
		color: #854d0e;
	}
	.banner {
		padding: 0.6rem 0.85rem;
		border-radius: 8px;
		font-size: 0.88rem;
	}
	.banner.warn {
		background: #fef3c7;
		color: #92400e;
		border: 1px solid #fcd34d;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.field span {
		font-size: 0.8rem;
		color: var(--text-muted, #64748b);
		font-weight: 500;
	}
	input {
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		padding: 0.45rem 0.5rem;
		font-size: 0.9rem;
		width: 100%;
		box-sizing: border-box;
	}
	.itemRow {
		display: flex;
		gap: 0.5rem;
		align-items: flex-start;
		padding: 0.75rem;
		border-radius: 10px;
		border: 1px solid var(--border);
		background: var(--surface, #fff);
	}
	.itemRow.lowConf {
		border-color: #fcd34d;
		background: #fffbeb;
	}
	.itemFields {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.row3 {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 0.5rem;
	}
	.removeBtn {
		background: none;
		border: none;
		color: #dc2626;
		cursor: pointer;
		font-size: 1rem;
		padding: 0.2rem 0.4rem;
		flex-shrink: 0;
		margin-top: 1.5rem;
	}
	.error {
		color: #b91c1c;
		font-size: 0.9rem;
	}
</style>
