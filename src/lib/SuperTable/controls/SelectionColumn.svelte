<script>
  import { getContext, beforeUpdate } from "svelte";

  const stbState = getContext("stbState");
  const stbSettings = getContext("stbSettings");
  const stbData = getContext("stbData");
  const stbScrollPos = getContext("stbScrollPos");
  const stbHorizontalScrollPos = getContext("stbHorizontalScrollPos");
  const stbHovered = getContext("stbHovered");
  const stbSelected = getContext("stbSelected");
  const stbEditing = getContext("stbEditing");
  const stbMenuID = getContext("stbMenuID");
  const stbAPI = getContext("stbAPI");
  const rowMetadata = getContext("stbRowMetadata");

  export let clientHeight;
  export let scrollHeight;
  export let canScroll;
  export let overflow;

  export let sticky;

  let columnBodyAnchor;
  let mouseover;

  $: synchScrollPosition($stbScrollPos);
  $: canSelect = $stbSettings.features.canSelect;
  $: canInsert = $stbSettings.features.canInsert;
  $: inInsert = $stbState == "Inserting";
  $: idColumn = $stbSettings.data.idColumn;
  $: partialSelection = $stbSelected.length;
  $: fullSelection = $stbSelected.length == $stbData.rows.length;
  $: loading = $stbData.loading;
  $: canDelete = $stbSettings.features.canDelete;
  $: numbering = $stbSettings.appearance.numberingColumn;
  $: sticky = $stbHorizontalScrollPos > 0;
  $: visible = numbering || canSelect || canDelete;

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
<div class="super-column control-column" class:sticky class:visible>
  {#if $stbSettings?.showHeader}
    <div
      class="super-column-header"
      class:selection={visible}
      on:mouseenter={() => (mouseover = true)}
      on:mouseleave={() => (mouseover = false)}
    >
      {#if loading && visible}
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
      {:else if canSelect && $stbSettings.features.maxSelected != 1}
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

      {#if canDelete && $stbSelected.length > 1}
        <i
          class="ri-delete-bin-line delete"
          style:color={"var(--spectrum-global-color-red-500)"}
          on:click={(e) => stbAPI.deleteSelectedRows()}
        />
      {/if}
    </div>
  {/if}

  <div
    bind:this={columnBodyAnchor}
    class="super-column-body"
    class:zebra={$stbSettings.appearance.zebraColors}
    class:quiet={$stbSettings?.appearance?.quiet}
    class:sticky
    on:mouseleave={() => ($stbHovered = undefined)}
  >
    {#each $stbData.rows as row, index}
      {@const hovered = $stbHovered == index || $stbMenuID == row[idColumn]}
      {@const editing = $stbEditing == index}
      {@const selected = $stbSelected?.includes(row[idColumn])}
      <div
        class="super-row"
        class:selection={visible}
        class:is-selected={selected}
        class:is-hovered={hovered}
        class:is-editing={editing}
        style:min-height={$rowMetadata[index]?.height}
        style:background-color={sticky
          ? "var(--spectrum-global-color-gray-75)"
          : null}
        on:mouseenter={() => ($stbHovered = index)}
      >
        {#if editing && numbering && visible}
          <i class="ri-edit-line" style:color={"var(--primaryColor)"}></i>
        {:else if canSelect}
          {#if selected}
            <i
              class="ri-check-line"
              style:color={"var(--spectrum-global-color-gray-800)"}
              on:click={() => stbAPI.selectRow(row[idColumn])}
            />
          {:else}
            <i
              class="ri-checkbox-blank-line"
              on:click={() => stbAPI.selectRow(row[idColumn])}
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
            on:click={(e) => stbAPI.deleteRow(row[idColumn])}
          />
        {/if}
      </div>
    {/each}
    {#if overflow || canInsert}
      {#if inInsert}
        <div class="add-row" style="padding: unset;"></div>
      {/if}
      <div
        class="spacer"
        style:background-color={sticky
          ? "var(--spectrum-global-color-gray-75)"
          : null}
      />
    {/if}
  </div>

  {#if $stbSettings.showFooter}
    <div class="super-column-footer" style:padding={"unset"}></div>
  {/if}
</div>

<style>
  .visible {
    min-width: 2.4rem;
  }
  .selection {
    flex: auto;
    padding-left: 0.75rem;
    padding-right: 0.5rem;
    gap: 1rem;
    font-size: 14px;
    font-weight: 500;
    align-items: center;
  }

  i {
    font-size: 16px;
    color: var(--spectrum-global-color-gray-500);
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

  .loader {
    width: 18px;
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
