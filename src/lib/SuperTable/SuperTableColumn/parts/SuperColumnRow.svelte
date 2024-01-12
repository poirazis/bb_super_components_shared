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
			dispatch( "resize" , { height : cellHeight })
		} else if ( cellHeight < minHeight) {
			dispatch( "resize" , { height : minHeight })
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
	tabindex="0"
	class="spectrum-Table-row" 
	class:is-selected={isSelected} 
	class:is-hovered={isHovered}
	style:height={ height + "px" }
	on:focusin={cellState.focus}
	on:mouseenter={ () => dispatch("hovered") } 
	on:mouseleave={ () => dispatch("unHovered") }
	on:click={ () => {cellState?.focus(); dispatch("rowClicked", { rowKey : row?.rowKey })} }
	on:dblclick={ () => dispatch("rowDblClicked", { rowKey : row?.rowKey }) } 
	on:contextmenu|preventDefault={ () => dispatch("contextmenu", { rowKey : row?.rowKey }) }
	>
		{#if !columnOptions.hasChildren }
			<svelte:component 
				this={columnOptions.cellComponent} 
				bind:cellState
				cellOptions={columnOptions.cellOptions}
				fieldSchema={columnOptions.schema}
				value={row.rowValue}
				formattedValue={getCellValue(row.rowValue)}
				multi={columnOptions.schema.type == "array"}
				on:blur={cellState.lostFocus}
				on:change
			/>
		{:else}
			<div bind:this={contents} class="contentsWrapper"> 
				<Provider data={ { rowKey: row?.rowKey, Value: row?.rowValue } }>
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