<script>
  import { getContext } from "svelte";
  import SuperPopover from "../../SuperPopover/SuperPopover.svelte";
  import SuperButton from "../../SuperButton/SuperButton.svelte";

  const { enrichButtonActions } = getContext("sdk");
  const context = getContext("context");

  export let stbSettings;
  export let stbSelected;
  export let stbHovered;
  export let stbEditing;
  export let stbData;
  export let stbScrollPos;
  export let stbVerticalScroll;
  export let stbHorizontalRange;
  export let stbHorizontalScroll;
  export let stbRowHeights;
  export let stbRowColors;
  export let headerHeight;
  export let quiet;

  export let rowMenu;
  export let rowMenuItems;
  export let onInsert;
  export let onDelete;
  export let menuItemsVisible = 0;
  export let stbMenuID;

  export let visible;

  let columnBodyAnchor;
  let mouseover;
  let color;
  let menuAnchor;
  let openMenu;
  let menuIcon = "ri-more-fill";

  $: inlineButtons =
    menuItemsVisible < rowMenuItems?.length
      ? rowMenuItems.slice(0, menuItemsVisible)
      : rowMenuItems;

  $: menuItems =
    menuItemsVisible < rowMenuItems?.length
      ? rowMenuItems.slice(menuItemsVisible, rowMenuItems.length)
      : [];

  $: synchScrollPosition($stbScrollPos);
  $: menuRow = $stbData?.rows?.find((row) => row["_id"] == $stbMenuID) || {};

  const synchScrollPosition = (position) => {
    if (columnBodyAnchor) columnBodyAnchor.scrollTop = position;
  };

  const syncScroll = (e) => {
    $stbScrollPos = columnBodyAnchor.scrollTop;
    $stbVerticalScroll =
      columnBodyAnchor.scrollTop / columnBodyAnchor.scrollTopMax;
  };

  const handleMenu = (e, rowID) => {
    menuAnchor = e.target;
    openMenu = !openMenu;
    $stbMenuID = openMenu ? rowID : null;
  };
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="spectrum-Table"
  class:sticky={$stbHorizontalRange < 1 && $stbHorizontalScroll < 1}
  on:mouseleave={() => ($stbHovered = null)}
>
  {#if $stbSettings.showHeader}
    <div
      class="spectrum-Table-headCell"
      style:height={headerHeight}
      on:mouseenter={() => (mouseover = true)}
      on:mouseleave={() => (mouseover = false)}
    >
      {#if $stbSettings.features.canInsert}
        <SuperButton
          size="M"
          icon="ri-add-fill"
          fillOnHover="true"
          text=""
          quiet="true"
        />
      {/if}
    </div>
  {/if}

  <div
    bind:this={columnBodyAnchor}
    class="spectrum-Table-body"
    style:background={quiet ? "transparent" : null}
    style:border-right={"var(--super-table-vertical-dividers)"}
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
          class:is-selected={selected}
          class:is-hovered={$stbHovered === index}
          class:is-editing={$stbEditing == index &&
            ($stbSettings.appearance.highlighters == "horizontal" ||
              $stbSettings.appearance.highlighters == "both")}
          class:odd={$stbSettings.appearance.zebraColors && index % 2 == 1}
          style:min-height={$stbRowHeights[index]}
          style:background-color={$stbRowColors[index]?.bgcolor}
          style:padding-right={visible ? "1.5rem" : "0rem"}
        >
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div class="row-menu" on:mousedown={(e) => ($stbMenuID = rowID)}>
            {#if $stbSettings.features.canDelete}
              <SuperButton
                size="M"
                icon="ri-delete-bin-2-line"
                iconColor="var(--spectrum-global-color-red-500)"
                fillOnHover="true"
                text=""
                quiet="true"
                context={{ menuRow }}
                onClick={enrichButtonActions(onDelete, {})}
              />
            {/if}
            {#if rowMenu && inlineButtons?.length}
              {#each inlineButtons as { text, icon, disabled, onClick, quiet, type, size }}
                <SuperButton
                  {size}
                  {icon}
                  fillOnHover="true"
                  {text}
                  {disabled}
                  quiet={true}
                  context={{ menuRow }}
                  onClick={enrichButtonActions(onClick, {})}
                />
              {/each}
            {/if}
          </div>

          {#if rowMenu && menuItems?.length}
            <button
              class="spectrum-ActionButton spectrum-ActionButton--sizeM spectrum-ActionButton--quiet"
              class:is-selected={$stbMenuID == rowID && openMenu}
              class:is-emphasized={false}
              on:click|stopPropagation={(e) => handleMenu(e, rowID)}
            >
              <i class={menuIcon} />
            </button>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
  {#if $stbSettings.showFooter}
    <div class="spectrum-Table-footer" style:height={headerHeight}></div>
  {/if}
</div>

{#if openMenu}
  <SuperPopover
    open={openMenu}
    anchor={menuAnchor}
    on:close={() => (openMenu = false)}
  >
    {#if menuItems?.length}
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="action-menu">
        {#each menuItems as { text, icon, disabled, onClick, size }}
          <SuperButton
            {size}
            {icon}
            fillOnHover="true"
            {text}
            {disabled}
            quiet={true}
            menuItem
            context={{ menuRow }}
            onClick={enrichButtonActions(onClick, {})}
          />
        {/each}
      </div>
    {/if}
  </SuperPopover>
{/if}

<style>
  .action-menu {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.35rem;
    min-width: 120px;
  }

  .row-menu {
    display: flex;
    flex-direction: row;
    gap: 4px;
    min-width: fit-content;
  }

  .spectrum-Table {
    background-color: transparent;
    min-width: 2rem;
    flex: 0 0 auto;
  }
  .spectrum-Table.sticky {
    filter: drop-shadow(-12px 0px 8px var(--spectrum-global-color-gray-50));
  }
  .spectrum-Table-headCell {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    padding: unset;
    background-color: var(--spectrum-global-color-gray-100);
    border-bottom: 1px solid var(--spectrum-alias-border-color-mid);
    border-right: var(--super-table-vertical-dividers);
  }
  .spectrum-Table-row {
    display: flex;
    justify-content: flex-start;
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
