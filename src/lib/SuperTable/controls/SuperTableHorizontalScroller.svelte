<script>
  export let stbHorizontalScroll
  export let stbHorizontalRange
  export let highlighted
  export let offset = "0px"

  $: left = ($stbHorizontalScroll * 100 * ( 1 - $stbHorizontalRange )) + "%"
  $: width = ($stbHorizontalRange * 100) + "%"
</script>

{#if $stbHorizontalRange < 1}
  <div class="stb-scrollbar" class:highlighted style:--offset={offset}>
    <div 
      class="stb-scrollbar-indicator"
      style:left
      style:width
    />
  </div>
{/if}


<style>
  .stb-scrollbar {
    position: absolute;
    bottom: 8px;
    left: calc(var(--offset) + 8px);
    width: calc( 100% - 32px - var(--offset));
    height: 8px;
    border-radius: 4px;
    opacity: 0.2;
    transition: opacity 230ms;
  }

  .highlighted {
    opacity: 0.55;
  }
  .stb-scrollbar-indicator {
    position: relative;
    height: 100%;
    border-radius: 4px;
    background-color: var(--spectrum-global-color-gray-500);
  }
</style>