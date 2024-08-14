<script>
  import { getContext, setContext, onDestroy } from "svelte";
  import { writable } from "svelte/store";
  import fsm from "svelte-fsm";

  import {
    sizingMap,
    defaultOperatorMap,
    supportFilteringMap,
    supportSortingMap,
    supportEditingMap,
  } from "./constants.js";

  import ScrollbarsOverlay from "./overlays/ScrollbarsOverlay.svelte";
  import SuperTableColumn from "../SuperTableColumn/SuperTableColumn.svelte";
  import CellSkeleton from "../SuperTableCells/CellSkeleton.svelte";
  import SuperTableSelectionActionBar from "./controls/SuperTableSelectionActionBar.svelte";
  import ActionColumn from "./controls/ActionColumn.svelte";
  import SelectionColumn from "./controls/SelectionColumn.svelte";

  const {
    API,
    processStringSync,
    notificationStore,
    enrichButtonActions,
    getAction,
    ActionTypes,
    Provider,
    fetchData,
    QueryUtils,
    memo,
    builderStore,
  } = getContext("sdk");

  const context = getContext("context");

  // Create Stores
  const stbScrollPos = new writable(0);
  const stbScrollPercent = new writable(0);
  const stbHorizontalScrollPos = new writable(0);
  const stbHorizontalScrollPercent = new writable(0);

  const stbMenuID = new writable(0);
  const stbSelected = new writable([]);
  const stbHovered = new writable(-1);
  const stbEditing = new writable(-1);
  const stbSortColumn = new writable({});
  const stbSortOrder = new writable({});
  const stbRowHeights = new writable([]);
  const stbRowColors = new writable([]);

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
  export let jsoncolumns;

  export let visibleRowCount;
  export let showFooter;
  export let showHeader;
  export let size;
  export let canInsert, canDelete, canEdit, canSort, canResize, canFilter;
  export let deleteIconPosition = "left";
  export let superColumnsPos;

  export let debounce = 750;

  export let rowSelectMode;
  export let rowMenu;
  export let rowMenuItems;
  export let rowMenuIcon = "ri-more-fill";
  export let menuItemsVisible = 0;
  export let selectionMenu;
  export let selectionMenuItems;
  export let preselectedId;
  export let preselectedIds;
  export let selectionColumn;
  export let numberingColumn;
  export let stickFirstColumn = false;
  export let selectionLimit;

  export let columnSizing = "flex";
  export let columnMinWidth = "6rem";
  export let columnMaxWidth = "auto";
  export let columnFixedWidth = "8rem";
  export let dividers, dividersColor;

  export let rowColorTemplate, rowBGColorTemplate;

  export let footerColorTemplate, footerBGColorTemplate;

  export let customCellPadding;
  export let customBaseFont;
  export let customRowHeight;
  export let useOptionColors = true;
  export let optionsViewMode = "pills";
  export let relViewMode = "pills";
  export let zebraColors = false;
  export let quiet;
  export let highlighters;

  // Events
  export let onRowSelect;
  export let onCellChange;
  export let onRowClick;
  export let onRowDblClick;
  export let onInsert;
  export let onDelete;
  export let onEdit;

  let timer;
  let anchor;
  let columns = [];
  let schema = {};
  let query = {};
  let queryExtensions = {};
  let stbColumnFilters = [];
  let highlighted;
  let columnsBodyAnchor;
  let visible = false;
  let horizontalVisible = false;
  let scrollHeight;
  let clientHeight;
  let columnStates = [];
  let clientWidth;

  // Deep compare datasource as its of type Object
  const dataSourceStore = memo({});
  const filterStore = memo(filter);
  const stbSettings = memo({});

  $: inBuilder = $builderStore?.inBuilder;
  $: dataSourceStore.set(datasource);
  $: filterStore.set(filter);
  $: stbSettings.set({
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
    rowMenuIcon,
    headerHeight:
      size == "custom" ? customCellPadding : sizingMap[size].headerHeight,
    features: {
      canFilter,
      canSort,
      canEdit,
      canDelete,
      deleteIconPosition,
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
  });

  $: if (rowSelectMode == "single") $stbSelected[0] = preselectedId;
  $: if (rowSelectMode == "multi" && !Array.isArray(preselectedIds))
    $stbSelected = preselectedIds?.split(",") || [];

  $: if (datasource.type == "provider") {
    let dataProviderId = datasource.providerId;
    let addExtension = getAction(
      dataProviderId,
      ActionTypes.AddDataProviderQueryExtension
    );

    let removeExtension = getAction(
      dataProviderId,
      ActionTypes.RemoveDataProviderQueryExtension
    );
  }

  $: commonColumnOptions = {
    hasChildren: false,
    maxWidth: columnMaxWidth,
    minWidth: columnMinWidth,
    canResize,
    showFooter,
    showHeader,
    cellPadding:
      size == "custom" ? customCellPadding : sizingMap[size].cellPadding,
    headerHeight:
      size == "custom" ? customCellPadding : sizingMap[size].headerHeight,
    highlighters,
    useOptionColors,
    optionsViewMode,
    relViewMode,
    zebraColors,
  };

  $: defaultQuery = QueryUtils.buildQuery($filterStore);
  $: queryExtension = QueryUtils.buildQuery(stbColumnFilters);
  $: query = extendQuery(defaultQuery, [queryExtension]);

  $: stbData = createFetch($dataSourceStore);
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
    jsoncolumns,
    canFilter,
    canEdit,
    columnSizing
  );
  $: stbState.synch($stbData, $stbSettings);
  $: tableId = $stbData?.definition?.tableId || $stbData?.definition?._id;
  $: isEmpty =
    ($stbData.loaded && !$stbData?.rows.length) || columns.length < 1;

  // Generate Layout required variables first so we can render early on
  $: defaultRowHeight =
    size == "custom" ? customRowHeight : sizingMap[size].rowHeight;

  $: maxBodyHeight = visibleRowCount * defaultRowHeight;

  // Reactive Fetch on Scroll
  $: if (
    fetchOnScroll &&
    $stbScrollPercent > 0.8 &&
    !$stbData.loading &&
    limit == $stbData?.rows.length
  ) {
    let old_limit = limit;
    limit = old_limit + fetchPageSize < 1000 ? old_limit + fetchPageSize : 1000;
    $stbScrollPercent -= 0.1;
  }

  // Autorefresh Timer
  $: if (autoRefresh && stbData) {
    if (!timer) {
      timer = setInterval(() => {
        stbData.refresh();
      }, autoRefreshRate * 1000);
    } else {
      clearInterval(timer);
      timer = setInterval(() => {
        stbData.refresh();
      }, autoRefreshRate * 1000);
    }
  } else {
    clearInterval(timer);
  }

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

  // Show Action Column
  $: showActionColumn =
    rowMenu == "columnRight" &&
    (canDelete || canEdit == "advanced" || rowMenuItems.length);

  $: showActionColumnLeft =
    (canDelete && rowMenu == "columnLeft") ||
    (canDelete && !rowMenu) ||
    (rowMenuItems?.length && rowMenu == "columnLeft") ||
    (canEdit == "advanced" && !rowMenu);

  $: showSelectionColumn =
    (rowSelectMode && selectionColumn) ||
    numberingColumn ||
    (canEdit == "simple" && !selectionColumn);

  // Super Table State Machine
  const stbState = fsm("Loading", {
    "*": {
      handleWheel(e) {
        if ($stbData.loading) {
          e.preventDefault();
          return;
        }

        if (e.deltaY) {
          if ($stbScrollPos + e.deltaY <= 0) {
            $stbScrollPos = 0;
            $stbScrollPercent = 0;
            return;
          }

          if ($stbScrollPos + e.deltaY >= scrollHeight - maxBodyHeight) {
            $stbScrollPos = scrollHeight - maxBodyHeight;
            $stbScrollPercent = 1;
            return;
          }
          $stbScrollPos += e.deltaY;
          $stbScrollPercent = $stbScrollPos / scrollHeight;
        } else if (e.deltaX) {
          if ($stbHorizontalScrollPos + e.deltaX < 0) {
            $stbHorizontalScrollPos = 0;
            $stbHorizontalScrollPercent = 0;
            return;
          }

          if (
            $stbHorizontalScrollPos + e.deltaX >
            columnsBodyAnchor?.scrollWidth - columnsBodyAnchor.clientWidth
          ) {
            $stbHorizontalScrollPos =
              columnsBodyAnchor?.scrollWidth - columnsBodyAnchor.clientWidth;
            $stbHorizontalScrollPercent = 1;
            return;
          }

          $stbHorizontalScrollPos += e.deltaX;
          $stbHorizontalScrollPercent =
            $stbHorizontalScrollPos / columnsBodyAnchor.scrollWidth;
        }
      },
      handleRowResize(idx, size) {
        $stbRowHeights[idx] < size ? ($stbRowHeights[idx] = size) : null;
      },
      handleKeyboard(e) {},
      refreshScroll() {
        highlighted = highlighted;
      },
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
      addRow() {
        if (canInsert == "advanced") {
          let event = enrichButtonActions(onInsert, $context);
          event?.();
        } else {
          return "Inserting";
        }
      },
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
      async cellChanged(change) {
        let row = { tableId, _id: change.rowID, [change.field]: change.value };
        await API.patchRow(row);
        stbData.refresh();
        onCellChange?.({
          rowID: change.rowID,
          field: change.field,
          value: change.value,
          previousValue: change.previousValue,
        });
      },
      cellClicked(columnID, rowID) {},
      rowDblClicked(rowID) {
        let row = $stbData.rows.find((x) => x[idColumn] == rowID);
        onRowDblClick?.({ row });
      },
      rowClicked(rowID) {
        let row = $stbData.rows.find((x) => x[idColumn] == rowID);
        onRowClick?.({ row });
        if (rowSelectMode && canEdit != "simple") this.toggleSelectRow(rowID);
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
      _exit() {
        columnStates.forEach((columnState) => {
          columnState.lockWidth();
        });
      },
      synch(fetchState) {
        if (fetchState?.loading) return "Loading";
        $stbRowHeights = new Array($stbData?.rows.length).fill(
          defaultRowHeight
        );
        this.getRowColors();
        columnStates.forEach((columnState) => {
          columnState.unlockWidth();
        });
      },
    },
    Loading: {
      _enter() {},
      synch(fetchState) {
        if (fetchState?.loaded && stbColumnFilters?.length > 0)
          return "Filtered";
        else if (fetchState?.loaded) return "Idle";
      },
    },
    Filtered: {
      _enter() {
        this.getRowColors();
      },
      synch(fetchState) {
        if (fetchState?.loaded && stbColumnFilters?.length > 0) {
          $stbRowHeights = new Array($stbData?.rows.length).fill(
            defaultRowHeight
          );
          this.getRowColors();
        } else return "Idle";
      },
    },
    Editing: {},
    Inserting: {
      _enter() {},
      save() {
        return "Idle";
      },
    },
    Empty: {},
    Sorted: {},
    Empty: {},
  });

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
      fixedWidth: bbcolumn.width ? bbcolumn.width : columnFixedWidth || "8rem",
      sizing: bbcolumn.width ? "fixed" : columnSizing,
      canEdit: bbcolumn.autocolumn
        ? false
        : canEdit == "simple" && supportEditingMap[schema[bbcolumn.name].type],
      canFilter: supportFilteringMap[schema[bbcolumn.name]?.type]
        ? canFilter
        : false,
      canSort: canSort && supportSortingMap[schema[bbcolumn.name]?.type],
      filteringOperators: QueryUtils.getValidOperatorsForType({
        type: schema[bbcolumn.name]?.type,
      }),
      defaultFilteringOperator: defaultOperatorMap[schema[bbcolumn.name]?.type],
      headerAlign: bbcolumn.align ? bbcolumn.align : "flex-start",
      type: bbcolumn.name.endsWith("_self_") ? "link" : bbcolumn.type,
      displayName:
        bbcolumn.name.endsWith("_self_") && bbcolumn.displayName != ""
          ? bbcolumn.name.slice(0, -6)
          : bbcolumn.displayName,
      schema: bbcolumn.name.endsWith("_self_")
        ? {
            ...schema[bbcolumn.name],
            type: "link",
            relationshipType: "self",
            tableId: $dataSourceStore?.tableId,
          }
        : schema[bbcolumn.name] ?? {},
    };
    return superColumn;
  };

  const populateColumns = (data, list, auto, json) => {
    let jsoncolumnslist = [];
    let autocolumnsList = [];
    columns = [];

    if (data?.schema) {
      schema = data.schema;

      if (auto) {
        autocolumnsList = Object.keys(schema)
          .filter((v) => schema[v].autocolumn)
          .map((v) => makeSuperColumn(schema[v]));
      }

      if (json) {
        jsoncolumnslist = Object.keys(schema)
          .filter((v) => schema[v].type == "json")
          .map((v) => makeSuperColumn(schema[v]));
      }

      if (list?.length) {
        columns = list.map((column) => makeSuperColumn(column));
      } else {
        columns = Object.keys(schema)
          .filter(
            (v) =>
              !schema[v].autocolumn &&
              schema[v].type != "json" &&
              schema[v]?.visible != false &&
              v != idColumn
          )
          .map((v) => makeSuperColumn(schema[v]));
      }

      columns = [...columns, ...jsoncolumnslist, ...autocolumnsList];
    }
  };

  setContext("stbScrollPos", stbScrollPos);
  setContext("stbHovered", stbHovered);
  setContext("stbSelected", stbSelected);
  setContext("stbEditing", stbEditing);
  setContext("stbState", stbState);
  setContext("stbSettings", stbSettings);
  setContext("stbSortColumn", stbSortColumn);
  setContext("stbSortOrder", stbSortOrder);
  setContext("stbRowHeights", stbRowHeights);
  setContext("stbRowColors", stbRowColors);
  $: setContext("stbData", stbData);

  onDestroy(() => {
    if (timer) clearInterval(timer);
  });
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  bind:this={anchor}
  tabindex="0"
  class="st-master-wrapper"
  style:font-size={sizingMap[size].rowFontSize}
  style:--spectrum-table-border-color={$stbSettings.dividersColor ??
    "var(--spectrum-alias-border-color-mid)"}
  style:--super-table-body-height={maxBodyHeight + "px"}
  style:--super-table-horizontal-dividers={$stbSettings.dividers == "both" ||
  $stbSettings.dividers == "horizontal"
    ? "1px solid var(--spectrum-table-border-color)"
    : "1px solid transparent"}
  style:--super-table-vertical-dividers={$stbSettings.dividers == "both" ||
  $stbSettings.dividers == "vertical"
    ? "1px solid var(--spectrum-table-border-color)"
    : "none"}
  on:mouseenter={() => (highlighted = true)}
  on:mouseleave={() => (highlighted = false)}
  on:keydown={stbState.handleKeyboard}
  on:wheel={stbState.handleWheel}
  on:mousedown={(e) => {
    if (inBuilder) {
      e.preventDefault();
    }
  }}
