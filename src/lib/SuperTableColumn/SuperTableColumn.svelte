<script>
  import { getContext, setContext, onMount, onDestroy } from "svelte";
  import fsm from "svelte-fsm";

  const { memo, derivedMemo } = getContext("sdk");

  import SuperColumnHeader from "./parts/SuperColumnHeader.svelte";
  import SuperColumnBody from "./parts/SuperColumnBody.svelte";
  import SuperColumnFooter from "./parts/SuperColumnFooter.svelte";

  import CellOptions from "../SuperTableCells/CellOptions.svelte";
  import CellString from "../SuperTableCells/CellString.svelte";
  import CellNumber from "../SuperTableCells/CellNumber.svelte";
  import CellBoolean from "../SuperTableCells/CellBoolean.svelte";
  import CellDatetime from "../SuperTableCells/CellDatetime.svelte";
  import CellLink from "../SuperTableCells/CellLink.svelte";
  import CellJSON from "../SuperTableCells/CellJSON.svelte";
  import CellAttachment from "../SuperTableCells/CellAttachment.svelte";

  const stbData = getContext("stbData");
  const stbSettings = getContext("stbSettings");
  const stbSortColumn = getContext("stbSortColumn");
  const stbSortOrder = getContext("stbSortOrder");
  const stbHovered = getContext("stbHovered");
  const stbEditing = getContext("stbEditing");
  const stbState = getContext("stbState");
  const stbAPI = getContext("stbAPI");

  // Cell Components Map
  const cellComponents = {
    string: CellString,
    longform: CellString,
    number: CellNumber,
    bigint: CellNumber,
    options: CellOptions,
    array: CellOptions,
    jsonarray: CellOptions,
    boolean: CellBoolean,
    datetime: CellDatetime,
    link: CellLink,
    json: CellJSON,
    attachment_single: CellAttachment,
    attachment: CellAttachment,
    bb_reference_single: CellLink,
    bb_reference: CellLink,
  };
  const headerComponents = {
    string: CellString,
    number: CellNumber,
    bigint: CellNumber,
    options: CellOptions,
    array: CellOptions,
    jsonarray: CellOptions,
    boolean: CellBoolean,
    datetime: CellDatetime,
    link: CellString,
    json: CellJSON,
    attachment_single: null,
    attachment: null,
    bb_reference_single: CellString,
    bb_reference: CellString,
  };

  // Props
  export let columnOptions;
  export let sticky;
  export let scrollPos;

  // Internal Variables
  let id = Math.random() * 100;
  let resizing;
  let considerResizing;
  let startPoint;
  let startWidth = 0;
  let width;

  let lockWidth = memo(0);
  let sorted;
  let viewport;

  const columnOptionsStore = memo({
    ...columnOptions,
    cellComponent: cellComponents[columnOptions.schema.type] ?? CellString,
    headerComponent: headerComponents[columnOptions.schema.type] ?? CellString,
  });

  $: columnOptionsStore.set({
    ...columnOptions,
    cellComponent: cellComponents[columnOptions.schema.type] ?? CellString,
    headerComponent: headerComponents[columnOptions.schema.type] ?? CellString,
    background:
      sticky && scrollPos
        ? "var(--spectrum-global-color-gray-75)"
        : columnOptions.quiet
          ? "transparent"
          : columnOptions.background,
  });

  const rowCellOptions = derivedMemo(
    columnOptionsStore,
    ($columnOptionsStore) => {
      return {
        role: "tableCell",
        search: true,
        autocomplete: false,
        showDirty: true,
        readonly: !$columnOptionsStore.canEdit,
        align: $columnOptionsStore.align,
        color: $columnOptionsStore.color,
        background: $columnOptionsStore.background ?? "transparent",
        fontWeight: $columnOptionsStore.fontWeight,
        padding: $columnOptionsStore.cellPadding,
        template: $columnOptionsStore.template,
        useOptionColors: $columnOptionsStore.useOptionColors,
        optionsViewMode: $columnOptionsStore.optionsViewMode,
        relViewMode: $columnOptionsStore.relViewMode,
        controlType: "select",
        placeholder: " ",
        datasource: $columnOptionsStore.data?.datasource,
        limit: $columnOptionsStore.data?.limit,
        valueColumn: $columnOptionsStore.data?.valueColumn,
        labelColumn: $columnOptionsStore.data?.labelColumn,
        fullTable: $columnOptionsStore.data?.fullTable,
        columnList: $columnOptionsStore.data?.columnList,
      };
    }
  );

  const headerCellOptions = derivedMemo(
    columnOptionsStore,
    ($columnOptionsStore) => {
      return {
        align: $columnOptionsStore?.align,
        color: $columnOptionsStore?.color,
        background: "var(--spectrum-global-color-gray-50)",
        fontWeight: $columnOptionsStore?.fontWeight,
        padding: $columnOptionsStore?.cellPadding,
        placeholder: $columnOptionsStore.defaultFilteringOperator,
        clearValueIcon: true,
        optionsViewMode: "text",
        optionsSource: "schema",
        debounce: 250,
        controlType: "select",
        initialState: "Editing",
        role: "inlineInput",
      };
    }
  );

  // Allow the Super Table to bind to the Super Column State Machine to control it
  export const columnState = fsm("Idle", {
    "*": {
      reset() {
        return "Idle";
      },
      headerClicked() {
        if ($columnOptionsStore.canFilter) this.filter();
        else this.sort();
      },
      sort() {
        if (columnOptions.canSort) {
          stbState.sortBy(
            columnOptions.name,
            sorted == "ascending" ? "descending" : "ascending"
          );
          sorted = "ascending" ? "descending" : "ascending";
        }
      },
      enteredit(index) {
        $stbEditing = index;
        stbState.edit();
        return "EditingCell";
      },
      exitedit(index) {
        $stbEditing = -1;
        stbState.endEdit();
        return "Idle";
      },
      lockWidth() {
        if (!resizing) $lockWidth = viewport.clientWidth;
      },
      unlockWidth() {
        if (resizing) return;
        $lockWidth = 0;
      },
      startResizing(e) {
        e.stopPropagation();
        e.preventDefault();
        resizing = true;
        startPoint = e.clientX;
        startWidth = viewport.clientWidth;
        $lockWidth = startWidth;
      },
      resize(e) {
        $lockWidth = startWidth + e.clientX - startPoint;
      },
      stopResizing(e) {
        e.preventDefault();
        e.stopPropagation();
        resizing = false;
        startPoint = undefined;
        width = $lockWidth;
      },
      resetSize(e) {
        e.preventDefault();
        e.stopPropagation();
        $lockWidth = 0;
        width = 0;
      },
    },
    Idle: {
      _enter() {
        $lockWidth = 0;
      },
      filter() {
        return columnOptions.canFilter ? "Entering" : "Idle";
      },
      addRow() {
        return "Inserting";
      },
    },
    Entering: {
      _enter() {
        $lockWidth = viewport.clientWidth;
      },
      filter(filterObj) {
        stbState.addFilter({ ...filterObj, id: id });
        return "Filtered";
      },
      cancel() {
        return "Idle";
      },
      clear() {
        return "Idle";
      },
    },
    Filtered: {
      filter(filterObj) {
        stbState.removeFilter(id);
        stbState.addFilter({ ...filterObj, id: id });
      },
      clear() {
        stbState.clearFilter(id);
        return "Entering";
      },
    },
    EditingCell: {
      _enter() {
        $lockWidth = viewport.clientWidth;
        stbState.edit();
      },
      patchRow(index, id, rev, field, change) {
        stbState.patchRow(index, id, rev, field, change);
      },
    },
    Inserting: {
      _enter() {
        $lockWidth = viewport.clientWidth;
      },
      _exit() {
        $lockWidth = 0;
      },
      cancelAddRow() {
        return "Idle";
      },
    },
  });

  $: if ($stbSortColumn == $columnOptionsStore.name) {
    sorted = $stbSortOrder;
  } else if ($stbSortColumn != $columnOptionsStore.name && sorted) {
    sorted = undefined;
  }

  const getMinWidth = (val, options) => {
    if (val > 0) return val;
    else
      return options.sizing == "fixed"
        ? options.fixedWidth
        : options.minWidth || "auto";
  };

  const getMaxWidth = (val, options) => {
    if (val > 0) return val;
    else
      return options.sizing == "fixed"
        ? options.fixedWidth
        : options.maxWidth || "unset";
  };

  setContext("stColumnOptions", columnOptionsStore);
  setContext("stRowCellOptions", rowCellOptions);
  setContext("stHeaderCellOptions", headerCellOptions);
  setContext("stColumnState", columnState);

  onMount(() => {
    stbAPI?.registerSuperColumn(id, columnState);
  });

  onDestroy(() => {
    stbAPI?.unregisterSuperColumn(id);
  });
