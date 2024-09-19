<script>
  import { getContext, createEventDispatcher } from "svelte";
  import { elementSizeStore } from "svelte-legos";

  const { Provider, processStringSync, ContextScopes, API } = getContext("sdk");

  const dispatch = createEventDispatcher();
  const columnSettings = getContext("stColumnOptions");
  const rowCellOptions = getContext("stRowCellOptions");
  const stbAPI = getContext("stbAPI");

  export let index;
  export let row;
  export let field;
  export let idField;
  export let isSelected;
  export let isHovered;
  export let isEditing;
  export let odd;
  export let isLast;

  // the proposed height
  export let height;
  export let minHeight;

  let contents, size, cellHeight, rowElement;
  $: meta = row["_st_meta"] ?? {};

  $: if ($columnSettings.hasChildren && contents)
    size = elementSizeStore(contents);
  else size = undefined;

  // Ractive request for additional height if needed
  $: if ($size) {
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

  function omit(key, obj) {
    const { [key]: omitted, ...rest } = obj;
    return rest;
  }

  const patchRow = async (change) => {
    let patch = { _id: row[idField], [field]: change };
    row = await stbAPI.patchRow(patch);
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
  style:min-height={height + "px"}
  style:color={meta.color ? meta.color : "inherit"}
  style:background-color={meta.bgcolor && !isHovered ? meta.bgcolor : null}
  on:mouseenter={() => dispatch("hovered")}
  on:mouseleave={() => dispatch("unHovered")}
  on:click={() => {
    dispatch("rowClicked", row[idField]);
  }}
  on:dblclick={() => dispatch("rowDblClicked", row[idField])}
  on:contextmenu|preventDefault={() =>
    dispatch("contextmenu", { rowID: row[idField], anchor: rowElement })}
>
  {#if !$columnSettings.hasChildren}
    <svelte:component
      this={$columnSettings.cellComponent}
      cellOptions={$rowCellOptions}
      fieldSchema={$columnSettings.schema}
      value={row[field]}
      formattedValue={getCellValue(row[field])}
      on:enteredit
      on:exitedit
      on:change={(e) => patchRow(e.detail)}
    />
  {:else}
    <Provider
      data={{
        id: row[idField],
        value: row[field],
        row: omit("_st_meta", row),
        index,
      }}
      scope={ContextScopes.Local}
    >
      <div
        bind:this={contents}
        class="contents-wrapper"
        style:justify-content={$columnSettings.align}
      >
        <slot />
      </div>
    </Provider>
  {/if}
</div>

<style>
  .contents-wrapper {
    flex: 1 1 auto;
    display: flex;
  }
</style>
