<script>
  /**
   * @typedef {Object} stbSettings
  */

  import { getContext, setContext, beforeUpdate } from "svelte";
  import { writable } from "svelte/store";
  import fsm from "svelte-fsm";
  import { dataFilters } from "@budibase/shared-core/";
  import { fetchData } from "./../Fetch"
  import { sizingMap, defaultOperatorMap, supportFilteringMap, supportSortingMap, supportEditingMap } from "./constants.js"
 
  import {
    createSuperTableStateStore,
  } from "./stores/superTableStores.js";

  import SuperTableVerticalScroller from "./controls/SuperTableVerticalScroller.svelte";
  import SuperTableRowSelect from "./controls/SuperTableRowSelect.svelte";
  import SuperTableColumn from "../SuperTableColumn/SuperTableColumn.svelte";
  import CellSkeleton from "../SuperTableCells/CellSkeleton.svelte";
  import SuperTableHorizontalScroller from "./controls/SuperTableHorizontalScroller.svelte";

  const { API , processStringSync, notificationStore } = getContext("sdk");

  export let tableOptions 

  let timer
  let anchor
  let columns 
  let schema = {}
  let query = {}
  let queryExtensions = {}
  let stbColumnFilters = []
  let highlighted
  let columnsBodyAnchor


  // Create Stores
  const tableStateStore = createSuperTableStateStore();

 
  const stbSelected = new writable([]);
  const stbScrollPos = new writable(0);

  const stbHovered = new writable(-1);
  const stbEditing = new writable(-1)
  const stbSettings = new writable({})
  const stbSortColumn = new writable({})
  const stbSortOrder = new writable({})

  const stbRowHeights = new writable([]); 
  const stbRowColors = new writable([]);

  const stbVerticalScroll = new writable(0);
  const stbVerticalRange = new writable(1);

  const stbHorizontalScroll = new writable(0);
  const stbHorizontalRange = new writable(1);

  const stbState = fsm("Loading", {
    "*" : {
      handleKeyboard( e ) { console.log(e.key) },
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
      clearFilter() { 
        stbColumnFilters = [];
        removeQueryExtension("123"); 
        return "Idle" 
      },
      sortBy( column, order ) {  
        sortColumn = column;
        sortOrder = order;
        $stbSortColumn = column;
        $stbSortOrder = order;
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
            if ($stbSelected.length < tableOptions.selectionLimit || !tableOptions.selectionLimit )
              $stbSelected = [ ...$stbSelected, rowID ]
            else
              notificationStore.actions.warning("Cannot select more than " + tableOptions.selectionLimit + " rows")
          }
          tableOptions.events.onRowSelect?.( $stbData.rows.filter ( x => $stbSelected.includes(x[tableOptions.data.idColumn]) ) )
        } else if ($stbSettings.rowSelectMode == "single") { 
          if ($stbSelected.includes(rowID)) { $stbSelected = []}           
          else { $stbSelected = [rowID] };
          tableOptions.events.onRowSelect?.( $stbData.rows.filter ( x => $stbSelected.includes(x[tableOptions.data.idColumn]) ) )
        }
      },
      toggleSelectAllRows () {
        if ($stbSettings.rowSelectMode == "multi") {
          if ( $stbSelected.length != $stbData.rows.length ) 
            $stbSelected = $stbData.rows.map ( x => x[$stbSettings.data.idColumn])
          else
            $stbSelected = [];
            
          tableOptions.events.onRowSelect?.( $stbData.rows.filter ( x => $stbSelected.includes(x[tableOptions.data.idColumn]) ) )
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
        if ( tableOptions.rowSelectMode != "off" && !tableOptions.features.canEdit )
          this.toggleSelectRow ( rowID)
      },
      getRowColors() {
        if ($stbData?.loading) return;

        if ( tableOptions.appearance.rowBGColorTemplate || tableOptions.appearance.rowColorTemplate ) {
          $stbRowColors = []
          $stbRowColors = $stbData.rows.map ( ( row ) => {
            return { bgcolor : processStringSync( tableOptions.appearance.rowBGColorTemplate ?? "", {Row : row } ) ?? "var(--spectrum-global-color-gray-50)",
                     color : processStringSync( tableOptions.appearance.rowColorTemplate ?? "", {Row : row } ) ?? "var(--spectrum-global-color-gray-800)"}
          })  
        } else if ( tableOptions.appearance.zebraColors ) {
          $stbRowColors = $stbRowHeights.map ( ( row, idx ) => {
            return { bgcolor : ( idx % 2 == 1) ? "var(--spectrum-global-color-gray-75)" : "inherit",
                     color : "var(--spectrum-global-color-gray-800)" };
          })
        } else {
          $stbRowColors = $stbRowHeights.map ( ( row ) => {
            return { bgcolor : "inherit",
                     color : "var(--spectrum-global-color-gray-800)"}
          }) 
        }
      },
      setState( state ) { 
        if (state?.loaded) {
          this.getRowColors();
          return "Idle"
        }
       } 
    },
    Idle: { 
      _enter() {
        $stbRowHeights = tableOptions.visibleRowCount > $stbData.rows.length 
          ? new Array( tableOptions.visibleRowCount).fill(defaultRowHeight) 
          : new Array($stbData.rows.length).fill(defaultRowHeight);

        this.getRowColors();
      },
      synch( fetchState ) { 
        this.getRowColors();
        if (fetchState?.loading) return "Loading" 
      },
     },
    Loading: { 
      loaded: "Idle",
      synch( fetchState ) { 
        if (fetchState?.loaded && stbColumnFilters?.length > 0) 
          return "Filtered";
        else  
          return "Idle"
        },
    },
    Filtered: { 
      _enter() { this.getRowColors() },
      synch( fetchState ) { 
        if (fetchState?.loaded && stbColumnFilters?.length > 0) 
          this.getRowColors();
        else  
          return "Idle"
        },
    },
    Editing: { },
    Empty: { },
    Sorted: { },
    Empty: { }
  });

  // Generate Layout required variables first so we can render early on
  $: defaultRowHeight = tableOptions.appearance.size == "custom" ? tableOptions.appearance.customRowHeight : sizingMap[tableOptions.appearance.size].rowHeight
  $: if ( tableOptions.appearance.size == "custom" ) {
    $stbRowHeights = [ ... new Array(tableOptions.visibleRowCount).fill(defaultRowHeight) ]
  } else {
    $stbRowHeights = [ ... new Array(tableOptions.visibleRowCount).fill(defaultRowHeight) ]
  }

  $: maxBodyHeight = tableOptions.visibleRowCount * defaultRowHeight

  $: limit = tableOptions.data.limit
  $: if ( tableOptions.data.fetchOnScroll && $stbVerticalScroll > 0.8 && limit == $stbData?.rows.length ) {
    limit = limit + tableOptions.data.fetchPageSize < 1000 ? limit + tableOptions.data.fetchPageSize : 1000;
    $stbVerticalScroll = 0.8
  }

  $: sortColumn = tableOptions.data.sortColumn
  $: sortOrder = tableOptions.data.sortOrder
  $: datasource = tableOptions.data.datasource
  $: paginate = tableOptions.data.paginate
  $: stbData = createFetch(datasource)
  $: schema = $stbData?.schema

  $: defaultQuery = dataFilters.buildLuceneQuery(tableOptions.data.filter)
  $: queryExtension = dataFilters.buildLuceneQuery(stbColumnFilters)
  $: addQueryExtension("1000", queryExtension)
  $: query = extendQuery(defaultQuery, queryExtensions)

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

  $: $stbSettings = tableOptions
  $: stbData?.update({
    query,
    sortColumn,
    sortOrder,
    limit,
    paginate,
  })

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
      fixedWidth: bbcolumn.width ? bbcolumn.width : tableOptions.columnFixedWidth ?? "8rem",
      maxWidth: tableOptions.columnMaxWidth ?? "16rem",
      minWidth: tableOptions.columnMinWidth ?? "6rem",
      canResize: tableOptions.features.canResize,
      showFooter: tableOptions.showFooter,
      showHeader: tableOptions.showHeader,
      canEdit: tableOptions.features.canEdit && supportEditingMap[schema[bbcolumn.name].type],
      canFilter: tableOptions.features.canFilter && supportFilteringMap[schema[bbcolumn.name].type],
      showFilterOperators: tableOptions.features.showFilterOperators,
      canSort: tableOptions.features.canSort && supportSortingMap[schema[bbcolumn.name].type],
      filteringOperators: dataFilters.getValidOperatorsForType( { type: schema[bbcolumn.name].type } ),
      defaultFilteringOperator: defaultOperatorMap[schema[bbcolumn.name].type],
      cellPadding: tableOptions.appearance.size == "custom" ? tableOptions.appearance.cellPadding : sizingMap[tableOptions.appearance.size].cellPadding,
      headerAlign: bbcolumn.align ? bbcolumn.align : "flex-start",
      useOptionColors: tableOptions.appearance.useOptionColors, 
      optionsViewMode: tableOptions.appearance.optionsViewMode,
      relViewMode: tableOptions.appearance.relViewMode,
      zebraColors: tableOptions.appearance.zebraColors
    }
    return superColumn
  }

  beforeUpdate( () => {
    if ( columnsBodyAnchor ) {
      const { scrollWidth , clientWidth } = columnsBodyAnchor
      $stbHorizontalRange = scrollWidth > clientWidth ? clientWidth / scrollWidth : 1
    }

  })

  setContext("tableStateStore", tableStateStore);

  setContext("stbScrollPos", stbScrollPos);
  setContext("stbVerticalScroll", stbVerticalScroll);
  setContext("stbVerticalRange", stbVerticalRange);
  setContext("stbHovered", stbHovered);
  setContext("stbSelected", stbSelected);
  setContext("stbEditing", stbEditing);
  setContext("tableState", stbState);
  setContext("stbSettings", stbSettings);
  setContext("stbSortColumn", stbSortColumn)
  setContext("stbSortOrder", stbSortOrder)
  setContext("stbRowHeights", stbRowHeights)
  setContext("stbRowColors", stbRowColors)
  $: setContext("stbData", stbData)

