<script>
  import { getContext, setContext } from "svelte";
  import { writable } from "svelte/store";
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

  // Export the column's body scrolling info
  export let clientHeight;
  export let scrollHeight;
  export let clientWidth;

  export let sticky;
  export let scrollPos;

  // Internal Variables
  let id = Math.random() * 100;
  let resizing;
  let considerResizing;
  let startPoint;
  let startWidth = 0;
  let width;
  let columnAnchor;
  let lockWidth = new writable(0);
  let sortOrder = "ascending";

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
        optionsSource: $columnOptionsStore.optionsSource,
        customOptions: $columnOptionsStore.customOptions,
        useOptionColors: $columnOptionsStore.useOptionColors,
        useOptionIcons: $columnOptionsStore.useOptionIcons,
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
      let filterOperator;
      return {
        align: $columnOptionsStore?.align,
        color: $columnOptionsStore?.color,
        background: "var(--spectrum-global-color-gray-50)",
        fontWeight: $columnOptionsStore?.fontWeight,
        padding: $columnOptionsStore?.cellPadding,
        placeholder: $columnOptionsStore?.filteringOperators?.find(
          (x) => x.value == filterOperator
        )?.label,
        clearValueIcon: true,
        disabled: filterOperator == "empty" || filterOperator == "notEmpty",
        readonly: filterOperator == "empty" || filterOperator == "notEmpty",
        useOptionColors: true,
        debounce: 250,
        controlType: "select",
        initialState: "Editing",
        role: "inlineInput",
      };
    }
  );

  $: inInsert = $stbState == "Inserting";
  $: canInsert = $stbSettings.features.canInsert;
  $: isLast = columnOptions.isLast;
  // Allow the Super Table to bind to the Super Column State Machine to control it
  export const columnState = fsm("Idle", {
    "*": {
      tableState(state) {
        return state;
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
        $lockWidth = clientWidth;
      },
      unlockWidth() {
        $lockWidth = 0;
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

  $: if ($stbSortColumn == $columnOptionsStore.name && $columnState == "Idle") {
    columnState.sort($stbSortOrder);
  } else if (
    $stbSortColumn != $columnOptionsStore.name &&
    $columnState == "Sorted"
  ) {
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

  setContext("stColumnOptions", columnOptionsStore);
  setContext("stRowCellOptions", rowCellOptions);
  setContext("stHeaderCellOptions", headerCellOptions);
  setContext("stColumnState", columnState);
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
  bind:clientWidth
  class="super-column"
  class:sticky={sticky && scrollPos}
  class:resizing
  class:considerResizing={considerResizing && !resizing}
  style:min-width={getMinWidth($lockWidth)}
  style:max-width={getMaxWidth($lockWidth)}
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
    <SuperColumnHeader />
  {/if}

  <SuperColumnBody
    bind:clientHeight
    bind:scrollHeight
    on:rowResize={(e) => stbState.handleRowResize(e.detail.idx, e.detail.size)}
    on:rowClicked={(e) => stbState.rowClicked(e.detail)}
    on:rowDblClicked={(e) => stbState.rowDblClicked(e.detail)}
    rows={$stbData.rows}
    field={$columnOptionsStore.name}
    idField={$stbSettings.data.idColumn}
    {isLast}
    {inInsert}
    {canInsert}
  >
    <slot />
  </SuperColumnBody>
  {#if $columnOptionsStore.showFooter}
    <SuperColumnFooter />
  {/if}
</div>

<style>
  .resizing {
    border-right: 1px solid var(--primaryColor);
  }
  .considerResizing {
    border-right: 1px solid var(--spectrum-global-color-gray-500);
  }
</style>
