<script>
    import CellSkeleton from "./CellSkeleton.svelte";
    import { getContext , createEventDispatcher } from "svelte";
    import { fly } from "svelte/transition"
    import { fetchData } from "../Fetch"
    import { dataFilters } from "@budibase/shared-core"


    const { API } = getContext("sdk");
    const dispatch = createEventDispatcher();

    export let value = []
    export let tableId 
    export let labelColumn
    export let schema
    export let active = false
    export let datasourceType = "table"
    
    let timer;
    let limit = 10

    let filteredValue = ""
    let results
    let queryParams = {}
    let primaryDisplay = "email"

    $: fetch = fetchData({
      API,
      datasource: {
        type: datasourceType,
        tableId: tableId,
      },
      options: {
        filter: {
        },
        limit: 100,
      },
    })

    $: primaryDisplay = labelColumn ? labelColumn : $fetch?.definition?.primaryDisplay
    $: tableSchema = $fetch?.schema

    const debounce = e => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        filteredValue = e.target.value;
      }, 500);
    } 

    const setLimit = (e, val ) => {
      e.stopPropagation();
      limit = val
    }

    const rowSelected = ( val ) => {
      if ( value ) {
        let found = value.find ( (e) => e._id == val._id )
        return found 
      }
    }

    const selectRow = ( val ) => {

      if ( schema.relationshipType == "many-to-many" ) {
        value.push ( { _id: val._id, primaryDisplay: val[primaryDisplay] } )
      } else if ( schema.relationshipType == "many-to-one") {
        value.push ( { _id: val._id, primaryDisplay: val[primaryDisplay] } )
      } else if ( schema.relationshipType == "one-to-many") {
        value = [ { _id: val._id, primaryDisplay: val[primaryDisplay] }]
      }
      dispatch("change", value )
    }

    const unselectRow = ( val ) => {
      value.splice( value.findIndex ( (e) => e._id === val._id  ), 1 );
      dispatch("change", value )
    }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="control"> 

  <div class="searchControl">
    <input class="input" on:input={debounce} on:focusout type="text" placeholder="Search..."/>
  </div>

  {#if schema.relationshipType == "many-to-many" || schema.relationshipType == "many-to-one"}
    <div class="listWrapper">
      <div class="list">
        <div class="options"> 
          {#if $fetch.loading }
              <CellSkeleton > <div class="option text"> Loading ... </div> </CellSkeleton> 
          {:else if $fetch.loaded }
              {#key value}
                {#if $fetch.rows.length > 0 }
                  {#each $fetch.rows as row, idx }
                    {#if !(rowSelected(row)) }
                      <div class="option" on:mousedown|stopPropagation|preventDefault={selectRow(row)} >
                          {row[primaryDisplay]}
                      </div>
                    {/if}
                  {/each}
                {/if}
              {/key}
          {/if}
        </div>
      </div>
      <div class="list listSelected">
        <div class="options"> 
          {#each value as val, idx }
            {#if (rowSelected(val)) }
              <div transition:fly={{ x: -20, duration: 130}} class="option" on:mousedown|stopPropagation|preventDefault={unselectRow(val)} >
                  {val.primaryDisplay}
              </div>
            {/if}
          {/each}
        </div>
      </div>
    </div>
  {/if}

  {#if schema.relationshipType == "one-to-many"}
    <div class="listWrapper">
      <div class="list">
        <div class="options"> 
          {#if $fetch.loading}
              <CellSkeleton > <div class="option text"> Loading ... </div> </CellSkeleton> 
          {:else}
            {#if $fetch.rows.length > 0 }
              {#key value}
                {#each $fetch.rows as row, idx }
                  {#if !(rowSelected(row)) }
                    <div class="option" on:mousedown|stopPropagation|preventDefault={selectRow(row)} >
                        {row[primaryDisplay]}
                    </div>
                  {/if}
                {/each}
              {/key}
            {/if}
          {/if}
        </div>
      </div>
    </div>
  {/if}

</div>


<style>
   .control {
    flex: auto;
    flex-direction: column;
    display: flex;
    align-items: stretch;
    justify-content: space-around;
    gap: 0.5rem;
    padding: 0.5rem 0.5rem 0.5rem 0.5rem;
    overflow-x: hidden;
  }

  .searchControl {
    flex: 1 1 auto;
  }

  .listWrapper {
    flex: auto;
    display: flex;
    justify-content: stretch;
    align-content: stretch;
    gap: 0.5rem;
    overflow: hidden;
  }

  .list {
    flex: 1 1 50%;
    height: 200px;
    overflow-y: auto;
    overflow-x: hidden;
    color: var(--spectrum-global-color-gray-700);
    border: 1px solid var(--spectrum-global-color-gray-300);
    border-radius: 0.25rem;
  }

  .listSelected {
    color: var(--spectrum-global-color-gray-900);
    border: 1px solid var(--spectrum-global-color-gray-500);
  }
  .searchControl {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;
    min-height: 2rem;
  }

  .input {
    min-height: 1.85rem;
    min-width: none;
    width: 100%;
    box-sizing: border-box;
    outline: none;
    background: none;
    border: 1px solid var(--primaryColor);
    padding-left: 0.5rem;
    color: inherit;
    font: inherit;
    cursor: pointer;
    background-color: var(--spectrum-textfield-m-background-color, var(--spectrum-global-color-gray-50));
  }

  .options {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;
    overflow-y: auto;
    padding: 0.3rem;
    gap: 0rem;
    min-width: 0;
  }
  .option {
    padding: 0.15rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .option:hover,
  .option.focused {
    background-color: var(--spectrum-global-color-gray-200);
    border-radius: 4px;
    cursor: pointer;
  }
</style>