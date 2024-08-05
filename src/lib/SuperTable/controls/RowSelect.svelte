<script>
  import { getContext, beforeUpdate } from "svelte";

  const stbState = getContext("stbState");
  const stbSettings = getContext("stbSettings");
  const stbData = getContext("stbData");
  const stbScrollPos = getContext("stbScrollPos");
  const stbVerticalScroll = getContext("stbVerticalScroll");
  const stbHovered = getContext("stbHovered");
  const stbSelected = getContext("stbSelected");
  const stbRowHeights = getContext("stbRowHeights");
  const stbRowColors = getContext("stbRowColors");
  const stbEditing = getContext("stbEditing");

  export let loading;
  export let headerHeight;
  export let quiet;

  export let clientHeight;
  export let scrollHeight;

  let columnBodyAnchor;
  let mouseover;

  $: synchScrollPosition($stbScrollPos);
  $: loaded = $stbData?.rows?.length;
  $: inInsert = $stbState == "Inserting";
  $: canInsert = $stbSettings?.features.canInsert;

  const synchScrollPosition = (position) => {
    if (columnBodyAnchor) columnBodyAnchor.scrollTop = position;
  };

  beforeUpdate(() => {
    scrollHeight = columnBodyAnchor?.scrollHeight;
    clientHeight = columnBodyAnchor?.clientHeight;
  });
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
{#if stbState}
  <div
    class="super-column"
    on:mouseleave={() => ($stbHovered = null)}
    style:max-width={"2.4rem"}
    style:min-width={"2.4rem"}
  >
    {#if $stbSettings?.showHeader}
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
            on:click={stbState.clearFilter}
          ></i>
        {:else if $stbState == "Filtered"}
          <i
            class="ri-filter-fill"
            style:color={"var(--spectrum-global-color-blue-500)"}
          ></i>
        {:else if $stbSettings.rowSelectMode == "multi"}
          {#if $stbSelected.length > 0 && $stbSelected.length < $stbData?.rows.length}
            <i
              class="ri-checkbox-indeterminate-line"
              on:click={stbState.toggleSelectAllRows}
            ></i>
          {:else if $stbData?.rows.length && $stbSelected.length == $stbData?.rows.length}
            <i class="ri-check-line" on:click={stbState.toggleSelectAllRows} />
          {:else}
            <i
              class="ri-checkbox-blank-line"
              style:color={"var(--spectrum-global-color-gray-500)"}
              on:click={stbState.toggleSelectAllRows}
            />
          {/if}
        {/if}
      </div>
    {/if}

    <div
      bind:this={columnBodyAnchor}
      class="spectrum-Table-body"
      style:background={quiet ? "transparent" : null}
      style:border-right={"var(--super-table-vertical-dividers)"}
    >
      {#if loaded}
        {#each $stbData.rows as row, index}
          {@const selected =
            $stbSelected?.includes(row[$stbSettings.data.idColumn]) ||
            $stbSelected?.includes(row[$stbSettings.data.idColumn]?.toString())}

          <div
            class="super-row spectrum-Table-row"
            on:mouseenter={() => ($stbHovered = index)}
            on:click={() =>
              stbState.toggleSelectRow(row[$stbSettings.data.idColumn])}
            class:is-selected={selected}
            class:is-hovered={$stbHovered === index}
            class:is-editing={$stbEditing == index &&
              ($stbSettings.appearance.highlighters == "horizontal" ||
                $stbSettings.appearance.highlighters == "both")}
            class:odd={$stbSettings.appearance.zebraColors && index % 2 == 1}
            style:min-height={$stbRowHeights[index]}
            style:background-color={$stbRowColors[index]?.bgcolor}
            style:align-items={"center"}
          >
            {#if $stbEditing == index}
              <i class="ri-edit-line" style:color={"var(--primaryColor)"}></i>
            {:else if $stbSettings.rowSelectMode}
              {#if selected}
                <i
                  class="ri-check-line"
                  style:color={"var(--spectrum-global-color-gray-800)"}
                />
              {:else if $stbSettings.rowSelectMode == "multi"}
                <i class="ri-checkbox-blank-line" />
              {:else}
                <i class="ri-checkbox-blank-line" />
              {/if}
            {:else}
              {index + 1}
            {/if}
          </div>
        {/each}
      {:else}
        {#each $stbRowHeights as height, index}
          <div class="super-row spectrum-Table-row" style:height>
            {index + 1}
          </div>
        {/each}
      {/if}

      {#if canInsert}
        <div
          class="super-row spectrum-Table-row"
          style:height={$stbRowHeights[0]}
          style:align-items={"center"}
        >
          <i
            class={inInsert ? "ri-save-line" : "ri-add-line"}
            on:click|self={inInsert ? stbState.save : stbState.addRow}
          >
          </i>
        </div>
        {#if inInsert || canInsert}
          <div class="spacer" style="min-height: 4rem" />
        {/if}
      {/if}
    </div>

    {#if $stbSettings.showFooter}
      <div class="spectrum-Table-footer" style:height={headerHeight}></div>
    {/if}
  </div>
{/if}

<style>
  i {
    font-size: 16px;
    color: var(--spectrum-global-color-gray-500);
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
