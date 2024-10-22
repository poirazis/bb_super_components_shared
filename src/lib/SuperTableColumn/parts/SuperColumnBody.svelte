<script>
  import { getContext, beforeUpdate } from "svelte";
  import SuperColumnRow from "./SuperColumnRow.svelte";
  import SuperColumnRowNew from "./SuperColumnRowNew.svelte";
  const columnSettings = getContext("stColumnOptions");
  const columnState = getContext("stColumnState");
  const stbVisibleRows = getContext("stbVisibleRows");
  const stbScrollOffset = getContext("stbScrollOffset");
  const stbState = getContext("stbState");

  export let field;
  export let idField;
  export let isLast;
  export let isFirst;
  export let zebra;
  export let rowHeight;
  let viewport;

  $: inserting = $columnState == "Inserting";
  $: quiet = $columnSettings.quiet;
  $: editing =
    $columnState == "EditingCell" &&
    ($columnSettings.highlighters == "vertical" ||
      $columnSettings.highlighters == "both");

  beforeUpdate(() => {
    if (viewport) viewport.scrollTop = $stbScrollOffset;
  });
</script>

<div
  class="super-column-body"
  bind:this={viewport}
  tabindex="-1"
  class:quiet
  class:zebra
  class:inserting
  class:filtered={$columnState == "Filtered"}
  class:is-editing={editing}
>
  {#each $stbVisibleRows as row (row.index)}
    <SuperColumnRow
      {isLast}
      index={row.index}
      row={row.data}
      {field}
      {idField}
      disabled={inserting}
      {rowHeight}
      on:resize={(e) => stbState.resizeRow(row.index, e.detail)}
    >
      <slot />
    </SuperColumnRow>
  {/each}
  {#if inserting}
    <SuperColumnRowNew {isFirst} {isLast} />
  {/if}
</div>
