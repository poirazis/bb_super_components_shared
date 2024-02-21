<script>
  /**
   * @typedef {Object} stbSettings
  */

  import { getContext, setContext, beforeUpdate } from "svelte";
  import { writable } from "svelte/store";
  import fsm from "svelte-fsm";
  import { sizingMap, defaultOperatorMap, supportFilteringMap, supportSortingMap, supportEditingMap } from "./constants.js"
 
  import {
    createSuperTableStateStore,
  } from "./stores/superTableStores.js";

  import SuperTableVerticalScroller from "./controls/SuperTableVerticalScroller.svelte";
  import SuperTableRowSelect from "./controls/SuperTableRowSelect.svelte";
  import SuperTableColumn from "../SuperTableColumn/SuperTableColumn.svelte";
  import CellSkeleton from "../SuperTableCells/CellSkeleton.svelte";
  import SuperTableHorizontalScroller from "./controls/SuperTableHorizontalScroller.svelte";

  const { API , processStringSync, notificationStore, ActionTypes, Provider, fetchData, LuceneUtils } = getContext("sdk");
  
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

  export let datasource
  export let idColumn;
  export let sortColumn
  export let sortOrder
  export let limit
  export let fetchOnScroll
  export let fetchPageSize
  export let autoRefresh
  export let autoRefreshRate
  export let paginate
  export let filter
  export let columnList = []
  export let autocolumns 

  export let visibleRowCount;
  export let showFooter;
  export let showHeader;
  export let size;
  export let canInsert, canDelete, canEdit, canSort, canResize, canFilter
  export let showFilterOperators
  export let superColumnsPos;

  export let debounce = 750

  export let rowSelectMode
  export let selectionColumn
  export let selectionLimit

  export let columnSizing
  export let columnMinWidth = "6rem"
  export let columnMaxWidth
  export let columnFixedWidth

  export let headerFontSize, headerColor, headerBgColor, headerAlign;
  export let dividers, dividersColor;

  export let rowVerticalAlign,
    rowHorizontalAlign,
    rowFontSize,
    rowColorTemplate,
    rowBGColorTemplate;

  export let footerAlign, footerFontSize, footerColorTemplate, footerBGColorTemplate;

  export let customCellPadding
  export let customBaseFont
  export let customRowHeight
  export let useOptionColors = true
  export let optionsViewMode = "pills"
  export let relViewMode = "pills"
  export let zebraColors = false
  export let highlighters 

  // Events
  export let onRowSelect;
  export let onCellChange;
  export let onRowClick;
  export let onRowDblClick;

  let timer
  let anchor
  let columns 
  let schema = {}
  let query = {}
  let queryExtensions = {}
  let stbColumnFilters = []
  let highlighted
  let columnsBodyAnchor

  $: defaultQuery = LuceneUtils.buildLuceneQuery(filter)
  $: queryExtension = LuceneUtils.buildLuceneQuery(stbColumnFilters)
  $: addQueryExtension("1000", queryExtension)
  $: query = extendQuery(defaultQuery, queryExtensions)
  $: stbData = createFetch(datasource)
  $: tableOptions = {
    superColumnsPos,
    columnSizing,
    columnMaxWidth,
    columnMinWidth,
    columnFixedWidth,
    debounce,
    visibleRowCount,
    rowSelectMode,
    selectionLimit,
    selectionColumn,
    dividers,
    dividersColor,
    showFooter,
    showHeader,
    features: {
      canFilter,
      showFilterOperators,
      canSort,
      canEdit,
      canDelete,
      canInsert,
      canResize,
    },
    data: { 
      datasource,
      idColumn,
      filter,
      sortColumn,
      sortOrder,
      limit,
      paginate,
      autoRefresh,
      autoRefreshRate,
      fetchOnScroll,
      fetchPageSize
    },
    columns: columnList,
    autocolumns,
    appearance: {
      size,
      useOptionColors,
      optionsViewMode,
      relViewMode,
      customCellPadding,
      customRowHeight,
      customBaseFont,
      zebraColors,
      dynamicColors: true,
      highlighters,
      rowColorTemplate,
      rowBGColorTemplate,
      footerColorTemplate,
      footerBGColorTemplate
    },
    events: {
      onRowClick,
      onRowDblClick,
      onCellChange,
      onRowSelect,
    }
  };

  const stbState = fsm("Loading", {
    "*" : {
      handleKeyboard( e ) { },
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
          $stbRowColors = $stbData?.rows.map ( ( row ) => {
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
        $stbRowHeights = tableOptions.visibleRowCount > $stbData?.rows.length 
          ? new Array( tableOptions.visibleRowCount).fill(defaultRowHeight) 
          : new Array($stbData?.rows.length).fill(defaultRowHeight);

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

  $: if ( fetchOnScroll && $stbVerticalScroll > 0.8 && limit == $stbData?.rows.length ) {
    limit = limit + fetchPageSize < 1000 ? limit + fetchPageSize : 1000;
    $stbVerticalScroll = 0.8
  }


  $: schema = $stbData?.schema
  $: $stbSortColumn = sortColumn
  $: $stbSortOrder = sortOrder

  $: if (autoRefresh ) {
    timer = setInterval(() => {
      stbData.refresh();
    }, autoRefreshRate * 1000);
  }

  $: if ( $stbData?.schema && columns?.length > 0 ) {
        let autocolumns = []
        if (autocolumns) {
          autocolumns = Object.keys(schema).filter ( v => schema[v].autocolumn ).map( (v) => makeSuperColumn( schema[v]) )
        }
        columns = columns.map( (column) => makeSuperColumn (column) )
        columns = [ ...columns,  ...autocolumns ]
      } else 
        columns = getAllColumns(autocolumns)

        
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
        .filter( v => schema[v]?.autocolumn != !includeAuto )
        .filter( v => schema[v]?.visible  != false )
        .map( (v) => makeSuperColumn( schema[v] ) )
      
    return allColumns
  }

  const makeSuperColumn =  bbcolumn  => {
    let superColumn = {
      ...bbcolumn,
      hasChildren: false,
      autocolumn: bbcolumn.autocolumn,
      schema: schema[bbcolumn.name] ?? {},
      sizing: tableOptions.columnSizing,
      fixedWidth: bbcolumn.width ? bbcolumn.width : tableOptions.columnFixedWidth ?? "8rem",
      maxWidth: tableOptions.columnMaxWidth ?? "16rem",
      minWidth: tableOptions.columnMinWidth ?? "6rem",
      canResize: tableOptions.features.canResize,
      showFooter: tableOptions.showFooter,
      showHeader: tableOptions.showHeader,
      highlighters: tableOptions.appearance.highlighters,
      canEdit: bbcolumn.autocolumn ? false : tableOptions.features.canEdit && supportEditingMap[schema[bbcolumn.name].type],
      canFilter: supportFilteringMap[schema[bbcolumn.name].type] ? tableOptions.features.canFilter : false,
      showFilterOperators: tableOptions.features.showFilterOperators,
      canSort: tableOptions.features.canSort && supportSortingMap[schema[bbcolumn.name].type],
      filteringOperators: LuceneUtils.getValidOperatorsForType( { type: schema[bbcolumn.name].type } ),
      defaultFilteringOperator: defaultOperatorMap[schema[bbcolumn.name].type],
      cellPadding: tableOptions.appearance.size == "custom" ? tableOptions.appearance.customCellPadding : sizingMap[tableOptions.appearance.size].cellPadding,
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

  // Global Bindings 
  $: actions = [
    {
      type: ActionTypes.RefreshDatasource,
      callback: () => stbData.refresh(),
      metadata: { datasource : $stbSettings.data.datasource },
    },
    {
      type: ActionTypes.AddDataProviderQueryExtension,
      callback: addQueryExtension,
    },
    {
      type: ActionTypes.RemoveDataProviderQueryExtension,
      callback: removeQueryExtension,
    },
    {
      type: ActionTypes.SetDataProviderSorting,
      callback: ({ column, order }) => {
        let newOptions = {}
        if (column) {
          newOptions.sortColumn = column
        }
        if (order) {
          newOptions.sortOrder = order
        }
        if (Object.keys(newOptions)?.length) {
          fetch.update(newOptions)
        }
      },
    },
  ]

  // Build our data context
  $: dataContext = {
    rows: $stbData?.rows,
    selectedRows: $stbSelected,
    info: $stbData?.info,
    datasource: datasource || {},
    schema,
    rowsLength: $stbData?.rows.length,
    pageNumber: $stbData?.pageNumber + 1
  }


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
  style:--spectrum-table-border-color={tableOptions.dividersColor ?? "var(--spectrum-alias-border-color-mid)"}
  style:--super-table-body-height={maxBodyHeight + "px"}
  style:--super-table-horizontal-dividers={tableOptions.dividers == "both" ||
  tableOptions.dividers == "horizontal"
    ? "1px solid var(--spectrum-table-border-color)"
    : "1px solid transparent"}
  style:--super-table-vertical-dividers={tableOptions.dividers == "both" ||
  tableOptions.dividers == "vertical"
    ? "1px solid var(--spectrum-table-border-color)"
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
    offset={ $stbSettings.rowSelectMode != "off" || $stbSettings.selectionColumn  ? "3rem" : "0rem"}
    verticalOffset = { $stbSettings.showFooter ? "40px" : "8px" }
  />

  <SuperTableVerticalScroller 
    {stbVerticalScroll}
    {highlighted}
    clientHeight={maxBodyHeight}
    clientScrollHeight = {$stbData?.rows.length > tableOptions.visibleRowCount ? $stbData?.rows.length  * defaultRowHeight : maxBodyHeight}
    offset={$stbSettings.showHeader ? "40px" : "8px"}
    bottomOffset={ $stbSettings.showFooter ? "32px" : "8px"}
  />

  <Provider {actions} data={dataContext}></Provider>
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
