<script>
  import { createEventDispatcher, getContext } from "svelte";
	import CellLinkPicker from "./CellLinkPicker.svelte";
  import CellSkeleton from "./CellSkeleton.svelte";
  import fsm from "svelte-fsm"
  import "./CellCommon.css"
  import SuperPopover from "../SuperPopover/SuperPopover.svelte";
  import { sdk } from "@budibase/shared-core"

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
  export let multi = true

  let originalValue = [ ...value ]
  let localValue = [ ...value]
  let anchor;
  let open
  let picker
  let searchTerm
  let definition
  let loaded
  let editor
  let datasource

  export let cellState = fsm( "View" , {
    "*": {
      goTo( state ) { return state }
    },
    View: { 
      _enter() { open = false; },
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
      _enter() { dispatch("enteredit") },
      _exit() { dispatch("exitedit") },
      focusout( e ) { 
        if (!picker?.contains(e.relatedTarget)) {
          this.submit();
        }
       },
      submit() { 
        dispatch("change", localValue );
        editorState.close();
        return "View"; 
      },
      cancel() { value = [...originalValue] ; return "View" },
    }
  })

  const editorState = fsm("Closed", {
    "Open" : { 
      close() { return "Closed" },
      toggle() { return "Closed"},
      lostFocus() { cellState.focusout() }
    },
    "Closed" : {
      open() { return "Open"},
      toggle() { return "Open"}
    }
  })

  $: inEdit = $cellState == "Editing"
  $: if ( fieldSchema.type == "link" ) fetchDefinition(fieldSchema.tableId)

  $: if ( definition ) {
    labelColumn = definition.primaryDisplay 
    pickerColumns = !pickerColumns?.length ? [{"name": labelColumn}] : pickerColumns
    datasource = {tableId: tableId || fieldSchema.tableId, type:"table"}
  } else if ( fieldSchema.type == "bb_reference") {
    labelColumn = "email"
    valueColumn = "email"
    datasource = { type : "user" }
    loaded = true
  }

  $: simpleView = cellOptions.relViewMode == "text"

  const handleKeyboard = ( e ) => {
    if ( e.keyCode == 32 && $cellState == "Editing") {
      e.preventDefault();
      e.stopPropagation();
      editorState.toggle();
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

  const focus = e => { e?.focus() }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="superCell"
  tabindex="0"
  bind:this={anchor}
  class:disabled={ !loaded || cellOptions.disabled }
  class:inEdit
  class:inline={ cellOptions?.role == "inline" }  
  class:tableCell={ cellOptions?.role == "tableCell" } 
  class:formInput={ cellOptions?.role == "formInput" }
  class:focused={ $editorState == "Open" }
  style:color={ cellOptions?.color }
  style:background={ inEdit ? "var(--spectrum-global-color-gray-50)" : cellOptions?.background }
  style:font-weight={ cellOptions?.fontWeight }
  on:keydown={handleKeyboard}
  on:click={() => {if (inEdit) editorState.toggle(); else () => {}}}
  on:focusout={cellState.focusout}
  on:focus={cellState.focus}
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
        class="editor" 
        class:placeholder={localValue?.length < 1} 
        style:padding-left={ cellOptions?.icon ? "32px" : cellOptions?.padding }
      >
        <div class="items" class:simpleView >
          {#if localValue?.length < 1}
            { cellOptions?.placeholder || "Select " + fieldSchema.name }
          {:else if localValue?.length > 0}
            {#each localValue as val, idx}
              <div class="item" class:rel-pills={!simpleView} >
                {#if !simpleView}
                  <i class={ fieldSchema.type == "link" ? "ri-links-line" : "ri-user-line" } />
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
        class="value" 
        class:placeholder={value?.length < 1} 
        style:padding-left={ cellOptions?.icon ? "32px" : cellOptions?.padding }
        style:padding-right={cellOptions.padding}
        >
          <div class="items" class:simpleView >
            {#if localValue?.length < 1}
              { cellOptions?.placeholder || "Select " + fieldSchema.name }
            {:else if localValue?.length > 0}
              {#each localValue as val}
                <div class="item" class:rel-pills={!simpleView} class:rel-bb-reference={!simpleView && fieldSchema.type != "link"}>
                  {#if !simpleView}
                    <i class={ fieldSchema.type == "link" ? "ri-links-line" : "ri-user-line" } />
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
  dismissible
  useAnchorWidth
  open={$editorState == "Open"}
  on:close={cellState.focusout}
  >
    <CellLinkPicker
      bind:picker={picker}
      {value} 
      {datasource}
      {filter}
      {labelColumn}
      {valueColumn}
      {pickerColumns}
      {searchColumns}
      {limit}
      {searchTerm}
      multi={fieldSchema?.relationshipType != "many-to-one"}
      on:change={ ( e ) => localValue = e.detail }
    />
  </SuperPopover>
{/if}

<style>
  .rel-pills {
    background-color: var(--spectrum-global-color-gray-200);
  }
  .rel-bb-reference {
    background-color: var(--spectrum-global-color-gray-200);
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