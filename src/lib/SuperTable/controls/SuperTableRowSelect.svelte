<script>
  import { beforeUpdate } from "svelte"

  export let stbSettings
  export let stbState
  export let stbSelected
  export let stbHovered
  export let stbData
  export let stbScrollPos
  export let stbRowHeights

  let bodyContainer
  let mouseover
  let color 

  function handleScroll( e ) {
      if ( mouseover )
        $stbScrollPos = bodyContainer?.scrollTop;
    }

  beforeUpdate( () => { if ( bodyContainer ) bodyContainer.scrollTop = $stbScrollPos } )
</script>

  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="spectrum-Table" on:mouseleave={() => ($stbHovered = null)} >
    {#if $stbSettings.showHeader}
        <div style:min-height={"2.5rem"} class="spectrum-Table-headCell">
          {#if $stbSettings.rowSelectMode == "multi"}
            <div class="loope" 
              on:click={stbState.toggleSelectAllRows}
              style:background-color={color ? color : "var(--spectrum-global-color-gray-200)"}>
              {#if  $stbSelected.length > 0 && $stbSelected.length < $stbData.rows.length}
                -
              {:else if ( $stbData.rows.length && $stbSelected.length == $stbData.rows.length) }
                <i class="ri-check-line" />
              {/if}
            </div>
          {/if}
        </div>
    {/if}

    <div 
      bind:this={bodyContainer} 
      class="spectrum-Table-body"
      on:scroll={handleScroll} 
      on:mouseenter={ () => mouseover = true } 
      on:mouseleave={ () => mouseover = false } 
    >
      {#each $stbData.rows as row, index (index) }
      {@const rowID = row[$stbSettings.data.idColumn]}
      {@const selected = $stbSelected.includes(rowID)}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div 
          class="spectrum-Table-row" 
          on:mouseenter={ () => $stbHovered = index }
          on:click={ () => stbState.toggleSelectRow(rowID) }
          class:is-selected={ selected } 
          class:is-hovered={ $stbHovered === index }
          style:min-height={ $stbSettings.rowHeight + "px"  }
          >
          <div 
            class="loope" 
            style:background-color={selected ? "var(--primaryColor)" : "var(--spectrum-global-color-gray-50)"}
            >
            {#if selected }
              <i class="ri-check-line" style:color="var(--spectrum-global-color-gray-50)" />
            {/if}
          </div>

        </div>
      {/each}
    </div>

    {#if $stbSettings.showFooter}
      <div class="spectrum-Table-footer"></div>
    {/if}
  </div>

<style>
  
  .spectrum-Table {
    background-color: transparent;
    min-width: 40px;
  }
  .spectrum-Table-headCell {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    height: 2.5rem;
    padding: unset;
    background-color: var(--super-table-header-bg-color);
    border-bottom: 1px solid var(--spectrum-alias-border-color-mid);
    border-right: var(--super-table-vertical-dividers);
  }
  .spectrum-Table-row {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: unset;
    margin: unset;

  }
  .is-hovered {
    background-color: var(--spectrum-table-m-regular-row-background-color-hover, var(--spectrum-alias-highlight-hover));
	}

  .is-hovered.is-selected {
    background-color: var(--spectrum-table-m-regular-row-background-color-selected-hover, var(--spectrum-alias-highlight-selected-hover));
	}
  .spectrum-Table-body {
    height: var(--super-table-body-height);
    background-color: var(--spectrum-global-color-gray-75);
    border-radius: 0px;
    overflow-y: scroll !important;
    overflow-x: hidden;
    padding: 0px;
    margin: 0px;
    border: none;
    scrollbar-width: none;
    border-right: var(--super-table-vertical-dividers);
  }
  .spectrum-Table-body::-webkit-scrollbar {
    display: none;
  }
  .spectrum-Table-footer {
    width: 100%;
    height: var(--super-table-footer-height);
    background-color: var(--super-table-footer-bg-color);
    border-right: var(--super-table-vertical-dividers);
    overflow: hidden;
  }

  .loope {
		height: 14px;
		width: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
		border-radius: 2px;
    font-weight: 600;
    font-size: 14px;
		border: 1px solid var(--spectrum-global-color-gray-500);
	}
  .loope:hover {
		border: 1px solid var(--spectrum-global-color-gray-800);
    cursor: pointer;
	}
</style>