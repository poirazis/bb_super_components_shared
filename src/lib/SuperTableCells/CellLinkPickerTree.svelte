<script>
  import { createEventDispatcher, getContext } from "svelte";
  import { writable } from "svelte/store";
  import SuperTree from "../SuperTree/SuperTree.svelte";
  import CellString from "./CellString.svelte";
  const { API, fetchData, notificationStore } = getContext("sdk");

  const dispatch = createEventDispatcher();

  export let value = [];
  export let fieldSchema;
  export let joinColumn;

  export let sortColumn;
  export let sortOrder;
  export let filter = [];
  export let limit = 250;
  export let searchTerm;
  export let multi = false;

  export let picker;
  export let quiet;

  let selectedNodes = new writable([]);
  let maxNodeSelection = 10;
  let name = joinColumn || fieldSchema.name;
  let treeLoaded = false;
  let appliedFilter = [];

  let tree = {
    root: true,
    id: "root",
    label: "Super Tree",
    children: [],
  };

  $: fetch = fetchData({
    API,
    datasource: {
      type: "table",
      tableId: fieldSchema.tableId,
    },
    options: {
      sortOrder,
      sortColumn,
      filter,
      limit,
    },
  });

  $: primaryDisplay = $fetch?.definition?.primaryDisplay;
  $: buildRootTree($fetch.rows);
  $: setSelections(value);

  // Recursion
  const getChildren = (rows, parent) => {
    let children = [];
    rows?.forEach((row) => {
      if (row[name]?.[0]?._id == parent["_id"]) {
        children.push({
          id: row["_id"],
          label: row[$fetch.definition.primaryDisplay],
          children: getChildren(rows, row),
        });
      }
    });
    return children;
  };

  // Build Tree Structure
  const buildRootTree = (rows) => {
    treeLoaded = false;
    tree.children = [];
    if (rows?.length) {
      // Parse string into relationship object
      rows.map((x) => (x[name] = safeParse(x[name])));
      rows?.forEach((row) => {
        if (row[name]) {
        } else {
          tree.children.push({
            id: row["_id"],
            label: row[$fetch.definition.primaryDisplay],
            children: getChildren(rows, row),
          });
        }
      });
      tree = tree;
      treeLoaded = true;
    }
  };

  // Handle Node Selection
  const handleNodeSelect = (e) => {
    if (multi) {
      let index = $selectedNodes.findIndex((x) => x.id == e.detail.id);
      if (index > -1) {
        $selectedNodes.splice(index, 1);
        $selectedNodes = $selectedNodes;
      } else if ($selectedNodes.length < maxNodeSelection) {
        $selectedNodes = [...$selectedNodes, e.detail];
      } else if (maxNodeSelection == 1) {
        $selectedNodes = [e.detail];
      } else {
        notificationStore.actions.warning(
          "Cannot select more than " + maxNodeSelection + " items"
        );
      }
    } else {
      $selectedNodes =
        $selectedNodes[0]?.id !== e.detail.id
          ? [{ id: e.detail.id, label: e.detail.label }]
          : [];
    }

    dispatch(
      "change",
      $selectedNodes.map((x) => {
        return { _id: x.id, primaryDisplay: x.label };
      })
    );
  };

  const setSelections = () => {
    if (value && value.length) {
      $selectedNodes = [];
      $selectedNodes = value.map((x) => {
        return { id: x["_id"], label: x["primaryDisplay"] };
      });
    }
  };

  const safeParse = (x) => {
    let res;
    try {
      res = JSON.parse(x);
    } catch {}

    return res;
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

  let cellOptions = {
    icon: "ri-search-line",
    initialState: "Editing",
    role: "formInput",
    debounce: 250,
  };
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div bind:this={picker} class="control">
  <CellString
    on:change={handleSearch}
    autofocus
    {cellOptions}
    on:exitedit={() => dispatch("focusout", {})}
  />
  <ul
    class="spectrum-TreeView"
    style="margin: unset;"
    class:spectrum-TreeView--quiet={quiet}
  >
    {#if $fetch.loaded && treeLoaded && tree?.children?.length}
      {#each tree?.children as node}
        <SuperTree
          tree={node}
          nodeSelection
          {selectedNodes}
          on:nodeSelect={handleNodeSelect}
        />
      {/each}
    {:else}
      <li class="spectrum-TreeView-item" class:is-open={true}>
        <div class="spectrum-TreeView-itemLink">No Matches</div>
      </li>
    {/if}
  </ul>
</div>

<style>
  .control {
    flex: auto;
    flex-direction: column;
    display: flex;
    align-items: stretch;
    justify-content: stretch;
    overflow-x: hidden;
    padding: 0.5rem;
    gap: 0.25rem;
    min-height: 260px;
    max-height: 260px;
  }
</style>
