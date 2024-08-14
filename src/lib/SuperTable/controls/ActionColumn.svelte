<script>
  import { getContext } from "svelte";
  import SuperPopover from "../../SuperPopover/SuperPopover.svelte";
  import SuperButton from "../../SuperButton/SuperButton.svelte";

  const { enrichButtonActions } = getContext("sdk");
  const context = getContext("context");

  const stbState = getContext("stbState");
  const stbSettings = getContext("stbSettings");
  const stbData = getContext("stbData");
  const stbScrollPos = getContext("stbScrollPos");
  const stbHovered = getContext("stbHovered");
  const stbSelected = getContext("stbSelected");
  const stbRowHeights = getContext("stbRowHeights");
  const stbRowColors = getContext("stbRowColors");
  const stbEditing = getContext("stbEditing");

  export let headerHeight;
  export let quiet;
  export let right;

  export let rowMenu;
  export let rowMenuItems;
  export let onDelete;
  export let onEdit;
  export let menuItemsVisible = 0;
  export let stbMenuID;

  export let visible;
  export let horizontalVisible;
  export let stbHorizontalScrollPos;
  export let sticky;

  let columnBodyAnchor;
  let mouseover;
  let menuAnchor;
  let openMenu;

  $: inInsert = $stbState == "Inserting";
  $: canInsert = $stbSettings.features.canInsert;
  $: canDelete = $stbSettings.features.canDelete;
  $: canDeleteEvent = $stbSettings.features.canDelete == "advanced";
  $: canEditEvent = $stbSettings.features.canEdit == "advanced";
  $: menuIcon = $stbSettings.rowMenuIcon;

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

  const handleMenu = (e, rowID) => {
    menuAnchor = e.detail;
    openMenu = !openMenu;
    $stbMenuID = openMenu ? rowID : null;
  };
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="super-column action-column"
  class:right
  class:sticky
  on:mouseleave={() => ($stbHovered = null)}
>
  {#if $stbSettings.showHeader}
    <div
      class="spectrum-Table-headCell"
      style:height={headerHeight}
      style:backgroud-color={"transparent"}
      on:mouseenter={() => (mouseover = true)}
      on:mouseleave={() => (mouseover = false)}
    ></div>
  {/if}

  <div
    bind:this={columnBodyAnchor}
    class="spectrum-Table-body"
    style:background={quiet ? "transparent" : null}
  >
    {#if $stbData?.rows?.length}
      {#each $stbData.rows as row, index}
        {@const rowID = row[$stbSettings.data.idColumn]}
        {@const selected =
          $stbSelected.includes(rowID) ||
          $stbSelected.includes(rowID?.toString())}
        <div
          class="super-row spectrum-Table-row"
          on:mouseenter={() => ($stbHovered = index)}
          class:is-selected={selected}
          class:is-hovered={$stbHovered === index}
          class:is-editing={$stbEditing == index &&
            ($stbSettings.appearance.highlighters == "horizontal" ||
              $stbSettings.appearance.highlighters == "both")}
          class:odd={$stbSettings.appearance.zebraColors && index % 2 == 1}
          style:min-height={$stbRowHeights[index]}
          style:padding-right={visible && right ? "1.5rem" : "0rem"}
          style:background-color={$stbHorizontalScrollPos && !right && sticky
            ? "var(--spectrum-global-color-gray-75)"
            : "transparent"}
        >
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div class="row-menu" on:mousedown={(e) => ($stbMenuID = rowID)}>
            {#if rowMenu && inlineButtons?.length}
              {#each inlineButtons as { text, icon, disabled, onClick, quiet, type, size }}
                <SuperButton
                  {size}
                  {icon}
                  fillOnHover="true"
                  {text}
                  {disabled}
                  {quiet}
                  context={{ menuRow }}
                  onClick={enrichButtonActions(onClick, {})}
                />
              {/each}
            {/if}
            {#if canEditEvent}
              <SuperButton
                size="S"
                icon="ri-edit-2-line"
                iconColor={$stbHovered === index
                  ? "var(--spectrum-global-color-blue-500)"
                  : "var(--spectrum-global-color-gray-700)"}
                fillOnHover="true"
                text=""
                quiet="true"
                context={{ menuRow }}
                onClick={enrichButtonActions(onEdit, $context)}
              />
            {/if}
            {#if canDelete || canDeleteEvent}
              <SuperButton
                size="S"
                icon="ri-delete-bin-2-line"
                iconColor="var(--spectrum-global-color-red-500)"
                fillOnHover="true"
                text=""
                quiet="true"
                context={{ menuRow }}
                onClick={enrichButtonActions(onDelete, $context)}
              />
            {/if}
            {#if rowMenu && menuItems?.length}
              <SuperButton
                size="S"
                icon={menuIcon}
                fillOnHover="true"
                text=""
                quiet="true"
                on:click={(e) => handleMenu(e, rowID)}
              />
            {/if}
          </div>
        </div>
      {/each}
      {#if inInsert || canInsert}
        <div
          class="super-row spectrum-Table-row"
          style:height={$stbRowHeights[0]}
          style:align-items={"center"}
        ></div>
      {/if}
      <div class="spacer" style="min-height: 4rem" />
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
    align={right ? "right" : "left"}
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
            menuAlign={right ? "right" : "left"}
            context={{ menuRow }}
            onClick={enrichButtonActions(onClick, {})}
          />
        {/each}
      </div>
    {/if}
  </SuperPopover>
{/if}

<style>
  .action-column {
    flex: none;
    border-right: unset !important;
  }
  .action-column.right {
    border-left: 1px solid var(--spectrum-global-color-gray-200);
  }

  .row-menu {
    display: flex;
    flex-direction: row;
    align-items: center;
    min-width: fit-content;
  }

  .action-menu {
    min-width: 120px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }
  .spectrum-Table-headCell {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    padding: unset;
    background-color: var(--spectrum-global-color-gray-100);
    border-bottom: 1px solid var(--spectrum-alias-border-color-mid);
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
    background-color: var(--spectrum-global-color-gray-75);
    border-top: 2px solid var(--spectrum-alias-border-color-mid);
    overflow: hidden;
  }
</style>
