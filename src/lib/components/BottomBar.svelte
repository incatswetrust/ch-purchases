<script lang="ts">
	let { children }: { children?: import('svelte').Snippet } = $props();
</script>

<div class="bottom-bar">
	<div class="container row">{@render children?.()}</div>
</div>

<style>
	.bottom-bar {
		position: sticky;
		bottom: 0;
		background: color-mix(in srgb, var(--bg) 80%, white 20%);
		border-top: 1px solid var(--border);
		padding: 0.5rem 0;
		z-index: 20;
	}
	:global(.bottom-bar .btn) {
		flex: 1;
	}

	@media (min-width: 768px) {
		.bottom-bar {
			position: static;
			background: transparent;
			border-top: 0;
			padding: 0;
		}
		:global(.bottom-bar .btn) {
			flex: 0;
		}
	}
</style>
