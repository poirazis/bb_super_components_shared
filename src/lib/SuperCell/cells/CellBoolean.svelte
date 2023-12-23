<script>
  import { createEventDispatcher } from 'svelte'

  export let value
  export let formattedValue
  export let cellState
  export let fieldSchema
  export let cellOptions

  const dispatch = createEventDispatcher()

  const handleKeyboard = ( e ) => {
    if ( e.keyCode == 32 ) {
      e.stopPropagation();
      e.preventDefault();
      value = !value
    }
  }

  let anchor

  $: inEdit = $cellState == "Editing"
  $: if ( inEdit && anchor ) anchor?.focus() 
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div 
  class="superCell"
  class:inEdit={ $cellState == "Editing" }
  class:inline={ cellOptions?.role == "inline" }  
  class:tableCell={ cellOptions?.role == "tableCell" } 
  class:formInput={ cellOptions?.role == "formInput" } 
  style:color={ cellOptions?.color }
  style:background={ cellOptions?.background }
  style:font-weight={ cellOptions?.fontWeight }
  >
    {#if cellOptions?.iconFront}
      <i class={cellOptions.iconFront + " frontIcon"}></i>
    {/if}

    {#if $cellState == "Editing" || cellOptions?.role == "formInput"}
      <div class="editor" 
      style:padding-left={ cellOptions?.iconFront ? "32px" : cellOptions?.padding }
      style:padding-right={ cellOptions?.iconFront ? "32px" : cellOptions?.padding }
      style:justify-content={ cellOptions.align ?? "center" }
      > 
        <div class="spectrum-Switch spectrum-Switch--emphasized" style="margin: 0;">
          <input
            bind:this={anchor}
            checked={value}
            on:change={(e) => dispatch("change", !value)}
            type="checkbox"
            class="spectrum-Switch-input"
            on:blur={() => dispatch("blur")}
          />
          <span class="spectrum-Switch-switch" />
        </div>
      </div>
    {:else}
      <div class="value"
        style:justify-content={ cellOptions.align ?? "center" }
        style:padding-left={ cellOptions?.iconFront ? "32px" : cellOptions?.padding }> 
        {#if value}
          <i class="ri-check-line icon"></i>
        {/if}
      </div>
    {/if}
</div>

<style>
  .icon {
    font-size: 20px;
    color: var(--spectrum-global-color-green-400);
  }
</style>