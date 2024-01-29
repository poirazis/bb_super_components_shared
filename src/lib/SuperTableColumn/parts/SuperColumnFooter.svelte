<script>
  export let columnState
  export let columnOptions
</script>

{#if columnOptions.showFooter}
  <div class="spectrum-Table-headcell"  style:height={ "2.2rem"}>
    <span>
      {columnOptions.displayName}
    </span>
  </div>
{/if}

<style>
  .spectrum-Table-headcell {
    width: 100%;
		display: flex;
		align-items: center;
		padding-left: 0.5rem;
		padding-right: 0.5rem;
    border-top: 1px solid var(--spectrum-alias-border-color-mid);
		color: var(--spectrum-global-color-gray-600);
    background-color: var(--spectrum-global-color-gray-200);
  }

  .spectrum-Table-headcell > span {
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }
</style>