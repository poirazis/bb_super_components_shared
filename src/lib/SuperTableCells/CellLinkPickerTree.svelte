<script>
  import { createEventDispatcher, getContext } from "svelte";
  import { writable } from "svelte/store";
  import SuperTree from "../SuperTree/SuperTree.svelte";
  const { API, fetchData, notificationStore } = getContext("sdk");

  const dispatch = createEventDispatcher();

  export let value = [];
  export let tableId;
  export let idColumn = "_id";
  export let valueColumn;
  export let parentColumn;
  export let sortColumn;
  export let sortOrder;
  export let filter = {};
  export let limit = 250;
  export let labelColumn;
  export let searchTerm;
  export let searchColumns = [];
  export let multi = false;

  export let picker;
  export let quiet;

  let selectedNodes = new writable([]);
  let maxNodeSelection = 10;

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
      tableId,
    },
    options: {
      filter,
      limit,
    },
  });

  $: buildRootTree($fetch.rows);

  // Recursion
  const getChildren = (rows, value) => {
    let children = [];
    rows.forEach((row) => {
      if (row[parentColumn] == value) {
        children.push({
          id: row[idColumn],
          label: row[valueColumn],
          children: getChildren(rows, row[valueColumn]),
        });
      }
    });
    return children;
  };

  // Build Tree Structure
  const buildRootTree = (rows) => {
    $selectedNodes = [];
    rows.forEach((row) => {
      if (row[parentColumn]) {
      } else {
        tree.children.push({
          id: row[idColumn],
          label: row[valueColumn],
          children: getChildren(rows, row[valueColumn]),
        });
      }
    });
    tree = tree;
    value.forEach((v) => $selectedNodes.push({ id: v["_id"] }));
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
      $selectedNodes = [{ id: e.detail.id, label: e.detail.label }];
    }

    dispatch(
      "change",
      $selectedNodes.map((x) => {
        return { _id: x.id, primaryDisplay: x.label };
      })
    );
  };
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div bind:this={picker} class="control">
  <ul
    class="spectrum-TreeView spectrum-TreeView--sizeS"
    class:spectrum-TreeView--quiet={quiet}
    style:visibility={"visible"}
    style:height={"auto"}
    style:overflow-y={"auto"}
  >
    {#if $fetch.loaded}
      {#each tree.children as node}
        <SuperTree
          tree={node}
          nodeSelection
          {selectedNodes}
          on:nodeSelect={handleNodeSelect}
        />
      {/each}
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
  }
</style>
