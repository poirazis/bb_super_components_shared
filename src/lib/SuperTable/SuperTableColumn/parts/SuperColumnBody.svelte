<script>
  import { getContext } from "svelte";
  import SuperColumnRow from "./SuperColumnRow.svelte";

  const stbSelected = getContext("stbSelected");
  const tableScrollPosition = getContext("tableScrollPosition");
  const stbHovered = getContext("stbHovered");

  export let rows = []
  export let columnState
  export let columnOptions

  // for output
  export let rowHeights

  let columnBodyAnchor
  let mouseOver
    
  const handleScroll = () => {
    if (mouseOver) {
      $tableScrollPosition = columnBodyAnchor?.scrollTop;
    }
  }

  const synchScrollPosition = ( position ) => { 
    if (columnBodyAnchor && position != columnBodyAnchor.scrollTop ) 
      columnBodyAnchor.scrollTop = position 
  }

  $: synchScrollPosition($tableScrollPosition)
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  bind:this={columnBodyAnchor}
  class="spectrum-Table-body"
  tabindex="-1"
  style:background-color={columnOptions.background}
  class:filtered={$columnState == "Filtered"}
  on:scroll={handleScroll}
  on:mouseenter={ () => (mouseOver = true) }
  on:mouseleave={ () => (mouseOver = false) }
  >
    {#each rows as row, index}
      <SuperColumnRow
        {row} 
        {index} 
        {columnOptions}
        isHovered={ $stbHovered == index }
        isSelected={ $stbSelected.includes(row.rowID) }
        on:resize={ ( e ) => rowHeights[index] = e.detail }
        on:hovered={ () => ($stbHovered = index)}
        on:rowClicked
        on:rowDblClicked
        on:cellChanged
      >
        <slot />
      </SuperColumnRow>
    {/each}
</div>

<style>
  :global( .spectrum-Table-body > .spectrum-Table-row:last-of-type ){
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