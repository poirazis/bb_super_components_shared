<script>
  import Popover from "../../../../../node_modules/@budibase/bbui/src/Popover/Popover.svelte"

  export let columnState;
  export let columnOptions;

  let headerAnchor;
  let showFilteringOptions
  let cellState;
  let filterValue;
  let filterOperator = columnOptions.defaultFilteringOperator;

  $: cellOptions = {
    role: "tableCell",
    align: columnOptions.align,
    color: columnOptions.color,
    background: columnOptions.background ?? "transparent",
    fontWeight: columnOptions.fontWeight,
    padding: columnOptions.cellPadding,
    controlType: "select",
    initialState: "Editing",
    readonly: false
  };

  const handleValueChange = (e) => {
    filterValue = e.detail;
    if ( columnOptions.schema.type == "boolean" && !filterValue ) {
      columnState.filter(buildFilter("notEqual", true));
    } else if ( filterValue ) {
      columnState.filter(buildFilter(filterOperator, filterValue));
    } else {
      showFilteringOptions = false
      columnState.cancel();
    }
  };

  const buildFilter = (operator, value) => {
    return {
      field: columnOptions.name,
      operator: operator,
      value: value,
      valueType: "Value",
    };
  };

  const handleKeyboard = (e) => {
    if (e.key == "Enter") {
      columnState.filter(filterOperator, filterValue);
    }
    if (e.key == "Escape") {
      columnState.cancel();
    }
  };

  const handleBlur = ( e ) => {
    if ( !showFilteringOptions && !filterValue )
      columnState.cancel();
  }

</script>

{#if columnOptions.showHeader}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    class="spectrum-Table-headCell"
    class:enterting={$columnState == "Entering"}
    class:filtered={$columnState == "Filtered"}
    class:idle={$columnState != "Entering" && $columnState != "Filtered"}
    style:padding-left={ columnOptions.cellPadding }
    style:padding-right={ $columnState == "Entering" ? 0 : columnOptions.cellPadding }
    on:keydown={handleKeyboard}
    bind:this={headerAnchor} 
    tabindex="0"
  >
    {#if $columnState == "Idle" || $columnState == "Ascending" || $columnState == "Descending" || $columnState == "Loading" }
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

      {#if columnOptions.isSorted}
        <i class={ $columnState == "Ascending" ? "ri-sort-asc" : "ri-sort-desc" } > </i>
      {/if}
    {:else if $columnState == "Entering" || $columnState == "Filtered"}
      <i class="ri-equalizer-line" style="align-self: center; font-size: 12px;" on:click|stopPropagation={ () => showFilteringOptions = true } />
        <svelte:component 
          this={columnOptions.cellComponent} 
          bind:cellState
          {cellOptions}
          fieldSchema={columnOptions.schema}
          multi={columnOptions.schema.type == "array"}
          on:change={handleValueChange}
          on:blur={columnState.cancel}
          />
    {/if}
  </div>

  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <Popover
    anchor={headerAnchor}
    align="left"
    dismissible
    open={ showFilteringOptions }
    on:close={ () => { showFilteringOptions = false  } }
  >
    <ul class="spectrum-Menu" role="menu">
      {#each columnOptions.filteringOperators as option}
        <li
          class="spectrum-Menu-item"
          class:selected={option.value == filterOperator}
          role="menuitem"
          on:click|stopPropagation={() => {
            filterOperator = option.value;
            showFilteringOptions = false;
            columnState.filter(buildFilter(filterOperator, filterValue));
            cellState.focus();
          }}
        >
          <span class="spectrum-Menu-itemLabel">{option.label}</span>
        </li>
      {/each}
    </ul>
  </Popover>
{/if}

<style>
  .spectrum-Table-headCell {
    display: flex;
    align-items: center;
    height: 2.5rem;
    border: 1px solid transparent;
    border-bottom: 1px solid var(--spectrum-alias-border-color-mid);
    background-color: var(--super-table-header-bg-color);
    padding-top: none;
    padding-bottom: none;
  }

  .spectrum-Table-headCell.idle {
    gap: 0.5rem;
  }

  .enterting {
    min-width: 10rem;
    background-color: var(
      --spectrum-textfield-m-background-color,
      var(--spectrum-global-color-gray-100)
    );
  }
  .filtered {
    min-width: 10rem;
    color: var(--spectrum-global-color-gray-800);
    font-weight: 600;
    background-color: var(
      --spectrum-textfield-m-background-color,
      var(--spectrum-global-color-gray-100)
    );
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
    font-size: 18px;
    color: var(--spectrum-global-color-gray-400);
  }
  .icon:hover {
    cursor: pointer;
    color: var(--primaryColor);
  }
</style>
