<script>
  /**
   * The complete set of options that can be passed to a Super Column.
   * @typedef {Object} columnOptions
   * @property {Object} schema - The schema of the Cell ( as per Budibase Field Schema ). if Not set, the Cell will render as String
   * @property {string} mode - Can be Field / TableCell / or Unstyled
   * @property {string} state - The State of the Cell. Can be View / Edit / Disabled 
   * @property {string} placeholder - The Cell Placeholder Text
   * @property {string} align - Horizontal Alignment
   * @property {string} color - Use Font Color
   * @property {string} weight - Use Font Weight
   * @property {string} bgColor - The Background Color
   * @property {string} padding - The padding to be applied to the Cell
   * @property {boolean} hovered - To enter hovered state
   */

  import { getContext } from "svelte";
  import { writable, derived } from "svelte/store";
  import fsm from "svelte-fsm";

  import SuperColumnHeader from "./parts/SuperColumnHeader.svelte";
  import SuperColumnBody from "./parts/SuperColumnBody.svelte";
  import SuperColumnFooter from "./parts/SuperColumnFooter.svelte";
  import CellOptions from "../../SuperCells/CellOptions.svelte";
	import CellString from "../../SuperCells/CellString.svelte";
	import CellNumber from "../../SuperCells/CellNumber.svelte";
	import CellBoolean from "../../SuperCells/CellBoolean.svelte";
	import CellDatetime from "../../SuperCells/CellDatetime.svelte";
	import CellLink from "../../SuperCells/CellLink.svelte";
	import CellSkeleton from "../../SuperCells/CellSkeleton.svelte";
  import CellJSON from "../../SuperCells/CellJSON.svelte"

  const stbData = getContext("stbData");
  const stbSettings = getContext("stbSettings");
  const stbSortColumn = getContext("stbSortColumn")
  const stbSortOrder = getContext("stbSortOrder")
  const stbHovered = getContext("stbHovered");
  
  // Props
  export let columnOptions;
  export let stbState

  // Internal Variables
  let id = Math.random() * 100;
  let resizing = false
  let considerResizing = false
  let startPoint 
  let startWidth = 0
  let width
  let columnAnchor

  let sortOrder = "ascending"

  // Cell Components Map
  const cellComponents = {
		'string' : CellString,
	  'number': CellNumber,
	  'bigint': CellNumber,
		'options': CellOptions,
		'array': CellOptions,
		'jsonarray': CellOptions,
		'boolean': CellBoolean ,
		'datetime': CellDatetime,
		'link': CellLink,
		'json': CellJSON,
		"bb_reference": CellLink
  };

  // Allow the Super Table to bind to the Super Column State Machine to control it
  export const columnState = fsm( "Idle", {
    "*": {
      tableState( state ) { return state },
      initializeColumn ( field ) {     
        if (!field) return;
      },
      cancel() { return "Idle"},
      lockWidth () { lockWidth = true },
      startResizing ( e ) { 
        e.preventDefault();
        e.stopPropagation();
        resizing = true;
        startPoint = e.clientX;
        startWidth = columnAnchor.clientWidth;
        width = startWidth;
      },
      resize ( e ) {
        width = startWidth + e.clientX - startPoint
      },
      stopResizing ( e ) {
        e.preventDefault();
        e.stopPropagation();
        resizing = false;
        startPoint = undefined
      },
      resetSize ( e ) {
        e.preventDefault();
        e.stopPropagation();
        width = undefined;
      } 
    },
    Idle: { 
      sort() {
        if ( columnOptions.canSort ) {
          stbState.sortBy( columnOptions.name, "ascending"); 
          return "Sorted"
        }
      }, 
      filter () { return columnOptions.canFilter ? "Entering" : "Idle" },
    },
    Loading :{ 
      loaded() { return "Idle" } 
    },
    Sorted: { 
      sort () { 
        sortOrder = sortOrder == "ascending" ? "descending" : "ascending"
        stbState.sortBy( columnOptions.name, sortOrder); 
      }, 
      unsort: "Idle", 
      filter: "Entering" 
    },
    Entering: { 
      _enter() { },
      filter( filterObj ) { 
        stbState.removeFilter( id )
        stbState.addFilter( { ...filterObj, id: id } )  
        return "Filtered" },
      cancel() { return "Idle" },
      clear() { return "Idle" },
      _exit() {  }
    },
    Resizing: { stop: () => { return "Idle" } },
    Dragging: { stop: () => { return "Idle" } },
    EditingCell: { stop: () => { return "Idle" } },
    Filtered: { 
      filter( filterObj ) { stbState.removeFilter(id); stbState.addFilter( { ...filterObj, id: id } ) },
      clear() { stbState.removeFilter(id); return "Entering" },
      cancel() {  }
    }
  });

  $: columnOptions.cellComponent = $columnState == "Loading" ? CellSkeleton : cellComponents[columnOptions.schema.type] ?? CellString
  $: columnOptions.cellOptions = {
    role: "tableCell",
    readonly: !columnOptions.canEdit,
    align: columnOptions.align,
    color: columnOptions.color,
    background: columnOptions.background ?? "transparent",
    fontWeight: columnOptions.fontWeight,
    padding: columnOptions.cellPadding,
    useOptionColors: columnOptions.useOptionColors,
    optionsViewMode: columnOptions.optionsViewMode,
    optionsSource: columnOptions.optionsSource,
    customOptions: columnOptions.customOptions,
    useOptionColors: columnOptions.useOptionColors,
    useOptionIcons: columnOptions.useOptionIcons,
    relViewMode: columnOptions.relViewMode,
    controlType: "select",
    addNew: false,
    placeholder: " ",
    datasource: columnOptions.data?.datasource,
    valueColumn : columnOptions.data?.valueColumn,
    labelColumn : columnOptions.data?.labelColumn,
    iconColumn : columnOptions.data?.iconColumn,
    colorColumn : columnOptions.data?.colorColumn,
  }

  // Reactive declaration.
  // nameStore is used in our derived store that holds the column data
  let colsStore = new writable([])
  $: columnOptions.name ? colsStore.set(columnOptions.name.split(".")) : $colsStore = []

  let columnStore =
    derived([stbData, colsStore], ([$stbData, $colsStore]) => {
      return $stbData?.rows?.map((row) => ({
        rowID: row[$stbSettings.data.idColumn],
        rowValue: $colsStore.length > 1 ? row[$colsStore[0]]?.[$colsStore[1]] : row[$colsStore[0]]
      }));
    }) || null;

  $: columnState.initializeColumn (columnOptions.name);
  $: if ($stbSortColumn == columnOptions.name && $columnState == "Idle" ) {
    columnState.sort( $stbSortOrder )
  } else if ($stbSortColumn != columnOptions.name && $columnState == "Sorted" ) {
    columnState.unsort();
  }
