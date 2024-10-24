<script>
  import { getContext, setContext, onDestroy, tick } from "svelte";
  import fsm from "svelte-fsm";

  import {
    sizingMap,
    defaultOperatorMap,
    supportFilteringMap,
    supportSortingMap,
    supportEditingMap,
  } from "./constants.js";

  // Overlays
  import ScrollbarsOverlay from "./overlays/ScrollbarsOverlay.svelte";
  import EmptyResultSetOverlay from "./overlays/EmptyResultSetOverlay.svelte";
  import AddNewRowOverlay from "./overlays/AddNewRowOverlay.svelte";
  import SelectedActionsOverlay from "./overlays/SelectedActionsOverlay.svelte";

  // Components
  import SuperTableColumn from "../SuperTableColumn/SuperTableColumn.svelte";
  import CellSkeleton from "../SuperTableCells/CellSkeleton.svelte";
  import RowButtonsColumn from "./controls/RowButtonsColumn.svelte";
  import SelectionColumn from "./controls/SelectionColumn.svelte";
  import RowContextMenu from "./overlays/RowContextMenu.svelte";

  // Sections
  import ControlSection from "./controls/ControlSection.svelte";
  import ColumnsSection from "./controls/ColumnsSection.svelte";

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
    derivedMemo,
    builderStore,
  } = getContext("sdk");

  const context = getContext("context");

  // Create Stores
  const stbScrollPos = memo(0);
  const stbScrollOffset = memo(0);
  const stbScrollPercent = memo(0);
  const stbHorizontalScrollPos = memo(0);
  const stbHorizontalScrollPercent = memo(0);

  const stbVisibleRows = memo([]);

  const stbMenuID = memo(-1);
  const stbMenuAnchor = memo(-1);
  const stbSelected = memo([]);
  const stbHovered = memo(-1);
  const stbEditing = memo(-1);
  const stbSortColumn = memo({});
  const stbSortOrder = memo({});
  const stbRowMetadata = memo([{}]);

  // Internally used to appropriately enrich context
  // this is component.id of the wrapper component seen by budibase
  export let comp_id;
  export let inBuilder;

  // Properties
  export let datasource;
  export let idColumn;
  export let sortColumn;
  export let sortOrder;
  export let limit;
  export let fetchOnScroll;
  export let autoRefresh;
  export let autoRefreshRate;
  export let paginate;
  export let filter;
  export let emptyMessage;

  export let columnList = [];
  export let autocolumns;
  export let jsoncolumns;

  export let showFooter;
  export let showHeader;
  export let size;
  export let canInsert, canDelete, canEdit, canResize, canFilter, canSelect;
  export let superColumnsPos;

  export let debounce = 750;
  export let rowMenu;
  export let rowMenuItems;
  export let rowMenuIcon = "ri-more-fill";
  export let menuItemsVisible = 0;
  export let rowContextMenuItems;

  export let preselectedIds;
  export let hideSelectionColumn;
  export let numberingColumn;
  export let stickFirstColumn = false;
  export let maxSelected = 0;
  export let selectedActions;

  export let columnSizing = "flex";
  export let columnMinWidth = "6rem";
  export let columnMaxWidth = "auto";
  export let columnFixedWidth = "8rem";
  export let dividers, dividersColor;

  export let rowColorTemplate, rowBGColorTemplate;

  export let footerColorTemplate, footerBGColorTemplate;

  export let useOptionColors = true;
  export let optionsViewMode = "pills";
  export let relViewMode = "pills";
  export let zebraColors = false;
  export let quiet;
  export let highlighters;
  export let entitySingular = "Row";
  export let entityPlural = "Rows";

  // Events
  export let onRowSelect;
  export let onCellChange;
  export let onRowClick;
  export let onRowDblClick;
  export let onInsert;
  export let afterInsert;
  export let onDelete;
  export let afterDelete;
  export let afterEdit;

  // Internal Variables
  let timer;

  let stbColumnFilters = [];
  let highlighted;
  let scrollHeight;
  let clientHeight;
  let columnStates = [];
  let canScroll;
  let horizontalVisible;
  let maxBodyHeight;
  let viewport;
  let columnsViewport;
  let start = 0;
  let end = 0;
  let itemHeight = 36;
  let overflow;
  let isEmpty;

  // Inserting New Record
  let temp_scroll_pos;
  let new_row;

  // The Super Table API
  const tableAPI = {
    populateColumns: (schema, list, auto, json) => {
      let jsoncolumnslist = [];
      let autocolumnsList = [];
      let columns = [];

      if (schema) {
        if (auto) {
          autocolumnsList = Object.keys(schema)
            .filter((v) => schema[v].autocolumn)
            .map((v) => tableAPI.enrichColumn(schema, schema[v]));
        }

        if (json) {
          jsoncolumnslist = Object.keys(schema)
            .filter((v) => schema[v].type == "json")
            .map((v) => tableAPI.enrichColumn(schema, schema[v]));
        }

        if (list?.length) {
          columns = list.map((column) => tableAPI.enrichColumn(schema, column));
        } else {
          columns = Object.keys(schema)
            .filter(
              (v) =>
                !schema[v].autocolumn &&
                schema[v].type != "json" &&
                schema[v]?.visible != false &&
                v != idColumn
            )
            .map((v) => tableAPI.enrichColumn(schema, schema[v]));
        }

        return [...columns, ...jsoncolumnslist, ...autocolumnsList];
      }
    },
    enrichColumn: (schema, bbcolumn) => {
      let type = schema[bbcolumn.name]?.type;
      return {
        ...bbcolumn,
        widthOverride: bbcolumn.width,
        readonly: schema[bbcolumn.name]?.readonly,
        canEdit:
          supportEditingMap[type] &&
          canEdit &&
          !inBuilder &&
          !schema[bbcolumn.name]?.readonly,
        canFilter: supportFilteringMap[type] ? canFilter : false,
        canSort: supportSortingMap[type],
        filteringOperators: QueryUtils.getValidOperatorsForType({ type }),
        defaultFilteringOperator: defaultOperatorMap[type],
        headerAlign: bbcolumn.align ? bbcolumn.align : "flex-start",
        type: bbcolumn.name.endsWith("_self_") ? "link" : type,
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
          : (schema[bbcolumn.name] ?? {}),
      };
    },
    enrichContext: (row) => {
      return {
        ...$context,
        [comp_id]: {
          ...$context[comp_id],
          row,
        },
      };
    },
    registerSuperColumn: (id, state) => {
      columnStates = [...columnStates, { id, state }];
    },
    unregisterSuperColumn: (id) => {
      let pos = columnStates.findIndex((col) => col.id == id);
      if (pos > -1) {
        columnStates.splice(pos, 1);
        columnStates = columnStates;
      }
    },
    executeRowButtonAction: async (index, action) => {
      let cmd = enrichButtonActions(
        action,
        tableAPI.enrichContext($stbData.rows[index])
      );
      await cmd?.();
    },
    executeRowOnClickAction: async (index) => {
      await tableAPI.executeRowButtonAction(index, onRowClick);
    },
    executeRowOnDblClickAction: async (id) => {
      await tableAPI.executeRowButtonAction(id, onRowDblClick);
    },
    executeRowOnSelectAction: async (index) => {
      await tick();
      let cmd = enrichButtonActions(
        onRowSelect,
        tableAPI.enrichContext($stbData.rows[index])
      );
      await cmd?.();
    },
    showContextMenu: (id, anchor) => {
      if (rowContextMenuItems.length && $stbMenuID != id) {
        $stbMenuID = id;
        $stbMenuAnchor = anchor;
      } else {
        $stbMenuID = -1;
        $stbMenuAnchor = -1;
      }
    },
    executeRowContextMenuAction: async (id, action) => {
      await tableAPI.executeRowButtonAction(id, action);
    },
    executeSelectedRowsAction: async (action) => {
      tableAPI.executeRowButtonAction(null, action);
    },
    selectRow: (index) => {
      let id = $stbData.rows[index][idColumn];

      if (maxSelected != 1) {
        if ($stbSelected.includes(id)) {
          $stbSelected.splice($stbSelected.indexOf(id), 1);
          $stbSelected = $stbSelected;
        } else {
          if (maxSelected == 0 || $stbSelected.length < maxSelected)
            $stbSelected = [...$stbSelected, id];
          else
            notificationStore.actions.warning(
              "Cannot select more than " +
                maxSelected +
                " " +
                (entityPlural || "Rows")
            );
        }
      } else {
        if ($stbSelected.includes(id)) {
          $stbSelected = [];
        } else {
          $stbSelected = [id];
        }
      }

      // Fire Assigned Events
      tableAPI.executeRowOnSelectAction(index);
    },
    selectAllRows: () => {
      if ($stbSelected.length != $stbData.rows.length)
        $stbSelected = $stbData.rows.map((x) => x[idColumn]);
      else $stbSelected = [];

      tableAPI.executeRowOnSelectAction();
    },
    insertRow: async (row) => {
      let cmd_after = enrichButtonActions(afterInsert, $context);
      let saved_row;

      if (onInsert && onInsert.length) {
        let cmd = enrichButtonActions(onInsert, $context);
        await cmd?.();
      } else {
        stbState.startSave();
        try {
          saved_row = await API.saveRow({ ...new_row, tableId });
        } catch (e) {
          console.log(e);
        } finally {
          await cmd_after?.({ newRow: saved_row });
          stbState.endSave();
        }
      }
    },
    deleteRow: async (index) => {
      let id = $stbData.rows[index][idColumn];
      let row = $stbData.rows[index];

      let autoDelete = [
        {
          parameters: {
            confirm: true,
            notificationOverride: true,
            customTitleText: "Delete " + entitySingular + " ?",
            confirmText:
              "Are you sure you want to delete this " + entitySingular + " ?",
            tableId: tableId,
            rowId: id,
          },
          "##eventHandlerType": "Delete Row",
        },
      ];

      let cmd;
      let cmd_after = enrichButtonActions(
        afterDelete,
        tableAPI.enrichContext($stbData.rows[index])
      );

      if (onDelete?.length) {
        cmd = enrichButtonActions(
          onDelete,
          tableAPI.enrichContext($stbData.rows[index])
        );
      } else {
        cmd = enrichButtonActions(autoDelete, {});
      }

      await cmd?.({ row });
      await cmd_after?.({ row });
      stbData.refresh();
    },
    deleteSelectedRows: async () => {
      let autoDelete = [
        {
          parameters: {
            confirm: true,
            notificationOverride: true,
            customTitleText:
              "Delete " + $stbSelected.length + " " + entityPlural + " ?",
            confirmText:
              "Are you sure you want to delete these " + entityPlural + " ?",
            tableId: tableId,
            rowId: $stbSelected,
          },
          "##eventHandlerType": "Delete Row",
        },
      ];
      let cmd = enrichButtonActions(autoDelete, {});
      let cmd_after = enrichButtonActions(afterDelete, $context);
      await cmd?.();
      await cmd_after?.();
      stbData.refresh();
    },
    patchRow: async (patch) => {
      if (tableId) {
        try {
          let row = await API.patchRow({
            tableId,
            ...patch,
          });
          stbState.endSave();
          let richContext = {
            ...$context,
            [comp_id]: { row },
          };
          let cmd_after = enrichButtonActions(afterEdit, richContext);
          await cmd_after?.({ row });
          return row;
        } catch (ex) {
          console.log(ex);
        }
      }
    },
  };

  // Super Table State Machine
  const stbState = fsm("Init", {
    "*": {
      init() {
        return "Init";
      },
      refresh() {
        this.enrichRows();
      },
      enrichRows() {
        $stbRowMetadata = $stbData.rows.map((row, index) => {
          return {
            height: sizingMap[$stbSettings.appearance.size].rowHeight,
            bgcolor: rowBGColorTemplate
              ? processStringSync(rowBGColorTemplate, {
                  [comp_id]: { row },
                })
              : undefined,
            color: rowColorTemplate
              ? processStringSync(rowColorTemplate, {
                  [comp_id]: { row },
                })
              : undefined,
          };
        });
      },
      scrollTo(position) {
        $stbScrollPos = position;
        this.calculateRowBoundaries();
      },
      scrollToEnd() {
        $stbScrollPos = scrollHeight - maxBodyHeight;
        this.calculateRowBoundaries();
      },
      async calculateBoundaries() {
        let rows = $stbData.rows;
        itemHeight = $stbSettings.appearance.rowHeight;
        maxBodyHeight =
          viewport.clientHeight -
          $stbSettings.appearance.headerHeight -
          $stbSettings.appearance.footerHeight;

        scrollHeight =
          $stbRowMetadata.reduce((accumulator, currentValue) => {
            return accumulator + currentValue.height;
          }, 0) + 128;

        canScroll = scrollHeight > maxBodyHeight;
        overflow = canScroll;

        await tick();
        let content_height = 0;
        let i = start;

        while (content_height < maxBodyHeight && i < rows.length) {
          let row = rows[i - start];

          if (!row) {
            end = i;
            await tick(); // render the newly visible row
            row = rows[i - start];
          }

          const row_height = $stbRowMetadata[i].height;
          content_height += row_height;
          i += 1;
        }

        end = i;
      },
      calculateRowBoundaries() {
        let i = 0;
        let y = 0;

        while (i < $stbData.rows.length) {
          const row_height = $stbRowMetadata[i].height;
          if (y + row_height >= $stbScrollPos) {
            start = i;
            break;
          }

          y += row_height;
          i += 1;
        }

        while (i < $stbData.rows.length) {
          y += $stbRowMetadata[i].height;
          i += 1;

          if (y > $stbScrollPos + maxBodyHeight) break;
        }
        end = i;
      },
      async handleVerticalScroll(delta) {
        $stbScrollPos = Math.max(
          Math.min($stbScrollPos + delta, scrollHeight - maxBodyHeight),
          0
        );
        await this.calculateRowBoundaries.debounce(10);
        $stbScrollPercent = $stbScrollPos / (scrollHeight - maxBodyHeight);
        $stbScrollOffset = Math.floor($stbScrollPos % itemHeight);
      },
      handleWheel(e) {
        if ($stbData.loading || $stbState == "Inserting") {
          e.preventDefault();
          return;
        }

        if (e.deltaY && canScroll) {
          e.preventDefault();
          this.handleVerticalScroll(e.deltaY);
        } else if (e.deltaX) {
          if ($stbHorizontalScrollPos + e.deltaX < 0) {
            $stbHorizontalScrollPos = 0;
            $stbHorizontalScrollPercent = 0;
            return;
          }
          if (
            $stbHorizontalScrollPos + e.deltaX >
            columnsViewport?.scrollWidth - columnsViewport.clientWidth
          ) {
            $stbHorizontalScrollPos =
              columnsViewport?.scrollWidth - columnsViewport.clientWidth;
            $stbHorizontalScrollPercent = 1;
            return;
          }

          $stbHorizontalScrollPos += e.deltaX;
          $stbHorizontalScrollPercent =
            $stbHorizontalScrollPos / columnsViewport.scrollWidth;
        }
      },
      handleKeyboard(e) {
        // TODO : Table Keyboard Handler
      },
      sortBy(column, order) {
        sortColumn = column;
        sortOrder = order;
        $stbSortColumn = column;
        $stbSortOrder = order;
      },
      resizeRow(index, size) {
        $stbRowMetadata[index].height =
          size || $stbSettings.appearance.rowHeight;
        this.calculateBoundaries.debounce(20);
      },
      handleRowClick(index) {
        if (canSelect && !canEdit) tableAPI.selectRow(index);
        tableAPI.executeRowOnClickAction(index);
      },
      addRow() {
        if (!onInsert || onInsert?.length == 0) {
          return "Inserting";
        } else {
          tableAPI.insertRow();
        }
      },
      edit() {
        return "Editing";
      },
    },
    Init: {
      _enter() {
        if (timer) clearInterval(timer);
        start = 0;
        end = 0;
        $stbScrollPos = 0;
        $stbScrollOffset = 0;
        $stbHorizontalScrollPos = 0;
        $stbVisibleRows = [];
        this.calculateBoundaries();
      },
      synch(fetchState) {
        if (fetchState.loaded) {
          if (autoRefresh && !inBuilder) {
            timer = setInterval(() => {
              stbData.refresh();
            }, autoRefreshRate * 1000);
            a;
          }
          this.enrichRows();
          return "Idle";
        }
      },
    },
    Idle: {
      _enter() {
        if ($stbData.loading) return;
        this.enrichRows();
        isEmpty = $stbData.rows.length < 1;
        this.calculateBoundaries();
        this.calculateRowBoundaries();
      },
      _exit() {},
      synch(fetchState) {
        if (fetchState.loaded) {
          this.enrichRows();
          this.calculateBoundaries();
          this.calculateRowBoundaries();
          isEmpty = !$stbData?.rows.length;
        }
      },
      addFilter(filterObj) {
        stbColumnFilters = [...stbColumnFilters, filterObj];
        return "Filtered";
      },
      fetchMoreRows(size) {
        if ($stbData.hasNextPage) {
          limit = limit + size;
          stbData.update({ limit });
        }
      },
    },
    Filtered: {
      _enter() {},
      _exit() {},
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
      clearFilter(id) {
        let pos = stbColumnFilters.find((x) => x.id == id);
        if (pos) {
          stbColumnFilters = stbColumnFilters.toSpliced(pos, 1);
        }
        if (!stbColumnFilters.length) return "Idle";
      },
      clear() {
        stbColumnFilters = [];
        columnStates.forEach(({ state }) => state.reset());
        return "Idle";
      },
      synch(fetchState) {
        if (fetchState.loaded) {
          this.enrichRows();
          this.calculateRowBoundaries();
          isEmpty = fetchState.rows.length < 1;
        }
      },
    },
    Editing: {
      endEdit() {
        return "Idle";
      },
      startSave() {
        return "Saving";
      },
      patchRow(index, id, rev, field, change) {
        let patch = { _id: id, _rev: rev, [field]: change };
        tableAPI.patchRow(index, patch);
      },
    },
    Inserting: {
      _enter() {
        columnStates.forEach(({ state }) => state.addRow());
        new_row = {};
        temp_scroll_pos = $stbScrollPos;
        this.scrollToEnd();
      },
      _exit() {
        columnStates.forEach(({ state }) => state.cancelAddRow());
        this.scrollTo(temp_scroll_pos);
      },
      cancelAddRow() {
        return "Idle";
      },
      setValue(field, value) {
        new_row[field] = value;
      },
      startSave() {
        return "Saving";
      },
    },
    Saving: {
      endSave(e) {
        stbData.refresh();
      },
    },
  });

  // Turm non primitive props into reactive stores to limit refreshes
  const dataSourceStore = memo(datasource);
  const columnsStore = memo(columnList);
  const filterStore = memo(filter);
  const stbSettings = memo({});
  const stbSchema = memo(0);

  $: dataSourceStore.set(datasource);
  $: filterStore.set(filter);
  $: columnsStore.set(columnList);
  $: stbSchema.set($stbData?.schema);
  $: stbSelected.set(preselectedIds ?? []);

  // Reactively set the Table Settings store
  $: stbSettings.set({
    inBuilder: $builderStore?.inBuilder,
    autocolumns,
    superColumnsPos,
    columnSizing,
    columnMaxWidth,
    columnMinWidth,
    columnFixedWidth,
    debounce,
    hideSelectionColumn,
    dividers,
    dividersColor,
    showFooter,
    showHeader,
    rowMenuIcon,
    features: {
      canSelect,
      maxSelected,
      canFilter,
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
      emptyMessage: emptyMessage || "No Records Found",
      paginate,
      autoRefresh,
      autoRefreshRate,
      fetchOnScroll,
      schema: $stbSchema,
    },
    appearance: {
      size,
      headerHeight: showHeader ? sizingMap[size].headerHeight : 0,
      footerHeight: showFooter ? sizingMap[size].headerHeight : 0,
      rowHeight: sizingMap[size].rowHeight,
      numberingColumn,
      hideSelectionColumn,
      quiet,
      useOptionColors,
      optionsViewMode,
      relViewMode,
      zebraColors,
      dynamicColors: true,
      highlighters,
      rowColorTemplate,
      rowBGColorTemplate,
      footerColorTemplate,
      footerBGColorTemplate,
      cellPadding: sizingMap[size].cellPadding,
    },
    events: {
      onRowClick,
      onRowDblClick,
      onCellChange,
      onRowSelect,
      onDelete,
      afterDelete,
    },
  });

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

  // Data Related
  $: defaultQuery = QueryUtils.buildQuery($filterStore);
  $: queryExtension = QueryUtils.buildQuery(stbColumnFilters);
  $: query = extendQuery(defaultQuery, [queryExtension]);
  $: stbData = createFetch($dataSourceStore);
  $: stbData?.update({
    query,
    sortColumn,
    sortOrder,
    limit,
  });

  // Derived Store with the columns to be rendered
  $: superColumns = derivedMemo(
    [stbSchema, columnsStore, stbSettings],
    ([$stbSchema, $columnsStore, $stbSettings]) => {
      if ($stbSchema)
        return tableAPI.populateColumns(
          $stbSchema,
          $columnsStore,
          autocolumns,
          jsoncolumns
        );
    }
  );

  // Derived Store with common column settings
  const commonColumnOptions = derivedMemo(stbSettings, ($stbSettings) => {
    return {
      hasChildren: false,
      maxWidth: columnMaxWidth,
      minWidth: columnMinWidth,
      fixedWidth: columnFixedWidth || "8rem",
      sizing: columnSizing,
      canResize,
      showFooter,
      showHeader,
      cellPadding: sizingMap[size].cellPadding,
      headerHeight: sizingMap[size].headerHeight,
      rowHeight: sizingMap[size].rowHeight,
      highlighters,
      useOptionColors: $stbSettings?.appearance?.useOptionColors || false,
      optionsViewMode,
      relViewMode,
      zebraColors,
      quiet,
    };
  });

  $: stbState.synch($stbData);
  $: tableId = $stbData?.definition?.tableId || $stbData?.definition?._id;

  $: dividersStyles = {
    color:
      $stbSettings.dividersColor ?? "var(--spectrum-global-color-gray-200)",
    horizontal:
      $stbSettings.dividers == "both" || $stbSettings.dividers == "horizontal"
        ? "1px solid var(--spectrum-global-color-gray-200)"
        : "1px solid transparent",
    vertical:
      $stbSettings.dividers == "both" || $stbSettings.dividers == "vertical"
        ? "1px solid var(--spectrum-global-color-gray-200)"
        : "none",
  };

  // Reactive Fetch on Scroll
  $: if (fetchOnScroll && $stbScrollPercent > 0.8) {
    stbState.fetchMoreRows(100);
  }

  // Build our data and actions ontext
  $: actions = [
    {
      type: ActionTypes.ClearRowSelection,
      callback: () => ($stbSelected = []),
    },
    {
      type: ActionTypes.RefreshDatasource,
      callback: () => stbData?.refresh(),
    },
  ];

  // The "row" is dynamically enriched, but show the first one in the builder for preview
  $: dataContext = {
    row: inBuilder ? $stbData?.rows[0] : {},
    hoveredRow: $stbData?.rows[$stbHovered],
    rows: $stbData?.rows,
    selectedRows: $stbData?.rows.filter((x) =>
      $stbSelected.includes(x[idColumn])
    ),
    selectedIds: $stbSelected,
    info: $stbData?.info,
    datasource: datasource || {},
    schema: $stbSchema,
    rowsLength: $stbData?.rows.length,
    pageNumber: $stbData?.pageNumber + 1,
    entitySingular,
    entityPlural,
  };

  // Show Action Buttons Column
  $: showButtonColumnRight = rowMenu == "columnRight" && rowMenuItems.length;
  $: showButtonColumnLeft = rowMenu == "columnLeft" && rowMenuItems?.length;

  // Virtual List Capabilities
  $: if ($stbData?.loaded)
    stbState.calculateBoundaries(clientHeight, $stbSettings, stbData);

  $: $stbVisibleRows = $stbData.rows.slice(start, end).map((data, i) => {
    return { index: i + start, data };
  });

  const createFetch = (datasource) => {
    stbState.init();
    return fetchData({
      API,
      datasource,
      options: {
        query,
        sortColumn,
        sortOrder,
        limit,
        paginate: true,
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

  // Expose Context
  setContext("stbScrollPos", stbScrollPos);
  setContext("stbScrollOffset", stbScrollOffset);
  setContext("stbHorizontalScrollPos", stbHorizontalScrollPos);
  setContext("stbHovered", stbHovered);
  setContext("stbSelected", stbSelected);
  setContext("stbEditing", stbEditing);
  setContext("stbState", stbState);
  setContext("stbSettings", stbSettings);
  setContext("stbSortColumn", stbSortColumn);
  setContext("stbSortOrder", stbSortOrder);
  setContext("stbMenuID", stbMenuID);
  setContext("stbMenuAnchor", stbMenuAnchor);
  setContext("stbAPI", tableAPI);
  setContext("stbVisibleRows", stbVisibleRows);
  setContext("stbRowMetadata", stbRowMetadata);
  $: setContext("stbData", stbData);

  onDestroy(() => {
    if (timer) clearInterval(timer);
  });

  $: console.log("Table State : " + $stbState);
  $: console.log("Table Filters : ", stbColumnFilters);
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="super-table"
  bind:this={viewport}
  bind:clientHeight
  style:font-size={sizingMap[size].rowFontSize}
  style:--spectrum-table-border-color={dividersStyles.color}
  style:--super-table-body-height={maxBodyHeight}
  style:--super-table-header-height={$stbSettings.appearance.headerHeight}
  style:--super-table-footer-height={$stbSettings.appearance.footerHeight}
  style:--super-table-horizontal-dividers={dividersStyles.horizontal}
  style:--super-table-vertical-dividers={dividersStyles.vertical}
  style:--super-table-cell-padding={sizingMap[size].cellPadding}
  on:mouseenter={() => (highlighted = true)}
  on:mouseleave={() => {
    highlighted = false;
    $stbHovered = null;
  }}
  on:keydown={stbState.handleKeyboard}
  on:wheel={stbState.handleWheel}
>
  {#if $stbState != "Init"}
    <Provider {actions} data={dataContext}>
      <ControlSection>
        <SelectionColumn {hideSelectionColumn} />

        {#if showButtonColumnLeft}
          <RowButtonsColumn {rowMenuItems} {menuItemsVisible} {rowMenu} />
        {/if}

        {#if stickFirstColumn && $superColumns.length > 1}
          <SuperTableColumn
            sticky={true}
            scrollPos={$stbHorizontalScrollPos}
            columnOptions={{
              ...$superColumns[0],
              ...$commonColumnOptions,
              overflow,
              isFirst: true,
              isLast:
                $superColumns?.length == 1 &&
                !showButtonColumnRight &&
                canScroll,
            }}
          />
        {/if}
      </ControlSection>

      <ColumnsSection
        {stbSettings}
        {superColumns}
        {commonColumnOptions}
        {canScroll}
        bind:columnsViewport
      >
        <slot />
      </ColumnsSection>

      {#if showButtonColumnRight}
        <ControlSection>
          <RowButtonsColumn
            {rowMenuItems}
            {menuItemsVisible}
            {rowMenu}
            {canScroll}
            right={true}
          />
        </ControlSection>
      {/if}

      <ScrollbarsOverlay
        anchor={columnsViewport}
        clientHeight={maxBodyHeight}
        {scrollHeight}
        {highlighted}
        {isEmpty}
        bind:horizontalVisible
      />

      <EmptyResultSetOverlay
        {isEmpty}
        message={$stbSettings.data.emptyMessage}
        top={$superColumns?.length
          ? $stbSettings.appearance.headerHeight + 16
          : 16}
        bottom={horizontalVisible ? 24 : 16}
      />

      <RowContextMenu {rowContextMenuItems} />

      {#if $stbSettings.features.canInsert || $stbState == "Filtered"}
        <AddNewRowOverlay
          {stbState}
          {tableAPI}
          {highlighted}
          footer={$stbSettings.showFooter}
        />
      {/if}

      {#if $stbSettings.features.canSelect && selectedActions?.length}
        <SelectedActionsOverlay
          {stbSettings}
          {selectedActions}
          {stbSelected}
          {tableAPI}
          {stbState}
          {highlighted}
          {entitySingular}
          {entityPlural}
        />
      {/if}
    </Provider>
  {:else}
    <CellSkeleton />
  {/if}
</div>
