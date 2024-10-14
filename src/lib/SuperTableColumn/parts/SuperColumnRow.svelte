<script>
  import {
    getContext,
    createEventDispatcher,
    beforeUpdate,
    onMount,
    tick,
  } from "svelte";

  const { Provider, processStringSync, ContextScopes } = getContext("sdk");

  const dispatch = createEventDispatcher();
  const columnSettings = getContext("stColumnOptions");
  const columnState = getContext("stColumnState");
  const rowCellOptions = getContext("stRowCellOptions");
  const rowMetadata = getContext("stbRowMetadata");
  const stbHovered = getContext("stbHovered");
  const stbSelected = getContext("stbSelected");
  const stbAPI = getContext("stbAPI");
  const stbMenuID = getContext("stbMenuID");

  export let index;
  export let row;
  export let field;
  export let idField;
  export let isEditing;
  export let isLast;
  export let disabled;

  // the default height
  export let rowHeight;
  let mounted;

  let viewport, saving;
  $: meta = $rowMetadata[index] ?? {};
  $: isHovered = $stbHovered == index || $stbMenuID == row[idField];
  $: isSelected = $stbSelected.includes(row[idField]);
  $: hasChildren = $columnSettings.hasChildren > 0;

  const getCellValue = (value) => {
    return $columnSettings.template
      ? processStringSync($columnSettings.template, { value })
      : "";
  };

  const patchRow = async (change) => {
    saving = true;
    let patch = {
      _id: row[idField],
      [field]: change,
    };
    try {
      let patched_row = await stbAPI.patchRow(patch);
      row = patched_row;
    } catch (ex) {
      console.log(ex);
    } finally {
      saving = false;
    }
  };

  const handleSize = async () => {
    if (mounted) {
      await tick();
      if (
        $columnSettings.superColumn &&
        viewport &&
        viewport.scrollHeight > meta.height
      ) {
        dispatch("resize", viewport.scrollHeight);
      } else if (
        $columnSettings.superColumn &&
        viewport &&
        !hasChildren &&
        viewport.scrollHeight > rowHeight
      )
        dispatch("resize", rowHeight);
    }
  };

  beforeUpdate(() => handleSize());
  onMount(() => (mounted = $columnSettings.superColumn));
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->

<div
  bind:this={viewport}
  class="super-row"
  class:is-selected={isSelected}
  class:is-hovered={isHovered}
  class:is-editing={isEditing}
  class:saving
  class:isLast
  style:height={meta.height + "px"}
  style:color={meta.color}
  style:background-color={meta.bgcolor}
  style:justify-content={$columnSettings.align}
  on:mouseenter={() => ($stbHovered = index)}
  on:mouseleave={() => ($stbHovered = undefined)}
  on:click={() => {
    stbAPI.executeRowOnClickAction(row[idField]);
  }}
  on:dblclick={() => stbAPI.executeRowOnDblClickAction(row[idField])}
  on:contextmenu|preventDefault={() => {
    stbAPI.showContextMenu(row[idField], viewport);
  }}
>
  {#if !hasChildren}
    <svelte:component
      this={$columnSettings.cellComponent}
      cellOptions={{ ...$rowCellOptions, disabled }}
      fieldSchema={$columnSettings.schema}
      value={row[field]}
      formattedValue={getCellValue(row[field])}
      on:enteredit={() => columnState.enteredit(row[idField])}
      on:exitedit={columnState.exitedit}
      on:change={(e) => patchRow(e.detail)}
    />
  {:else}
    <Provider
      data={{
        id: row[idField],
        value: row[field],
        row,
        index,
      }}
      scope={ContextScopes.Local}
    >
      <slot />
    </Provider>
  {/if}
</div>