</script>

<svelte:window
  on:mouseup={ ( e ) => { if ( resizing ) columnState.stopResizing( e ) } } 
  on:mousemove={ ( e ) => { if ( resizing ) columnState.resize( e ) } }
  />



<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  bind:this={columnAnchor}
  class="superTableColumn"
  class:resizing
  class:considerResizing={considerResizing && !resizing}
  style:flex={ width ? "0 0" : columnOptions.sizing == "fixed" ? "0 0" : "1 0 auto" }
  style:min-width={ width ? width : columnOptions.sizing == "fixed" ? columnOptions.fixedWidth : columnOptions.minWidth || "auto"} 
  style:max-width={ width ? width : columnOptions.sizing == "fixed" ? columnOptions.fixedWidth : columnOptions.maxWidth || "auto"} 
  on:mouseleave={() => $stbHovered = null }
>
  {#if $columnState != "Entering" && columnOptions.showHeader && columnOptions.canResize}
    <div 
      class="grabber" 
      on:mousedown={ columnState.startResizing }
      on:dblclick={ columnState.resetSize }
      on:mouseenter={ () => ( considerResizing = true ) } on:mouseleave={ () => ( considerResizing = false ) } 
    /> 
  {/if}

  <SuperColumnHeader 
    {columnState} 
    {columnOptions}
    {sortOrder}
  />

  <SuperColumnBody 
    on:rowClicked={(e) => stbState.rowClicked( e.detail )} 
    on:rowDblClicked={(e) => stbState.rowDblClicked( e.detail )} 
    on:cellChanged={(e) => stbState.cellChanged( e.detail )}
    {columnState} 
    {columnOptions} 
    rows={$columnStore}>
    <slot />
  </SuperColumnBody>

  <SuperColumnFooter {columnState} {columnOptions} />
</div>

<style>
  .superTableColumn {
    position: relative;
    border-right: var(--super-table-vertical-dividers);
    color: var(--super-table-color);
    display: flex;
    flex-direction: column;
    align-items: stretch;
    overflow-x: hidden;
  }
  .grabber {
    width: 5px;
    position: absolute;
    right: 0px;
    top: 12px;
    height: 16px;
    border-radius: 2px;
    z-index: 10;
    background-color: var(--spectrum-global-color-gray-200);
    transition: all 130ms ease-in-out;
  }
  .grabber:hover {
    width: 5px;
    background-color: var(--spectrum-global-color-gray-600);
    cursor: col-resize;
  }
  .resizing {
    border-right: 1px solid var(--primaryColor);
  }
  .considerResizing {
    border-right: 1px solid var(--spectrum-global-color-gray-500);
  }
</style>