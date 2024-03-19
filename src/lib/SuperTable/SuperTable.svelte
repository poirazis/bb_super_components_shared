<script>
  import { getContext, setContext, beforeUpdate } from "svelte";
  import { writable } from "svelte/store";
  import fsm from "svelte-fsm";
  import {
    sizingMap,
    defaultOperatorMap,
    supportFilteringMap,
    supportSortingMap,
    supportEditingMap,
  } from "./constants.js";

  import { createSuperTableStateStore } from "./stores/superTableStores.js";

  import SuperTableVerticalScroller from "./controls/SuperTableVerticalScroller.svelte";
  import SuperTableRowSelect from "./controls/SuperTableRowSelect.svelte";
  import SuperTableColumn from "../SuperTableColumn/SuperTableColumn.svelte";
  import CellSkeleton from "../SuperTableCells/CellSkeleton.svelte";
  import SuperTableHorizontalScroller from "./controls/SuperTableHorizontalScroller.svelte";

  const {
    API,
    processStringSync,
    notificationStore,
    ActionTypes,
    Provider,
    fetchData,
    LuceneUtils,
  } = getContext("sdk");

  // Create Stores
  const tableStateStore = createSuperTableStateStore();
  const stbScrollPos = new writable(0);

  const stbHovered = new writable(-1);
  const stbEditing = new writable(-1);
  const stbSettings = new writable({});
  const stbSortColumn = new writable({});
  const stbSortOrder = new writable({});

  const stbRowHeights = new writable([]);
  const stbRowColors = new writable([]);

  const stbVerticalScroll = new writable(0);
  const stbVerticalRange = new writable(1);

  const stbHorizontalScroll = new writable(0);
  const stbHorizontalRange = new writable(1);

  export let datasource;
  export let idColumn;
  export let sortColumn;
  export let sortOrder;
  export let limit;
  export let fetchOnScroll;
  export let fetchPageSize;
  export let autoRefresh;
  export let autoRefreshRate;
  export let paginate;
  export let filter;
  export let columnList = [];
  export let autocolumns;

  export let visibleRowCount;
  export let showFooter;
  export let showHeader;
  export let size;
  export let canInsert, canDelete, canEdit, canSort, canResize, canFilter;
  export let showFilterOperators;
  export let superColumnsPos;

  export let debounce = 750;

  export let rowSelectMode;
  export let preselectedId;
  export let preselectedIds;
  export let selectionColumn;
  export let selectionLimit;

  export let columnSizing = "flex";
  export let columnMinWidth = "6rem";
  export let columnMaxWidth = "auto";
  export let columnFixedWidth;

  export let headerFontSize, headerColor, headerBgColor, headerAlign;
  export let dividers, dividersColor;

  export let rowVerticalAlign,
    rowHorizontalAlign,
    rowFontSize,
    rowColorTemplate,
    rowBGColorTemplate;

  export let footerAlign,
    footerFontSize,
    footerColorTemplate,
    footerBGColorTemplate;

  export let customCellPadding;
  export let customBaseFont;
  export let customRowHeight;
  export let useOptionColors = true;
  export let optionsViewMode = "pills";
  export let relViewMode = "pills";
  export let zebraColors = false;
  export let highlighters;

  // Events
  export let onRowSelect;
  export let onCellChange;
  export let onRowClick;
  export let onRowDblClick;

  let timer;
  let anchor;
  let columns = [];
  let autocolumnsList = [];
  let schema = {};
  let query = {};
  let queryExtensions = {};
  let stbColumnFilters = [];
  let highlighted;
  let columnsBodyAnchor;

  const stbSelected = new writable([]);

  $: if (rowSelectMode == "single") $stbSelected[0] = preselectedId;
  $: if (rowSelectMode == "multi" && preselectedIds)
    $stbSelected = preselectedIds?.split(",");

  $: defaultQuery = LuceneUtils.buildLuceneQuery(filter);
  $: queryExtension = LuceneUtils.buildLuceneQuery(stbColumnFilters);
  $: addQueryExtension("1000", queryExtension);
  $: query = extendQuery(defaultQuery, queryExtensions);
  $: stbData = createFetch(datasource);
  $: stbData?.update({
    query,
    sortColumn,
    sortOrder,
    limit,
    paginate,
  });

  $: populateColumns(
    $stbData,
    columnList,
    autocolumns,
    columnSizing,
    columnFixedWidth,
    columnMaxWidth,
    columnMinWidth
  );

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
    headerHeight:
      size == "custom" ? customCellPadding : sizingMap[size].headerHeight,
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
      fetchPageSize,
    },
    columns,
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
      footerBGColorTemplate,
      cellPadding:
        size == "custom" ? customCellPadding : sizingMap[size].cellPadding,
    },
    events: {
      onRowClick,
      onRowDblClick,
      onCellChange,
      onRowSelect,
    },
  };

  // Generate Layout required variables first so we can render early on
  $: defaultRowHeight =
    size == "custom" ? customRowHeight : sizingMap[size].rowHeight;
  $: if (size == "custom") {
    $stbRowHeights = [...new Array(visibleRowCount).fill(defaultRowHeight)];
  } else {
    $stbRowHeights = [...new Array(visibleRowCount).fill(defaultRowHeight)];
  }

  $: maxBodyHeight = visibleRowCount * defaultRowHeight;

  $: if (
    fetchOnScroll &&
    $stbVerticalScroll > 0.8 &&
    limit == $stbData?.rows.length
  ) {
    limit = limit + fetchPageSize < 1000 ? limit + fetchPageSize : 1000;
    $stbVerticalScroll = 0.8;
  }

  $: if (autoRefresh && stbData) {
    timer = setInterval(() => {
      stbData.refresh();
    }, autoRefreshRate * 1000);
  }

  $: $stbSettings = tableOptions;
  $: stbState.synch($stbData);

  // Super Table State Machine
  const stbState = fsm("Loading", {
    "*": {
      handleKeyboard(e) {},
      addFilter(filterObj) {
        this.removeFilter(filterObj.id);
        stbColumnFilters = [...stbColumnFilters, filterObj];
      },
      removeFilter(id) {
        let pos = stbColumnFilters.find((x) => x.id == id);
        if (pos) {
          stbColumnFilters = stbColumnFilters.toSpliced(pos, 1);
        }
      },
      clearFilter() {
        stbColumnFilters = [];
        removeQueryExtension("123");
        return "Idle";
      },
      sortBy(column, order) {
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
      toggleSelectRow(rowID) {
        if ($stbSettings.rowSelectMode == "multi") {
          if ($stbSelected.includes(rowID)) {
            $stbSelected.splice($stbSelected.indexOf(rowID), 1);
            $stbSelected = $stbSelected;
          } else {
            if ($stbSelected.length < selectionLimit || selectionLimit == 0)
              $stbSelected = [...$stbSelected, rowID];
            else
              notificationStore.actions.warning(
                "Cannot select more than " + selectionLimit + " rows"
              );
          }
          onRowSelect?.({
            selectedRows: $stbData.rows.filter((x) =>
              $stbSelected.includes(x[idColumn])
            ),
            selectedIds: $stbSelected,
          });
        } else if ($stbSettings.rowSelectMode == "single") {
          if ($stbSelected.includes(rowID)) {
            $stbSelected = [];
          } else {
            $stbSelected = [rowID];
          }
          onRowSelect?.({
            selectedRows: $stbData.rows.filter((x) =>
              $stbSelected.includes(x[idColumn])
            ),
            selectedIds: $stbSelected,
          });
        }
      },
      toggleSelectAllRows() {
        if ($stbSettings.rowSelectMode == "multi") {
          if ($stbSelected.length != $stbData.rows.length)
            $stbSelected = $stbData.rows.map((x) => x[idColumn]);
          else $stbSelected = [];

          onRowSelect?.({
            selectedRows: $stbData.rows.filter((x) =>
              $stbSelected.includes(x[idColumn])
            ),
            selectedIds: $stbSelected,
          });
        }
      },
      cellChanged(change) {
        console.log("Change", change);

        onCellChange?.({
          rowID: change.rowID,
          field: change.field,
          value: change.value,
          previousValue: change.previousValue,
        });
      },
      cellClicked(columnID, rowID) {},
      rowDblClicked(rowID) {
        onRowDblClick?.($stbData.rows.find((x) => x[idColumn] == rowID));
      },
      rowClicked(rowID) {
        onRowClick?.($stbData.rows.find((x) => x[idColumn] == rowID));
        if (rowSelectMode != "off" && !canEdit) this.toggleSelectRow(rowID);
      },
      getRowColors() {
        if ($stbData?.loading) return;

        if (rowBGColorTemplate || rowColorTemplate) {
          $stbRowColors = [];
          $stbRowColors = $stbData?.rows.map((row) => {
            return {
              bgcolor:
                processStringSync(rowBGColorTemplate ?? "", { Row: row }) ??
                "var(--spectrum-global-color-gray-50)",
              color:
                processStringSync(rowColorTemplate ?? "", { Row: row }) ??
                "var(--spectrum-global-color-gray-800)",
            };
          });
        } else if (zebraColors) {
          $stbRowColors = $stbRowHeights.map((row, idx) => {
            return {
              bgcolor:
                idx % 2 == 1
                  ? "var(--spectrum-global-color-gray-75)"
                  : "inherit",
              color: "var(--spectrum-global-color-gray-800)",
            };
          });
        } else {
          $stbRowColors = $stbRowHeights.map((row) => {
            return {
              bgcolor: "inherit",
              color: "var(--spectrum-global-color-gray-800)",
            };
          });
        }
      },
      setState(state) {
        if (state?.loaded) {
          this.getRowColors();
          return "Idle";
        }
      },
    },
    Idle: {
      _enter() {
        $stbRowHeights =
          visibleRowCount > $stbData?.rows.length
            ? new Array(visibleRowCount).fill(defaultRowHeight)
            : new Array($stbData?.rows.length).fill(defaultRowHeight);

        this.getRowColors();
      },
      synch(fetchState) {
        this.getRowColors();
        if (fetchState?.loading) return "Loading";
      },
    },
    Loading: {
      loaded: "Idle",
      synch(fetchState) {
        if (fetchState?.loaded && stbColumnFilters?.length > 0)
          return "Filtered";
        else return "Idle";
      },
    },
    Filtered: {
      _enter() {
        this.getRowColors();
      },
      synch(fetchState) {
        if (fetchState?.loaded && stbColumnFilters?.length > 0)
          this.getRowColors();
        else return "Idle";
      },
    },
    Editing: {},
    Empty: {},
    Sorted: {},
    Empty: {},
  });

  const syncScroll = (e) => {
    if (columnsBodyAnchor) {
      const { scrollLeftMax, scrollLeft, scrollWidth, clientWidth } =
        columnsBodyAnchor;
      $stbHorizontalRange = scrollLeftMax > 0 ? clientWidth / scrollWidth : 1;
      $stbHorizontalScroll = scrollLeft / scrollLeftMax;
    }
  };

  const createFetch = (datasource) => {
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
    });
  };

  const extendQuery = (defaultQuery, extensions) => {
    const extensionValues = Object.values(extensions || {});
    let extendedQuery = { ...defaultQuery };
    extensionValues.forEach((extension) => {
      Object.entries(extension || {}).forEach(([operator, fields]) => {
        extendedQuery[operator] = {
          ...extendedQuery[operator],
          ...fields,
        };
      });
    });
    return extendedQuery;
  };

  const addQueryExtension = (key, extension) => {
    if (!key || !extension) {
      return;
    }
    queryExtensions = { ...queryExtensions, [key]: extension };
  };

  const removeQueryExtension = (key) => {
    if (!key) {
      return;
    }
    const newQueryExtensions = { ...queryExtensions };
    delete newQueryExtensions[key];
    queryExtensions = newQueryExtensions;
  };

  const makeSuperColumn = (bbcolumn) => {
    let schema = $stbData.schema;
    let superColumn = {
      ...bbcolumn,
      hasChildren: false,
      autocolumn: bbcolumn.autocolumn,
      schema: schema[bbcolumn.name] ?? {},
      sizing: columnSizing,
      fixedWidth: bbcolumn.width ? bbcolumn.width : columnFixedWidth ?? "8rem",
      maxWidth: columnMaxWidth ?? "16rem",
      minWidth: columnMinWidth ?? "6rem",
      canResize: canResize,
      showFooter: showFooter,
      showHeader: showHeader,
      headerHeight:
        size == "custom" ? customCellPadding : sizingMap[size].headerHeight,
      highlighters: highlighters,
      canEdit: bbcolumn.autocolumn
        ? false
        : canEdit && supportEditingMap[schema[bbcolumn.name].type],
      canFilter: supportFilteringMap[schema[bbcolumn.name]?.type]
        ? canFilter
        : false,
      showFilterOperators: showFilterOperators,
      canSort: canSort && supportSortingMap[schema[bbcolumn.name].type],
      filteringOperators: LuceneUtils.getValidOperatorsForType({
        type: schema[bbcolumn.name].type,
      }),
      defaultFilteringOperator: defaultOperatorMap[schema[bbcolumn.name].type],
      cellPadding:
        size == "custom" ? customCellPadding : sizingMap[size].cellPadding,
      headerAlign: bbcolumn.align ? bbcolumn.align : "flex-start",
      useOptionColors: useOptionColors,
      optionsViewMode: optionsViewMode,
      relViewMode: relViewMode,
      zebraColors: zebraColors,
    };
    return superColumn;
  };

  const populateColumns = (data, list, auto) => {
    if (data?.schema) {
      schema = data.schema;
      columns = [];
      autocolumnsList = [];
      if (auto) {
        autocolumnsList = Object.keys(schema)
          .filter((v) => schema[v].autocolumn)
          .map((v) => makeSuperColumn(schema[v]));
      }

      if (list?.length) columns = list.map((column) => makeSuperColumn(column));
      else
        columns = Object.keys(schema)
          .filter(
            (v) =>
              !schema[v].autocolumn &&
              schema[v]?.visible != false &&
              v != idColumn
          )
          .map((v) => makeSuperColumn(schema[v]));

      columns = [...columns, ...autocolumnsList];
    }
  };

  beforeUpdate(() => {
    if (columnsBodyAnchor) {
      const { scrollWidth, clientWidth } = columnsBodyAnchor;
      $stbHorizontalRange =
        scrollWidth > clientWidth ? clientWidth / scrollWidth : 1;
    }
  });

  // Global Bindings
  $: actions = [
    {
      type: ActionTypes.ClearRowSelection,
      callback: () => ($stbSelected = []),
    },
    {
      type: ActionTypes.RefreshDatasource,
      callback: () => stbData.refresh(),
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
        let newOptions = {};
        if (column) {
          newOptions.sortColumn = column;
        }
        if (order) {
          newOptions.sortOrder = order;
        }
        if (Object.keys(newOptions)?.length) {
          fetch.update(newOptions);
        }
      },
    },
  ];

  // Build our data context
  $: dataContext = {
    rows: $stbData?.rows,
    selectedRows: $stbData?.rows.filter((x) =>
      $stbSelected.includes(x[idColumn])
    ),
    selectedIds: $stbSelected,
    info: $stbData?.info,
    datasource: datasource || {},
    schema,
    rowsLength: $stbData?.rows.length,
    pageNumber: $stbData?.pageNumber + 1,
  };

  setContext("tableStateStore", tableStateStore);
  setContext("stbScrollPos", stbScrollPos);
  setContext("stbVerticalScroll", stbVerticalScroll);
  setContext("stbVerticalRange", stbVerticalRange);
  setContext("stbHovered", stbHovered);
  setContext("stbSelected", stbSelected);
  setContext("stbEditing", stbEditing);
  setContext("tableState", stbState);
  setContext("stbSettings", stbSettings);
  setContext("stbSortColumn", stbSortColumn);
  setContext("stbSortOrder", stbSortOrder);
  setContext("stbRowHeights", stbRowHeights);
  setContext("stbRowColors", stbRowColors);
  $: setContext("stbData", stbData);
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  bind:this={anchor}
  tabindex="0"
  class="st-master-wrapper"
  style:font-size={sizingMap[size].rowFontSize}
  style:--spectrum-table-border-color={tableOptions.dividersColor ??
    "var(--spectrum-alias-border-color-mid)"}
  style:--super-table-body-height={maxBodyHeight + "px"}
  style:--super-table-horizontal-dividers={tableOptions.dividers == "both" ||
  tableOptions.dividers == "horizontal"
    ? "1px solid var(--spectrum-table-border-color)"
    : "1px solid transparent"}
  style:--super-table-vertical-dividers={tableOptions.dividers == "both" ||
  tableOptions.dividers == "vertical"
    ? "1px solid var(--spectrum-table-border-color)"
    : "none"}
  on:mouseenter={() => (highlighted = true)}
  on:mouseleave={() => (highlighted = false)}
  on:keydown={stbState.handleKeyboard}