>
  {#key stbData}
    <!-- Context Provider -->
    <Provider {actions} data={dataContext}>
      {#if showSelectionColumn && !isEmpty && $stbData?.loaded}
        <SelectionColumn
          {quiet}
          sticky={$stbHorizontalScrollPos}
          headerHeight={size == "custom"
            ? customCellPadding
            : sizingMap[size].headerHeight}
          loading={$stbData?.loading}
        />
      {/if}

      {#if isEmpty}
        <div
          class="empty"
          style:top={columns.length ? $stbSettings.headerHeight + 16 : 16}
        >
          No Records Found
        </div>
      {/if}

      {#if showActionColumnLeft}
        <ActionColumn
          sticky={$stbHorizontalScrollPos}
          {quiet}
          {rowMenuItems}
          {onInsert}
          {onDelete}
          {onEdit}
          {stbMenuID}
          {menuItemsVisible}
          {rowMenu}
          {visible}
          {horizontalVisible}
          {stbHorizontalScrollPos}
          headerHeight={size == "custom"
            ? customCellPadding
            : sizingMap[size].headerHeight}
          loading={$stbData?.loading}
        />
      {/if}

      {#if $stbData?.loaded && stickFirstColumn && columns.length}
        {@const column = columns[0]}
        {@const idx = 0}
        <SuperTableColumn
          bind:clientHeight
          bind:scrollHeight
          bind:clientWidth
          bind:columnState={columnStates[idx]}
          {stbState}
          sticky={true}
          scrollPos={$stbHorizontalScrollPos}
          columnOptions={{
            ...column,
            ...commonColumnOptions,
            isFirst: idx == 0,
            isLast: idx == columns.length - 1 && !showActionColumn && visible,
          }}
        />
      {/if}

      <div bind:this={columnsBodyAnchor} class="st-master-columns">
        {#if $stbData?.loaded}
          {#if $stbSettings.superColumnsPos == "first"}
            <slot />
          {/if}
          {#if columns?.length}
            {#each columns as column, idx}
              {#if !stickFirstColumn && idx === 0}
                <SuperTableColumn
                  bind:clientHeight
                  bind:scrollHeight
                  bind:columnState={columnStates[idx]}
                  {stbState}
                  columnOptions={{
                    ...column,
                    ...commonColumnOptions,
                    isFirst: idx == 0,
                    isLast:
                      idx == columns.length - 1 && !showActionColumn && visible,
                  }}
                />
              {:else if stickFirstColumn && idx == 0}
                <span style="display: none;"></span>
              {:else}
                <SuperTableColumn
                  bind:columnState={columnStates[idx]}
                  {stbState}
                  columnOptions={{
                    ...column,
                    ...commonColumnOptions,
                    isFirst: idx == 0,
                    isLast:
                      idx == columns.length - 1 && !showActionColumn && visible,
                  }}
                />
              {/if}
            {/each}
          {/if}

          {#if $stbSettings.superColumnsPos == "last"}
            <slot />
          {/if}
        {:else}
          <CellSkeleton>Loading ...</CellSkeleton>
        {/if}
      </div>

      {#if showActionColumn}
        <ActionColumn
          {stbHorizontalScrollPercent}
          {quiet}
          {rowMenuItems}
          {onInsert}
          {onDelete}
          {onEdit}
          {stbMenuID}
          {menuItemsVisible}
          {rowMenu}
          {visible}
          {horizontalVisible}
          right={true}
          headerHeight={size == "custom"
            ? customCellPadding
            : sizingMap[size].headerHeight}
          loading={$stbData?.loading}
        />
      {/if}

      {#if selectionMenu}
        <SuperTableSelectionActionBar
          {anchor}
          open={$stbSelected?.length && $stbData?.rows?.length}
          {selectionMenuItems}
          {stbSelected}
        ></SuperTableSelectionActionBar>
      {/if}

      <ScrollbarsOverlay
        bind:visible
        bind:horizontalVisible
        anchor={columnsBodyAnchor}
        {clientHeight}
        {scrollHeight}
        {stbScrollPos}
        {stbHorizontalScrollPos}
        {highlighted}
        verticalTopOffset={showHeader ? "40px" : "8px"}
        verticalBottomOffset={showFooter ? "40px" : "8px"}
        horizontalOffset={showSelectionColumn && stickFirstColumn
          ? clientWidth + 40 + "px"
          : stickFirstColumn
            ? clientWidth + "px"
            : showSelectionColumn
              ? "2.4rem"
              : "0.5rem"}
        bottomOffset={showFooter ? "40px" : "8px"}
      />
    </Provider>
  {/key}
</div>

<style>
  .st-master-wrapper {
    flex: auto;
    position: relative;
    display: flex;
    flex-direction: row;
    justify-content: stretch;
    align-items: stretch;
    border: 1px solid var(--spectrum-global-color-gray-200);
  }
  .st-master-columns {
    position: relative;
    flex: 1 1 auto;
    display: flex;
    flex-direction: row;
    align-items: stretch;
    justify-content: stretch;
    overflow: scroll;
    scrollbar-width: none;
    background-color: transparent;
    min-height: var(--super-table-body-height);
    min-width: 260px;
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
  :global(.super-column) {
    flex: 1 1 auto;
    position: relative;
    border-right: var(--super-table-vertical-dividers);
    color: var(--super-table-color);
    display: flex;
    flex-direction: column;
    align-items: stretch;
    overflow-x: hidden;
  }
  :global(.super-column.sticky) {
    filter: drop-shadow(2px 0px 2px rgba(0, 0, 0, 0.5));
    border-right: 1px solid var(--spectrum-global-color-gray-200);
    background-color: var(--spectrum-global-color-gray-75) !important;
    z-index: 1;
  }
  :global(.super-column > .grabber) {
    width: 5px;
    position: absolute;
    right: 0px;
    top: 8px;
    border-radius: 2px;
    z-index: 10;
    background-color: var(--spectrum-global-color-gray-200);
    transition: all 130ms ease-in-out;
  }
  :global(.super-column > .grabber:hover) {
    width: 5px;
    background-color: var(--spectrum-global-color-gray-600);
    cursor: col-resize;
  }
  :global(.super-row) {
    display: flex;
    justify-content: center;
    align-items: stretch;
    color: var(--spectrum-global-color-gray-400);
    border-bottom: var(--super-table-horizontal-dividers);
  }
  :global(.super-row.isLast) {
    padding-right: 1.5rem;
  }

  :global(.super-row.odd) {
    background-color: var(--spectrum-global-color-gray-75);
  }
  :global(.super-row.is-hovered) {
    background-color: var(--spectrum-global-color-gray-75) !important;
  }
  :global(.super-row.is-selected) {
    background-color: var(
      --spectrum-table-m-regular-row-background-color-selected-hover,
      var(--spectrum-alias-highlight-selected-hover)
    ) !important;
  }
  :global(.super-row.is-hovered.is-selected) {
    background-color: var(
      --spectrum-table-m-regular-row-background-color-selected-hover,
      var(--spectrum-alias-highlight-selected-hover)
    ) !important;
    color: var(--spectrum-global-color-gray-900) !important;
  }
  :global(.super-row.is-editing, .spectrum-Table-body.is-editing) {
    background-color: var(--spectrum-global-color-gray-75) !important;
  }
  :global(.super-row.is-inserting) {
    border: 2px solid
      var(
        --spectrum-table-m-regular-row-background-color-selected-hover,
        var(--spectrum-alias-highlight-selected-hover)
      );
    background-color: var(--spectrum-global-color-gray-75) !important;
    color: var(--spectrum-global-color-gray-900) !important;
  }

  :global(.super-row.contentsWrapper) {
    flex: 1 1 auto;
    display: flex;
    align-items: center;
  }
</style>
