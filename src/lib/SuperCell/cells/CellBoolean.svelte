<script>
  import { createEventDispatcher } from 'svelte'
  import fsm from "svelte-fsm"

  export let value
  export let formattedValue
  export let cellOptions

  const dispatch = createEventDispatcher()

  export let cellState = fsm( "View" , {
    "*": {
      goTo( state ) { return state }
    },
    View: { 
      focus () { 
        if (!cellOptions.readonly) return "Editing"
      }
    },
    Hovered: { cancel: () => { return "View" }},
    Focused: { 
      unfocus() { return "View" },
    },
    Error: { check : "View" },
    Editing: { 
      unfocus() { return "View" },
      lostFocus() { return "View" },
      submit() { if ( value != originalValue ) acceptChange() ; return "View" }, 
      cancel() { value = Array.isArray(originalValue) ? [ ... originalValue ] : originalValue ; return "View" },
    }
  })

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
  $: console.log(cellOptions)
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div 
  class="superCell"
  class:inEdit={ $cellState == "Editing" }
  class:inline={ cellOptions.role == "inline" }  
  class:tableCell={ cellOptions.role == "tableCell" } 
  class:formInput={ cellOptions.role == "formInput" } 
  class:disabled = { cellOptions.disabled }
  style:color={ cellOptions.color }
  style:background={ cellOptions.background }
  style:font-weight={ cellOptions.fontWeight }
  style:max-height={"2rem"}
  >
    {#if cellOptions.icon}
      <i class={cellOptions.icon + " frontIcon"}></i>
    {/if}

    {#if $cellState == "Editing" || cellOptions.role == "formInput"}
      <div class="editor" 
      style:padding-left={ cellOptions.icon ? "32px" : cellOptions.padding }
      style:padding-right={ cellOptions.icon ? "32px" : cellOptions.padding }
      style:justify-content={ cellOptions.align ?? "center" }
      > 
        <div class="spectrum-Switch spectrum-Switch--emphasized " style="margin: 0;">
          <input
            bind:this={anchor}
            checked={value}
            on:change={ (e) => dispatch("change", !value) }
            type="checkbox"
            disabled = {cellOptions.disabled || cellOptions.readonly }
            class="spectrum-Switch-input"
            on:blur={() => dispatch("blur")}
          />
          <span class="spectrum-Switch-switch" />
        </div>
      </div>
    {:else}
      <div class="value"
        style:justify-content={ cellOptions.align ?? "center" }
        style:padding-left={ cellOptions.icon ? "32px" : cellOptions.padding }> 
        {#if formattedValue}
          {formattedValue}
        {:else if value}
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