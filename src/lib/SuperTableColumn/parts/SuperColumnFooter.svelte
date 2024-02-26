<script>
  export let columnState
  export let columnOptions
</script>

{#if columnOptions.showFooter}
  <div class="spectrum-Table-headcell">
    <span>
      {columnOptions.displayName ?? columnOptions.name}
    </span>
  </div>
{/if}

<style>
  .spectrum-Table-headcell {
    width: 100%;
		display: flex;
    height: 2rem;
		align-items: center;
		padding-left: 0.5rem;
		padding-right: 0.5rem;
    border-top: 2px solid var(--spectrum-alias-border-color-mid);
		color: var(--spectrum-global-color-gray-600);
    background-color: var(--spectrum-global-color-gray-100);
  }

  .spectrum-Table-headcell > span {
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }
</style>