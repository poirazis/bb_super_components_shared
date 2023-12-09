<script>
  import { createEventDispatcher } from 'svelte'
  import { DateInput } from 'date-picker-svelte'
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
    <div class="pickerWrapper" on:mousedown|preventDefault|stopPropagation={ () => visible = !visible }>
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
    customHeight={"400px"}
    open={visible}
    on:close={ () => visible = false }
    >
      <DateInput bind:value={innerDate} visible />
  </Popover>
</div>

<style>
  .pickerWrapper {
    flex: auto;
    display: flex;
    align-items: center;
  }
  .inline-value { 
    flex-grow: 1;
    display: flex;
    white-space: nowrap;
    justify-content: var(--super-column-alignment);
    align-items: center;
  }

</style>