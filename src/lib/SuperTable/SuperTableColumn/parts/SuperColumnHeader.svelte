<script>
  import Popover from "../../../../../node_modules/@budibase/bbui/src/Popover/Popover.svelte"
  import SuperCell from "../../SuperTableCell/SuperCell.svelte";

  export let columnState;
  export let columnOptions;

  let headerAnchor;
  let showFilteringOptions
  let cellState;
  let filterValue;
  let filterOperator = columnOptions.defaultFilteringOperator;

  $: cellOptions = {
    align: columnOptions.align,
    color: columnOptions.color,
    background: columnOptions.background ?? "transparent",
    fontWeight: columnOptions.fontWeight,
    padding: columnOptions.padding,
  };

  const handleValueChange = (e) => {
    filterValue = e.detail;
    if (
      filterValue != undefined &&
      filterValue != "" &&
      filterValue.length != []
    ) {
      columnState.filter(buildFilter(filterOperator, filterValue));
    } else if ( e.detail == null ) {
      showFilteringOptions = false
      columnState.cancel();
    }
  };

  const buildFilter = (operator, value) => {
    return {
      field: columnOptions.name,
      operator: operator,
      value: columnOptions.schema.type == "number" ? Number(value) : value,
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
    on:keydown={handleKeyboard}
    bind:this={headerAnchor} 
    tabindex="0" 
  >
    {#if $columnState == "Idle" || $columnState == "Ascending" || $columnState == "Descending"}
      {#if columnOptions.canFilter && columnOptions.defaultFilteringOperator}
        <div class="actionIcon" on:click={columnState.filter}>
          <i class="ri-search-line" > </i>
        </div>
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
          {columnOptions.displayName}
        </div>
      </div>

      {#if columnOptions.isSorted}
        <div class="actionIcon sort">
            <i class={ $columnState == "Ascending" ? "ri-sort-asc" : "ri-sort-desc" } > </i>
        </div>
      {/if}
    {:else if $columnState == "Entering" || $columnState == "Filtered"}
      <i class="ri-equalizer-line" style="align-self: center; font-size: 12px;" on:click|stopPropagation={ () => showFilteringOptions = true } />
      <SuperCell
        bind:cellState       
        cellOptions={{
          padding: "0 0.5rem",
          clearValueIcon: true,
          placeholder: columnOptions.name,
          debounce: 500,
        }}
        multi={false}
        initialState={"Editing"}
        editable
        lockState
        unstyled
        value={filterValue}
        fieldSchema={columnOptions.schema}        
        on:change={handleValueChange}
        on:blur={() => { if (! headerAnchor.matches(":focus-within") && !filterValue) columnState.cancel() }}
      />
    {:else if $columnState == "Loading"}
      <p>...</p>
    {/if}

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

  </div>
{/if}

<style>
  .spectrum-Table-headCell {
    display: flex;
    align-items: stretch;
    height: 2.5rem;
    padding: unset;
    border: 1px solid transparent;
    border-bottom: 1px solid var(--spectrum-alias-border-color-mid);
    background-color: var(--super-table-header-bg-color);
    padding-left: var(--super-table-cell-padding);
  }

  .spectrum-Table-headCell.idle {
    gap: 0.5rem;
    padding-right: var(--super-table-cell-padding);

  }

  .enterting {
    background-color: var(
      --spectrum-textfield-m-background-color,
      var(--spectrum-global-color-gray-50)
    );
    color: var(--spectrum-global-color-gray-600);
  }
  .filtered {
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
  .actionIcon {
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--spectrum-global-color-gray-500);
    transition: all 230ms ease-in-out;
  }

  .actionIcon.sort {
    color: var(--spectrum-global-color-gray-600);
    font-size: 14px;
  }
  .actionIcon:hover {
    color: var(--spectrum-global-color-blue-500);
    cursor: pointer;
  }

  .actionIcon:hover > i {
    font-weight: 600;
  }
  .selected {
    color: var(--primaryColor);
    background-color: var(--spectrum-global-color-gray-75);
  }
</style>
