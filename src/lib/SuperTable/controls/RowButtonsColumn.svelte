<script>
  import { getContext } from "svelte";
  import SuperPopover from "../../SuperPopover/SuperPopover.svelte";
  import SuperButton from "../../SuperButton/SuperButton.svelte";

  const { enrichButtonActions } = getContext("sdk");

  const stbSettings = getContext("stbSettings");
  const stbState = getContext("stbState");
  const stbHorizontalScrollPos = getContext("stbHorizontalScrollPos");
  const stbHovered = getContext("stbHovered");
  const stbSelected = getContext("stbSelected");
  const stbEditing = getContext("stbEditing");
  const stbMenuID = getContext("stbMenuID");
  const rowMetadata = getContext("stbRowMetadata");
  const stbVisibleRows = getContext("stbVisibleRows");
  const stbScrollOffset = getContext("stbScrollOffset");

  const stbAPI = getContext("stbAPI");

  export let right;
  export let rowMenu;
  export let rowMenuItems;
  export let menuItemsVisible = 0;
  export let canScroll;

  let viewport;
  let menuAnchor;
  let openMenu;

  $: quiet = $stbSettings.appearance.quiet;
  $: menuIcon = $stbSettings.rowMenuIcon;
  $: idColumn = $stbSettings.data.idColumn;
  $: sticky = $stbHorizontalScrollPos > 0 && !right;
  $: inInsert = $stbState == "Inserting";

  $: inlineButtons =
    menuItemsVisible < rowMenuItems?.length
      ? rowMenuItems.slice(0, menuItemsVisible)
      : rowMenuItems;

  $: menuItems =
    menuItemsVisible < rowMenuItems?.length
      ? rowMenuItems.slice(menuItemsVisible, rowMenuItems.length)
      : [];

  $: synchScrollPosition($stbScrollOffset);
  const synchScrollPosition = (position) => {
    if (viewport) viewport.scrollTop = position;
  };

  const handleMenu = (e, rowID) => {
    menuAnchor = e.detail;
    openMenu = !openMenu;
    $stbMenuID = openMenu ? rowID : -1;
  };
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="super-column button-column" class:right class:sticky>
  {#if $stbSettings.showHeader}
    <div class="super-column-header"><span> </span></div>
  {/if}

  <div
    bind:this={viewport}
    class="super-column-body"
    class:quiet
    style:background-color={sticky
      ? "var(--spectrum-global-color-gray-75)"
      : null}
  >
    {#each $stbVisibleRows as row (row.index)}
      <div
        class="super-row spectrum-Table-row"
        on:mouseenter={() => ($stbHovered = row.index)}
        on:mouseleave={() => ($stbHovered = null)}
        class:is-selected={$stbSelected?.includes(row.data[idColumn])}
        class:is-hovered={$stbHovered == row.index ||
          $stbMenuID == row.data[idColumn]}
        class:is-editing={$stbEditing == row.index}
        style:min-height={$rowMetadata[row.index].height}
        style:padding-right={canScroll && right ? "1.5rem" : "0.5rem"}
      >
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div class="row-buttons">
          {#if rowMenu && inlineButtons?.length}
            {#each inlineButtons as { text, icon, disabled, onClick, quiet, type }}
              <SuperButton
                size="S"
                {icon}
                fillOnHover="true"
                {text}
                disabled={disabled || $stbEditing == row.index}
                {quiet}
                {type}
                on:click={() =>
                  stbAPI.executeRowButtonAction(row.data[idColumn], onClick)}
              />
            {/each}
          {/if}
          {#if rowMenu && menuItems?.length}
            <SuperButton
              size={$stbSettings.appearance.size}
              icon={menuIcon}
              fillOnHover="true"
              text=""
              quiet="true"
              on:click={(e) => handleMenu(e, row.data[idColumn])}
            />
          {/if}
        </div>
      </div>
    {/each}
  </div>
  {#if inInsert}
    <div class="add-row" style="padding: unset;"></div>
  {/if}

  {#if $stbSettings.showFooter}
    <div class="super-column-footer"></div>
  {/if}
</div>

{#if openMenu}
  <SuperPopover
    open
    anchor={menuAnchor}
    minWidth={150}
    align={right ? "right" : "left"}
    on:close={() => {
      openMenu = false;
      $stbMenuID = undefined;
    }}
  >
    {#if menuItems?.length}
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="action-menu"
        on:mouseup={() => {
          $stbMenuID = undefined;
          openMenu = false;
        }}
      >
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
            onClick={enrichButtonActions(onClick, {})}
          />
        {/each}
      </div>
    {/if}
  </SuperPopover>
{/if}

<style>
  .row-buttons {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    padding-left: 0.5rem;
  }

  .action-menu {
    min-width: 120px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }
</style>
