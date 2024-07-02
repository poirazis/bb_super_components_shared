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

  import CellOptions from "../SuperTableCells/CellOptions.svelte";
  import CellString from "../SuperTableCells/CellString.svelte";
  import CellNumber from "../SuperTableCells/CellNumber.svelte";
  import CellBoolean from "../SuperTableCells/CellBoolean.svelte";
  import CellDatetime from "../SuperTableCells/CellDatetime.svelte";
  import CellLink from "../SuperTableCells/CellLink.svelte";
  import CellSkeleton from "../SuperTableCells/CellSkeleton.svelte";
  import CellJSON from "../SuperTableCells/CellJSON.svelte";
  import CellAttachment from "../SuperTableCells/CellAttachment.svelte";

  const stbData = getContext("stbData");
  const stbSettings = getContext("stbSettings");
  const stbSortColumn = getContext("stbSortColumn");
  const stbSortOrder = getContext("stbSortOrder");
  const stbHovered = getContext("stbHovered");
  const stbEditing = getContext("stbEditing");
  const stbRowHeights = getContext("stbRowHeights");
  const stbRowColors = getContext("stbRowColors");

  // Props
  export let columnOptions;
  export let stbState;

  // Internal Variables
  let id = Math.random() * 100;
  let resizing = false;
  let considerResizing = false;
  let startPoint;
  let startWidth = 0;
  let width;
  let columnAnchor;
  let lockWidth = new writable(0);

  let sortOrder = "ascending";

  // Cell Components Map
  const cellComponents = {
    string: CellString,
    number: CellNumber,
    bigint: CellNumber,
    options: CellOptions,
    array: CellOptions,
    jsonarray: CellOptions,
    boolean: CellBoolean,
    datetime: CellDatetime,
    link: CellLink,
    json: CellJSON,
    attachment: CellAttachment,
    bb_reference: CellLink,
  };

  // Allow the Super Table to bind to the Super Column State Machine to control it
  export const columnState = fsm("Idle", {
    "*": {
      tableState(state) {
        return state;
      },
      initializeColumn(field) {
        if (!field) return;
      },
      enteredit(index) {
        $stbEditing = index;
        return "EditingCell";
      },
      exitedit(index) {
        $stbEditing = -1;
        return "Idle";
      },
      cancel() {
        return "Idle";
      },
      lockWidth() {
        lockWidth = true;
      },
      startResizing(e) {
        e.stopPropagation();
        e.preventDefault();
        resizing = true;
        startPoint = e.clientX;
        startWidth = columnAnchor.clientWidth;
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
        $lockWidth = width;
      },
      sort() {
        if (columnOptions.canSort) {
          stbState.sortBy(columnOptions.name, "ascending");
          return "Sorted";
        }
      },
      filter() {
        return columnOptions.canFilter ? "Entering" : "Idle";
      },
    },
    Loading: {
      loaded() {
        return "Idle";
      },
    },
    Sorted: {
      sort() {
        sortOrder = sortOrder == "ascending" ? "descending" : "ascending";
        stbState.sortBy(columnOptions.name, sortOrder);
      },
      unsort: "Idle",
      filter: "Entering",
    },
    Entering: {
      _enter() {
        $lockWidth = columnAnchor.clientWidth;
      },
      filter(filterObj) {
        stbState.removeFilter(id);
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
    Resizing: {
      stop: () => {
        return "Idle";
      },
    },
    Dragging: {
      stop: () => {
        return "Idle";
      },
    },
    EditingCell: {
      _enter() {
        $lockWidth = columnAnchor.clientWidth;
      },
    },
    Filtered: {
      filter(filterObj) {
        stbState.removeFilter(id);
        stbState.addFilter({ ...filterObj, id: id });
      },
      clear() {
        stbState.removeFilter(id);
        return "Entering";
      },
      cancel() {},
    },
  });

  $: columnOptions.cellComponent =
    $columnState == "Loading"
      ? CellSkeleton
      : cellComponents[columnOptions.schema.type] ?? CellString;

  $: columnOptions.cellOptions = {
    role: "tableCell",
    readonly: !columnOptions.canEdit,
    align: columnOptions.align,
    color: columnOptions.color,
    background: columnOptions.background ?? "transparent",
    fontWeight: columnOptions.fontWeight,
    padding: columnOptions.cellPadding,
    template: columnOptions.template,
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
    limit: columnOptions.data?.limit,
    valueColumn: columnOptions.data?.valueColumn,
    labelColumn: columnOptions.data?.labelColumn,
    fullTable: columnOptions.data?.fullTable,
    columnList: columnOptions.data?.columnList,
  };

  // Reactive declaration.
  // nameStore is used in our derived store that holds the column data
  let colsStore = new writable([]);
  $: columnOptions.name
    ? colsStore.set(columnOptions.name.split("."))
    : ($colsStore = []);

  $: columnStore =
    derived([stbData, colsStore], ([$stbData, $colsStore]) => {
      return $stbData?.rows?.map((row) => ({
        rowID: row[$stbSettings.data.idColumn],
        rowValue:
          $colsStore.length > 1
            ? row[$colsStore[0]]?.[$colsStore[1]]
            : row[$colsStore[0]],
      }));
    }) || null;

  $: columnState.initializeColumn(columnOptions.name);
  $: if ($stbSortColumn == columnOptions.name && $columnState == "Idle") {
    columnState.sort($stbSortOrder);
  } else if ($stbSortColumn != columnOptions.name && $columnState == "Sorted") {
    columnState.unsort();
  }

  const getMinWidth = (val) => {
    if (val > 0) return val;
    else
      return columnOptions.sizing == "fixed"
        ? columnOptions.fixedWidth
        : columnOptions.minWidth || "unset";
  };
  const getMaxWidth = (val) => {
    if (val > 0) return val;
    else
      return columnOptions.sizing == "fixed"
        ? columnOptions.fixedWidth
        : columnOptions.maxWidth || "unset";
  };
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
  bind:this={columnAnchor}
  class="superTableColumn"
  class:resizing
  class:considerResizing={considerResizing && !resizing}
  style:min-width={getMinWidth($lockWidth, columnOptions)}
  style:max-width={getMaxWidth($lockWidth, columnOptions)}
  on:mouseleave={() => ($stbHovered = null)}
>
  {#if columnOptions.showHeader && columnOptions.canResize}
    <div
      class="grabber"
      style:height={columnOptions.headerHeight - 16}
      on:mousedown={columnState.startResizing}
      on:dblclick={columnState.resetSize}
      on:mouseenter={() => (considerResizing = true)}
      on:mouseleave={() => (considerResizing = false)}
    />
  {/if}

  <SuperColumnHeader {columnState} {columnOptions} {sortOrder} />

  <SuperColumnBody
    on:rowClicked={(e) => stbState.rowClicked(e.detail)}
    on:rowDblClicked={(e) => stbState.rowDblClicked(e.detail)}
    on:cellChanged={(e) => stbState.cellChanged(e.detail)}
    {columnState}
    {columnOptions}
    rows={$columnStore}
    rowHeights={$stbRowHeights}
    rowColors={$stbRowColors}
  >
    <slot />
  </SuperColumnBody>

  <SuperColumnFooter {columnState} {columnOptions} />
</div>

<style>
  .superTableColumn {
    flex: 1 1 auto;
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
    top: 8px;
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
