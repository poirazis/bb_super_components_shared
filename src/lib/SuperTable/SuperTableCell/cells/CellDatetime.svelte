<script>
  import { createEventDispatcher } from 'svelte'
  import { DatePicker } from 'date-picker-svelte'
  import Popover from '../../../../../node_modules/@budibase/bbui/src/Popover/Popover.svelte'

  export let value
  export let cellState
  export let formattedValue
  export let unstyled
  export let cellOptions

  const dispatch = createEventDispatcher()

  let anchor 
  let innerDate
  let visible

  $: inEdit = $cellState == "Editing"
  $: if ( inEdit && anchor ) anchor.focus();
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div 
  bind:this={anchor}
  class="superCell"
  class:unstyled 
  class:inEdit
  tabindex="0"
  style:padding-left={cellOptions?.padding}
  style:padding-right={cellOptions?.padding}
>
  {#if inEdit}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="pickerWrapper" on:click={ () => visible = !visible }>
      { formattedValue || value || "" }
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
    on:close={ () => visible = false }
    >
      <div class="pickerWrapper">
        <DatePicker bind:value={innerDate} visible timePrecision="minute" />
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