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

  let schema = fieldSchema;
  let tableId = fieldSchema.tableId;
  let appliedFilter = [];

  $: localValue = Array.isArray(value) ? value : [];
  $: fetch = fetchData({
    API,
    datasource: {
      type: "table",
      tableId: tableId,
    },
    options: {
      filter,
      limit: 100,
    },
  });

  $: primaryDisplay = $fetch?.definition?.primaryDisplay;

  const rowSelected = (val) => {
    if (value) {
      let found = value.find((e) => e._id == val._id);
      return found;
    }
  };

  const selectRow = (val) => {
    if (schema.relationshipType == "many-to-many") {
      localValue.push({ _id: val._id, primaryDisplay: val[primaryDisplay] });
    } else if (schema.relationshipType == "many-to-one") {
      localValue.push({ _id: val._id, primaryDisplay: val[primaryDisplay] });
    } else if (schema.relationshipType == "one-to-many") {
      localValue = [{ _id: val._id, primaryDisplay: val[primaryDisplay] }];
    }
    value = localValue;
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
    }

    fetch?.update({
      filter: appliedFilter,
    });
  };
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="control">
  {#if search}
    <div class="searchControl">
      <CellString
        on:change={handleSearch}
        on:exitedit={() => dispatch("focusout", {})}
        autofocus
        {cellOptions}
      />
    </div>
  {/if}

  {#if $fetch?.loaded && $fetch?.rows?.length}
    {#if schema.relationshipType == "many-to-many" || schema.relationshipType == "many-to-one"}
      <div class="listWrapper">
        <div class="list">
          <div class="options">
            {#key localValue}
              {#each $fetch.rows as row, idx}
                {#if !rowSelected(row)}
                  <div
                    class="option"
                    on:mousedown|stopPropagation|preventDefault={selectRow(row)}
                  >
                    {row[primaryDisplay]}
                  </div>
                {/if}
              {/each}
            {/key}
          </div>
        </div>
        <div class="list listSelected">
          <div class="options">
            {#key localValue}
              {#each localValue as val, idx}
                {#if rowSelected(val)}
                  <div
                    transition:fly={{ x: -20, duration: 130 }}
                    class="option"
                    on:mousedown|stopPropagation|preventDefault={unselectRow(
                      val
                    )}
                  >
                    {val.primaryDisplay}
                  </div>
                {/if}
              {/each}
            {/key}
          </div>
        </div>
      </div>
    {/if}

    {#if schema.relationshipType == "one-to-many"}
      <div class="listWrapper">
        <div class="list">
          <div class="options">
            {#each $fetch?.rows as row, idx}
              {#if !rowSelected(row)}
                <div
                  class="option"
                  on:mousedown|stopPropagation|preventDefault={selectRow(row)}
                >
                  {row[primaryDisplay]}
                </div>
              {/if}
            {/each}
          </div>
        </div>
      </div>
    {/if}
  {:else}
    <p>No Records Found</p>
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
  }

  .listWrapper {
    flex: auto;
    display: flex;
    justify-content: stretch;
    align-content: stretch;
    gap: 0.5rem;
    overflow: hidden;
  }

  .list {
    flex: 1 1 50%;
    height: 200px;
    overflow-y: auto;
    overflow-x: hidden;
    color: var(--spectrum-global-color-gray-700);
    border: 1px solid var(--spectrum-global-color-gray-300);
    border-radius: 0.25rem;
  }

  .listSelected {
    color: var(--spectrum-global-color-gray-900);
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
    padding: 0.3rem;
    gap: 0rem;
    min-width: 0;
  }
  .option {
    line-height: 1.5rem;
    padding: 0.15rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .option:hover,
  .option.focused {
    background-color: var(--spectrum-global-color-gray-200);
    border-radius: 4px;
    cursor: pointer;
  }
</style>
