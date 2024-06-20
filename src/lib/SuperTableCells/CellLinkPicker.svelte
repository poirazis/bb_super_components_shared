<script>
  import { createEventDispatcher } from "svelte";
  import SuperTable from "../SuperTable/SuperTable.svelte";

  const dispatch = createEventDispatcher();

  export let value = [];
  export let datasource;
  export let valueColumn;
  export let sortColumn;
  export let sortOrder;
  export let filter;
  export let labelColumn;
  export let searchTerm;
  export let pickerColumns;
  export let searchColumns = [];
  export let multi;

  export let picker;

  $: tableOptions = {
    idColumn: valueColumn,
    superColumnsPos: "first",
    columnSizing: "flexible",
    columnMaxWidth: "auto",
    debounce: 500,
    visibleRowCount: 7,
    rowSelectMode: multi ? "multi" : "single",
    selectionColumn: false,
    dividers: "horizontal",
    dividersColor: null,
    baseFontSize: 12,
    rowHeight: 32,
    showFooter: false,
    showHeader: true,
    canFilter: true,
    canSort: true,
    canEdit: false,
    canDelete: false,
    canInsert: false,
    canResize: false,
    datasource,
    idColumn: valueColumn,
    filter: {},
    sortColumn: null,
    sortOrder: null,
    limit: 10,
    paginate: false,
    autoRefresh: false,
    autoRefreshRate: 10,
    columnList: pickerColumns,
    size: "S",
    cellPadding: "0.5rem",
    useOptionColors: true,
    optionsViewMode: "text",
    relViewMode: "text",
    onRowSelect: (arr) => {
      var val = arr.map((x) => {
        return { _id: x[valueColumn], primaryDisplay: x[labelColumn] };
      });
      dispatch("change", val);
    },
  };
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div bind:this={picker} class="control">
  <SuperTable on:change {...tableOptions}></SuperTable>
</div>

<style>
  .control {
    flex: auto;
    flex-direction: column;
    display: flex;
    align-items: stretch;
    justify-content: stretch;
    overflow-x: hidden;
    padding: 0.25rem;
  }
</style>
