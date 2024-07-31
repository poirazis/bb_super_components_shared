<script>
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let tree;
  export let label;

  export let open = false;
  export let nodeSelection;
  export let selectedNodes;
  export let id;
  export let disabled;

  let selectionIcon;

  $: if (disabled) open = false;
  $: selected = $selectedNodes.find((x) => x.id == tree.id);
  $: open = hasChildSelected(tree.children, $selectedNodes);

  const toggleOpen = (e) => {
    if (disabled) return;
    open = !open;
    dispatch("nodeClick", { id, label });
  };

  // Recursion
  const hasChildSelected = (children) => {
    let found = false;
    if (!$selectedNodes.length) return found;

    if (children.findIndex((x) => x.id == $selectedNodes[0].id) > -1) {
      found = true;
    } else {
      children.forEach((element) => {
        found = hasChildSelected(element.children);
      });
    }
    return found;
  };

  const toggleNode = (e) => {
    dispatch("nodeSelect", { id: tree.id, label: tree.label });
  };
</script>

<!-- svelte-ignore a11y-missing-attribute -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<li
  class="spectrum-TreeView-item"
  class:is-disabled={disabled}
  class:is-open={open}
>
  <div
    class="spectrum-TreeView-itemLink"
    style:padding-left={tree?.children?.length ? "0.25rem" : "1.5rem"}
    style:padding-right={"0.5rem"}
  >
    {#if tree.children?.length}
      <i
        class={"ri-arrow-right-s-line"}
        class:open
        style:z-index={1}
        style:font-size={"16px"}
        on:mousedown|self|stopPropagation|preventDefault={toggleOpen}
      />
    {/if}
    <div
      style:z-index={2}
      style:width={"100%"}
      on:mouseenter={() =>
        tree.children?.length ? null : (selectionIcon = true)}
      on:mouseleave={() => (selectionIcon = false)}
      on:mousedown|self|preventDefault={tree.children.length
        ? toggleOpen
        : toggleNode}
    >
      <span
        class="spectrum-TreeView-itemLabel"
        style:padding-left={"0.25rem"}
        on:mouseenter={() => (selectionIcon = true)}
        on:mouseleave={() => (selectionIcon = false)}
        on:mousedown|preventDefault={toggleNode}>{tree.label || "Not Set"}</span
      >
    </div>

    {#if selectionIcon || selected}
      <i
        class={selected ? "ri-checkbox-circle-fill" : "ri-checkbox-circle-line"}
        style:color={"var(--spectrum-global-color-green-500)"}
        style:font-size={"16px"}
      ></i>
    {/if}
  </div>

  {#if tree.children?.length}
    <ul class="spectrum-TreeView">
      {#each tree.children as node, idx}
        <svelte:self
          tree={node}
          {nodeSelection}
          {selectedNodes}
          open={node.open}
          on:nodeSelect
          on:nodeClick
        ></svelte:self>
      {/each}
    </ul>
  {/if}
</li>

<style>
  .spectrum-TreeView-item {
    transition: all 130ms;
  }

  .spectrum-TreeView-itemLink {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.25rem;
    max-height: 1.75rem;
  }

  i {
    transition: all 130ms;
  }
  .open {
    transform: rotate(90deg);
  }
</style>
