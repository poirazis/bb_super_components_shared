<script>
  import { getContext, beforeUpdate, createEventDispatcher } from "svelte";
  import SuperColumnRow from "./SuperColumnRow.svelte";
  import SuperColumnRowNew from "./SuperColumnRowNew.svelte";

  const dispatch = createEventDispatcher();

  const stbSelected = getContext("stbSelected");
  const stbScrollPos = getContext("stbScrollPos");
  const stbHovered = getContext("stbHovered");
  const stbEditing = getContext("stbEditing");

  const columnSettings = getContext("stColumnSettings");
  const columnState = getContext("stColumnState");

  export let rows = [];
  export let rowHeights;
  export let rowColors;
  export let inInsert;
  export let canInsert;
  export let isLast;

  // interanlly used property
  export let scrollHeight;
  export let clientHeight;

  let hovered;

  let columnBodyAnchor;

  $: synchScrollPosition($stbScrollPos);

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
  class="spectrum-Table-body"
  tabindex="-1"
  style:background-color={$columnSettings.background}
  class:filtered={$columnState == "Filtered"}
  class:is-editing={$columnState == "EditingCell" &&
    ($columnSettings.highlighters == "vertical" ||
      $columnSettings.highlighters == "both")}
  on:mouseenter={() => (hovered = true)}
  on:mouseleave={() => (hovered = false)}
  on:wheel={(e) => {
    if (e.detail.deltaY) e.preventDefault();
  }}
>
  {#if rowHeights?.length}
    {#each rows as row, index}
      <SuperColumnRow
        {isLast}
        {index}
        {row}
        odd={$columnSettings.zebraColors && index % 2 == 1}
        height={rowHeights[index]}
        bgColor={rowColors[index]?.bgcolor}
        color={rowColors[index]?.color}
        isHovered={$stbHovered == index}
        isEditing={$stbEditing == index &&
          ($columnSettings.highlighters == "horizontal" ||
            $columnSettings.highlighters == "both")}
        isSelected={$stbSelected.includes(row.rowID) ||
          $stbSelected.includes(row.rowID?.toString())}
        on:resize={(e) => dispatch("rowResize", { idx: index, size: e.detail })}
        on:hovered={() => ($stbHovered = index)}
        on:rowClicked
        on:rowDblClicked
        on:cellChanged
        on:enteredit={() => columnState.enteredit(index)}
        on:exitedit={columnState.exitedit}
      >
        <slot />
      </SuperColumnRow>
    {/each}

    {#if inInsert || canInsert}
      <SuperColumnRowNew
        row={{}}
        {$columnSettings}
        height={rowHeights[0]}
        {inInsert}
        on:enteredit={columnState.enteredit}
        on:exitedit={columnSettings.exitedit}
      ></SuperColumnRowNew>
    {/if}
    <div class="spacer" style="min-height: 4rem" />
  {/if}
</div>

<style>
  :global(.spectrum-Table-body > .spectrum-Table-row:last-of-type) {
    border-bottom-style: none;
  }
  .spectrum-Table-body {
    height: var(--super-table-body-height);
    color: var(--super-table-color);
    border-radius: 0px;
    overflow-y: scroll !important;
    overflow-x: hidden;
    padding: 0px;
    margin: 0px;
    border: none;
    scrollbar-width: none;
  }
  .spectrum-Table-body.filtered {
    background-color: var(--spectrum-global-color-gray-75);
  }
  .spectrum-Table-body::-webkit-scrollbar {
    display: none;
  }
</style>
