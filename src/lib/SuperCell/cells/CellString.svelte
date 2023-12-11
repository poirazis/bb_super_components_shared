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

  let focusable

  const dispatch = createEventDispatcher();

  let timer;
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
  class:inEdit={ $cellState == "Editing" }
  class:inline={ cellOptions?.role == "inline" }  
  class:tableCell={ cellOptions?.role == "tableCell" } 
  class:formInput={ cellOptions?.role == "formInput" } 
  style:color={ cellOptions?.color }
  style:background={ cellOptions?.background }
  style:font-weight={ cellOptions?.fontWeight }
> 
  {#if $cellState == "Editing" }
    {#if cellOptions?.iconFront}
      <i class={cellOptions.iconFront} style:font-size={"14px"}  style:color={ value ? "var(--primaryColor)" : "var(--spectrum-global-color-gray-500)"  }></i>
    {/if}
    <input
      bind:this={focusable} 
      class="editor"
      {value}
      placeholder={ cellOptions?.placeholder ? cellOptions.placeholder : "Enter..." }
      on:input={debounce}
      on:blur={() => dispatch("blur")}
      use:focus
    />
    {#if cellOptions.clearValueIcon}  
      <i class="ri-close-line" style:font-size={"16px"} on:mousedown|preventDefault={ ()=> dispatch("change", null )}></i>
    {/if}
  {:else}
    <div 
      class="value"
      style:padding={cellOptions?.padding} 
      style:justify-content={cellOptions.align}
      > 
      { formattedValue || value || ""  } 
    </div>
  {/if}
</div>

<style>
  .value {
    flex: auto;
    display: flex;
    align-items: center;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    font-size: var(--super-table-base-font-size);
  }
  .inline-edit::placeholder {
    font-style: italic;
    font-size: 12px;
    color: var(--spectrum-global-color-gray-500);
  }
  .inline-edit:focus::placeholder {
    font-style: italic;
    color: var(--spectrum-global-color-blue-500);
  }
</style>