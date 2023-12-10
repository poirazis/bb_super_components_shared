<script>
  /**
   * @typedef {import('../SuperCell.svelte').cellOptions} cellOptions
   */
  import { createEventDispatcher } from "svelte";

  export let value = ""
  export let cellState
  export let formattedValue
  export let placeholder = "Enter ... "
  export let debounced
  export let unstyled = false
  
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
<div 
  class="superCell"
  class:unstyled 
  style:color={cellOptions?.color}
  style:background={cellOptions?.background}
  style:padding={cellOptions?.padding}
  class:inEdit={ cellState == "Editing" }
  style:font-weight={ cellOptions?.fontWeight ? cellOptions?.fontWeight : "400"}
>
  {#if cellState == "Editing" }
    {#if cellOptions?.iconFront}
      <i class={cellOptions.iconFront} style:font-size={"14px"}  style:color={ value ? "var(--primaryColor)" : "var(--spectrum-global-color-gray-500)"  }></i>
    {/if}
    <input
      bind:this={focusable} 
      class="inline-edit"
      {value} 
      style:padding-left={cellOptions.iconFront ? "0.5rem" : "0rem"}
      placeholder={cellOptions?.placeholder}
      on:input={debounce}
      on:blur={() => dispatch("blur")}
      use:focus
    />
    {#if cellOptions.clearValueIcon}
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <i class="ri-close-line" style:font-size={"16px"} on:mousedown|preventDefault={ ()=> dispatch("change", null )}></i>
    {/if}
  {:else}
    <div class="value" 
    style:justify-content={cellOptions.align}> {formattedValue || value || "" } </div>
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
  .inline-edit {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    outline: none;
    background: none;
    color: inherit;
    border: none;
    cursor: pointer;
    overflow: hidden;
    min-width: unset;
  }
  .inline-edit:focus {
    min-width: unset;
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