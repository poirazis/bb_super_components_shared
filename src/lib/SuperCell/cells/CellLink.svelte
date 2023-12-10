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
  export let unstyled
  export let cellOptions

  export let editorState=fsm("Closed", {
    Open: { toggle: "Closed" },
    Closed: { toggle: "Open" },
  });

  let anchor;
  let valueAnchor
  let overflow

  $: inEdit = $cellState == "Editing"
  $: if ( inEdit ) anchor.focus()
  $: if ( value == "" || value == undefined ) value = []

  const unselectRow = ( val ) => {
    if ( value ) {
      value.splice( value.findIndex ( (e) => e._id === val._id  ), 1 );
      value = value
    }
  }

  function openPicker(e) {
    e.stopPropagation();
    editorState.toggle();
  }

  const handleKeyboard = ( e ) => {
    if ( e.keyCode == 32 && $cellState == "Editing") {
      e.preventDefault();
      e.stopPropagation();
      editorState.toggle();
    }
  }
  beforeUpdate ( () => { 
    overflow = valueAnchor ? valueAnchor.clientWidth != valueAnchor.scrollWidth : undefined
  } )

  const updateValue = ( newValue ) => {
    value = newValue
    dispatch("change", value)
    if ( fieldSchema.relationshipType == "one-to-many" ) editorState.toggle();   
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div 
  bind:this={anchor} 
  class="superCell"
  class:inEdit
  class:unstyled
  class:focused={$cellState == "Focused"}
  style:padding-left={cellOptions?.padding}
  style:padding-right={cellOptions?.padding}
  style:width={$cellState == "Editing" ? cellOptions.width : null } 
  tabindex="0"
  on:blur={() => { if (! anchor.matches(":focus-within")) cellState.lostFocus ()  } } 
  on:keydown={handleKeyboard} 
>
  <div bind:this={valueAnchor} class="inline-value">
    {#if value?.length < 1 && inEdit}
        <span class="placeholder">{ placeholder || "Select " + fieldSchema.name } </span>
    {:else if value?.length > 0}
      {#each value as val}
        <div class="item">
          <i class="ri-links-line" />
          <span> {val.primaryDisplay} </span>
        </div>
      {/each}
    {/if}
  </div>

  {#if inEdit}
    <i class="ri-add-line" style="font-size: 20px;" on:click={(e) => openPicker(e)}/>
  {/if}

  {#if overflow }
    <div class="overflow" style:background-color={ fadeToColor } >
      {#if inEdit}
        <i class="ri-add-line" style="font-size: 20px;" on:click={(e) => openPicker(e)} />
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
  open={ $editorState == "Open" } 
  on:close={ editorState.toggle }
  >
  <CellLinkPicker {value} schema={fieldSchema} tableId={fieldSchema.tableId} on:change={ (e) => { updateValue (e.detail)} } />
</Popover>

<style>
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
  .inline-value {
    position: relative;
    flex: 1 1 auto;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    column-gap: 0.5rem;
    z-index: 1;
    overflow: hidden;
  }
  .item {
    height: 1.45rem;
    display: flex;
    align-items: center;
    border-radius: 4px;
    background-color: var(--spectrum-global-color-gray-300);
    color: var(--spectrum-global-color-gray-800);
    padding-left: 0.5rem;
    padding-right: 0.5rem;
    white-space: nowrap;
    gap: 0.5rem;
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