<script>
  export let stbState;
  export let tableAPI;
  export let highlighted;
  export let footer;
  $: inInsert = $stbState == "Inserting";
</script>

{#if $stbState == "Idle" || inInsert}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="add-row-overlay"
    class:highlighted
    class:footer
    class:in-insert={inInsert}
    on:click={() => (inInsert ? stbState.cancelAddRow() : stbState.addRow())}
  >
    <span> + </span>
  </div>

  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="save-row-overlay"
    class:highlighted
    class:footer
    class:in-insert={inInsert}
    on:click={tableAPI.insertRow}
  >
    {#if $stbState == "Saving"}
      <i class="ri-loader-2-line" />
    {:else}
      <i class="ri-save-fill"> </i>
    {/if}
  </div>
{/if}
