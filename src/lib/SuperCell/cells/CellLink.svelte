<script>
  import Popover from "../../../../node_modules/@budibase/bbui/src/Popover/Popover.svelte"
  import { createEventDispatcher } from "svelte";
  import CellLinkPicker from "./CellLinkPicker.svelte";

  const dispatch = createEventDispatcher();

  export let value = []
  export let cellState
  export let fieldSchema;
  export let cellOptions

  let anchor;
  let picker

  $: inEdit = $cellState == "Editing"
  $: if ( value == "" || value == undefined ) value = []
  $: if ( inEdit && anchor && !picker) anchor?.focus() 

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
  on:focus={cellState.focus}
  on:blur
  on:keydown={handleKeyboard}
>
  {#if cellOptions?.iconFront}
    <i class={cellOptions.iconFront + " frontIcon"}></i>
  {/if}
  <div class="value" class:placeholder={value?.length < 1} style:padding-left={ cellOptions?.iconFront ? "32px" : cellOptions?.padding }>
    {#if value?.length < 1}
      { cellOptions?.placeholder || "Select " + fieldSchema.name }
    {:else if value?.length > 0}
      {#each value as val}
        <div class="item" >
          <i class={ fieldSchema.type == "link" ? "ri-links-line" : "ri-user-fill" } />
         <span>{val.primaryDisplay}</span>
        </div>
      {/each}
    {/if}

    {#if inEdit}
      <i class="ri-add-line" style="font-size: 20px;" on:click|stopPropagation={(e) => picker = !picker}/>
    {/if}
  </div>
</div>

<Popover 
{anchor} 
  dismissible
  align={"left"} 
  open={ picker } 
  on:close={ () => { picker = false;} }
  >
  <CellLinkPicker 
    {value} 
    schema={fieldSchema} 
    tableId={fieldSchema.tableId} 
    datasourceType={fieldSchema.tableId ? "table" : "user" }
    on:change={ (e) => { updateValue (e.detail)} } 
  />
</Popover>

<style>
  .value {
    flex: auto;
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    align-items: center;
  }
</style>