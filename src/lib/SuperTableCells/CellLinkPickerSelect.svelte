<script>
  import CellString from "./CellString.svelte";
  import { getContext, createEventDispatcher } from "svelte";
  import { fly } from "svelte/transition";

  const { API, fetchData } = getContext("sdk");
  const dispatch = createEventDispatcher();

  export let value = [];
  export let fieldSchema;
  export let filter = [];
  export let wide = true;
  export let search = true;
  export let singleSelect;

  let schema = fieldSchema;
  let tableId = fieldSchema.tableId;
  let appliedFilter = [];
  let viewport;

  $: isBBReference = fieldSchema.type.includes("bb_reference");
  $: isMultiReference = isBBReference && !fieldSchema.type.includes("_single");
  $: type = isBBReference ? "user" : "table";
  $: localValue = Array.isArray(value) ? value : [];
  $: fetch = fetchData({
    API,
    datasource: {
      type,
      tableId: tableId,
    },
    options: {
      filter,
      limit: 1000,
    },
  });

  $: primaryDisplay = $fetch?.definition?.primaryDisplay || "email";

  const rowSelected = (val) => {
    if (value) {
      let found = value.find((e) => e._id == val._id);
      return found;
    }
  };

  const selectRow = (val) => {
    if (singleSelect) {
      localValue = [{ _id: val._id, primaryDisplay: val[primaryDisplay] }];
    } else {
      localValue.push({ _id: val._id, primaryDisplay: val[primaryDisplay] });
    }

    localValue = localValue;
    dispatch("change", localValue);
  };

  const unselectRow = (val) => {
    localValue.splice(
      localValue.findIndex((e) => e._id === val._id),
      1
    );
    localValue = localValue;
    dispatch("change", localValue);
  };

  let cellOptions = {
    icon: "ri-search-line",
    initialState: "Editing",
    role: "inlineInput",
    debounce: 250,
    placeholder: "Search",
  };

  const handleSearch = (e) => {
    if (e.detail && e.detail != "") {
      appliedFilter = [
        ...filter,
        {
          field: primaryDisplay,
          type: "string",
          operator: "fuzzy",
          value: e.detail,
          valueType: "Value",
        },
      ];
    } else {
      appliedFilter = filter ?? [];
      dispatch("clearFilter");
    }
    fetch?.update({
      filter: appliedFilter,
    });
  };
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="control" bind:this={viewport}>
  {#if search}
    <div class="searchControl">
      <CellString on:change={handleSearch} autofocus {cellOptions} value="" />
    </div>
  {/if}

  {#if $fetch?.loaded}
    {#if !singleSelect && wide}
      <div class="listWrapper">
        <div class="list">
          <div class="options">
            {#key localValue}
              {#each $fetch.rows as row, idx (idx)}
                {#if !rowSelected(row)}
                  <div
                    class="option"
                    on:mousedown|stopPropagation|preventDefault={selectRow(row)}
                  >
                    {row[primaryDisplay]}
                    <i class="ri-add-line" />
                  </div>
                {/if}
              {/each}
            {/key}
          </div>
        </div>
        <div class="list listSelected">
          <div class="options">
            {#if localValue.length}
              {#each localValue as val, idx (idx)}
                {#if rowSelected(val)}
                  <div
                    transition:fly={{ x: -20, duration: 130 }}
                    class="option selected"
                    on:mousedown|stopPropagation|preventDefault={unselectRow(
                      val
                    )}
                  >
                    {val.primaryDisplay}
                    <i class="ri-close-line" />
                  </div>
                {/if}
              {/each}
            {:else}
              <span>Nothing Selected</span>
            {/if}
          </div>
        </div>
      </div>
    {:else}
      <div class="listWrapper">
        <div class="list">
          <div class="options">
            {#key value}
              {#each $fetch?.rows as row, idx (idx)}
                {#if !rowSelected(row)}
                  <div
                    class="option"
                    on:mousedown|stopPropagation|preventDefault={selectRow(row)}
                  >
                    {row[primaryDisplay]}
                    <i class="ri-checkbox-circle-fill" />
                  </div>
                {/if}
              {/each}
            {/key}
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .control {
    flex: auto;
    flex-direction: column;
    display: flex;
    align-items: stretch;
    justify-content: space-around;
    gap: 0.25rem;
    padding: 0.25rem 0.25rem 0.25rem 0.25rem;
    overflow-x: hidden;
  }

  .searchControl {
    height: 2rem;
    border-bottom: 1px solid var(--spectrum-global-color-gray-300);
  }

  .listWrapper {
    flex: auto;
    display: flex;
    justify-content: stretch;
    align-content: stretch;
    gap: 0.25rem;
    overflow: hidden;
  }

  .list {
    flex: 1 1 50%;
    height: 200px;
    overflow-y: auto;
    overflow-x: hidden;
    color: var(--spectrum-global-color-gray-700);
  }

  .listSelected {
    color: var(--spectrum-global-color-gray-800);
    border-left: 1px solid var(--spectrum-global-color-gray-300);
    padding-left: 0.25rem;
  }
  .searchControl {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;
    min-height: 2rem;
  }
  .options {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;
    overflow-y: auto;
    gap: 0rem;
    min-width: 0;
  }
  .option {
    line-height: 1.5rem;
    padding: 0.15rem 0.5rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: flex;
    justify-content: space-between;

    & > i {
      visibility: hidden;
    }

    &:hover {
      & > i {
        visibility: visible;
        color: var(--spectrum-global-color-green-500);
      }
    }

    &.selected {
      & > i {
        color: var(--spectrum-global-color-red-500);
      }
    }
  }

  .options > span {
    color: var(--spectrum-global-color-gray-500);
    font-style: italic;
    flex: auto;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .option:hover,
  .option.focused {
    background-color: var(--spectrum-global-color-gray-200);
    border-radius: 4px;
    cursor: pointer;
  }
</style>
