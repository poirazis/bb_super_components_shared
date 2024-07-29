<script>
  import { dndzone } from "../../../node_modules/svelte-dnd-action/dist/";
  import { createEventDispatcher, setContext } from "svelte";
  import { generate } from "../../../node_modules/shortid";
  import { writable, get } from "svelte/store";
  import DragHandle from "./drag-handle.svelte";

  export let items = [];
  export let showHandle = true;
  export let listType;
  export let listTypeProps = {};
  export let listItemKey;
  export let draggable = true;
  export let focus;
  export let addNew = true;
  export let editorState;
  export let cellState;

  let zoneType = generate();

  let store = writable({
    selected: null,
    actions: {
      select: (id) => {
        store.update((state) => ({
          ...state,
          selected: id,
        }));
      },
    },
  });

  setContext("draggable", store);

  $: if (focus && store) {
    get(store).actions.select(focus);
  }

  $: inEdit = $cellState == "Editing";
  $: showHandle = inEdit;
  $: isEmpty = draggableItems?.length < 1;

  const dispatch = createEventDispatcher();

  let anchors = {};
  let draggableItems = [];

  // Used for controlling cursor behaviour in order to limit drag behaviour
  // to the drag handle
  export let inactive = true;

  const buildDraggable = (items) => {
    return items
      .map((item) => {
        return {
          id: listItemKey ? item[listItemKey] : generate(),
          item,
          type: zoneType,
        };
      })
      .filter((item) => item.id);
  };

  $: if (items) {
    draggableItems = buildDraggable(items);
  }

  const updateRowOrder = (e) => {
    draggableItems = e.detail.items;
  };

  const serialiseUpdate = () => {
    return draggableItems.reduce((acc, ele) => {
      acc.push(ele.item);
      return acc;
    }, []);
  };

  const handleFinalize = (e) => {
    inactive = true;
    updateRowOrder(e);
    dispatch("change", serialiseUpdate());
  };

  const onItemChanged = (e) => {
    dispatch("itemChange", e.detail);
  };

  const removeItem = (id) => {
    let index = draggableItems.findIndex((item) => item.id == id);
    if (index > -1) {
      draggableItems.splice(index, 1);
      dispatch("change", serialiseUpdate());
    }
  };
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions-->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<ul
  class="list-wrap"
  class:inEdit
  use:dndzone={{
    items: draggableItems,
    dropTargetStyle: { outline: "none" },
    dragDisabled: !draggable || inactive,
    type: zoneType,
    dropFromOthersDisabled: true,
  }}
  on:finalize={handleFinalize}
  on:consider={updateRowOrder}
>
  {#each draggableItems as draggableItem, idx (draggableItem.id)}
    <li
      on:click={() => {
        get(store).actions.select(draggableItem.id);
        dispatch("itemClicked", {
          id: draggableItem.id,
          text: draggableItem.item.primaryDisplay,
        });
      }}
      bind:this={anchors[draggableItem.id]}
    >
      <div class="left-content">
        {#if showHandle}
          <div
            class="handle"
            aria-label="drag-handle"
            style={!inactive ? "cursor:grabbing" : "cursor:grab"}
            on:mousedown={() => {
              inactive = false;
            }}
            on:mouseup={() => {
              inactive = true;
            }}
          >
            <DragHandle />
          </div>
        {:else}
          <div class="index">{idx + 1}</div>
        {/if}
      </div>
      <div class="right-content">
        {draggableItem.item.primaryDisplay}
        {#if inEdit}
          <i
            class="ri-close-line"
            on:mousedown|preventDefault={() => removeItem(draggableItem.id)}
          />
        {/if}
      </div>
    </li>
  {/each}

  {#if addNew && inEdit && $editorState == "Closed" && inactive}
    <li>
      <div
        class="add-button"
        on:mousedown|self|preventDefault={editorState.toggle}
      >
        Select
      </div>
    </li>
  {/if}

  {#if isEmpty && !inEdit}
    <li>
      <div class="add-button">No Records</div>
    </li>
  {/if}
</ul>

<style>
  .list-wrap {
    list-style-type: none;
    margin: 0;
    padding: 0;
    width: 100%;
    border-radius: 4px;
    border: 0px solid
      var(--spectrum-table-border-color, var(--spectrum-alias-border-color-mid));
  }
  .list-wrap > li {
    background-color: transparent;
    transition: background-color ease-in-out 130ms;
    display: flex;
    align-items: center;
    border-bottom: 1px solid
      var(--spectrum-table-border-color, var(--spectrum-alias-border-color-mid));
  }
  .list-wrap.inEdit > li:hover {
    background-color: var(
      --spectrum-table-row-background-color-hover,
      var(--spectrum-alias-highlight-hover)
    );
    cursor: pointer;
  }
  .list-wrap > li:first-child {
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
  }
  .list-wrap > li:last-child {
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
    border-bottom: 0px;
  }
  .right-content {
    flex: 1;
    min-width: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .add-button {
    flex: 1;
    min-width: 0;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .list-wrap li {
    padding-left: var(--spacing-s);
    padding-right: var(--spacing-s);
    line-height: 2rem;
  }

  .list-wrap.compact li {
    font-size: 12px;
    line-height: 1.5rem;
  }
  .handle {
    display: flex;
    height: var(--spectrum-global-dimension-size-150);
  }
  .handle:hover {
    cursor: grab;
  }
  .handle :global(svg) {
    fill: var(--spectrum-global-color-gray-500);
    margin-right: var(--spacing-m);
    margin-left: 2px;
    width: var(--spectrum-global-dimension-size-65);
    height: 100%;
  }

  .index {
    display: flex;
    min-width: 1.25rem;
    justify-content: flex-start;
    align-items: center;
    color: var(--spectrum-global-color-gray-500);
  }
</style>
