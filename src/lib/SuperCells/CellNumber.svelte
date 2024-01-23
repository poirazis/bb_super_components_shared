<script>
  import { createEventDispatcher, getContext} from 'svelte'
  import fsm from "svelte-fsm"

  const { processStringSync } = getContext("sdk")
  const dispatch = createEventDispatcher()

  export let value = 0
  export let formattedValue
  export let cellOptions

  let originalValue
  let cell
  let lockWidth

  $: formattedValue = cellOptions.template ? processStringSync ( cellOptions.template , { Value : value } ) : undefined

  export let cellState = fsm( cellOptions.initialState ?? "View" , {
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
      _enter() { 
        originalValue = value;
      },
      focusout() {
        if ( originalValue !== value && !cellOptions.debounce)
          dispatch("change", value);

        dispatch("focusout");

        if ( !cellOptions.lockState ) 
          return "View";
      },
      cancel() { value = originalValue }
    }
  })

  let timer;
	const debounce = e => {
    value = e.target.value
    if (cellOptions.debounce) {    
      clearTimeout(timer);
      timer = setTimeout(() => {
        dispatch("change", value )
      }, cellOptions.debounce ?? 0 );
    }
	}

  function focus(element) {
    console.log("h")
    element?.focus()
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="superCell"
  class:error={cellOptions.error}
  class:disabled={ cellOptions.disabled }
  class:inEdit={ $cellState == "Editing" }
  class:inline={ cellOptions?.role == "inline" }  
  class:tableCell={ cellOptions?.role == "tableCell" } 
  class:formInput={ cellOptions?.role == "formInput" } 
  style:color={ cellOptions?.color }
  style:background={ cellOptions?.background }
  style:font-weight={ cellOptions?.fontWeight }
  >

  {#if cellOptions?.icon}
    <i class={cellOptions.icon + " frontIcon"}></i>
  {/if}

  {#if $cellState == "Editing" }
    <input 
      class="editor"
      type="text"
      style:padding-left={ cellOptions?.icon ? "32px" : cellOptions?.padding }
      style:padding-right={ cellOptions?.clearValueIcon ? "32px" : cellOptions?.padding }
      style:text-align={"right"}
      placeholder={ cellOptions?.placeholder ?? 0 }
      value={value ?? ""}
      on:input={debounce}
      on:focusout={cellState.focusout}
      use:focus
    />
    {#if cellOptions.clearValueIcon}
      <i 
        class="ri-close-line" 
        class:endIcon={true} 
        on:mousedown|preventDefault={ ()=> dispatch("change", null )}>
      </i>
    {/if}
  {:else}
    <div class="value"
      tabIndex="0"
      on:focusin={cellState.focus}
    > 
      {formattedValue || value || "" } 
    </div>
  {/if}


</div>

<style>
  .value {
    flex: auto;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    box-sizing: border-box;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }
</style>