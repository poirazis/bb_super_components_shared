<script>
  import { DateInput } from 'date-picker-svelte'

  export let value
  export let cellState
  export let formattedValue
  export let unstyled
  export let cellOptions

  let anchor 
  let innerDate

  $: inEdit = $cellState == "Editing"
  $: checkValue(value)

  const checkValue = ( val ) => {
    if ( typeof val === "string" )
      innerDate = Date.parse(value)
    else 
      innerDate = value ? value : Date.parse(cellOptions.defaultValue)
  }
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
  style:--date-picker-background="var(--spectrum-alias-background-color-default)"
  style:--date-picker-foreground="var(--spectrum-global-color-gray-800)"
  style:--date-picker-selected-background="var(--accent-color)"
  bind:this={anchor} 
  tabindex="0"
  on:focus={ cellState.focus() }
  on:blur={ () => !anchor.matches(":focus-within" ? cellState.lostFocus() : null )}
>
  {#if inEdit}
    <DateInput 
      bind:innerDate 
      closeOnSelection 
      placeholder={cellOptions.placeholder}
      on:select={ (e) => value = e.detail }
    />
  {:else}
    <div class="inline-value"> 
      { formattedValue || value || cellOptions.placeholder }
    </div>
  {/if}

</div>

<style>
  .inline-value { 
    flex-grow: 1;
    display: flex;
    white-space: nowrap;
    justify-content: var(--super-column-alignment);
    align-items: center;
  }
</style>