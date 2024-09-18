<script>
  import { getContext } from "svelte";
  const columnOptions = getContext("stColumnOptions");
</script>

{#if $columnOptions.showFooter}
  <div
    class="spectrum-Table-headcell"
    style:height={$columnOptions.headerHeight}
  >
    <span>
      {$columnOptions.displayName ?? $columnOptions.name}
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
    border-top: 1px solid var(--spectrum-alias-border-color-mid);
    color: var(--spectrum-global-color-gray-700);
    background-color: var(--spectrum-global-color-gray-75);
  }

  .spectrum-Table-headcell > span {
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }
</style>
