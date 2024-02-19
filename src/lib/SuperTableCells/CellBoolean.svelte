<script>
  import { createEventDispatcher, getContext } from 'svelte'
  import fsm from "svelte-fsm"
  import "./CellCommon.css"

  export let value
  export let formattedValue
  export let cellOptions

  let originalValue = value

  const dispatch = createEventDispatcher()
  const { processStringSync } = getContext("sdk")

  export let cellState = fsm( cellOptions.initialState ?? "View", {
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
      _enter() { originalValue = value ; dispatch("enteredit"); },
      _exit() { dispatch("exitedit") },
      change( e ) { 
        if (cellOptions.debounce) dispatch("change", value ) ;
      },
      submit() { 
        if ( value !== originalValue ) {
          dispatch("change", value);
        }
        dispatch("focusout");
        return "View" 
      }, 
      cancel() { value = originalValue; return "View" },
    }
  })

  $: formattedValue = cellOptions.template ? processStringSync ( cellOptions.template , { Value : value } ) : undefined

  const focus = (node) => {
    node.focus();
  }
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
  style:background={ $cellState == "Editing" && cellOptions.role != "inline" ? "var(--spectrum-global-color-gray-50)" : cellOptions.background }
  style:font-weight={ cellOptions.fontWeight }
  style:padding-top={"unset"}
  style:padding-bottom={"unset"}
  >
    {#if cellOptions.icon}
      <i class={cellOptions.icon + " frontIcon"}></i>
    {/if}

    {#if $cellState == "Editing"}
      <div 
      class="editor"
      style:padding-left={ cellOptions.icon ? "32px" : cellOptions.padding }
      style:padding-right={ cellOptions.clearValueIcon ? "32px" : cellOptions.padding }
      style:justify-content={ cellOptions.align ?? "center" }
      > 
        <div class="spectrum-Switch spectrum-Switch--emphasized" style:--spectrum-switch-height={"22px"} style:margin={0}>
          <input
            class="spectrum-Switch-input"
            bind:checked={value}
            type="checkbox"
            disabled = {cellOptions.disabled || cellOptions.readonly }
            on:focusout={cellState.submit}
            on:change={cellState.change}
            use:focus
          />
          <span class="spectrum-Switch-switch"  />
        </div>
      </div>
      {#if cellOptions.clearValueIcon}  
        <i 
          class="ri-close-line endIcon"
          on:mousedown|preventDefault={ ()=> dispatch("change", null )}>
        </i>
      {/if}
    {:else}
      <div class="value"
        tabIndex="0"
        on:focusin={cellState.focus}
        style:justify-content={ cellOptions.align ?? "center" }
        style:padding-left={ cellOptions.icon ? "32px" : cellOptions.padding }> 
        {#if formattedValue}
          {formattedValue}
        {:else if value}
          <i class="ri-check-line icon"></i>
        {:else if cellOptions.showFalse}
          <i class="ri-close-line icon"></i>
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