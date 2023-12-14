<script>
  import { createEventDispatcher } from 'svelte';
  import Popover from "../../../../node_modules/@budibase/bbui/src/Popover/Popover.svelte"
  import { DatePicker } from 'date-picker-svelte'

  export let value
  export let cellState
  export let formattedValue
  export let cellOptions

  const dispatch = new createEventDispatcher();

  let anchor
  let innerDate = value ? new Date(value) : null

  $: inEdit = $cellState == "Editing"

  const handleBlur = (event) => {
    // if the blur was because of outside focus
    // currentTarget is the parent element, relatedTarget is the clicked element
    if (!event.currentTarget.contains(event.relatedTarget)) {
      dispatch("blur")
    }
}

</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div 
  bind:this={anchor} 
  tabindex="0"
  class="superCell"
  class:inEdit
  class:inline={ cellOptions?.role == "inline" }  
  class:tableCell={ cellOptions?.role == "tableCell" } 
  class:formInput={ cellOptions?.role == "formInput" } 
  style:color={ cellOptions?.color }
  style:background={ cellOptions?.background }
  style:font-weight={ cellOptions?.fontWeight }
  on:blur={handleBlur}
>
  {#if inEdit }
    <div class="editor">
      {value}
    </div>
    <Popover
      {anchor} 
      dismissible
      align="left"
      open
      on:close={() => dispatch("blur")}
      >
      <div
        style:--date-picker-background="var(--spectrum-alias-background-color-default)"
        style:--date-picker-foreground="var(--spectrum-global-color-gray-800)"
        style:--date-picker-selected-background="var(--accent-color)"
      >
        <DatePicker 
          bind:value={innerDate}
          browseWithoutSelecting
          on:select={ (e) => { value = e.detail; dispatch("change", value ); cellState.goTo("View") }} />
      </div>
    </Popover>
  {:else}
    <div class="value" class:placeholder={!value}> 
      { formattedValue || value || cellOptions?.placeholder || "" }
    </div>
  {/if}

</div>

<style>
  .value { 
    flex: auto;
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