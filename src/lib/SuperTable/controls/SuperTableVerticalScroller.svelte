<script>
  export let stbVerticalScroll;
  export let highlighted;
  export let offset = "0";
  export let bottomOffset = "0";

  export let clientHeight;
  export let clientScrollHeight;

  export let visible;

  $: top =
    $stbVerticalScroll * 100 * (1 - clientHeight / clientScrollHeight) + "%";
  $: height = (clientHeight / clientScrollHeight) * 100 + "%";
  $: visible = clientHeight / clientScrollHeight < 1;
</script>

{#if clientHeight / clientScrollHeight < 1}
  <div
    class="stb-scrollbar"
    class:highlighted
    style:--offset={offset}
    style:--bottomOffset={bottomOffset}
  >
    <div class="stb-scrollbar-indicator" style:top style:height />
  </div>
{/if}

<style>
  .stb-scrollbar {
    position: absolute;
    right: 8px;
    top: calc(var(--offset) + 8px);
    bottom: calc(var(--bottomOffset) + 8px);
    width: 8px;
    border-radius: 4px;
    opacity: 0.2;
    transition: opacity 230ms;
  }

  .highlighted {
    opacity: 0.55;
  }
  .stb-scrollbar-indicator {
    position: relative;
    width: 100%;
    border-radius: 4px;
    background-color: var(--spectrum-global-color-gray-500);
  }
</style>
