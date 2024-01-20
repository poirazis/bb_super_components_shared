<script>
	import fsm from 'svelte-fsm';
	import { getContext, createEventDispatcher } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fetchData } from '../../../../node_modules/@budibase/frontend-core/src/fetch/index.js';
	import { dataFilters } from "@budibase/shared-core"
	import { elementSizeStore } from "svelte-legos";

	import "./CellCommon.css"

	const dispatch = createEventDispatcher();
	const { API } = getContext('sdk');

	export let cellOptions;
	export let value;
	export let fieldSchema;
	export let multi = false

	let anchor = null
	let picker;
	let options = []
	let optionColors = {}
	let optionIcons = {}
	let optionLabels = {}
	let focusedOptionIdx = -1
	let fetch;
	let loadedData
	let searchTerm = ""
	let pickerWidth

	export let cellState = fsm( "View" , {
    "*": {
      goTo( state ) { return state }
    },
    View: { 
      focus () { 
        if (!cellOptions.readonly && !cellOptions.disabled) {
				 	return "Editing" 
				}
      }
    },
    Hovered: { cancel: () => { return "View" }},
    Focused: { 
      unfocus() { return "View" },
    },
    Error: { check : "View" },
    Editing: { 
			_enter() {
				 if (!cellOptions.autocomplete) 
				 	editorState.open() 
				else 
					searchTerm = localValue[0]		
			},
			handleKeyboard( e ) {
				if ( e.key == "Backspace" || e.key == "Delete"  ){
						e.stopPropagation();
						dispatch("change",[] )
					}

					editorState.handleKeyboard( e )
			},
      unfocus() { return "View" },
      lostFocus() { return "View" },
      submit() { if ( value != originalValue ) acceptChange() ; return "View" }, 
      cancel() { value = Array.isArray(originalValue) ? [ ... originalValue ] : originalValue ; return "View" },
    }
  })

	export let editorState = fsm('Closed', {
		'*': {
			close() {
				return 'Closed';
			},
      toggleOption(idx) {
				if (!cellOptions.addNew && idx < 0 ) return;

				let option = options[idx] ?? searchTerm

				if (multi && localValue.includes(option))  {
						localValue.splice(localValue.indexOf(option), 1);
						localValue = localValue;
				} else if (multi) {
						localValue = [...localValue, option];
				} else {
					localValue = [option];
				}

				if ( cellOptions.autocomplete ) searchTerm = localValue[0]
				dispatch("change", localValue)
			}
		},
		Open: {
			_enter() { 
				focusedOptionIdx = -1;
			},
			toggle() {
				return 'Closed';
			},
			handleKeyboard ( e ) {
				if ( e.keyCode == 32 ) {
					if ( focusedOptionIdx > -1 ) {
						this.toggleOption(focusedOptionIdx)
						if ( !multi ) this.close()
					} else {
						this.close();
					}
				}


				if ( e.key == "Enter" ) {
					if ( multi )
						this.close();
					else {
						this.toggleOption(focusedOptionIdx);
						this.close()
					}
				}

				if (e.key == 'ArrowDown') this.highlightNext(e.stopPropagation());
				if (e.key == 'ArrowUp') this.highlightPrevious(e.stopPropagation());
				if (e.key == 'ArrowLeft') this.highlightLeft(e.stopPropagation());
				if (e.key == 'ArrowRight') this.highlightRight(e.stopPropagation());
			},
			highlightNext() {
				if ( cellOptions.coltrolType == "select" ) {
					focusedOptionIdx = focusedOptionIdx + 1
				} else {
					if ( focusedOptionIdx + columns < options.length) {
						focusedOptionIdx = focusedOptionIdx == -1 ? 0 : focusedOptionIdx + columns
					} else {
						focusedOptionIdx = focusedOptionIdx % columns
					}
				}
				if ( focusedOptionIdx > options.length - 1 ) focusedOptionIdx = 0
			},
			highlightPrevious() {
				let rows = Math.ceil(options.length / columns)

				if ( cellOptions.coltrolType == "select" ) {
					focusedOptionIdx = focusedOptionIdx - 1
				} else {
					if ( focusedOptionIdx - columns > -1 ) {
						focusedOptionIdx = focusedOptionIdx - columns
					} else {
						focusedOptionIdx = ( (rows - 1) * columns) + focusedOptionIdx < options.length 
						? ( (rows - 1) * columns) + focusedOptionIdx 
						: ( (rows - 2) * columns) + focusedOptionIdx 
					}
				}

				if ( focusedOptionIdx < 0 ) focusedOptionIdx = options.length - 1
			},
			highlightRight() {
				if ( cellOptions.coltrolType != "select" ) {
					if ( (focusedOptionIdx + 1) % columns== 0 )
						focusedOptionIdx = focusedOptionIdx - columns+ 1
					else
						focusedOptionIdx = focusedOptionIdx + 1 == options.length
						? options.length - 1
						: focusedOptionIdx += 1
				}
			},
			highlightLeft() {
				if ( cellOptions.coltrolType != "select" ) {
					if ( focusedOptionIdx % columns== 0 )
						focusedOptionIdx = (focusedOptionIdx + columns- 1) > options.length
						? options.length - 1
						: focusedOptionIdx + columns- 1
					else
						focusedOptionIdx = focusedOptionIdx - 1
				}
			}
		},
		Closed: {
			_enter() { },
			toggle() {
				return $cellState == "Editing" ? 'Open' : "Closed"
			},
			open() {
				return 'Open';
			},
			handleKeyboard( e ) {
				if ( cellOptions.autocomplete )
					return "Open"
				else {
					if (e.keyCode == 32) {
						e.stopPropagation();
						return "Open"
					}
				}
			},
			highlightNext() {
				return $cellState == "Editing" ? 'Open' : "Closed"
			}
		}
	});

	$: if ( (cellOptions.controlType != "select" || $cellState == "Editing" ) && loadedData != cellOptions.datasource?.label ) { 
		fetch = createFetch(cellOptions.datasource) 
		loadedData = cellOptions.datasource?.label
	}

	$: if (cellOptions.optionsSource == 'data' && fetch) {
		options = $fetch.rows.map( (x) =>  x[cellOptions.valueColumn] )
		$fetch.rows.forEach(element => {
			optionColors[element[cellOptions.valueColumn]] = element[cellOptions.colorColumn] ;
			optionIcons[element[cellOptions.valueColumn]] = element[cellOptions.iconColumn] ;
			optionLabels[element[cellOptions.valueColumn]] = cellOptions.labelColumn ? element[cellOptions.labelColumn] : element[cellOptions.valueColumn];
		});
	} else if (cellOptions.optionsSource == 'custom') {
			if ( cellOptions.customOptions.length) {
				options = cellOptions.customOptions.map( (x) => x.value || x)
				cellOptions.customOptions.forEach( (e) => {
					optionLabels[e.value || e] = e.label || e
				})
			}
	} else {
		options = fieldSchema?.constraints?.inclusion || [];
		optionColors = fieldSchema?.optionColors || {};
		if ( searchTerm && searchTerm != localValue[0]) options = options.filter ( x => x.startsWith(searchTerm) )
	}

	// Make sure the internal value is always an array
	$: localValue = Array.isArray(value) ? value : value ? [value] : [];
	$: columns = cellOptions.optionsArrangement || 1
	$: inEdit = $cellState == 'Editing';
	$: simpleView = cellOptions.optionsViewMode != 'pills';
	$: anchor ? pickerWidth = elementSizeStore(anchor) : null

	const getOptionColor = (value) => {
		let color 
		if ( cellOptions.useOptionColors ) 
			color = optionColors[value]

		if (cellOptions.controlType == "select" && cellOptions.optionsViewMode == "pills" && !color)
			color = "var(--spectrum-global-color-gray-300)" 

		return color
	};

	const getOptionLabel = (value) => {
		return optionLabels[value] || value;
	}

	const getOptionIcon = (value) => {
		return cellOptions.useOptionIcons ? optionIcons[value] : undefined
	};

	const createFetch = (datasource) => {
		return fetchData({
			API,
			datasource,
			options: {
				query: dataFilters.buildLuceneQuery(cellOptions.filter),
				sortColumn : cellOptions.sortColumn,
				sortOrder : cellOptions.sortOrder, 
        limit : cellOptions.limit
      },
		});
	};

	const handleBlur = (e) => {

		if (!picker?.contains(e.relatedTarget) && !anchor.contains(e.relatedTarget)) {
			focusedOptionIdx = -1;
			editorState.close();
			dispatch('blur');
		} 
	};

	const focus = node => {
		node?.focus()
	}
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	bind:this={anchor}
	tabindex="0"
	class="superCell"
	class:inEdit
	class:disabled = { cellOptions.disabled }
	class:error = { cellOptions.error }
	class:inline={cellOptions.role == 'inline'}
	class:tableCell={cellOptions.role == 'tableCell'}
	class:formInput={cellOptions.role == 'formInput'}
	style:color={cellOptions.color}
	style:background={cellOptions.background}
	style:font-weight={cellOptions.fontWeight}
	style:max-height={cellOptions.coltrolType == "select" ? "2rem" : "auto"}
	on:keydown={cellState.handleKeyboard}
	on:blur={(e) => setTimeout(handleBlur, 20, e)}
	on:focusin={cellState.focus}
