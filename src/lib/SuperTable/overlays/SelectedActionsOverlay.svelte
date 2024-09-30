<script>
  import { slide } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import SuperButton from "../../SuperButton/SuperButton.svelte";

  export let stbState;
  export let tableAPI;
  export let highlighted;
  export let footer;
  export let selectedActions;
  export let stbSelected;
  export let entityPlural = "Rows";
  export let entitySingular = "Row";
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
{#if $stbSelected.length && $stbState != "Inserting"}
  <div
    class="selected-row-actions-overlay"
    class:highlighted
    class:footer
    transition:slide={{ delay: 50, duration: 300, easing: quintOut, axis: "y" }}
  >
    <span
      >{$stbSelected.length == 1
        ? $stbSelected.length + " " + entitySingular + " "
        : $stbSelected.length + " " + entityPlural + " "}Selected</span
    >
    {#each selectedActions as { text, icon, quiet, disabled, type, size }}
      <SuperButton {text} {icon} {quiet} {type} {disabled} {size} />
    {/each}
  </div>
{/if}
