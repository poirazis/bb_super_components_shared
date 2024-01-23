<script>
  import { createEventDispatcher, getContext } from "svelte";
  import fsm from "svelte-fsm"
  import "./CellCommon.css"

  const { processStringSync } = getContext("sdk")

  export let value
  export let formattedValue
  export let cellOptions

  const dispatch = createEventDispatcher();

  let timer;
  let suggestions = []
  let originalValue

  export let cellState = fsm( cellOptions.initialState ?? "View" , {
    "*": {
      lostFocus() { return "View" },
      goTo( state ) { return state }
    },
    View: { 
      focus () { 
        if (!cellOptions.readonly) return "Editing"
      }
    },
    Hovered: { cancel: () => { return "View" }},
    Focused: { },
    Error: { check : "View" },
    Readonly: { check : "View" },
    Editing: { 
      _enter() { if (cellOptions.readonly) { 
          return "Readonly";
        } else {
          originalValue = value
        }
      },
      submit() { 
        if ( originalValue !== value && !cellOptions.debounce)
          dispatch("change", value);

        dispatch("focusout");

        if ( !cellOptions.lockState ) 
          return "View";
      }, 
      cancel() { value = originalValue; return "View"},
      handleKeyboard(e) {
        if ( e.key == "Enter" )
          this.submit();

        if ( e.key == "Escape" )
          this.cancel();
      }
    }
  })

  $: inEdit = $cellState == "Editing"
  $: formattedValue = cellOptions.template ? processStringSync ( cellOptions.template , { Value : value } ) : undefined

	const debounce = e => {
    value = e.target.value
    if (cellOptions.debounce) {    
      clearTimeout(timer);
      timer = setTimeout(() => {
        dispatch("change", value )
      }, cellOptions.debounce ?? 0 );
    }
	}
  
  const focus = ( node ) => {
    node.focus();
  }

</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div 
  class="superCell"
  class:inEdit
  class:inline={ cellOptions.role == "inline" }  
  class:tableCell={ cellOptions.role == "tableCell" } 
  class:formInput={ cellOptions.role == "formInput" } 
  class:disabled={ cellOptions.disabled }
  class:reeadonly={ $cellState == "Readonly" }
  class:error={ cellOptions.error }
  style:color={ cellOptions.color }
  style:background={ cellOptions.background }
  style:font-weight={ cellOptions.fontWeight }
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
      value={value ?? ""}
      placeholder={ cellOptions.placeholder ?? "Enter..." }
      on:input={debounce}
      on:focusout={cellState.submit}
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
      tabIndex="0"
      on:focusin={cellState.focus}
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
