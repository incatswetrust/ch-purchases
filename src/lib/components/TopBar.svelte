<script lang="ts">
	let {
		title,
		backHref = '',
		actions,
		subtitle = ''
	}: {
		title: string;
		backHref?: string;
		subtitle?: string;
		actions?: import('svelte').Snippet;
	} = $props();
</script>

<header class="topbar card">
	<div class="stack" style="gap: 0.35rem;">
		{#if backHref}
			<a class="back" href={backHref} aria-label="Go back">← Back</a>
		{/if}
		<h1>{title}</h1>
		{#if subtitle}<p class="subtitle">{subtitle}</p>{/if}
	</div>
	{#if actions}
		<div class="actions">{@render actions()}</div>
	{/if}
</header>

<style>
	.topbar {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.75rem;
	}
	.back {
		font-size: 0.88rem;
		color: var(--muted);
		text-decoration: none;
	}
	.subtitle {
		color: var(--muted);
		font-size: 0.92rem;
	}
	.actions {
		display: flex;
		gap: 0.5rem;
	}
</style>
