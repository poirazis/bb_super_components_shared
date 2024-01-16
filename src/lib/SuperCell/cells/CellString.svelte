<script>
  /**
   * @typedef {import('../SuperCell.svelte').cellOptions} cellOptions
   */
  import { createEventDispatcher, getContext } from "svelte";
  import fsm from "svelte-fsm"
  import "./CellCommon.css"

  const { processStringSync } = getContext("sdk")

  export let value = null
  export let formattedValue
  
  /** @type {cellOptions} */
  export let cellOptions

  const dispatch = createEventDispatcher();
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
      unfocus() { return "View" },
      lostFocus() { return "View" },
      submit() { if ( value != originalValue ) acceptChange() ; return "View" }, 
      cancel() { value = Array.isArray(originalValue) ? [ ... originalValue ] : originalValue ; return "View" },
    }
  })

  let timer;

  $: inEdit = $cellState == "Editing"

	const debounce = e => {
    value = e.target.value
    if (cellOptions.debounce) {    
      clearTimeout(timer);
      timer = setTimeout(() => {
        dispatch("change", value )
      }, cellOptions.debounce ?? 0 );
    }
    else {
     dispatch("change", value )
    }
	}
  
  const focus = ( node ) => {
    node.focus();
  }

  $: formattedValue = cellOptions.template ? processStringSync ( cellOptions.template , { Value : value } ) : undefined
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div 
  class="superCell"
  tabindex="0"
  class:inEdit
  class:inline={ cellOptions.role == "inline" }  
  class:tableCell={ cellOptions.role == "tableCell" } 
  class:formInput={ cellOptions.role == "formInput" } 
  class:disabled={ cellOptions.disabled }
  class:error={ cellOptions.error }
  style:color={ cellOptions.color }
  style:background={ cellOptions.background }
  style:font-weight={ cellOptions.fontWeight }
  on:focus={cellState.focus}
> 

  {#if cellOptions.icon}
    <i class={cellOptions.icon + " frontIcon"}></i>
  {/if}

  {#if inEdit}
    <input
      class="editor"
      class:placeholder={!value}
      style:padding-left={ cellOptions.icon ? "32px" : cellOptions.padding }
      style:padding-right={ cellOptions.clearValueIcon ? "32px" : cellOptions.padding }
      value={ value ?? "" }
      placeholder={ cellOptions.placeholder ?? "Enter..." }
      on:input={debounce}
      on:blur={() => dispatch("blur")}
      use:focus
    />
    {#if cellOptions.clearValueIcon}  
      <i 
        class="ri-close-line endIcon"
        on:mousedown|preventDefault={ ()=> dispatch("change", null )}>
      </i>
    {/if}
  {:else}
    <div 
      class="value"
      class:placeholder={!value}
      style:padding-left={ cellOptions.icon ? "32px" : cellOptions.padding }
      style:justify-content={cellOptions.align}
      > 
        <span>
          { formattedValue || value || cellOptions?.placeholder || "" } 
        </span>
    </div>
  {/if}

</div>