<script>
  import Popover from "../../../../node_modules/@budibase/bbui/src/Popover/Popover.svelte"
  import fsm from "svelte-fsm";
  import { createEventDispatcher, beforeUpdate } from "svelte";
  import CellLinkPicker from "./CellLinkPicker.svelte";
  const dispatch = createEventDispatcher();

  export let value = []
  export let cellState
  export let fieldSchema;
  export let isHovered;
  export let placeholder 
  export let fadeToColor = "var(--spectrum-global-color-gray-50)"
  export let cellOptions

  let anchor;
  let overflow
  let picker

  $: inEdit = $cellState == "Editing"
  $: if ( value == "" || value == undefined ) value = []

  const unselectRow = ( val ) => {
    if ( value ) {
      value.splice( value.findIndex ( (e) => e._id === val._id  ), 1 );
      value = value
    }
  }

  const handleKeyboard = ( e ) => {
    if ( e.keyCode == 32 && $cellState == "Editing") {
      e.preventDefault();
      e.stopPropagation();
      picker = !picker
    }
  }
  beforeUpdate ( () => { 
    overflow = anchor ? anchor.clientWidth != anchor.scrollWidth : undefined
  } )

  const updateValue = ( newValue ) => {
    value = newValue
    dispatch("change", value)
    if ( fieldSchema.relationshipType == "one-to-many" ) editorState.toggle();   
  }

  const handleBlur = (event) => {
    // if the blur was because of outside focus
    // currentTarget is the parent element, relatedTarget is the clicked element
    if (!event.currentTarget.contains(event.relatedTarget)) {
      dispatch("blur")
    }
}
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div 
  bind:this={anchor} 
  tabindex="0"
  class="superCell"
  class:inEdit
  class:inline={ cellOptions?.role == "inline" }  
  class:tableCell={ cellOptions?.role == "tableCell" } 
  class:formInput={ cellOptions?.role == "formInput" } 
  style:color={ cellOptions?.color }
  style:background={ cellOptions?.background }
  style:font-weight={ cellOptions?.fontWeight }
  on:blur={handleBlur}
  on:keydown={handleKeyboard} 
>
  <div class="value">
    {#if value?.length < 1 && inEdit}
        <span class="placeholder">{ placeholder || "Select " + fieldSchema.name } </span>
    {:else if value?.length > 0}
      {#each value as val}
        <div class="item">
          <i class="ri-links-line" />
         <span>{val.primaryDisplay}</span>
        </div>
      {/each}
    {/if}

    {#if inEdit}
      <i class="ri-add-line" style="font-size: 20px;" on:click|stopPropagation={(e) => picker = !picker}/>
    {/if}
  </div>

  {#if overflow }
    <div class="overflow" style:background-color={ fadeToColor } >
      {#if inEdit}
        <i class="ri-add-line" style="font-size: 20px;" on:click|stopPropagation={(e) => picker = !picker}/>
      {:else if isHovered}
        <div class="circle"> { value?.length } </div>
      {/if}
    </div>
  {/if}
</div>

<Popover 
  {anchor} 
  dismissible
  align={"left"} 
  open={ picker } 
  on:close={ () => { picker = false;} }
  >
  <CellLinkPicker {value} schema={fieldSchema} tableId={fieldSchema.tableId} on:change={ (e) => { updateValue (e.detail)} } />
</Popover>

<style>

  .value {
    flex: auto;
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    align-items: center;
  }
  .circle {
    width: 22px;
    height: 22px;
    font-size: 15px;
    font-weight: bold;
    display: flex;
    align-items: center;
    align-self: center;
    justify-content: center;
    border-radius: 50%;
    color: var(--spectrum-global-color-gray-600);
    z-index: 3;
  }

  .overflow {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    width: 3rem;
    height: 1.5rem;
    top: 7px;
    right: var(--super-table-cell-padding);
    mask-image: linear-gradient(to right, transparent 0%, black 65% );
    mask-mode: alpha;
    z-index: 1;
    transition: all 130ms;
  }
</style>