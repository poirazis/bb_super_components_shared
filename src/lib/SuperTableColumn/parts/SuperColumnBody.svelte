<script>
  import { getContext, beforeUpdate, createEventDispatcher } from "svelte";
  import SuperColumnRow from "./SuperColumnRow.svelte";
  import SuperColumnRowNew from "./SuperColumnRowNew.svelte";

  const stbScrollPos = getContext("stbScrollPos");
  const stbHovered = getContext("stbHovered");
  const columnSettings = getContext("stColumnOptions");
  const columnState = getContext("stColumnState");
  const stbState = getContext("stbState");

  export let rows = [];
  export let field;
  export let idField;
  export let isLast;
  export let isFirst;
  export let zebra;
  export let inserting;
  export let canInsert;

  // interanlly used property
  export let scrollHeight;
  export let clientHeight;

  let columnBodyAnchor;

  $: synchScrollPosition($stbScrollPos);
  $: quiet = $columnSettings.quiet;
  $: editing =
    $columnState == "EditingCell" &&
    ($columnSettings.highlighters == "vertical" ||
      $columnSettings.highlighters == "both");

  const synchScrollPosition = (position) => {
    if (columnBodyAnchor) columnBodyAnchor.scrollTop = position;
  };

  beforeUpdate(() => {
    clientHeight = columnBodyAnchor?.clientHeight;
    scrollHeight = columnBodyAnchor?.scrollHeight;
  });
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  bind:this={columnBodyAnchor}
  class="super-column-body"
  class:quiet
  class:zebra
  class:inserting
  class:filtered={$columnState == "Filtered"}
  class:is-editing={editing}
>
  {#each rows as row, index}
    <SuperColumnRow
      {isLast}
      {index}
      {row}
      {field}
      {idField}
      on:enteredit={() => columnState.enteredit(index)}
      on:exitedit={columnState.exitedit}
    >
      <slot />
    </SuperColumnRow>
  {/each}

  {#if inserting}
    <SuperColumnRowNew {isFirst} />
  {/if}

  {#if $columnSettings.overflow || canInsert}
    <div class="spacer" on:mouseenter={() => ($stbHovered = undefined)}></div>
  {/if}
</div>
