<script>
  import { getContext } from "svelte";
  import SuperColumnRow from "./SuperColumnRow.svelte";

  const stbSelected = getContext("stbSelected");
  const stbScrollPos = getContext("stbScrollPos");
  const stbVerticalScroll = getContext("stbVerticalScroll")
  const stbHovered = getContext("stbHovered");

  export let rows = []
  export let columnState
  export let columnOptions

  // for output
  export let rowHeights
  let id = Math.random();
  let hovered

  let columnBodyAnchor

  $: synchScrollPosition($stbScrollPos)

  const synchScrollPosition = ( position ) => { 
    if (columnBodyAnchor) 
      columnBodyAnchor.scrollTop = position 
  }

  const syncScroll = e => {
    if ( $stbScrollPos != columnBodyAnchor.scrollTop ) { 
      $stbScrollPos = columnBodyAnchor.scrollTop;
      $stbVerticalScroll = columnBodyAnchor.scrollTop / columnBodyAnchor.scrollTopMax
    }
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  bind:this={columnBodyAnchor}
  class="spectrum-Table-body"
  tabindex="-1"
  id={id}
  style:background-color={columnOptions.background}
  class:filtered={$columnState == "Filtered"}
  on:scroll={ syncScroll }
  on:mouseenter={ () => hovered = true }
  on:mouseleave={ () => hovered = false }
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