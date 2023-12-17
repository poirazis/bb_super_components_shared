<script>
  import { createEventDispatcher } from 'svelte'

  export let value = null
  export let formattedValue
  export let cellState
  export let unstyled
  export let placeholder = "Enter..."
  export let debounced
  export let cellOptions

  const dispatch = createEventDispatcher()

  $: inEdit = $cellState == "Editing"

  let timer;
	const debounce = e => {
    value = e.target.value

    if (debounced) {    
      clearTimeout(timer);
      timer = setTimeout(() => {
        dispatch("change", value )
      }, debounced ?? 0 );
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
  class:inEdit={ $cellState == "Editing" }
  class:inline={ cellOptions?.role == "inline" }  
  class:tableCell={ cellOptions?.role == "tableCell" } 
  class:formInput={ cellOptions?.role == "formInput" } 
  style:color={ cellOptions?.color }
  style:background={ cellOptions?.background }
  style:font-weight={ cellOptions?.fontWeight }
  >


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
   {#if cellOptions?.iconFront}
    <i class={cellOptions.iconFront + " frontIcon"}></i>
  {/if}
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