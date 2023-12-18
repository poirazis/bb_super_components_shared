<script>
  /**
   * @typedef {import('../SuperCell.svelte').cellOptions} cellOptions
   */
  import { createEventDispatcher } from "svelte";

  export let value = null
  export let cellState
  export let formattedValue
  
  /** @type {cellOptions} */
  export let cellOptions

  const dispatch = createEventDispatcher();

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

  export let focus = ( node ) =>  node ? node.focus() : focusable?.focus()

</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div 
  class="superCell"
  class:inEdit
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

  {#if inEdit}
    <input
      class="editor"
      class:placeholder={!value}
      style:padding-left={ cellOptions?.iconFront ? "32px" : cellOptions?.padding }
      style:padding-right={ cellOptions?.clearValueIcon ? "32px" : cellOptions?.padding }
      value={ value ?? "" }
      placeholder={ cellOptions?.placeholder ?? "Enter..." }
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
    <div 
      class="value"
      class:placeholder={!value}
      style:padding-left={ cellOptions?.iconFront ? "32px" : cellOptions?.padding }
      style:justify-content={cellOptions.align}
      > 
      { formattedValue || value || cellOptions?.placeholder || "" } 
    </div>
  {/if}

</div>