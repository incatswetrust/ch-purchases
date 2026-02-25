<script lang="ts">
	let {
		type = 'button',
		disabled = false,
		variant = 'primary',
		onclick,
		children
	}: {
		type?: 'button' | 'submit';
		disabled?: boolean;
		variant?: 'primary' | 'secondary' | 'danger';
		onclick?: (event: MouseEvent) => void;
		children?: import('svelte').Snippet;
	} = $props();
</script>

<button class="btn {variant}" {type} {disabled} {onclick}>
	{@render children?.()}
</button>

<style>
	.btn {
		padding: 0.55rem 0.95rem;
		border-radius: 8px;
		border: 1px solid transparent;
		cursor: pointer;
		font-size: 0.95rem;
	}
	.btn:focus-visible {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}
	.primary {
		background: #1d4ed8;
		color: #fff;
	}
	.secondary {
		background: #fff;
		border-color: #cbd5e1;
		color: #0f172a;
	}
	.danger {
		background: #dc2626;
		color: #fff;
	}
	.btn:disabled {
		opacity: 0.65;
		cursor: not-allowed;
	}
</style>
