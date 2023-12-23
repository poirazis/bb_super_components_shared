<script>
  import { getContext , createEventDispatcher, onMount } from "svelte";
  import SuperCell from "../../SuperCell/SuperCell.svelte";
  import CellSkeleton from "../../SuperCell/cells/CellSkeleton.svelte";

  const tableDataChangesStore = getContext("tableDataChangesStore");
  const dispatch = createEventDispatcher();

  export let value
  export let rowKey
  export let editable
  export let fieldSchema
  export let valueTemplate
  export let submitOn = "onEnter"
  export let isHovered = false
  export let columnOptions
  export let isLoading

  let originalValue = Array.isArray(value) ? [ ... value ] : value

  let cellState
  let wrapperAnchor

  /** @type {import('./SuperCell.Svelte').cellOptions} */
  $: cellOptions = {
    role: "tableCell",
    align: columnOptions.align,
    color: columnOptions.color,
    background: columnOptions.background ?? "transparent",
    fontWeight: columnOptions.fontWeight,
    padding: columnOptions.padding,
    useOptionColors: columnOptions.useOptionColors,
    optionsViewMode: columnOptions.optionsViewMode,
    relViewMode: columnOptions.relViewMode,
  }

  function acceptChange ( ) { 
    let newDataChange = {
      rowID: rowKey,
      field: fieldSchema.name,
      originalValue: originalValue,
      newValue: value
    };

    // Get all other dataChanges, removing any previous changes of ours
    let dataChanges = $tableDataChangesStore.filter(
      (v) => v.rowKey != rowKey || v.field != fieldSchema.name
    );
    originalValue = Array.isArray(value) ? [ ... value ] : value
    $tableDataChangesStore = [...dataChanges, newDataChange];
  }


  function handleChange ( e ) {
    value = e.detail
    console.log("Change Received", value )
  }

  const handleKeyboard = ( e ) => {
    if (e.key == "Escape" ) {
      e.stopPropagation();
      e.preventDefault();
      cellState.unfocus();
    }

    if (e.key == "Enter") {
      cellState.lostFocus();
    } 
  }

  const handleBlur = (event) => {
    // if the blur was because of outside focus
    // currentTarget is the parent element, relatedTarget is the clicked element
    if (!event.currentTarget.contains(event.relatedTarget)) {
        cellState.lostFocus()
    }
}
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div 
  bind:this={wrapperAnchor}
  class="superTableCellWrapper"
  class:inEdit={ $cellState == "Editing" }
  tabindex="0"
  on:keydown={handleKeyboard}
  on:focus={ cellState.focus }
  on:blur={handleBlur}
>
  {#if isLoading}
    <CellSkeleton > Loading .. </CellSkeleton>
  {:else}
    <SuperCell
      bind:cellState 
      {cellOptions}
      {value}
      {valueTemplate}
      {fieldSchema}
      {editable}
      {isHovered}
      on:change={handleChange}
      on:keydown
      on:blur={cellState?.lostFocus}
    />
  {/if}
</div>

<style>
.superTableCellWrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  overflow: hidden;
  border: 1px solid transparent;
}
.superTableCellWrapper:focus {
  outline: none;
}
.superTableCellWrapper.inEdit {
  border-color: var(--spectrum-global-color-blue-500);
}

</style>