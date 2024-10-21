<script>
  import { dndzone } from "../../../node_modules/svelte-dnd-action/dist/";
  import { createEventDispatcher } from "svelte";
  import { generate } from "../../../node_modules/shortid";
  import { writable, get } from "svelte/store";

  export let items = [];
  export let itemsColors = [];
  export let showColors;
  export let showHandle = true;
  export let listItemKey;
  export let listItemText = "primaryDisplay";
  export let draggable = true;
  export let numbering;
  export let focus;
  export let addNew = true;
  export let editorState;
  export let cellState;
  export let createNew;
  export let reorderOnly;
  export let placeholder;

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

  $: if (focus && store) {
    get(store).actions.select(focus);
  }

  $: inEdit = $cellState == "Editing";
  $: showHandle = draggableItems.length > 1 && draggable;
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
          color: itemsColors[item],
          item,
          type: zoneType,
        };
      })
      .filter((item) => item.id);
  };

  $: draggableItems = buildDraggable(items);

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
      }}
      bind:this={anchors[draggableItem.id]}
    >
      <div class="left-content">
        {#if showHandle}
          <div
            class="handle"
            class:inEdit
            aria-label="drag-handle"
            style={!inactive ? "cursor:grabbing" : "cursor:grab"}
            on:mousedown={() => {
              inactive = false;
            }}
            on:mouseup={() => {
              inactive = true;
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="14"
              height="18"
              ><path
                d="M8.5 7C9.32843 7 10 6.32843 10 5.5C10 4.67157 9.32843 4 8.5 4C7.67157 4 7 4.67157 7 5.5C7 6.32843 7.67157 7 8.5 7ZM8.5 13.5C9.32843 13.5 10 12.8284 10 12C10 11.1716 9.32843 10.5 8.5 10.5C7.67157 10.5 7 11.1716 7 12C7 12.8284 7.67157 13.5 8.5 13.5ZM10 18.5C10 19.3284 9.32843 20 8.5 20C7.67157 20 7 19.3284 7 18.5C7 17.6716 7.67157 17 8.5 17C9.32843 17 10 17.6716 10 18.5ZM15.5 7C16.3284 7 17 6.32843 17 5.5C17 4.67157 16.3284 4 15.5 4C14.6716 4 14 4.67157 14 5.5C14 6.32843 14.6716 7 15.5 7ZM17 12C17 12.8284 16.3284 13.5 15.5 13.5C14.6716 13.5 14 12.8284 14 12C14 11.1716 14.6716 10.5 15.5 10.5C16.3284 10.5 17 11.1716 17 12ZM15.5 20C16.3284 20 17 19.3284 17 18.5C17 17.6716 16.3284 17 15.5 17C14.6716 17 14 17.6716 14 18.5C14 19.3284 14.6716 20 15.5 20Z"
              ></path></svg
            >
          </div>
        {:else if numbering && draggableItems.length > 1}
          <div class="index">{idx + 1}</div>
        {/if}

        {#if showColors}
          <div
            style:background-color={draggableItem.color}
            style="width: 13px; height: 13px; border-radius: 2px;"
          ></div>
        {/if}
      </div>
      <div class="right-content">
        {#if inEdit}
          {draggableItem.item[listItemText] || draggableItem.item}
          {#if !reorderOnly}
            <i
              class="ri-close-line"
              on:mousedown|preventDefault={() => removeItem(draggableItem.id)}
            />
          {/if}
        {:else}
          {draggableItem.item[listItemText] || draggableItem.item}
        {/if}
      </div>
    </li>
  {/each}

  {#if addNew && !reorderOnly && inactive}
    <li class="buttons">
      <div class="add-button" on:click={() => dispatch("togglePicker")}>
        {$editorState == "Closed" ? "Select" : "Close"}
      </div>
      <div class="add-button" on:click={() => dispatch("clear")}>Clear</div>
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
  }
  .list-wrap > li:not(.buttons) {
    background-color: transparent;
    transition: background-color ease-in-out 130ms;
    display: flex;
    align-items: center;
    border-bottom: 1px solid var(--spectrum-global-color-gray-200);
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
    gap: 0.25rem;
  }
  .left-content {
    flex: none;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin-right: 0.5rem;
  }
  li.buttons {
    display: flex;
    padding: unset !important;
  }
  li.buttons:hover {
    background-color: transparent !important;
  }
  i:hover {
    cursor: pointer;
  }
  .add-button {
    flex: 1;
    min-width: 0;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .add-button:hover {
    background-color: var(--spectrum-global-color-gray-100);
    cursor: pointer;
  }
  .list-wrap li {
    padding-left: var(--spacing-s);
    padding-right: var(--spacing-s);
    line-height: 1.85rem;
  }
  .handle > svg:hover {
    cursor: grab;
  }

  .index,
  .handle {
    display: flex;
    min-width: 1.25rem;
    justify-content: center;
    align-items: center;
    color: var(--spectrum-global-color-gray-500);
    fill: var(--spectrum-global-color-gray-700);
    font-size: 14px;
    margin-left: -4px;
  }
</style>
