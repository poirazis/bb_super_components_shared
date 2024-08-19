<script>
  import { getContext, createEventDispatcher } from "svelte";
  import { elementSizeStore } from "svelte-legos";

  const { Provider, processStringSync } = getContext("sdk");

  const dispatch = createEventDispatcher();
  const columnSettings = getContext("stColumnSettings");
  const columnState = getContext("stColumnState");

  export let index;
  export let row;
  export let isSelected;
  export let isHovered;
  export let isEditing;
  export let odd;
  export let isLast;

  // the proposed height
  export let height;
  export let minHeight;

  let contents, size, cellHeight, rowElement;
  $: meta = row.rowMeta;

  $: if ($columnSettings.hasChildren && contents)
    size = elementSizeStore(contents);

  // Ractive request for additional height if needed
  $: if (size && $columnSettings.hasChildren) {
    cellHeight = Math.ceil(parseFloat(contents?.scrollHeight));
    if (cellHeight > height) {
      dispatch("resize", cellHeight);
    } else if (cellHeight < minHeight) {
      dispatch("resize", minHeight);
    }
  }

  const getCellValue = (value) => {
    return $columnSettings.template
      ? processStringSync($columnSettings.template, { value })
      : "";
  };
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div
  bind:this={rowElement}
  class="super-row spectrum-Table-row"
  class:is-selected={isSelected}
  class:is-hovered={isHovered}
  class:is-editing={isEditing}
  class:odd
  class:isLast
  style:height={height + "px"}
  style:color={meta.color ? meta.color : "inherit"}
  style:background-color={meta.bgcolor && !isHovered ? meta.bgcolor : null}
  on:mouseenter={() => dispatch("hovered")}
  on:mouseleave={() => dispatch("unHovered")}
  on:click={() => {
    dispatch("rowClicked", row.rowID);
  }}
  on:dblclick={() => dispatch("rowDblClicked", row.rowID)}
  on:contextmenu|preventDefault={() =>
    dispatch("contextmenu", { rowID: row.rowID, anchor: rowElement })}
>
  {#if !$columnSettings.hasChildren}
    <svelte:component
      this={$columnSettings.cellComponent}
      cellOptions={$columnSettings.cellOptions}
      fieldSchema={$columnSettings.schema}
      value={row.rowValue}
      formattedValue={getCellValue(row.rowValue)}
      multi={$columnSettings.schema.type == "array"}
      on:enteredit
      on:exitedit
      on:change={(e) =>
        dispatch("cellChanged", {
          rowID: row.rowID,
          previousValue: row.rowValue,
          value: e.detail,
          field: $columnSettings.name,
        })}
    />
  {:else}
    <Provider data={{ id: row?.rowID, value: row?.rowValue, row: {} }}>
      <div
        bind:this={contents}
        class="contentsWrapper"
        style:justify-content={$columnSettings.align}
      >
        <slot />
      </div>
    </Provider>
  {/if}
</div>
