<script lang="ts">
	let {
		id,
		label,
		value = $bindable(''),
		options = []
	}: {
		id: string;
		label: string;
		value?: string;
		options: Array<{ value: string; label: string }>;
	} = $props();
</script>

<label class="field" for={id}>
	<span>{label}</span>
	<select {id} bind:value>
		<option value="">Select...</option>
		{#each options as option}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>
</label>

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	select {
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		padding: 0.5rem 0.65rem;
		background: #fff;
	}
	select:focus-visible {
		outline: 2px solid #3b82f6;
		outline-offset: 1px;
	}
</style>
