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
		variant?: 'primary' | 'secondary' | 'danger' | 'accent';
		onclick?: (event: MouseEvent) => void;
		children?: import('svelte').Snippet;
	} = $props();
</script>

<button class="btn {variant}" {type} {disabled} {onclick}>
	{@render children?.()}
</button>

<style>
	.btn {
		min-height: 44px;
		padding: 0.55rem 0.95rem;
		border-radius: 10px;
		border: 1px solid transparent;
		cursor: pointer;
		font-size: 0.95rem;
		font-weight: 600;
	}
	.btn:focus-visible {
		outline: 2px solid var(--primary);
		outline-offset: 2px;
	}
	.primary {
		background: var(--primary);
		color: #fff;
	}
	.accent {
		background: var(--accent);
		color: #fff;
	}
	.secondary {
		background: var(--surface);
		border-color: var(--border);
		color: var(--text);
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
