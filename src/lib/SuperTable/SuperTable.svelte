<script>
  /**
   * @typedef {Object} stbSettings
  */

  import { getContext, setContext } from "svelte";
  import { writable } from "svelte/store";
  import fsm from "svelte-fsm";
  import { dataFilters } from "@budibase/shared-core/";
  import { fetchData } from "./../Fetch"
  import { themeMap } from "./themes/superTableThemes.js"
 
  import {
    createSuperTableDataStore,
    createSuperTableStateStore,
  } from "./stores/superTableStores.js";

  import SuperTableVerticalScroller from "./controls/SuperTableVerticalScroller.svelte";
  import SuperTableRowSelect from "./controls/SuperTableRowSelect.svelte";
  import SuperTableColumn from "./SuperTableColumn/SuperTableColumn.svelte";

  const { API } = getContext("sdk");

  export let tableOptions 

  let timer
  let anchor
  let columns 
  let schema = {}
  let loadedDatasource 
  let query = {}
  let stbChanges
  let stbColumnFilters = []

  // Create Stores
  const tableDataStore = createSuperTableDataStore();
  const tableStateStore = createSuperTableStateStore();

  const stbRowHeights = new writable({});  
  const tableDataChangesStore = new writable([]);

  const stbSelected = new writable([]);
  const stbScrollPos = new writable(0);
  const stbHovered = new writable(-1);
  const stbSettings = new writable({})

  let stbData = new writable({})
  let stbSortColumn = new writable({})
  let stbSortOrder = new writable({})
  
  const stbState = fsm("Idle", {
    "*" : {
      refresh( fetch ) { 
        if ( fetch.loaded ) 
          return "Idle"
        if ( fetch.loading )
          return "Loading" 
       },
      addFilter( filterObj ) { 
        this.removeFilter( filterObj.id )
        stbColumnFilters = [ ...stbColumnFilters, filterObj]
      },
      removeFilter ( id ) {
        let pos = stbColumnFilters.find(x => x.id == id )
        if (pos) { 
          stbColumnFilters = stbColumnFilters.toSpliced( pos, 1)
        }
      },
      clearFilter() { removeQueryExtension("123"); return "Idle" },
      sortBy( column, order ) {  
        $stbSortColumn = column
        $stbSortOrder = order
      },
      registerColumn() {},
      unregisterColumn() {},
      exportData() {},
      deleteRow() {},
      addRow() {},
      toggleSelectRow( rowID ) { 
         
      },
      toggleSelectRow( rowKey ) {
        if ($stbSelected.includes(rowKey)) {
          $stbSelected.splice($stbSelected.indexOf(rowKey), 1)
          $stbSelected = $stbSelected
        } else {
          $stbSelected = [ ...$stbSelected, rowKey ] 
        }
        console.log($stbSelected)
      },
      unselectRow() {},
      editCell() {},
      cellClicked( columnID, rowID ) { },
      rowDblClicked ( context ) { 
        tableOptions.events.onRowDblClick?.( context )
      },
      rowClicked( context ) { 
        tableOptions.events.onRowClick?.( context );
       },
      setState( state ) { return state } 
    },
    Idle: { 
      filtering: "Loading",
     },
    Loading: { 
      loaded: "Idle"
    },
    Filtered: { },
    Sorted: { },
    Empty: { }
  });

  let queryExtensions = {}
  $: $stbSortColumn = tableOptions.data.sortColumn
  $: $stbSortOrder = tableOptions.data.sortOrder

  $: console.log(tableOptions.data.filter)
  $: console.log(stbColumnFilters)

  $: defaultQuery = dataFilters.buildLuceneQuery(tableOptions.data.filter)
  $: queryExtension = dataFilters.buildLuceneQuery(stbColumnFilters)
  $: addQueryExtension("12332", queryExtension)
  $: query = extendQuery(defaultQuery, queryExtensions)
  $: stbData = ( loadedDatasource != tableOptions.data.datasource?.label ) ? createFetch(tableOptions.data.datasource) : stbData
  $: schema = $stbData.schema

  $: stbData?.update({
    query,
    sortColumn : $stbSortColumn,
    sortOrder : $stbSortOrder,
    limit : tableOptions.data.limit || 50,
    paginate: tableOptions.data.paginate,
    state: () => { console.log("firing")}
  })

  $: if ( $stbData.schema && tableOptions.columns?.length > 0 )
        columns = tableOptions.columns.map( (column) => makeSuperColumn (column) )
      else if ( tableOptions.hasChildren )
        columns = []
      else 
        columns = getAllColumns(false)

  $: tableTheme = themeMap[tableOptions.appearance.theme]
  $: $tableDataStore.data = $stbData?.rows ?? [];
  $: $tableDataStore.schema = $stbData?.datasource?.schema

  $: $tableStateStore.rowCount = $stbData.rows.length
    ? $stbData.rows.length
    : tableOptions.visibleRowCount;

  // Initialize Store with appropriate row heights to avoid flicker when they load
  $: tableStateStore.setRowMinHeight(tableOptions.rowHeight);
  $: maxBodyHeight = tableOptions.visibleRowCount * $tableStateStore.rowHeights[0];


  $: $tableDataStore.idColumn = tableOptions.idColumn;
  $: $stbSettings = tableOptions


  const createFetch = datasource => {
    return fetchData({
      API,
      datasource,
      options: {
        query,
        sortColumn : tableOptions.data.sortColumn,
        sortOrder : tableOptions.data.sortOrder,
        limit: tableOptions.data.limit,
        paginate: tableOptions.data.paginate,
      },
    })
  }

  const extendQuery = (defaultQuery, extensions) => {
    const extensionValues = Object.values(extensions || {})
    let extendedQuery = { ...defaultQuery }
    extensionValues.forEach(extension => {
      Object.entries(extension || {}).forEach(([operator, fields]) => {
        extendedQuery[operator] = {
          ...extendedQuery[operator],
          ...fields,
        }
      })
    })
    return extendedQuery
  }

  const addQueryExtension = (key, extension) => {
    if (!key || !extension) {
      return
    }
    queryExtensions = { ...queryExtensions, [key]: extension }
  }

  const removeQueryExtension = key => {
    if (!key) {
      return
    }
    const newQueryExtensions = { ...queryExtensions }
    delete newQueryExtensions[key]
    queryExtensions = newQueryExtensions
  }

  const defaultOperatorMap = {
    "string" : "fuzzy",
    "formula" : "fuzzy",
    "array" : "contains",
    "options" : "equal",
    "datetime" : "rangeLow",
    "boolean" : "equal",
    "number" : "equal",
    "bigint" : "equal",
	}

  const supportFilteringMap = {
    "string" : true,
    "array" : true,
    "options" : true,
    "datetime" : true,
    "boolean" : true,
    "number" : true,
    "bigint" : true,
	}

  const supportSortingMap = {
    "string" : true,
    "formula" : true,
    "array" : true,
    "options" : true,
    "datetime" : true,
    "boolean" : true,
    "number" : true,
    "bigint" : true,
	}

  const supportEditingMap = {
		 "string" : true,
		 "array" : true,
     "link" : true,
     "bb_reference" : true,
		 "options" : true,
		 "datetime" : true,
     "boolean" : true,
     "number" : true,
     "bigint" : true,
	}

  const getAllColumns = ( includeAuto ) => {
    let allColumns = []
    if (schema) 
      allColumns = Object.keys(schema)
        .filter( v => schema[v].autocolumn !== !includeAuto)
        .map( (v) => makeSuperColumn( { name: v, displayName: v }) )
      
    return allColumns
  }

  const makeSuperColumn =  bbcolumn  => {
    let superColumn = {
      ...bbcolumn,
      hasChildren: false,
      schema: schema[bbcolumn.name] ?? {},
      sizing: bbcolumn.width ? "fixed" : tableOptions.columnSizing,
      fixedWidth: bbcolumn.width ? bbcolumn.width : tableOptions.columnFixedWidth,
      maxWidth: tableOptions.columnMaxWidth,
      minWidth: tableOptions.columnMinWidth,
      showFooter: tableOptions.showFooter,
      showHeader: tableOptions.showHeader,
      canEdit: tableOptions.canEdit && supportEditingMap[schema[bbcolumn.name].type],
      canFilter: tableOptions.canFilter && supportFilteringMap[schema[bbcolumn.name].type],
      canSort: tableOptions.canSort && supportSortingMap[schema[bbcolumn.name].type],
      filteringOperators: dataFilters.getValidOperatorsForType( { type: schema[bbcolumn.name].type } ),
      defaultFilteringOperator: defaultOperatorMap[schema[bbcolumn.name].type],
      cellPadding: tableOptions.appearance.cellPadding,
      headerAlign: bbcolumn.align ? bbcolumn.align : "flex-start",
      useOptionColors: tableOptions.appearance.useOptionColors, 
      optionsViewMode: tableOptions.appearance.optionsViewMode,
      relViewMode: tableOptions.appearance.relViewMode
    }
    return superColumn
  }

  setContext("tableDataStore", tableDataStore);
  setContext("tableStateStore", tableStateStore);

  setContext("tableSelectionStore", stbSelected);
  setContext("tableScrollPosition", stbScrollPos);

  setContext("tableHoverStore", stbHovered);
  setContext("tableState", stbState);

  $: setContext("stbSettings", stbSettings);
  $: setContext("stbData", stbData)
  $: setContext("stbSortColumn", stbSortColumn)
  $: setContext("stbSortOrder", stbSortOrder)

  $: console.log($stbSortColumn, $stbSortOrder)