</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div
  bind:this={anchor}
  tabindex="0"
  class="st-master-wrapper"
  style:--super-table-body-height={maxBodyHeight + "px"}
  style:--super-table-vertical-dividers={tableOptions.dividers == "both" ||
  tableOptions.dividers == "vertical"
    ? "1px solid var(--spectrum-table-border-color, var(--spectrum-alias-border-color-mid))"
    : "none"}

  on:mouseenter={ () => highlighted = true }
  on:mouseleave={ () => highlighted = false }
  on:keydown={stbState.handleKeyboard}
>
  {#if tableOptions.selectionColumn || (tableOptions.features.canEdit && tableOptions.rowSelectMode != "off") }
    <SuperTableRowSelect 
      {stbState} 
      {stbSettings}
      {stbData} 
      {stbSelected}
      {stbHovered}
      {stbEditing}
      {stbScrollPos}
      {stbVerticalScroll}
      {tableStateStore}
      {stbRowHeights}
      {stbRowColors}
      loading={$stbData?.loading}      
    />
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
      {#if $stbSettings.superColumnsPos == "last"} <slot /> {/if}
    {/if}
  </div>

  <SuperTableHorizontalScroller
    {stbHorizontalScroll} 
    {stbHorizontalRange} 
    {highlighted} 
    offset={ $stbSettings.rowSelectMode != "off" && $stbSettings.selectionColumn  ? "2.5rem" : "0rem"} 
  />

  <SuperTableVerticalScroller 
    {stbVerticalScroll}
    {highlighted}
    clientHeight={maxBodyHeight}
    clientScrollHeight = {$stbData?.rows.length > tableOptions.visibleRowCount ? $stbData?.rows.length  * defaultRowHeight : maxBodyHeight}
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