>
	{#if cellOptions.icon && cellOptions.controlType == "select"}
		<i class={cellOptions.icon + ' frontIcon'}></i>
	{/if}

	{#if cellOptions.controlType == 'checkbox'}
    <div 
      class="options checkboxes" 
      style:grid-template-columns={ "repeat( " + columns + " , 1fr" }
			on:mouseleave={() => focusedOptionIdx = -1}
    >
			{#each options as option, idx (idx)}
				{@const color = getOptionColor(option)}
				{@const label = getOptionLabel(option)}
				{@const icon = getOptionIcon(option)}
				{@const selected = localValue?.includes(option)}
					<div
						class="option"
						class:selected
						class:focused={focusedOptionIdx === idx}
						on:mousedown={(e) => editorState.toggleOption(idx)}
						on:mouseenter={() => (focusedOptionIdx = idx)}
					>
						{#if icon}
							<i class={icon} style:color={color}> </i>
						{/if}
						<div class="loope" style:background-color={color ? color : "var(--spectrum-global-color-gray-100)"}>
							{#if selected}
								<i class="ri-check-line" />
							{/if}
						</div>
						{label}
					</div>
			{/each}
    </div>
	{:else if cellOptions.controlType == "radio"}
	<div 
		class="options checkboxes" 
		style:grid-template-columns={ "repeat( " + columns + " , 1fr" }
		on:mouseleave={() => focusedOptionIdx = -1}
	>
		{#each options as option, idx (idx)}
			{@const color = getOptionColor(option)}
			{@const label = getOptionLabel(option)}
			{@const icon = getOptionIcon(option)}
			{@const selected = localValue?.includes(option)}
				<div
					class="option"
					class:selected
					class:focused={focusedOptionIdx === idx}
					on:click|stopPropagation={(e) => editorState.toggleOption(idx)}
					on:mouseenter={() => (focusedOptionIdx = idx)}
				>
					{#if icon}
						<i class={icon} style:color={color}> </i>
					{/if}

					<div class="loope round" 
						style:background-color={color ? color : "var(--spectrum-global-color-gray-100)"}>
						{#if selected}
							<div class="loope dot" />
						{/if}
					</div>

					{label}
				</div>
		{/each}
	</div>

	{:else if cellOptions.controlType == 'switch'}
    <div 
      class="options checkboxes" 
			on:mouseleave={() => focusedOptionIdx = -1}
      style:grid-template-columns={ "repeat( " + columns + " , 1fr" }
    >
			{#each options as option, idx (idx)}
				{@const color = getOptionColor(option)}
				{@const label = getOptionLabel(option)}
				{@const selected = localValue.includes(option)}
					<div class="option" 
					class:focused={focusedOptionIdx === idx}
					style:max-height={"1.75rem"} 
					on:click={(e) => editorState.toggleOption(idx, e.stopPropagation())}
					on:mouseenter={() => (focusedOptionIdx = idx)} 
					>
						<div class="spectrum-Switch spectrum-Switch--emphasized"
						style:--spectrum-switch-m-emphasized-handle-border-color-selected = { color ? color : "var(--spectrum-global-color-blue-500)" }
						style:--spectrum-switch-m-emphasized-track-color-selected={ selected && color ? color : "var(--spectrum-global-color-blue-500)"}
						style:--spectrum-switch-m-emphasized-track-color-selected-hover={ color ? color : "var(--spectrum-global-color-blue-600)"}
						>
							<input
								checked={localValue.includes(option)}
								type="checkbox"
								class="spectrum-Switch-input"
								id={idx}
							/>
							<span class="spectrum-Switch-switch" />
							<label class="spectrum-Switch-label" class:selected for={idx}>{label}</label>
						</div>
					</div>
			{/each}
    </div>
	{:else if inEdit && cellOptions.autocomplete}
		<input
			class="editor"
			class:placeholder={!searchTerm}
			style:padding-left={ cellOptions.icon ? "32px" : cellOptions.padding }
			style:padding-right={ cellOptions.clearValueIcon ? "32px" : cellOptions.padding }
			style:padding-top={0}
			style:padding-bottom={0}
			style:border={"none"}
			bind:value={searchTerm}
			on:keydown={editorState.handleKeyboard}
			placeholder={ cellOptions.placeholder ?? "Enter..." }
			on:blur={(e) => {
				dispatch("change", [searchTerm])
				setTimeout(handleBlur, 20, e)
			}}
			use:focus
		/>
			<div class="actionIcon" on:click|stopPropagation={editorState.toggle}>
				<i class="ri-arrow-down-s-line" ></i> 
			</div>
	{:else if inEdit}
		<div
			class="editor"
			class:placeholder={localValue?.length < 1}
			style:padding-left={cellOptions.icon ? '32px' : cellOptions.padding}
			style:padding-right={cellOptions.padding}
			on:click|stopPropagation={() => {if (!cellOptions.addNew) editorState.toggle()}}
		>
			<div class="items" class:simpleView style:justify-content={cellOptions.align ?? 'flex-start'}>
				{#if localValue.length < 1}
					{cellOptions?.placeholder}
				{:else if localValue.length > 0 }
					{#each localValue as val (val)}
					{@const color = getOptionColor(val)}
					{@const label = getOptionLabel(val)}
						<div
							class="item"
							animate:flip={{ duration: 130 }}
							style:background-color={ !simpleView ? color : "unset"}
							style:border={ getOptionColor(val) || simpleView ? undefined : "1px solid var(--spectrum-global-color-gray-300)" }
						>
						{#if simpleView && color }
							<div class="loope" style:background-color={color} />
						{/if}
							<span> {label} </span>
						</div>
					{/each}
				{/if}
			</div>
			<i class="ri-arrow-down-s-line" on:click|stopPropagation={editorState.toggle}></i>
		</div>
	{:else}
		<div
			class="value"
			class:placeholder={localValue?.length < 1}
			style:padding-left={cellOptions?.icon ? '32px' : cellOptions.padding}
		>
			<div class="items" class:simpleView style:justify-content={cellOptions.align ?? 'flex-start'}>
				{#if $fetch?.loading}
					Loading
				{/if}
				{#if localValue.length < 1}
					{cellOptions.placeholder}
				{:else if localValue.length > 0}
					{#each localValue as val (val)}
					{@const color = getOptionColor(val)}
					{@const label = getOptionLabel(val)}
						<div
							class="item"
							animate:flip={{ duration: 130 }}
							style:background-color={ !simpleView ? color : "unset"}
							style:border={ color || simpleView ? "unset" : "1px solid var(--spectrum-global-color-gray-300)" }
						>
						{#if simpleView && color }
							<div class="loope small" style:background-color={color} />
						{/if}
							<span> {label} </span>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>

{#if cellOptions.controlType == "select" && inEdit}
	<div
	 	class="spectrum-Popover spectrum-Popover--bottom" 
		id="popover-default" 
		class:is-open={$editorState == "Open"}
		style:width={$pickerWidth.width}
		style:z-index={1000}
		style:margin-top={"2rem"}
		>
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div bind:this={picker} class="options" on:wheel={(e) => e.stopPropagation()}  on:mouseleave={() => focusedOptionIdx = -1}>
			{#if options.length < 1}
				<div class="option">
						<i class="ri-close-line" />
						No Available Options
				</div>
			{:else}
				{#each options as option, idx (idx)}
				{@const color = getOptionColor(option)}
				{@const label = getOptionLabel(option)}
				{@const icon = getOptionIcon(option)}
					<div
						class="option"
						class:focused={focusedOptionIdx === idx}
						on:mousedown|preventDefault|stopPropagation={(e) => editorState.toggleOption(idx)}
						on:mouseenter={() => (focusedOptionIdx = idx)}
					>
						{#if multi || color }
							<div class="loope small" style:background-color={color}>
								{#if localValue?.includes(option)}
									<i class="ri-check-line" />
								{/if}
							</div>
						{/if}
						{#if icon}
							<i class={icon} />
						{/if}
						{label}
					</div>
				{/each}
			{/if}
		</div>
	</div>
{/if}

<style>
	.options {
    flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		align-items: stretch;
		overflow-y: auto;
		padding: 0.25rem;
	}

  .options.checkboxes {
    display: grid; 
    padding: 0.25rem 0.25rem;
  }

	.option {
		line-height: 18px;
		padding: 0.25rem;
		display: flex;
		gap: 0.5rem;
		flex-direction: row;
		align-items: center;
		cursor: pointer;
		color: var(--spectrum-global-color-gray-700);
	}

	.option.selected {
		color: var(--spectrum-global-color-gray-900);
	}

	.loope {
		height: 14px;
		width: 14px;
		line-height: 12px;
		border-radius: 2px;
		display: grid;
		align-items: center;
		justify-items: center;
		font-size: 12px;
		font-weight: 700;
		border: 1px solid var(--spectrum-global-color-gray-500);
	}
	.loope.round {
		border-radius: 50%;
	}
	.loope.small {
		height: 12px;
		width: 12px;
		line-height: 10px;
		font-size: 10px;
		font-weight: 700;
	}
	.loope.dot {
		border-radius: 50%;
		height: 8px;
		width: 8px;
		background-color: var(--spectrum-global-color-gray-800);
	}
	.option:hover,
	.option.focused {
		background-color: var(--spectrum-global-color-gray-200);
		border-radius: 4px;
	}

	.spectrum-Switch-label {
		color: var(--spectrum-global-color-gray-700);
	}

	.spectrum-Switch-label.selected {
		color: var(--spectrum-global-color-gray-900);
	}

	.search {
		display: flex;
		justify-content: stretch;
		align-items: center;
		position: relative;
		margin-bottom: 8px;
	}

	.actionIcon {
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		border-left: 1px solid var(--spectrum-global-color-blue-500);
		min-width: 2rem;
		font-size: 16px;
		transition: all 130ms;
	}
	.actionIcon:hover {
		cursor: pointer;
		background-color: var(--spectrum-global-color-gray-75);
		font-weight: 800;
	}
	.icon {
		position: absolute;
		left: 0.5rem;
	}
	input {
		width: 100%;
		height: 100%;
		box-sizing: border-box;
		outline: none;
		background: none;
		color: inherit;
		border: 1px solid var(--spectrum-global-color-gray-300);
		cursor: text;
		overflow: hidden;
		min-width: unset;
		padding: 0.3rem 0.5rem 0.3rem 2rem;
	}

	input:focus {
		border: 1px solid var(--spectrum-global-color-blue-500);
	}
</style>
