<script>
  import SuperPopover from "../../SuperPopover/SuperPopover.svelte";

  import { getContext } from "svelte";
  const { Block, BlockComponent } = getContext("sdk");

  export let open;
  export let anchor;
  export let selectionMenuItems;
  export let stbSelected;

  const handleMenu = () => {
    open = !open;
  };
</script>

<SuperPopover
  {open}
  {anchor}
  align="left"
  dismissible={false}
  minWidth={"20rem"}
  offset={-88}
>
  <div class="action-bar">
    <div class="spectrum-FieldLabel spectrum-FieldLabel--sizeS">
      {$stbSelected?.length} Selected
    </div>
    {#if selectionMenuItems?.length}
      <Block>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div class="selection-menu">
          {#each selectionMenuItems as { text, icon, disabled, onClick, quiet }}
            <BlockComponent
              type="plugin/bb-component-SuperButton"
              props={{
                size: "M",
                icon,
                text,
                quiet: true,
                disabled,
                onClick,
              }}
            ></BlockComponent>
          {/each}
        </div>
      </Block>
    {/if}
  </div>
</SuperPopover>

<style>
  .action-bar {
    min-width: 20rem;
    padding: 1rem;
    display: flex;
    align-items: center;
    flex-direction: row;
  }
  .selection-menu {
    display: flex;
  }
</style>