</script>

<svelte:window
  on:mouseup={(e) => {
    if (resizing) columnState.stopResizing(e);
  }}
  on:mousemove={(e) => {
    if (resizing) columnState.resize(e);
  }}
/>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  bind:this={viewport}
  class="super-column"
  class:sticky={sticky && scrollPos}
  class:resizing
  class:considerResizing={considerResizing && !resizing}
  class:isLast={$columnOptionsStore.isLast}
  style:flex={$columnOptionsStore.sizing == "flexible" ? "auto" : "none"}
  style:max-width={getMaxWidth($lockWidth, $columnOptionsStore)}
  style:min-width={getMinWidth($lockWidth, $columnOptionsStore)}
  on:mouseleave={() => ($stbHovered = null)}
>
  {#if $columnOptionsStore.showHeader && $columnOptionsStore.canResize}
    <div
      class="grabber"
      style:height={$columnOptionsStore.headerHeight - 16}
      on:mousedown={columnState.startResizing}
      on:dblclick={columnState.resetSize}
      on:mouseenter={() => (considerResizing = true)}
      on:mouseleave={() => (considerResizing = false)}
    />
  {/if}

  {#if $columnOptionsStore.showHeader}
    <SuperColumnHeader {sorted} />
  {/if}

  <SuperColumnBody
    rows={$stbData.rows}
    rowHeight={$stbSettings.appearance.rowHeight}
    field={$columnOptionsStore.name}
    idField={$stbSettings.data.idColumn}
    zebra={$stbSettings.appearance.zebraColors}
    isLast={$columnOptionsStore.isLast}
    isFirst={$columnOptionsStore.isFirst}
    canInsert={$stbSettings.features.canInsert}
  >
    <slot />
  </SuperColumnBody>

  {#if $columnOptionsStore.showFooter}
    <SuperColumnFooter />
  {/if}
</div>
