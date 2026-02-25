<script lang="ts">
	let { headers = [] as string[], children } = $props();
</script>

<div class="table-wrap">
	<table>
		<thead>
			<tr>
				{#each headers as header}
					<th>{header}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{@render children?.()}
		</tbody>
	</table>
</div>

<style>
	.table-wrap {
		overflow-x: auto;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		background: #fff;
	}
	table {
		width: 100%;
		border-collapse: collapse;
	}
	:global(th),
	:global(td) {
		padding: 0.6rem 0.75rem;
		text-align: left;
		border-bottom: 1px solid #f1f5f9;
	}
	th {
		background: #f8fafc;
		font-weight: 600;
	}
</style>
