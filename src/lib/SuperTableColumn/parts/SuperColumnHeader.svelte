<script>
  import SuperPopover from "../../SuperPopover/SuperPopover.svelte"

  export let columnState;
  export let columnOptions;
  export let sortOrder

  let headerAnchor;
  let picker
  let showFilteringOptions = false
  let filterValue;
  let filterOperator = columnOptions.defaultFilteringOperator;

  $: cellOptions = {
    align: columnOptions.align,
    color: columnOptions.color,
    background: columnOptions.background,
    fontWeight: columnOptions.fontWeight,
    padding: columnOptions.cellOptions.padding,
    placeholder: columnOptions.filteringOperators?.find( x => x.value == filterOperator)?.label,
    clearValueIcon: true,
    disabled: filterOperator == "empty" || filterOperator == "notEmpty",
    readonly: filterOperator == "empty" || filterOperator == "notEmpty",
    useOptionColors: true,
    debounce: 250,
    controlType: "select",
    initialState: "Editing",
    role: "inline"
  };

  const handleValueChange = ( e ) => {
    if ( e.detail != undefined && e.detail != null && e.detail != "") {
      filterValue = e.detail;
      if ( columnOptions.schema.type == "boolean" && filterValue === false ) {
        columnState.filter(buildFilter("notEqual", true));
      } else if (Array.isArray(e.detail) && e.detail.length == 0) {
        columnState.clear();
      } else {
        columnState.filter(buildFilter(filterOperator, filterValue));
      };
    } else {
      showFilteringOptions = false;
      filterValue = null;
      columnState.clear();
    }
  };

  const buildFilter = (operator, value) => {
    let temp 

    if ( operator == "oneOf" && !Array.isArray(value) ) {
      temp = value.split(",")
    } else if ( operator != "oneOf" && operator != "containsAny" && Array.isArray(value) ) {
      temp = value[0]
      filterValue = temp
    } else {
      temp = value
    }

    return {
      field: columnOptions.name,
      operator: operator,
      value: temp,
      type: columnOptions.schema.type,
      valueType: "Value",
    };

  };

  const handleOperatorChange = op => {
    filterOperator = op
    if ( filterValue  || op == "empty" || op == "notEmpty") 
      columnState.filter(buildFilter(filterOperator, filterValue ?? ""));

    showFilteringOptions = false
  }

  const handleBlur = e => {
    if ( !headerAnchor?.contains(e.explicitOriginalTarget) )
      columnState.cancel();
  }

</script>


<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
{#if columnOptions.showHeader}
  <div
    bind:this={headerAnchor} 
    class="spectrum-Table-headCell"
    class:enterting={$columnState == "Entering"}
    class:filtered={$columnState == "Filtered"}
    class:idle={$columnState != "Entering" && $columnState != "Filtered"}
    style:height={ columnOptions.headerHeight }
    style:padding-left={ columnOptions.cellOptions.padding }
    style:padding-right={ columnOptions.cellOptions.padding }
  >
    {#if $columnState == "Idle" || $columnState == "Sorted" || $columnState == "Loading" || $columnState == "EditingCell"}
      {#if columnOptions.canFilter && columnOptions.defaultFilteringOperator}
        <i class="ri-search-line icon" on:click={columnState.filter}> </i>
      {/if}

      <div
        class="headerLabel"
        style:justify-content={columnOptions?.headerAlign}
      >
        <div
          class="innerText"
          class:sortable={columnOptions.canSort}
          on:click={columnState.sort}
        >
          {columnOptions.displayName ?? columnOptions.name}
        </div>
      </div>

      {#if $columnState == "Sorted"}
        <i class={ sortOrder == "ascending" ? "ri-sort-asc" : "ri-sort-desc" } > </i>
      {/if}
    {:else if $columnState == "Entering" || $columnState == "Filtered"}
      {#if columnOptions.canFilter == "advanced"}
        <i class="ri-settings-line" 
        style="align-self: center; font-size: 14px;" 
        on:click|preventDefault={ () => showFilteringOptions = !showFilteringOptions } 
        />
      {/if}
        <svelte:component 
          this={columnOptions.cellComponent}
          {cellOptions}
          value={filterValue}
          fieldSchema={columnOptions.schema}
          multi={filterOperator == "containsAny" || filterOperator == "oneOf"}
          on:change={handleValueChange}
          on:cancel={columnState.cancel}
          on:exitedit={handleBlur}
          />
    {/if}
  </div>

  {#if columnOptions.canFilter == "advanced"}
    <SuperPopover
      anchor={headerAnchor}
      align="left"
      dismissible=false
      open={ showFilteringOptions }
      on:close={ () => showFilteringOptions = false }
    >
      <ul bind:this={picker} class="spectrum-Menu" role="menu" style="background-color: var(--spectrum-global-color-gray-75 );">
        {#each columnOptions.filteringOperators as option}
          <li
            class="spectrum-Menu-item"
            class:selected={option.value == filterOperator}
            role="menuitem"
            on:mousedown|preventDefault={ () => handleOperatorChange(option.value) }
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
    border-bottom: 1px solid var(--spectrum-alias-border-color-mid);
    background-color: var(--spectrum-global-color-gray-100);
    padding-top: none;
    padding-bottom: none;
    font-size: 12px;
  }

  .spectrum-Table-headCell.idle {
    gap: 0.5rem;
  }

  .enterting {
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
    font-size: 16px;
    color: var(--spectrum-global-color-gray-400);
  }
  .icon:hover {
    cursor: pointer;
    color: var(--primaryColor);
  }
</style>
