<script>
  import { createEventDispatcher, getContext} from 'svelte'
  import fsm from "svelte-fsm"


  const { processStringSync } = getContext("sdk")


  export let value
  export let formattedValue
  export let cellOptions


  $: formattedValue = cellOptions.template ? processStringSync ( cellOptions.template , { Value : value } ) : undefined

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

  const dispatch = createEventDispatcher()

  let timer;
	const debounce = e => {
    value = e.target.value

    if (cellOptions.debounce) {    
      clearTimeout(timer);
      timer = setTimeout(() => {
        dispatch("change", value )
      }, cellOptions.debounce  ?? 0 );
    }
    else {
     dispatch("change", value )
    }
	}

  function focus(element) {
    element.focus()
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="superCell"
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
      type="text" inputmode="numeric" pattern="[0-9]*"
      style:padding-left={ cellOptions?.iconFront ? "32px" : cellOptions?.padding }
      style:padding-right={ cellOptions?.clearValueIcon ? "32px" : cellOptions?.padding }
      style:text-align="right"
      placeholder={ cellOptions?.placeholder ? cellOptions.placeholder : 0 }
      {value} 
      on:input={debounce}
      on:blur={() => dispatch("blur")}
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
   <div class="value"> {formattedValue || value || "" } </div>
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