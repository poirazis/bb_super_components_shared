<script>
  /**
   * @typedef {Object} stbSettings
  */

  import { getContext, setContext, onMount } from "svelte";
  import { writable } from "svelte/store";
  import fsm from "svelte-fsm";
  import { dataFilters } from "@budibase/shared-core/";
  import { fetchData } from "./../Fetch"
  import { themeMap } from "./themes/superTableThemes.js"
 
  import {
    createSuperTableStateStore,
  } from "./stores/superTableStores.js";

  import SuperTableVerticalScroller from "./controls/SuperTableVerticalScroller.svelte";
  import SuperTableRowSelect from "./controls/SuperTableRowSelect.svelte";
  import SuperTableColumn from "./SuperTableColumn/SuperTableColumn.svelte";
  import CellSkeleton from "../SuperCells/CellSkeleton.svelte";
  import SuperTableHorizontalScroller from "./controls/SuperTableHorizontalScroller.svelte";

  const { API } = getContext("sdk");

  export let tableOptions 

  let timer
  let anchor
  let columns 
  let schema = {}
  let query = {}
  let stbChanges
  let stbColumnFilters = []
  let highlighted
  let columnsBodyAnchor


  let loadedDatasource

  // Create Stores
  const tableStateStore = createSuperTableStateStore();
  const tableDataChangesStore = new writable([]);

  const stbSelected = new writable([]);
  const stbScrollPos = new writable(0);

  const stbHovered = new writable(-1);
  const stbSettings = new writable({})
  const stbSortColumn = new writable({})
  const stbSortOrder = new writable({})
  const stbRowHeights = new writable(new Array(tableOptions.visibleRowCount));  


  const stbVerticalScroll = new writable(0);
  const stbVerticalRange = new writable(1);

  const stbHorizontalScroll = new writable(0);
  const stbHorizontalRange = new writable(1);

  const stbState = fsm("Loading", {
    "*" : {
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
        sortColumn = column
        sortOrder = order
        $stbSortColumn = column
        $stbSortOrder = order
      },
      registerColumn() {},
      unregisterColumn() {},
      exportData() {},
      deleteRow() {},
      addRow() {},
      toggleSelectRow( rowID ) {
        if ($stbSettings.rowSelectMode == "multi") {
          if ($stbSelected.includes(rowID)) {
            $stbSelected.splice($stbSelected.indexOf(rowID), 1)
            $stbSelected = $stbSelected
          } else {
            $stbSelected = [ ...$stbSelected, rowID ] 
          }
        } else { 
          if ($stbSelected.includes(rowID)) 
            $stbSelected = []
          else
           $stbSelected = [rowID]
        }
        tableOptions.events.onRowSelect?.( $stbData.rows.filter ( x => $stbSelected.includes(x[tableOptions.data.idColumn]) ) )
      },
      toggleSelectAllRows () {
        if ($stbSettings.rowSelectMode == "multi") {
          if ( $stbSelected.length != $stbData.rows.length ) 
            $stbSelected = $stbData.rows.map ( x => x[$stbSettings.data.idColumn])
          else
            $stbSelected = []
        }
      },
      cellChanged( change ) {
        console.log( "Change", change )

        tableOptions.events.onCellChange?.({
          rowID : change.rowID,
          field : change.field,
          value : change.value,
          previousValue : change.previousValue
        })
      },
      cellClicked( columnID, rowID ) { },
      rowDblClicked ( rowID ) { 
        tableOptions.events.onRowDblClick?.( $stbData.rows.find( x => x[tableOptions.data.idColumn] == rowID ) )
      },
      rowClicked( rowID ) { 
        tableOptions.events.onRowClick?.( $stbData.rows.find( x => x[tableOptions.data.idColumn] == rowID ) );
        if ( tableOptions.rowSelectMode != "off" && !tableOptions.selectionColumn )
          this.toggleSelectRow ( rowID)
      },
      setState( state ) { if (state?.loaded ) return "Idle" } 
    },
    Idle: { 
      _enter() {
        $stbRowHeights = tableOptions.visibleRowCount > $stbData.rows.length ? new Array(tableOptions.visibleRowCount) : new Array($stbData.rows.length)
      },
      synch( fetchState ) { if (fetchState?.loading) return "Loading" },
     },
    Loading: { 
      loaded: "Idle",
      synch( fetchState ) { if (fetchState?.loaded) return "Idle" },
    },
    Filtered: { },
    Sorted: { },
    Empty: { }
  });

  let queryExtensions = {}
  $: limit = tableOptions.data.limit
  $: if ( tableOptions.data.fetchOnScroll && $stbVerticalScroll > 0.8)
      if ( limit == $stbData?.rows.length ) {
        limit += tableOptions.data.fetchPageSize
      }

  $: sortColumn = tableOptions.data.sortColumn
  $: sortOrder = tableOptions.data.sortOrder
  $: datasource = tableOptions.data.datasource
  $: paginate = tableOptions.data.paginate

  $: stbData = createFetch(datasource)
  $: schema = $stbData?.schema

  $: defaultQuery = dataFilters.buildLuceneQuery(tableOptions.data.filter)
  $: queryExtension = dataFilters.buildLuceneQuery(stbColumnFilters)
  $: addQueryExtension("12332", queryExtension)
  $: query = extendQuery(defaultQuery, queryExtensions)

  $: stbData.update({
    query,
    sortColumn,
    sortOrder,
    limit,
    paginate: tableOptions.data.paginate,
  })

  $: $stbSortColumn = tableOptions.data.sortColumn
  $: $stbSortOrder = tableOptions.data.sortOrder

  $: if (tableOptions.data.autoRefresh ) {
    timer = setInterval(() => {
      stbData.refresh();
    }, tableOptions.data.autoRefreshRate * 1000);
  }

  $: if ( $stbData?.schema && tableOptions.columns?.length > 0 )
        columns = tableOptions.columns.map( (column) => makeSuperColumn (column) )
      else if ( tableOptions.hasChildren )
        columns = []
      else 
        columns = getAllColumns(false)

  $: tableTheme = themeMap[tableOptions.appearance.theme]

  $: maxBodyHeight = tableOptions.visibleRowCount * tableOptions.rowHeight
  $: $stbSettings = tableOptions
  $: stbState.synch($stbData)

  const syncScroll = (e) => {
    if ( columnsBodyAnchor ) {
      const { scrollLeftMax, scrollLeft , scrollWidth , clientWidth } = columnsBodyAnchor
      $stbHorizontalRange = scrollLeftMax > 0 ? clientWidth / scrollWidth : 1
      $stbHorizontalScroll = scrollLeft / scrollLeftMax
    }
  }

  const createFetch = datasource => {
      return fetchData({
        API,
        datasource,
        options: {
          query,
          sortColumn,
          sortOrder,
          limit,
          paginate,
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
      canResize: tableOptions.canResize,
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

  onMount( () => {
    if ( columnsBodyAnchor ) {
      const { scrollLeftMax, scrollLeft , scrollWidth , clientWidth } = columnsBodyAnchor
        $stbHorizontalRange = scrollLeftMax > 0 ? clientWidth / scrollWidth : 1
    }
  })

  setContext("tableStateStore", tableStateStore);

  setContext("stbScrollPos", stbScrollPos);
  setContext("stbVerticalScroll", stbVerticalScroll);
  setContext("stbVerticalRange", stbVerticalRange);
  setContext("stbHovered", stbHovered);
  setContext("stbSelected", stbSelected);
  setContext("tableState", stbState);
  setContext("stbSettings", stbSettings);
  setContext("stbSortColumn", stbSortColumn)
  setContext("stbSortOrder", stbSortOrder)
  $: setContext("stbData", stbData)

  $: console.log(sortColumn,sortOrder)
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div
  bind:this={anchor}
  tabindex="0"
  class="st-master-wrapper"
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

  on:mouseenter={ () => highlighted = true }
  on:mouseleave={ () => highlighted = false }
>
  {#if $stbSettings.rowSelectMode != "off" && $stbSettings.selectionColumn }
    <div class="st-master-control" >
      <SuperTableRowSelect 
        {stbState} 
        {stbSettings}
        {stbData} 
        {stbSelected}
        {stbHovered}
        {stbScrollPos}
        {tableStateStore}
        {stbRowHeights}
        loading={$stbData?.loading}
        />
    </div>
  {/if}
  
  <div bind:this={columnsBodyAnchor} class="st-master-columns" on:scroll={syncScroll}>
    {#if $stbData?.loading && !$stbData?.loaded}
      <CellSkeleton > Loading ... </CellSkeleton>
    {:else}
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
    {/if}
  </div>

  <SuperTableHorizontalScroller {stbHorizontalScroll} {stbHorizontalRange} {highlighted} offset={"2.5rem"} />
  <SuperTableVerticalScroller 
    {stbVerticalScroll}
    {highlighted}
    clientHeight={maxBodyHeight}
    clientScrollHeight = {$stbData?.rows.length > tableOptions.visibleRowCount ? $stbData?.rows.length  * tableOptions.rowHeight : maxBodyHeight}
    offset={"2.5rem"}
  />
</div>

<style>
  .st-master-wrapper {
    position: relative;
    display: flex;
    flex-direction: row;
    justify-content: stretch;
    align-items: stretch;
    border: 1px solid var(--spectrum-global-color-gray-300);
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
    overflow-x: scroll;
    scrollbar-width: none;
    background-color: transparent;
    min-height: var(--super-table-body-height);
  }

  .st-master-columns::-webkit-scrollbar {
    display: none;
  }

</style>
