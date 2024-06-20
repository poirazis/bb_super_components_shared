<script>
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let tree;

  export let label;
  export let quiet;
  export let open = false;
  export let nodeSelection;
  export let selectedNodes;
  export let icon = "ri-checkbox-blank-line";
  export let id;
  export let disabled;

  $: if (disabled) open = false;

  const handleClick = (e) => {
    if (disabled) return;

    if (tree.children?.length) {
      open = !open;
      return;
    } else {
      toggleNode(e);
    }
    dispatch("nodeClick", { id, label });
    e.stopPropagation();
  };

  const toggleNode = (e) => {
    dispatch("nodeSelect", { id: tree.id, label: tree.label });
    e.stopPropagation();
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
  <a
    class="spectrum-TreeView-itemLink"
    style:padding-left={tree.children?.length || quiet ? "0.25rem" : "0.5rem"}
    on:click|self={handleClick}
  >
    {#if tree.children?.length && !quiet}
      <i class="ri-arrow-right-s-line chevron" class:open> </i>
    {/if}

    {#if $selectedNodes?.findIndex((x) => x.id == tree.id) > -1}
      <i class="icon selected ri-checkbox-fill" on:click={toggleNode} />
    {:else}
      <i class="icon ri-checkbox-blank-line" on:click={toggleNode} />
    {/if}

    {tree.label || "Not Set"}
  </a>

  {#if tree.children?.length && open}
    <ul class="spectrum-TreeView" class:spectrum-TreeView--quiet={quiet}>
      {#each tree.children as node, idx}
        <svelte:self
          tree={node}
          {nodeSelection}
          {selectedNodes}
          quiet={node.quiet}
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
    padding-left: 0.25rem;
  }

  .spectrum-TreeView-itemLink {
    width: 100%;
    display: flex;
    justify-content: stretch;
    gap: 0.5rem;
    padding-left: unset;
  }

  .icon {
    font-size: 18px;
    color: var(--spectrum-global-color-gray-600);
    transition: all 130ms;
    z-index: 2;
  }

  .selected {
    font-size: 18px;
    color: var(--spectrum-global-color-gray-700);
  }
  .chevron {
    transition: all 130ms;
    font-size: 16px;
    color: var(--spectrum-global-color-gray-500);
    z-index: -1;
  }

  .chevron.open {
    transform: rotate(90deg);
    color: var(--spectrum-global-color-gray-800);
  }
</style>
