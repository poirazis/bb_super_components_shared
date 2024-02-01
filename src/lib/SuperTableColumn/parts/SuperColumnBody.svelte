<script>
  import { getContext } from "svelte";
  import SuperColumnRow from "./SuperColumnRow.svelte";

  const stbSelected = getContext("stbSelected");
  const stbScrollPos = getContext("stbScrollPos");
  const stbVerticalScroll = getContext("stbVerticalScroll")
  const stbHovered = getContext("stbHovered");
  const stbEditing = getContext("stbEditing");

  export let rows = []
  export let rowHeights
  export let rowColors
  export let columnState
  export let columnOptions

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
  style:background-color={columnOptions.background}
  class:filtered={$columnState == "Filtered"}
  class:is-editing={ $columnState == "EditingCell" && (columnOptions.highlighters == "vertical" || columnOptions.highlighters == "both" )}
  on:scroll|self={ syncScroll }
  on:mouseenter={ () => hovered = true }
  on:mouseleave={ () => hovered = false }
  >
  {#if rowHeights?.length}
      {#each rows as row, index}
        <SuperColumnRow
          {row} 
          odd={columnOptions.zebraColors && ( index % 2 == 1) }
          {columnOptions}
          height={rowHeights[index]}
          bgColor={rowColors[index]?.bgcolor}
          color={rowColors[index]?.color}
          isHovered={ $stbHovered == index}
          isEditing={ $stbEditing == index  && (columnOptions.highlighters == "horizontal" || columnOptions.highlighters == "both" )}
          isSelected={ $stbSelected.includes(row.rowID) }
          on:resize={ ( e ) => rowHeights[index] = e.detail }
          on:hovered={ () => ($stbHovered = index)}
          on:rowClicked
          on:rowDblClicked
          on:cellChanged
          on:enteredit = {() => columnState.enteredit(index)}
          on:exitedit = {columnState.exitedit}
        >
          <slot />
        </SuperColumnRow>
      {/each}
    {/if}
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
  .is-editing {
    background-color: var(--spectrum-global-color-gray-75);
  }
  .spectrum-Table-body::-webkit-scrollbar {
    display: none;
  }
</style>