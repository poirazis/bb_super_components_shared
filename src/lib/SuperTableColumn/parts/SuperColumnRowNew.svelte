<script>
  import { getContext, createEventDispatcher } from "svelte";
  import { elementSizeStore } from "svelte-legos";
  import { readonly } from "svelte/store";

  const { processStringSync } = getContext("sdk");

  const dispatch = createEventDispatcher();
  const columnSettings = getContext("stColumnSettings");
  const columnState = getContext("stColumnState");

  export let row;
  export let inInsert = true;
  export let color;

  // the proposed height
  export let height;
  export let minHeight;

  let contents, size, cellHeight, rowElement;

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
      : undefined;
  };
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div
  bind:this={rowElement}
  class="super-row"
  style:height
  style:color
  on:mouseenter={() => dispatch("hovered")}
  on:mouseleave={() => dispatch("unHovered")}
>
  {#if inInsert}
    <svelte:component
      this={$columnSettings.cellComponent}
      cellOptions={{
        ...$columnSettings.cellOptions,
        readonly: false,
        initialState: "View",
      }}
      autofocus
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
  {/if}
</div>
