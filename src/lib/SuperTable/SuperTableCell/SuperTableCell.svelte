<script>
  import { getContext , createEventDispatcher, onMount } from "svelte";
  import SuperCell from "./SuperCell.svelte";

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

  let originalValue = Array.isArray(value) ? [ ... value ] : value

  let cellState
  let wrapperAnchor

  /** @type {import('./SuperCell.Svelte').cellOptions} */
  $: cellOptions = {
    align: columnOptions.align,
    color: columnOptions.color,
    background: columnOptions.background ?? "transparent",
    fontWeight: columnOptions.fontWeight,
    padding: columnOptions.padding,
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
  on:click={ () => { cellState.focus() } }
  on:focus={ () => { cellState.focus() } }
>
  <SuperCell
    bind:cellState 
    {cellOptions}
    {value}
    {valueTemplate}
    {fieldSchema}
    {editable}
    {isHovered}
    lockState={false}
    unstyled
    on:change={handleChange}
    on:keydown
  />
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