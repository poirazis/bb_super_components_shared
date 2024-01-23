<script>
	import { getContext , createEventDispatcher } from "svelte";
	import { elementSizeStore } from "svelte-legos";

	const { Provider, processStringSync } = getContext("sdk")
	const tableOptionStore = getContext("tableOptionStore");
	const tableStateStore = getContext("tableStateStore");

	const dispatch = createEventDispatcher();

	export let row
	export let index
	export let columnOptions
	export let isSelected
	export let isHovered

	// the proposed height
	export let height
	export let minHeight

	let contents, size, cellHeight, rowElement, cellState 

	$: height = $tableStateStore?.rowHeights[index] || $tableOptionStore?.rowHeight
	$: minHeight = $tableOptionStore?.rowHeight

	$: if ( columnOptions.hasChildren && contents ) size = elementSizeStore(contents) 

	// Ractive request for additional height if needed 
	$: if ( size &&  columnOptions.hasChildren ) 
	{ 
		cellHeight = Math.ceil (parseFloat(contents?.scrollHeight))
		if ( cellHeight > height ) 
		{
			dispatch( "resize" , cellHeight)
		} else if ( cellHeight < minHeight) {
			dispatch( "resize" , minHeight )
		}
	}

	const getCellValue = value => {
		return columnOptions.template ? processStringSync( columnOptions.template, { value } ) : undefined
	}
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div 
	bind:this={rowElement}
	class="spectrum-Table-row" 
	class:is-selected={isSelected} 
	class:is-hovered={isHovered}
	style:height={ height + "px" }
	on:mouseenter={ () => dispatch("hovered") } 
	on:mouseleave={ () => dispatch("unHovered") }
	on:click={ () => {cellState?.focus(); dispatch("rowClicked", { rowID : row.rowID })} }
	on:dblclick={ () => dispatch("rowDblClicked", { rowID : row.rowID }) } 
	on:contextmenu|preventDefault={ () => dispatch("contextmenu", { rowID : row.rowID }) }
	>
		{#if !columnOptions.hasChildren }
			<svelte:component 
				this={columnOptions.cellComponent} 
				cellOptions={columnOptions.cellOptions}
				fieldSchema={columnOptions.schema}
				value={row.rowValue}
				formattedValue={getCellValue(row.rowValue)}
				multi={columnOptions.schema.type == "array"}
				on:change={ (e) => dispatch("cellChanged", {rowID : row.rowID, previousValue: row.rowValue, value: e.detail, field : columnOptions.name })}
			/>
		{:else}
			<div bind:this={contents} class="contentsWrapper"> 
				<Provider data={ { rowID: row?.rowID, value : row?.rowValue } }>
					<slot /> 
				</Provider>
			</div>	
		{/if}
</div>

<style>
	.spectrum-Table-row {
		display: flex;
		align-items: stretch;
		justify-content: stretch;	
	}
	.contentsWrapper {
		flex: 1 1 auto;
		display: flex;
		align-items: center;
		justify-content: stretch;	
	}
	.is-hovered {
		background-color: var(--spectrum-table-m-regular-row-background-color-hover, var(--spectrum-alias-highlight-hover));
	}
	.is-hovered.is-selected {
		background-color: var(--spectrum-table-m-regular-row-background-color-selected-hover, var(--spectrum-alias-highlight-selected-hover));
	}

	.is-selected {
		background-color: var(--spectrum-table-m-regular-row-background-color-selected, var(--spectrum-alias-highlight-selected));
	}
</style>