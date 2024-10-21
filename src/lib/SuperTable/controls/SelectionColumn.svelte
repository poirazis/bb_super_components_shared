<script>
  import { getContext } from "svelte";

  const stbState = getContext("stbState");
  const stbSettings = getContext("stbSettings");
  const stbData = getContext("stbData");
  const stbScrollOffset = getContext("stbScrollOffset");
  const stbHorizontalScrollPos = getContext("stbHorizontalScrollPos");
  const stbHovered = getContext("stbHovered");
  const stbSelected = getContext("stbSelected");
  const stbEditing = getContext("stbEditing");
  const stbAPI = getContext("stbAPI");
  const rowMetadata = getContext("stbRowMetadata");
  const stbVisibleRows = getContext("stbVisibleRows");

  export let sticky;
  export let hideSelectionColumn;

  let viewport;
  $: idColumn = $stbSettings.data.idColumn;
  $: partialSelection = $stbSelected.length;
  $: fullSelection =
    $stbSelected.length == $stbData.rows.length && $stbData.rows.length > 0;
  $: numbering = $stbSettings.appearance.numberingColumn;
  $: sticky = $stbHorizontalScrollPos > 0;
  $: visible =
    numbering ||
    ($stbSettings.features.canSelect && !hideSelectionColumn) ||
    $stbSettings.features.canDelete;

  $: synchScrollPosition($stbScrollOffset);
  const synchScrollPosition = (position) => {
    if (viewport) viewport.scrollTop = position;
  };
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
{#if visible}
  <div class="super-column control-column" class:sticky>
    {#if $stbSettings?.showHeader}
      <div class="control-column-header">
        {#if numbering}
          <div class="row-number"></div>
        {/if}

        {#if $stbSettings.features.canDelete}
          {#if $stbSelected.length > 1}
            <i
              class="ri-delete-bin-line"
              on:click={stbAPI.deleteSelectedRows}
            />
          {:else}
            <div class="row-number"></div>
          {/if}
        {/if}

        {#if $stbSettings.features.canSelect && $stbSettings.features.maxSelected != 1 && !hideSelectionColumn}
          {#if fullSelection}
            <i class="ri-check-line" on:click={stbAPI.selectAllRows} />
          {:else if partialSelection}
            <i
              class="ri-checkbox-indeterminate-line"
              on:click={stbAPI.selectAllRows}
            ></i>
          {:else}
            <i
              class="ri-checkbox-blank-line"
              style:color={"var(--spectrum-global-color-gray-500)"}
              on:click={stbAPI.selectAllRows}
            />
          {/if}
        {/if}
      </div>
    {/if}

    <div
      bind:this={viewport}
      class="super-column-body"
      class:zebra={$stbSettings.appearance.zebraColors}
      class:quiet={$stbSettings?.appearance?.quiet}
      class:sticky
      style:background-color={sticky
        ? "var(--spectrum-global-color-gray-50)"
        : null}
    >
      {#each $stbVisibleRows as row (row.index)}
        <div
          class="super-row selection"
          class:is-selected={$stbSelected?.includes(row.data[idColumn])}
          class:is-hovered={$stbHovered == row.index}
          class:is-editing={$stbEditing == row.data[idColumn]}
          style:min-height={$rowMetadata[row.index]?.height}
          on:mouseenter={() => ($stbHovered = row.index)}
          on:mouseleave={() => ($stbHovered = null)}
        >
          {#if numbering}
            <span class="row-number">
              {#if $stbEditing == row.data[idColumn]}
                <i
                  class="ri-edit-line"
                  style:font-size={"12px"}
                  style:color={"lime"}
                />
              {:else}
                {row.index + 1}
              {/if}
            </span>
          {/if}

          {#if $stbSettings.features.canDelete}
            <i
              class="ri-delete-bin-line delete"
              on:click={(e) => stbAPI.deleteRow(row.index)}
            />
          {/if}

          {#if $stbSettings.features.canSelect && !hideSelectionColumn}
            {#if $stbSelected?.includes(row.data[idColumn])}
              <i
                class="ri-check-line"
                style:color={"var(--spectrum-global-color-gray-800)"}
                on:click={() => stbAPI.selectRow(row.index)}
              />
            {:else}
              <i
                class="ri-checkbox-blank-line"
                on:click={() => stbAPI.selectRow(row.index)}
              />
            {/if}
          {/if}
        </div>
      {/each}

      {#if $stbState == "Inserting"}
        <div class="add-row" style="padding: unset;"></div>
      {/if}
    </div>

    {#if $stbSettings.showFooter}
      <div class="super-column-footer" style:padding={"unset"}></div>
    {/if}
  </div>
{/if}

<style>
  .selection {
    flex: auto;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    gap: 1rem;
    font-size: 14px;
    font-weight: 500;
    align-items: center;
    &.is-hovered > .delete {
      color: var(--spectrum-global-color-red-500);
    }
    &.is-selected > .delete {
      color: var(--spectrum-global-color-red-500);
    }
    &.is-hovered > i {
      color: var(--spectrum-global-color-gray-700);
    }
  }

  i {
    font-size: 16px;
    color: var(--spectrum-global-color-gray-500);
  }
</style>
