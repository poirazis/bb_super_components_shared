<script>
  import { createEventDispatcher } from 'svelte'
  import { DateInput, DatePicker } from 'date-picker-svelte'
  import Popover from '../../../../../node_modules/@budibase/bbui/src/Popover/Popover.svelte'

  export let value
  export let cellState
  export let formattedValue
  export let unstyled
  export let cellOptions

  const dispatch = createEventDispatcher()

  let anchor 
  let visible
  let innerDate = value

  $: inEdit = $cellState == "Editing"
  $: handleSelection(innerDate)

  const handleSelection = ( selection ) => {
    if ( value != selection ){
      visible = false
      dispatch("change", selection )
    }
  }

  $: console.log($cellState)
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div 
  class="superCell"
  class:unstyled 
  class:inEdit
  style:padding-left={cellOptions?.padding}
  style:padding-right={cellOptions?.padding}
  bind:this={anchor} 
  tabindex="0"
  on:focus={cellState.focus()}
  on:blur={ () => !anchor.matches(":focus-within" ? cellState.lostFocus() : null )}
>
  {#if inEdit}
    <div class="pickerWrapper" on:click|preventDefault={ () => visible = visible ? false : true }>
      <DateInput bind:innerDate />
    </div>
  {:else}
    <div class="inline-value"> 
      { formattedValue || value || "" }
    </div>
  {/if}

  <Popover
    {anchor}
    dismissible
    open={visible}
    on:close={ () => { visible = false; dispatch("blur") }  }
    >
      <div class="pickerWrapper">
        <DatePicker bind:value={innerDate} visible browseWithoutSelecting timePrecision="minute" />
      </div>
  </Popover>
</div>

<style>
 .pickerWrapper {
    flex: auto;
    display: flex;
    align-items: center; 
    --date-picker-background: var(--spectrum-alias-background-color-default);
    --date-picker-foreground: var(--spectrum-global-color-gray-800);
    --date-picker-selected-background: var(--accent-color);
  }
  .inline-value { 
    flex-grow: 1;
    display: flex;
    white-space: nowrap;
    justify-content: var(--super-column-alignment);
    align-items: center;
  }

</style>