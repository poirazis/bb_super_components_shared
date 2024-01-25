<script>
  import { createEventDispatcher, getContext } from "svelte";
	import CellLinkPicker from "./CellLinkPicker.svelte";
  import CellSkeleton from "./CellSkeleton.svelte";
  import fsm from "svelte-fsm"
  import "./CellCommon.css"
  import SuperPopover from "../SuperPopover/SuperPopover.svelte";

  const dispatch = createEventDispatcher();

  const { API } = getContext ("sdk")

  export let value = []
  export let linkValueType = "link"
  export let fieldSchema;
  export let cellOptions
  export let simpleView = true

  export let tableId
  export let valueColumn = "_id"
  export let labelColumn
  export let pickerColumns
  export let searchColumns
  export let filter
  export let limit
  export let multi = false

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
      focusout( e ) {
          open = false;
          dispatch("change", localValue);
        },
      cancel() { value = Array.isArray(originalValue) ? [ ... originalValue ] : originalValue ; return "View" },
    }
  })

  let anchor;
  let open
  let picker
  let searchTerm
  let definition
  let loaded

  $: inEdit = $cellState == "Editing"
  $: fetchDefinition(fieldSchema?.tableId)
  $: if ( definition ) {
    labelColumn = definition.primaryDisplay 
    pickerColumns = !pickerColumns?.length ? [{"name": labelColumn}] : pickerColumns
  }
  $: if ( value == "" || value == undefined ) value = []
  $: simpleView = cellOptions.relViewMode == "text"

  const handleKeyboard = ( e ) => {
    if ( e.keyCode == 32 && $cellState == "Editing") {
      e.preventDefault();
      e.stopPropagation();
      open = !open
    }
  }

  const fetchDefinition = async tableId => {
    try {
      definition = await API.fetchTableDefinition(tableId)
    } catch (error) {
      definition = null
    }

    if (!loaded) {
      loaded = true
    }
  }

  const updateValue = ( newValue ) => {
    value = [ ...newValue ]
    dispatch("change", value)
    if (!multi) open = false;  
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div 
  bind:this={anchor}
  class="superCell"
  class:disabled={ !loaded || cellOptions.disabled }
  class:inEdit
  class:inline={ cellOptions?.role == "inline" }  
  class:tableCell={ cellOptions?.role == "tableCell" } 
  class:formInput={ cellOptions?.role == "formInput" } 
  style:color={ cellOptions?.color }
  style:background={ cellOptions?.background }
  style:font-weight={ cellOptions?.fontWeight }
  on:keydown={handleKeyboard}
>
  {#if loaded}
    {#if cellOptions?.icon}
      <i class={cellOptions.icon + " frontIcon"}></i>
    {/if}

    {#if inEdit && cellOptions.autocomplete}
        <input
          class="editor"
          class:placeholder={!searchTerm}
          style:padding-left={ cellOptions.icon ? "32px" : cellOptions.padding }
          style:padding-right={ cellOptions.clearValueIcon ? "32px" : cellOptions.padding }
          style:padding-top={0}
          style:padding-bottom={0}
          style:border={"none"}
          bind:value={searchTerm}
          placeholder={ cellOptions.placeholder ?? "Enter..." }
          use:focus
        />
          <i class="ri-add-line actionIcon" on:click={(e) => open = true }></i>
    {:else if inEdit}
      <div 
        class="editor" class:placeholder={value?.length < 1} 
        style:padding-left={ cellOptions?.icon ? "32px" : cellOptions?.padding }
        on:click|preventDefault={(e) => open = true }
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
      <div
        tabindex="0"
        on:focus={cellState.focus}
        class="value" 
        class:placeholder={value?.length < 1} 
        style:padding-left={ cellOptions?.icon ? "32px" : cellOptions?.padding }
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
      </div>
    {/if}
  {:else}
    <CellSkeleton> Initializing ... </CellSkeleton>
  {/if}

</div>

{#if inEdit}
  <SuperPopover 
    {anchor} 
    align="left"
    dismissible
    useAnchorWidth
    open={ open }
    on:close = { open = false }
    >
      <div bind:this={picker}>
        <CellLinkPicker
          {value} 
          datasource={{tableId: tableId || fieldSchema.tableId, type:"table"}}
          {filter}
          {labelColumn}
          {valueColumn}
          {pickerColumns}
          {searchColumns}
          {limit}
          {searchTerm}
          {multi}
          on:change={ (e) => { updateValue (e.detail)} } 
        />
      </div>
  </SuperPopover>
{/if}

<style>
  .rel-pills {
    background-color: var(--spectrum-global-color-gray-300);
  }

  .actionIcon {
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		border-left: 1px solid var(--spectrum-global-color-blue-500);
		min-width: 2rem;
		font-size: 16px;
		transition: all 130ms;
	}
	.actionIcon:hover {
		cursor: pointer;
		background-color: var(--spectrum-global-color-gray-75);
		font-weight: 800;
	}

  /* HTML: <div class="loader"></div> */
/* HTML: <div class="loader"></div> */
.loader {
  width: 120px;
  height: 20px;
  background: 
    linear-gradient(90deg,#0001 33%,#0005 50%,#0001 66%)
    #f2f2f2;
  background-size:300% 100%;
  animation: l1 1s infinite linear;
}
@keyframes l1 {
  0% {background-position: right}
}
</style>