</script>


{#if schema}
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  bind:this={anchor}
  class="st-master-wrapper"
  class:refreshing={$tableStateStore.refreshing}
  style:--super-table-footer-height={"2.5rem"}
  style:--super-table-body-height={maxBodyHeight + "px"}
  style:--super-table-header-color={tableTheme.headerColor}
  style:--super-table-header-bg-color={tableTheme.headerBgColor}
  style:--super-table-color={tableTheme.tableColor}
  style:--super-table-base-font-size={tableOptions.baseFontSize}
  style:--super-table-bg-color={tableTheme.tableBgColor}
  style:--super-table-footer-color={tableTheme.footerColor}
  style:--super-table-footer-bg-color={tableTheme.footerBgCoßlor}
  style:--super-table-relItem-color={tableTheme.relationshipItemColor}
  style:--super-table-relItem-bg-color={tableTheme.relationshipItemBgColor}
  style:--super-table-column-width={tableOptions.columnSizing == "fixed" ? tableOptions.columnWidth : null }
  style:--super-table-cell-padding={tableOptions.appearance.cellPadding + "px"}
  style:--super-table-vertical-dividers={tableOptions.dividers == "both" ||
  tableOptions.dividers == "vertical"
    ? "1px solid var(--spectrum-table-border-color, var(--spectrum-alias-border-color-mid))"
    : "none"}
>
  {#if $stbSettings.rowSelectMode != "off"}
    <div class="st-master-control" >
      <SuperTableRowSelect 
        {stbState} 
        {stbSettings}
        {stbData} 
        {stbSelected}
        {stbHovered}
        {stbScrollPos}
        {tableStateStore}
        />
    </div>
  {/if}
  
    <div class="st-master-columns">

      {#if $stbSettings.superColumnsPos == "first"} <slot /> {/if}
      {#if columns?.length}
        {#each columns as column, idx }
          <SuperTableColumn
            {stbState}
            columnOptions = {{
              ...column,
              canEdit: column.canEdit}}
          />
        {/each}
      {/if}
      {#if $stbSettings.superColumnsPos != "first"} <slot /> {/if}
    </div>


  {#if $stbData?.rows.length > tableOptions.visibleRowCount}
    <div class="st-master-scroll"> <SuperTableVerticalScroller {tableOptions} /></div>
  {/if}
</div>
{/if}

<style>
  .st-master-wrapper {
    display: flex;
    flex-direction: row;
    justify-content: stretch;
    align-items: stretch;
    transition: opacity 750ms ease-in-out;
    border: 1px solid var(--spectrum-global-color-gray-300);
  }
  .refreshing {
    filter: blur(10);
    opacity: 0.75;
  }
  .st-master-control {
    display: flex;
    flex-direction: row;
    justify-content: stretch;
    align-items: stretch;
  }
  .st-master-columns {
    position: relative;
    flex: 1 1 auto;
    display: flex;
    flex-direction: row;
    align-items: stretch;
    justify-content: stretch;
    overflow-x: auto;
    background-color: transparent;
  }

  .st-master-scroll {
    background-color: transparent;
  }
  
</style>
