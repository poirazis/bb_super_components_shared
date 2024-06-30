<script>
  export let stbSettings;
  export let stbState;
  export let stbSelected;
  export let stbHovered;
  export let stbEditing;
  export let stbData;
  export let stbScrollPos;
  export let stbVerticalScroll;
  export let stbRowHeights;
  export let stbRowColors;
  export let loading;
  export let headerHeight;
  export let quiet;

  let columnBodyAnchor;
  let mouseover;
  let color;

  $: synchScrollPosition($stbScrollPos);

  const synchScrollPosition = (position) => {
    if (columnBodyAnchor) columnBodyAnchor.scrollTop = position;
  };

  const syncScroll = (e) => {
    $stbScrollPos = columnBodyAnchor.scrollTop;
    $stbVerticalScroll =
      columnBodyAnchor.scrollTop / columnBodyAnchor.scrollTopMax;
  };
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="spectrum-Table" on:mouseleave={() => ($stbHovered = null)}>
  {#if $stbSettings.showHeader}
    <div
      class="spectrum-Table-headCell"
      style:height={headerHeight}
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
          style:font-size={"16px"}
          on:click={stbState.clearFilter}
        ></i>
      {:else if $stbState == "Filtered"}
        <i
          class="ri-filter-fill"
          style:font-size={"16px"}
          style:color={"var(--spectrum-global-color-blue-500)"}
        ></i>
      {:else if $stbSettings.rowSelectMode == "multi"}
        <div
          class="loope"
          on:click={stbState.toggleSelectAllRows}
          style:background-color={color
            ? color
            : "var(--spectrum-global-color-gray-200)"}
        >
          {#if $stbSelected.length > 0 && $stbSelected.length < $stbData?.rows.length}
            -
          {:else if $stbData?.rows.length && $stbSelected.length == $stbData?.rows.length}
            <i class="ri-check-line" />
          {/if}
        </div>
      {/if}
    </div>
  {/if}

  <div
    bind:this={columnBodyAnchor}
    class="spectrum-Table-body"
    style:background={quiet ? "transparent" : null}
    style:border-right="var(--super-table-vertical-dividers)"
    on:scroll|self={syncScroll}
  >
    {#if $stbData?.rows?.length}
      {#each $stbData.rows as row, index}
        {@const rowID = row[$stbSettings.data.idColumn]}
        {@const selected =
          $stbSelected.includes(rowID) ||
          $stbSelected.includes(rowID?.toString())}
        <div
          class="spectrum-Table-row"
          on:mouseenter={() => ($stbHovered = index)}
          on:click={() => stbState.toggleSelectRow(rowID)}
          class:is-selected={selected}
          class:is-hovered={$stbHovered === index}
          class:is-editing={$stbEditing == index &&
            ($stbSettings.appearance.highlighters == "horizontal" ||
              $stbSettings.appearance.highlighters == "both")}
          class:odd={$stbSettings.appearance.zebraColors && index % 2 == 1}
          style:min-height={$stbRowHeights[index]}
          style:background-color={$stbRowColors[index]?.bgcolor}
        >
          {#if $stbEditing == index}
            <i class="ri-edit-line" style:color={"var(--primaryColor)"}></i>
          {:else if $stbSettings.rowSelectMode != "off"}
            <div
              class="loope"
              style:height={$stbSettings.appearance.size == "S" ? 12 : 14}
              style:background-color={selected
                ? "var(--primaryColor)"
                : "var(--spectrum-global-color-gray-50)"}
            >
              {#if selected}
                <i
                  class="ri-check-line"
                  style:color="var(--spectrum-global-color-gray-50)"
                />
              {/if}
            </div>
          {:else}
            {index + 1}
          {/if}
        </div>
      {/each}
    {:else}
      {#each $stbRowHeights as val, index}
        <div
          class="spectrum-Table-row"
          on:mouseenter={() => ($stbHovered = index)}
          class:is-hovered={$stbHovered === index}
          style:height={val}
        >
          {index + 1}
        </div>
      {/each}
    {/if}
  </div>

  {#if $stbSettings.showFooter}
    <div class="spectrum-Table-footer" style:height={headerHeight}></div>
  {/if}
</div>

<style>
  .spectrum-Table {
    background-color: transparent;
    min-width: 2.4rem;
  }
  .spectrum-Table-headCell {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    padding: unset;
    background-color: var(--spectrum-global-color-gray-100);
    border-bottom: 1px solid var(--spectrum-alias-border-color-mid);
    border-right: var(--super-table-vertical-dividers);
  }
  .spectrum-Table-row {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: unset;
    margin: unset;
    color: var(--spectrum-global-color-gray-400);
    border-bottom: var(--super-table-horizontal-dividers);
  }
  .spectrum-Table-row.odd {
    background-color: var(--spectrum-global-color-gray-75);
  }
  .is-hovered {
    background-color: var(--spectrum-global-color-gray-75) !important;
    color: var(--spectrum-global-color-gray-800);
  }

  .is-hovered.is-selected {
    background-color: var(
      --spectrum-table-m-regular-row-background-color-selected-hover,
      var(--spectrum-alias-highlight-selected-hover)
    ) !important;
  }

  .is-selected {
    background-color: important;
  }

  .is-hovered.is-selected {
    background-color: var(
      --spectrum-table-m-regular-row-background-color-selected-hover,
      var(--spectrum-alias-highlight-selected-hover)
    ) !important;
    color: var(--spectrum-global-color-gray-800) !important;
  }
  .is-selected {
    background-color: var(
      --spectrum-table-m-regular-row-background-color-selected,
      var(--spectrum-alias-highlight-selected)
    ) !important;
    font-weight: 800;
    color: var(--spectrum-global-color-gray-800);
  }

  .is-editing {
    background-color: var(--spectrum-global-color-gray-100) !important;
  }

  .spectrum-Table-body {
    height: var(--super-table-body-height);
    border-radius: 0px;
    overflow-y: scroll !important;
    overflow-x: hidden;
    padding: 0px;
    margin: 0px;
    border: none;
    scrollbar-width: none;
    background-color: var(--spectrum-global-color-gray-50);
  }
  .spectrum-Table-body::-webkit-scrollbar {
    display: none;
  }
  .spectrum-Table-footer {
    width: 100%;
    max-height: 2rem;
    border-right: var(--super-table-vertical-dividers);
    background-color: var(--spectrum-global-color-gray-100);
    border-top: 2px solid var(--spectrum-alias-border-color-mid);
    overflow: hidden;
  }

  .loope {
    height: 14px;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 2px;
    font-weight: 600;
    font-size: 12px;
    border: 1px solid var(--spectrum-global-color-gray-400);
  }
  .loope:hover {
    border: 1px solid var(--spectrum-global-color-gray-700);
    cursor: pointer;
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
