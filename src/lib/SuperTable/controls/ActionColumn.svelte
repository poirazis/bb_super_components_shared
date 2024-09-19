<script>
  import { getContext } from "svelte";
  import SuperPopover from "../../SuperPopover/SuperPopover.svelte";
  import SuperButton from "../../SuperButton/SuperButton.svelte";

  const { enrichButtonActions } = getContext("sdk");

  const stbState = getContext("stbState");
  const stbSettings = getContext("stbSettings");
  const stbRowHeights = getContext("stbRowHeights");
  const stbData = getContext("stbData");
  const stbScrollPos = getContext("stbScrollPos");
  const stbHorizontalScrollPos = getContext("stbHorizontalScrollPos");
  const stbHovered = getContext("stbHovered");
  const stbSelected = getContext("stbSelected");
  const stbEditing = getContext("stbEditing");
  const stbMenuID = getContext("stMenuId");

  const stbAPI = getContext("stbAPI");

  export let right;
  export let rowMenu;
  export let rowMenuItems;
  export let menuItemsVisible = 0;
  export let canScroll;

  let columnBodyAnchor;
  let menuAnchor;
  let openMenu;

  $: quiet = $stbSettings.appearance.quiet;
  $: zebra = $stbSettings?.appearance?.zebraColors;
  $: menuIcon = $stbSettings.rowMenuIcon;
  $: idColumn = $stbSettings.data.idColumn;
  $: sticky = $stbHorizontalScrollPos > 0 && !right;

  $: inlineButtons =
    menuItemsVisible < rowMenuItems?.length
      ? rowMenuItems.slice(0, menuItemsVisible)
      : rowMenuItems;

  $: menuItems =
    menuItemsVisible < rowMenuItems?.length
      ? rowMenuItems.slice(menuItemsVisible, rowMenuItems.length)
      : [];

  $: synchScrollPosition($stbScrollPos);

  $: menuRow = $stbData?.rows?.find((row) => row[idColumn] == $stbMenuID) || {};

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
{#if inlineButtons.length || menuItems.length}
  <div class="super-column action-column" class:right class:sticky>
    {#if $stbSettings.showHeader}
      <div class="spectrum-Table-headCell"></div>
    {/if}

    <div bind:this={columnBodyAnchor} class="spectrum-Table-body" class:quiet>
      {#each $stbData.rows as row, index}
        {@const hovered = $stbHovered == index}
        {@const editing = $stbEditing == index}
        {@const odd = zebra && index % 2 == 1}
        {@const selected = $stbSelected?.includes(row[idColumn])}
        <div
          class="super-row spectrum-Table-row"
          on:mouseenter={() => ($stbHovered = index)}
          class:is-selected={selected}
          class:is-hovered={hovered}
          class:is-editing={editing}
          class:odd
          style:min-height={$stbRowHeights[index]}
          style:padding-right={canScroll && right ? "1.5rem" : "0rem"}
        >
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div class="row-buttons">
            {#if rowMenu && inlineButtons?.length}
              {#each inlineButtons as { text, icon, disabled, onClick, quiet, type, size }}
                <SuperButton
                  {size}
                  {icon}
                  fillOnHover="true"
                  {text}
                  disabled={disabled || editing}
                  {quiet}
                  on:click={() =>
                    stbAPI.executeRowButtonAction(row[idColumn], onClick)}
                />
              {/each}
            {/if}
            {#if rowMenu && menuItems?.length}
              <SuperButton
                size="S"
                icon={menuIcon}
                fillOnHover="true"
                text=""
                quiet="true"
                on:click={(e) => handleMenu(e, row[idColumn])}
              />
            {/if}
          </div>
        </div>
      {/each}
      <div class="spacer" style="min-height: 4rem" />
    </div>

    {#if $stbSettings.showFooter}
      <div class="spectrum-Table-footer"></div>
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
              context={{ menuRow }}
              onClick={enrichButtonActions(onClick, {})}
            />
          {/each}
        </div>
      {/if}
    </SuperPopover>
  {/if}
{/if}

<style>
  .action-column {
    flex: none;
    border-right: unset !important;
  }
  .action-column.right {
    border-left: 1px solid var(--spectrum-global-color-gray-200);
  }

  .row-buttons {
    display: flex;
    flex-direction: row;
    align-items: center;
    min-width: fit-content;
    gap: 0.25rem;
    padding-left: 0.25rem;
  }

  .action-menu {
    min-width: 120px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }
</style>
