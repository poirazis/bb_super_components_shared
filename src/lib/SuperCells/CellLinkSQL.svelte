<script>
  import { createEventDispatcher } from "svelte";
	import CellLinkPicker from "./CellLinkPicker.svelte";
  import fsm from "svelte-fsm"
  import "./CellCommon.css"
  import SuperPopover from "../SuperPopover/SuperPopover.svelte";

  const dispatch = createEventDispatcher();

  export let value = []
  export let fieldSchema;
  export let cellOptions
  export let simpleView = true

  let localValue = [...value]


  export let cellState = fsm( "View" , {
    "*": {
      goTo( state ) { return state }
    },
    View: { 
      focus () { 
        if (!cellOptions.readonly && !cellOptions.disabled) return "Editing"  
      }
    },
    Hovered: { cancel: () => { return "View" }},
    Focused: { 
      unfocus() { return "View" },
    },
    Error: { check : "View" },
    Editing: { 
      unfocus() { return "View" },
      focusout( e ) {
        if ( !picker?.contains(e.relatedTarget) ) {
          open = false;
          dispatch("change", localValue);
          return "View";
        }
      },
      submit() { if ( value != originalValue ) acceptChange() ; return "View" }, 
      cancel() { value = Array.isArray(originalValue) ? [ ... originalValue ] : originalValue ; return "View" },
    }
  })

  let anchor;
  let open
  let picker

  $: inEdit = $cellState == "Editing"
  $: if ( value == "" || value == undefined ) value = []
  $: simpleView = cellOptions.relViewMode == "text"

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

  const loadRelatedRecords = () => {

  }

  const loadDefaultValue = val => {

  }

  $: console.log(value)
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div 
  bind:this={anchor} 
  tabindex="0"
  class="superCell"
  class:disabled={ cellOptions.disabled }
  class:inEdit
  class:inline={ cellOptions?.role == "inline" }  
  class:tableCell={ cellOptions?.role == "tableCell" } 
  class:formInput={ cellOptions?.role == "formInput" } 
  style:color={ cellOptions?.color }
  style:background={ cellOptions?.background }
  style:font-weight={ cellOptions?.fontWeight }
  on:focus={cellState.focus}
  on:focusout={cellState.focusout}
  on:keydown={handleKeyboard}
>
  {#if cellOptions?.icon}
    <i class={cellOptions.icon + " frontIcon"}></i>
  {/if}

  {#if inEdit}
    <div 
      class="editor" class:placeholder={value?.length < 1} 
      style:padding-left={ cellOptions?.icon ? "32px" : cellOptions?.padding }
      on:click={(e) => open = !open}
    >
      <div class="items" class:simpleView >
        {#if value?.length < 1}
          { cellOptions?.placeholder || "Select " + fieldSchema.name }
        {:else if value?.length > 0}
          {#each value as val}
            <div class="item" class:rel-pills={!simpleView} >
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
    <div class="value" class:placeholder={value?.length < 1} style:padding-left={ cellOptions?.icon ? "32px" : cellOptions?.padding }>
      <div class="items" class:simpleView >
        {#if value?.length < 1}
          { cellOptions?.placeholder || "Select " + fieldSchema.name }
        {:else if value?.length > 0}
          {#each value as val}
            <div class="item" class:rel-pills={!simpleView} >
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
  <SuperPopover 
    {anchor} 
    align="left"
    dismissible={false}
    useAnchorWidth
    open={ open }
    >
      <div bind:this={picker} style="display: contents">
        <CellLinkPicker 
          {value} 
          schema={fieldSchema} 
          tableId={fieldSchema.tableId} 
          labelColumn={fieldSchema.labelColumn}
          datasourceType={fieldSchema.tableId ? "table" : "user" }
          on:change={ (e) => { updateValue (e.detail)} } 
          on:focusout={ cellState.focusout }
        />
      </div>
  </SuperPopover>
{/if}

<style>
  .rel-pills {
    background-color: var(--spectrum-global-color-gray-300);
  }
</style>