>
  {#key stbData}
    <!-- Context Provider -->
    <Provider {actions} data={dataContext}>
      {#if $stbData?.rows?.length || (stbColumnFilters?.length && (selectionColumn || (canEdit && rowSelectMode != "off")))}
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
          headerHeight={size == "custom"
            ? customCellPadding
            : sizingMap[size].headerHeight}
          loading={$stbData?.loading}
        />
      {/if}

      <div
        bind:this={columnsBodyAnchor}
        class="st-master-columns"
        on:scroll={syncScroll}
      >
        {#if $stbData?.loaded}
          {#if $stbSettings.superColumnsPos == "first"}
            <slot />
          {/if}
          {#if columns?.length}
            {#each columns as column, idx}
              <SuperTableColumn
                {stbState}
                columnOptions={{
                  ...column,
                  canEdit: column.canEdit,
                }}
              />
            {/each}
          {/if}
          {#if $stbSettings.superColumnsPos == "last"}
            <slot />
          {/if}
        {:else}
          <CellSkeleton>Loading ...</CellSkeleton>
        {/if}
      </div>

      {#if $stbData.loaded && $stbData.rows.length == 0}
        <div class="empty" style:top={tableOptions.headerHeight + 16}>
          No Records Found
          {#if stbColumnFilters.length}
            Clear Filters
          {/if}
        </div>
      {/if}

      <SuperTableHorizontalScroller
        {stbHorizontalScroll}
        {stbHorizontalRange}
        {highlighted}
        offset={$stbSettings.rowSelectMode != "off" ||
        $stbSettings.selectionColumn
          ? "3rem"
          : "0rem"}
        verticalOffset={$stbSettings.showFooter ? "40px" : "8px"}
      />

      <SuperTableVerticalScroller
        {stbVerticalScroll}
        {highlighted}
        clientHeight={maxBodyHeight}
        clientScrollHeight={$stbData?.rows.length > tableOptions.visibleRowCount
          ? $stbData?.rows.length * defaultRowHeight
          : maxBodyHeight}
        offset={$stbSettings.showHeader ? "40px" : "8px"}
        bottomOffset={$stbSettings.showFooter ? "32px" : "8px"}
      />
    </Provider>
  {/key}
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

  .empty {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    position: absolute;
    left: 1rem;
    top: 3rem;
    bottom: 1rem;
    right: 1rem;
    z-index: 2;
    background-color: hsla(0, 0%, 50%, 0.1);
    border-radius: 0.5rem;
  }
</style>
