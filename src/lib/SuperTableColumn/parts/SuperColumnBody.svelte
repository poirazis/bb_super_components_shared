<script>
  import { getContext, beforeUpdate, createEventDispatcher } from "svelte";
  import SuperColumnRow from "./SuperColumnRow.svelte";
  import SuperColumnRowNew from "./SuperColumnRowNew.svelte";

  const dispatch = createEventDispatcher();

  const stbSelected = getContext("stbSelected");
  const stbScrollPos = getContext("stbScrollPos");
  const stbHovered = getContext("stbHovered");
  const stbEditing = getContext("stbEditing");
  const stbRowHeights = getContext("stbRowHeights");
  const stbMenuID = getContext("stbMenuID");
  const stbMenuAnchor = getContext("stbMenuAnchor");
  const stbData = getContext("stbData");

  const columnSettings = getContext("stColumnOptions");
  const columnState = getContext("stColumnState");

  export let rows = [];
  export let field;
  export let idField;
  export let rowHeights;
  export let inInsert;
  export let canInsert;
  export let isLast;

  // interanlly used property
  export let scrollHeight;
  export let clientHeight;

  let columnBodyAnchor;

  $: synchScrollPosition($stbScrollPos);
  $: quiet = $columnSettings.quiet;

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
  class:quiet
  tabindex="-1"
  style:background-color={!quiet ? $columnSettings.background : "transparent"}
  class:filtered={$columnState == "Filtered"}
  class:is-editing={$columnState == "EditingCell" &&
    ($columnSettings.highlighters == "vertical" ||
      $columnSettings.highlighters == "both")}
>
  {#if rows.length}
    {#each rows as row, index}
      <SuperColumnRow
        {isLast}
        {index}
        {row}
        {field}
        {idField}
        height={$stbRowHeights[index]}
        odd={$columnSettings.zebraColors && index % 2 == 1}
        isHovered={$stbHovered == index || $stbMenuID == row[idField]}
        isEditing={$stbEditing == index &&
          ($columnSettings.highlighters == "horizontal" ||
            $columnSettings.highlighters == "both")}
        isSelected={$stbSelected.includes(row[idField]) ||
          $stbSelected.includes(row[idField]?.toString())}
        on:resize={(e) => dispatch("rowResize", { idx: index, size: e.detail })}
        on:contextmenu={(e) => (
          ($stbMenuID = e.detail.rowID), ($stbMenuAnchor = e.detail.anchor)
        )}
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
  .spectrum-Table-body.filtered {
    background-color: var(--spectrum-global-color-gray-75);
  }
  .spectrum-Table-body::-webkit-scrollbar {
    display: none;
  }
</style>
