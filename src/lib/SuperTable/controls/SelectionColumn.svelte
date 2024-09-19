<script>
  import { getContext, beforeUpdate } from "svelte";

  const stbState = getContext("stbState");
  const stbSettings = getContext("stbSettings");
  const stbData = getContext("stbData");
  const stbScrollPos = getContext("stbScrollPos");
  const stbHorizontalScrollPos = getContext("stbHorizontalScrollPos");
  const stbHovered = getContext("stbHovered");
  const stbSelected = getContext("stbSelected");
  const stbRowHeights = getContext("stbRowHeights");
  const stbEditing = getContext("stbEditing");

  export let clientHeight;
  export let scrollHeight;
  export let canScroll;

  export let sticky;

  let columnBodyAnchor;
  let mouseover;

  $: synchScrollPosition($stbScrollPos);
  $: zebra = $stbSettings?.appearance?.zebraColors;
  $: quiet = $stbSettings?.appearance?.quiet;
  $: idColumn = $stbSettings.data.idColumn;
  $: partialSelection = $stbSelected.length;
  $: fullSelection = $stbSelected.length == $stbData.rows.length;
  $: loading = $stbData.loading;
  $: canDelete = $stbSettings.features.canDelete;
  $: numbering = $stbSettings.appearance.numberingColumn;
  $: sticky = $stbHorizontalScrollPos > 0;

  const synchScrollPosition = (position) => {
    if (columnBodyAnchor) columnBodyAnchor.scrollTop = position;
  };

  beforeUpdate(() => {
    scrollHeight = columnBodyAnchor?.scrollHeight;
    clientHeight = columnBodyAnchor?.clientHeight;
    canScroll = scrollHeight > clientHeight;
  });
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="super-column selection-column" class:sticky>
  {#if $stbSettings?.showHeader}
    <div
      class="selection-column-header"
      on:mouseenter={() => (mouseover = true)}
      on:mouseleave={() => (mouseover = false)}
    >
      {#if loading}
        <div class="loader" />
      {:else if $stbState == "Filtered" && mouseover}
        <i
          class="ri-filter-off-fill"
          style:color={"var(--spectrum-global-color-red-500)"}
          style:cursor={"pointer"}
          on:click={stbState.clearFilter}
        ></i>
      {:else if $stbState == "Filtered"}
        <i
          class="ri-filter-fill"
          style:color={"var(--spectrum-global-color-blue-500)"}
        ></i>
      {:else if $stbSettings.rowSelectMode == "multi"}
        {#if fullSelection}
          <i class="ri-check-line" on:click={stbState.toggleSelectAllRows} />
        {:else if partialSelection}
          <i
            class="ri-checkbox-indeterminate-line"
            on:click={stbState.toggleSelectAllRows}
          ></i>
        {:else}
          <i
            class="ri-checkbox-blank-line"
            style:color={"var(--spectrum-global-color-gray-500)"}
            on:click={stbState.toggleSelectAllRows}
          />
        {/if}
      {/if}

      {#if canDelete && $stbSelected.length > 1}
        <i
          class="ri-delete-bin-line delete"
          style:color={"var(--spectrum-global-color-red-500)"}
          on:click={(e) => stbState.deleteSelectedRows()}
        />
      {/if}
    </div>
  {/if}

  <div
    bind:this={columnBodyAnchor}
    class="spectrum-Table-body"
    class:quiet
    style:border-right={"var(--super-table-vertical-dividers)"}
  >
    {#each $stbData.rows as row, index}
      {@const hovered = $stbHovered == index}
      {@const editing = $stbEditing == index}
      {@const odd = zebra && index % 2 == 1}
      {@const selected = $stbSelected?.includes(row[idColumn])}
      <div
        class="super-row spectrum-Table-row selection"
        class:is-selected={selected}
        class:is-hovered={hovered}
        class:is-editing={editing}
        class:odd
        style:min-height={$stbRowHeights[index]}
        style:background-color={sticky
          ? "var(--spectrum-global-color-gray-75)"
          : null}
        on:mouseenter={() => ($stbHovered = index)}
      >
        {#if editing}
          <i class="ri-edit-line" style:color={"var(--primaryColor)"}></i>
        {:else if $stbSettings.rowSelectMode}
          {#if selected}
            <i
              class="ri-check-line"
              style:color={"var(--spectrum-global-color-gray-800)"}
              on:click={() => stbState.toggleSelectRow(row[idColumn])}
            />
          {:else}
            <i
              class="ri-checkbox-blank-line"
              on:click={() => stbState.toggleSelectRow(row[idColumn])}
            />
          {/if}
        {:else if numbering}
          <span class="row-number">
            {index + 1}
          </span>
        {/if}

        {#if canDelete}
          <i
            class="ri-delete-bin-line delete"
            class:hovered={hovered || selected}
            on:click={(e) => stbState.deleteRow(row[idColumn])}
          />
        {/if}
      </div>
    {/each}
    <div
      class="spacer"
      style:background-color={sticky
        ? "var(--spectrum-global-color-gray-75)"
        : "transparent"}
      style="min-height: 4rem"
    />
  </div>

  {#if $stbSettings.showFooter}
    <div class="spectrum-Table-footer"></div>
  {/if}
</div>

<style>
  .selection-column {
    flex: none;
  }
  .selection-column-header {
    display: flex;
    align-items: center;
    border: 1px solid transparent;
    border-bottom: 1px solid var(--spectrum-global-color-gray-200);
    background-color: var(--spectrum-global-color-gray-100);
    height: var(--super-table-header-height);
    padding-left: 0.75rem !important;
    gap: 1rem;
    font-size: 14px;
    font-weight: 500;
  }
  .selection {
    flex: auto !important;
    padding-left: 0.85rem !important;
    padding-right: 0.85rem !important;
    gap: 1rem;
    font-size: 14px;
    font-weight: 500;
    align-items: center;
  }
  .selection-column {
    flex: none;
  }

  i {
    font-size: 16px;
    color: var(--spectrum-global-color-gray-500);
  }

  .spectrum-Table-body::-webkit-scrollbar {
    display: none;
  }

  .delete {
    font-size: 14px;
    cursor: pointer;
  }
  .delete:hover,
  .delete.hovered {
    font-size: 14px;
    cursor: pointer;
    color: var(--spectrum-global-color-red-500);
  }

  .row-number {
    min-width: 1rem;
  }

  .loader {
    width: 20px;
    aspect-ratio: 1;
    border-radius: 50%;
    background:
      radial-gradient(
          farthest-side,
          var(--spectrum-global-color-gray-500) 94%,
          #0000
        )
        top/4px 4px no-repeat,
      conic-gradient(#0000 30%, var(--spectrum-global-color-gray-500));
    -webkit-mask: radial-gradient(
      farthest-side,
      #0000 calc(100% - 4px),
      #000 0
    );
    mask: radial-gradient(farthest-side, #0000 calc(100% - 4px), #000 0);
    animation: l13 1s infinite linear;
  }
  @keyframes l13 {
    100% {
      transform: rotate(1turn);
    }
  }
</style>
