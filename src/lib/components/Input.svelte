<script lang="ts">
	let {
		id,
		label,
		type = 'text',
		value = $bindable(''),
		placeholder = '',
		required = false
	}: {
		id: string;
		label: string;
		type?: string;
		value?: string | number;
		placeholder?: string;
		required?: boolean;
	} = $props();
</script>

<label class="field" for={id}>
	<span>{label}</span>
	<input {id} {type} bind:value {placeholder} {required} />
</label>

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	span {
		font-size: 0.9rem;
		color: #1e293b;
	}
	input {
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		padding: 0.5rem 0.65rem;
	}
	input:focus-visible {
		outline: 2px solid #3b82f6;
		outline-offset: 1px;
	}
</style>
