<script>
  import { getContext } from "svelte";
  import SuperPopover from "../../SuperPopover/SuperPopover.svelte";

  const columnSettings = getContext("stColumnSettings");
  const columnState = getContext("stColumnState");
  const { API } = getContext("sdk");

  export let sortOrder;

  let headerAnchor;
  let picker;
  let showFilteringOptions = false;
  let filterValue;
  let filterOperator = $columnSettings.defaultFilteringOperator;
  let schema;
  let filterColumn;
  let hovered;

  $: isLink = $columnSettings.schema.type == "link";
  $: isReference =
    $columnSettings.schema.type == "bb_reference" ||
    $columnSettings.schema.type == "bb_reference_single";

  $: if (isLink && !schema && $columnSettings.canFilter)
    fetchDefinition($columnSettings.schema.tableId);

  $: if (isLink && schema) {
    filterColumn = "1:" + $columnSettings.name + "." + schema?.primaryDisplay;
  } else {
    filterColumn = $columnSettings.name;
  }

  $: isEntering = $columnState == "Entering";

  $: cellOptions = {
    align: $columnSettings.align,
    color: $columnSettings.color,
    background: "var(--spectrum-global-color-gray-50)",
    fontWeight: $columnSettings.fontWeight,
    padding: $columnSettings.cellOptions.padding,
    placeholder: $columnSettings.filteringOperators?.find(
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

  const handleValueChange = (e) => {
    if (e.detail != undefined && e.detail != null && e.detail != "") {
      filterValue = e.detail;
      if ($columnSettings.schema.type == "boolean" && filterValue === false) {
        columnState.filter(buildFilter("notEqual", true));
      } else if (Array.isArray(e.detail) && e.detail.length == 0) {
        columnState.clear();
      } else {
        columnState.filter(buildFilter(filterOperator, filterValue));
      }
    } else {
      showFilteringOptions = false;
      filterValue = null;
      columnState.clear();
    }
  };

  const buildFilter = (operator, value) => {
    let temp;
    if (operator == "oneOf" && !Array.isArray(value)) {
      temp = value.split(",");
    } else if (
      operator != "oneOf" &&
      operator != "containsAny" &&
      Array.isArray(value)
    ) {
      temp = value[0];
      filterValue = temp;
    } else {
      temp = value;
    }

    return {
      field: filterColumn,
      operator: operator,
      value: temp,
      type: isLink ? "string" : $columnSettings.schema.type,
      valueType: "Value",
    };
  };

  const handleOperatorChange = (op) => {
    filterOperator = op;
    if (filterValue || op == "empty" || op == "notEmpty")
      columnState.filter(buildFilter(filterOperator, filterValue ?? ""));

    showFilteringOptions = false;
  };

  const handleBlur = (e) => {
    if (!headerAnchor?.contains(e.explicitOriginalTarget)) columnState.cancel();
  };

  const fetchDefinition = async (tableId) => {
    if (tableId) {
      schema = await API.fetchTableDefinition(tableId);
    }
  };
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
{#if $columnSettings.showHeader}
  <div
    bind:this={headerAnchor}
    class="spectrum-Table-headCell"
    class:isEntering
    class:filtered={$columnState == "Filtered"}
    class:idle={$columnState != "Entering" && $columnState != "Filtered"}
    style:height={$columnSettings.headerHeight}
    style:padding-left={$columnSettings.cellOptions.padding}
    style:padding-right={$columnSettings.cellOptions.padding}
    on:mouseenter={() => (hovered = true)}
    on:mouseleave={() => (hovered = false)}
  >
    {#if $columnState == "Idle" || $columnState == "Sorted" || $columnState == "Loading" || $columnState == "EditingCell"}
      {#if $columnSettings.canFilter && $columnSettings.defaultFilteringOperator && hovered}
        <i class="ri-search-line icon" on:click={columnState.filter}> </i>
      {/if}

      <div
        class="headerLabel"
        style:justify-content={$columnSettings?.headerAlign}
      >
        <div
          class="innerText"
          class:sortable={$columnSettings.canSort}
          on:click={columnState.sort}
        >
          {$columnSettings.displayName ?? $columnSettings.name}
        </div>
      </div>

      {#if $columnState == "Sorted"}
        <i class={sortOrder == "ascending" ? "ri-sort-asc" : "ri-sort-desc"}>
        </i>
      {/if}
    {:else if $columnState == "Entering" || $columnState == "Filtered"}
      {#if $columnSettings.canFilter == "advanced"}
        <i
          class="ri-settings-line"
          style="align-self: center; font-size: 14px;"
          on:click|preventDefault={() =>
            (showFilteringOptions = !showFilteringOptions)}
        />
      {/if}
      <svelte:component
        this={$columnSettings.headerComponent}
        {cellOptions}
        value={filterValue}
        fieldSchema={$columnSettings.schema}
        multi={filterOperator == "containsAny" || filterOperator == "oneOf"}
        on:change={handleValueChange}
        on:cancel={columnState.cancel}
        on:exitedit={handleBlur}
      />
    {/if}
  </div>

  {#if $columnSettings.canFilter == "advanced"}
    <SuperPopover
      anchor={headerAnchor}
      align="left"
      dismissible="false"
      open={showFilteringOptions}
      on:close={() => (showFilteringOptions = false)}
    >
      <ul
        bind:this={picker}
        class="spectrum-Menu"
        role="menu"
        style="background-color: var(--spectrum-global-color-gray-75 );"
      >
        {#each $columnSettings.filteringOperators as option}
          <li
            class="spectrum-Menu-item"
            class:selected={option.value == filterOperator}
            role="menuitem"
            on:mousedown|preventDefault={() =>
              handleOperatorChange(option.value)}
          >
            <span class="spectrum-Menu-itemLabel">{option.label}</span>
          </li>
        {/each}
      </ul>
    </SuperPopover>
  {/if}
{/if}

<style>
  .spectrum-Table-headCell {
    display: flex;
    align-items: center;
    border: 1px solid transparent;
    border-bottom: 1px solid var(--spectrum-global-color-gray-200);
    background-color: var(--spectrum-global-color-gray-100);
    padding-top: none;
    padding-bottom: none;
    font-size: 12px;
  }

  .spectrum-Table-headCell.idle {
    gap: 0.5rem;
  }

  .isEntering {
    gap: 0.5rem;
  }
  .filtered {
    gap: 0.5rem;
    color: var(--spectrum-global-color-gray-800);
    font-weight: 600;
    background-color: var(--spectrum-global-color-gray-100);
  }

  .headerLabel {
    flex: 1 1 auto;
    display: flex;
    align-items: center;
    min-width: 0;
  }
  .innerText {
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    color: var(--super-table-header-color);
  }

  .sortable {
    cursor: pointer;
  }
  .sortable:hover {
    filter: brightness(120%);
  }
  .selected {
    color: var(--primaryColor);
    background-color: var(--spectrum-global-color-gray-75);
  }

  .icon {
    transition: all 230ms;
    font-size: 14px;
    color: var(--spectrum-global-color-gray-400);
  }
  .icon:hover {
    cursor: pointer;
    color: var(--primaryColor);
  }
</style>
