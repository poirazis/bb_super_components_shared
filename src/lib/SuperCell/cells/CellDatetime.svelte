<script>
  import { createEventDispatcher } from 'svelte';
  import Popover from "../../../../node_modules/@budibase/bbui/src/Popover/Popover.svelte"
  import { DatePicker } from 'date-picker-svelte'

  export let value
  export let cellState
  export let formattedValue
  export let unstyled
  export let cellOptions

  const dispatch = new createEventDispatcher();

  let anchor , input
  let innerDate = value ? new Date(value) : null
  let visible

  $: inEdit = $cellState == "Editing"

  const focus = ( node ) => {
    node.focus()
  }

  const handleInputBlur = ( e ) => {
    if (!visible) {
      cellState.lostFocus();
      console.log("LostFocus")
    }
  }
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div 
  bind:this={anchor} 
  class="superCell"
  tabindex="0"
  class:unstyled 
  class:inEdit
  style:padding-left={cellOptions?.padding ?? "0.5rem"}
  style:padding-right={cellOptions?.padding ?? "0.5rem"}
  on:blur={() => { setTimeout( () => {
    if (!anchor.matches(":focus-within")) cellState.lostFocus()
  }, 50) } }
>
  {$cellState}
  {#if inEdit}
    {value}
  {:else}
    <div class="inline-value" class:placeholder={!value}> 
      { formattedValue || value || cellOptions.placeholder }
    </div>
  {/if}

  <Popover
    {anchor} 
    dismissible
    align="left"
    open={$cellState == "Editing"}
    on:close={cellState.lostFocus}
    >
    <div
      style:--date-picker-background="var(--spectrum-alias-background-color-default)"
      style:--date-picker-foreground="var(--spectrum-global-color-gray-800)"
      style:--date-picker-selected-background="var(--accent-color)"
    >
      <DatePicker 
        bind:value={innerDate}
        browseWithoutSelecting
        on:select={ (e) => { value = e.detail  }} />
    </div>
  </Popover>

</div>


<style>
  .superCell.unstyled.inEdit {
    border: 1px solid lime;
    padding: unset;
  }
  .inline-value { 
    flex-grow: 1;
    display: flex;
    white-space: nowrap;
    justify-content: var(--super-column-alignment);
    align-items: center;
  }

  .placeholder {
    font-style: italic;
    color: var(--spectrum-global-color-gray-700);
  }
</style>