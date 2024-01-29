<script>
  export let stbVerticalScroll
  export let highlighted
  export let offset = "0px"

  export let clientHeight
  export let clientScrollHeight

  $: top = ($stbVerticalScroll * 100 * ( 1 - clientHeight / clientScrollHeight )) + "%"
  $: height = (clientHeight / clientScrollHeight * 100) + "%"

</script>

{#if clientHeight / clientScrollHeight < 1}
  <div class="stb-scrollbar" class:highlighted style:--offset={offset}>
    <div 
      class="stb-scrollbar-indicator"
      style:top
      style:height
    />
  </div>
{/if}


<style>
  .stb-scrollbar {
    position: absolute;
    right: 8px;
    top: calc(var(--offset) + 8px);
    height: calc( 100% - 16px - var(--offset));
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