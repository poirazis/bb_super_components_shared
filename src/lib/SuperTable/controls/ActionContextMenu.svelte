<script>
  import { getContext, createEventDispatcher } from "svelte";
  import SuperPopover from "../../SuperPopover/SuperPopover.svelte";
  import SuperButton from "../../SuperButton/SuperButton.svelte";

  const { enrichButtonActions } = getContext("sdk");
  const context = getContext("context");
  const dispatch = createEventDispatcher();

  export let anchor;
  export let rowMenuItems;
  export let menuRow;
  export let right = false;
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<SuperPopover open {anchor} align={right ? "right" : "left"} on:close>
  {#if rowMenuItems?.length}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="action-menu" on:mouseup={() => dispatch("close")}>
      {#each rowMenuItems as { text, icon, disabled, onClick, size }}
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
          onClick={enrichButtonActions(onClick, $context)}
        />
      {/each}
    </div>
  {/if}
</SuperPopover>

<style>
  .action-menu {
    min-width: 120px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    border: 1px solid var(--spectrum-global-color-gray-100);
  }
</style>
