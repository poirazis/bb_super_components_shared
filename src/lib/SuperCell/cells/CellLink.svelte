<script>
  import Popover from "../../../../node_modules/@budibase/bbui/src/Popover/Popover.svelte"
  import { createEventDispatcher } from "svelte";
	import CellLinkPicker from "./CellLinkPicker.svelte";

  const dispatch = createEventDispatcher();

  export let value = []
  export let cellState
  export let fieldSchema;
  export let cellOptions
  export let simpleView = true

  let anchor;
  let open
  let picker

  $: inEdit = $cellState == "Editing"
  $: if ( value == "" || value == undefined ) value = []
  $: if ( inEdit && anchor && !open) anchor?.focus() 
  $: simpleView = cellOptions.relViewMode == "text"

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
      open = !open
    }
  }

  const updateValue = ( newValue ) => {
    value = newValue
    dispatch("change", value)
    if ( fieldSchema.relationshipType == "one-to-many" ) open = false;   
  }

  const handleBlur = (event) => {
    if (!picker?.contains(event.relatedTarget)) {
      open = false
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
  on:focusin={cellState.focus}
  on:blur={handleBlur}
  on:keydown={handleKeyboard}
>
  {#if cellOptions?.iconFront}
    <i class={cellOptions.iconFront + " frontIcon"}></i>
  {/if}

  {#if inEdit}
    <div 
      class="editor" class:placeholder={value?.length < 1} 
      style:padding-left={ cellOptions?.iconFront ? "32px" : cellOptions?.padding }
      on:click={(e) => open = !open}
    >
      <div class="items" class:simpleView >
        {#if value?.length < 1}
          { cellOptions?.placeholder || "Select " + fieldSchema.name }
        {:else if value?.length > 0}
          {#each value as val}
            <div class="item">
              {#if !simpleView}
                <i class={ fieldSchema.type == "link" ? "ri-links-line" : "ri-user-fill" } />
              {/if}
              <span>{val.primaryDisplay}</span>
            </div>
          {/each}
        {/if}
      </div>
        <i class="ri-add-line"></i>
    </div>
  {:else}
    <div class="value" class:placeholder={value?.length < 1} style:padding-left={ cellOptions?.iconFront ? "32px" : cellOptions?.padding }>
      <div class="items" class:simpleView >
        {#if value?.length < 1}
          { cellOptions?.placeholder || "Select " + fieldSchema.name }
        {:else if value?.length > 0}
          {#each value as val}
            <div class="item" >
              {#if !simpleView}
                <i class={ fieldSchema.type == "link" ? "ri-links-line" : "ri-user-fill" } />
              {/if}              
              <span>{val.primaryDisplay}</span>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}

</div>

{#if inEdit}
  <Popover 
    {anchor} 
    align="left"
    dismissible
    open={ open }
    on:close={() => open = false} 
    >
      <div bind:this={picker} >
        <CellLinkPicker 
          {value} 
          schema={fieldSchema} 
          tableId={fieldSchema.tableId} 
          labelColumn={fieldSchema.labelColumn}
          datasourceType={fieldSchema.tableId ? "table" : "user" }
          on:change={ (e) => { updateValue (e.detail)} } 
        />
      </div>
  </Popover>
{/if}