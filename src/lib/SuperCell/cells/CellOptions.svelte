<script>
	import Popover from '../../../../node_modules/@budibase/bbui/src/Popover/Popover.svelte';
	import fsm from 'svelte-fsm';
	import { getContext, createEventDispatcher } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fetchData } from '../../../../node_modules/@budibase/frontend-core/src/fetch/index.js';
	import { dataFilters } from "@budibase/shared-core"
	import "./CellCommon.css"

	const dispatch = createEventDispatcher();
	const { API } = getContext('sdk');

	export let cellOptions;
	export let value;
	export let fieldSchema;
	export let multi = false

	let anchor;
	let picker;
	let options = []
	let optionColors = {}
	let optionIcons = {}
	let optionLabels = {}
	let focusedOptionIdx;
	let fetch;
	let filterValue
	let filterBar
	let loadedData

	export let cellState = fsm( "View" , {
    "*": {
      goTo( state ) { return state }
    },
    View: { 
      focus () { 
        if (!cellOptions.readonly) {
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
			_enter() { if (!cellOptions.addNew) editorState.open() },
      unfocus() { return "View" },
      lostFocus() { return "View" },
      submit() { if ( value != originalValue ) acceptChange() ; return "View" }, 
      cancel() { value = Array.isArray(originalValue) ? [ ... originalValue ] : originalValue ; return "View" },
    }
  })

	export let editorState = fsm('Closed', {
		'*': {
			handleKeyboard(e) {},
			close() {
				return 'Closed';
			},
			open() {
				return 'Open';
			},
      toggleOption(idx) {
				toggleOption(options[idx]);
				dispatch('change', localValue);
			}
		},
		Open: {
			toggle() {
				focusedOptionIdx = undefined;
				return 'Closed';
			},
			highlightNext() {
				if (focusedOptionIdx == options.length - 1) focusedOptionIdx = 0;
				else if (focusedOptionIdx != undefined) focusedOptionIdx = focusedOptionIdx + 1;
				else focusedOptionIdx = 0;
			},
			highlightPrevious() {
				if (focusedOptionIdx == 0) focusedOptionIdx = options.length - 1;
				else if (focusedOptionIdx == undefined) focusedOptionIdx = options.length - 1;
				else focusedOptionIdx = focusedOptionIdx - 1;
			}
		},
		Closed: {
			toggle() {
				return $cellState == "Editing" ? 'Open' : "Closed"
			},
			highlightNext() {
				return $cellState == "Editing" ? 'Open' : "Closed"
			}
		}
	});

	$: if ( loadedData != cellOptions.datasource?.label ) { 
		fetch = createFetch(cellOptions.datasource) 
		loadedData = cellOptions.datasource.label
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
				options = cellOptions.customOptions.map( (x) => x.value )
				cellOptions.customOptions.forEach( (e) => {
					optionLabels[e.value] = e.label
				})
			}
	} else {
		options = fieldSchema?.constraints?.inclusion || [];
		optionColors = fieldSchema?.optionColors || {};
		optionIcons = {}
		optionLabels = {}
	}

	// Make sure the internal value is always an array
	$: localValue = Array.isArray(value) ? value : value ? [value] : [];

	$: if (options.length > 1 && cellOptions.coltrolType == "select") options = ['Clear Selection', ...options];
	$: inEdit = $cellState == 'Editing';
	$: simpleView = cellOptions.optionsViewMode == 'text';

	const getOptionColor = (value) => {
		return cellOptions.useOptionColors ? optionColors[value] : undefined
	};

	const getOptionLabel = (value) => {
		return cellOptions.optionsSource == "schema" ? value : optionLabels[value];
	}

	const getOptionIcon = (value) => {
		return cellOptions.useOptionIcons ? optionIcons[value] : undefined
	};

	const handleKeyboard = (e) => {
		if ($editorState == 'Open') {
			if (e.key == 'ArrowDown') editorState.highlightNext(e.preventDefault());
			if (e.key == 'ArrowUp') editorState.highlightPrevious();
			if (e.key == 'Escape') editorState.close(e.stopPropagation());
			if (e.key == 'Enter') editorState.close(e.stopPropagation());
			if (e.key == 'Tab') editorState.close();
			if (e.keyCode == 32) {
				e.preventDefault();
				e.stopPropagation();
				focusedOptionIdx != undefined
					? editorState.toggleOption(focusedOptionIdx)
					: editorState.toggle();
			}
		} else if ($cellState == 'Editing') {
			if (e.keyCode == 32) editorState.toggle(e.preventDefault());
		}
	};

	const toggleOption = (option) => {
		if (option == 'Clear Selection') {
			localValue = multi ? [] : null;
			return;
		}

		if (multi && localValue.includes(option))  {
				localValue.splice(localValue.indexOf(option), 1);
				localValue = localValue;
		} else if (multi) {
				localValue = [...localValue, option];
		} else {
			localValue = [option];
			editorState.toggle();
		}
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
	class:disabled = { cellOptions.disabled || (options.length < 1 && !filterValue )}
	class:error = { cellOptions.error }
	class:inline={cellOptions.role == 'inline'}
	class:tableCell={cellOptions.role == 'tableCell'}
	class:formInput={cellOptions.role == 'formInput'}
	style:color={cellOptions.color}
	style:background={cellOptions.background}
	style:font-weight={cellOptions.fontWeight}
	style:max-height={cellOptions.coltrolType == "select" ? "2rem" : "auto"}
	on:keydown={(e) => { if (!cellOptions.addNew) handleKeyboard(e) }}
	on:blur={(e) => setTimeout(handleBlur, 20, e)}
	on:focusin={cellState.focus}
>
	{#if cellOptions.icon && cellOptions.controlType == "select"}
		<i class={cellOptions.icon + ' frontIcon'}></i>
	{/if}

	{#if cellOptions.controlType == 'checkbox' && options.length > 0}
    <div 
      class="options checkboxes" 
      style:grid-template-columns={ "repeat( " + cellOptions.optionsArrangement  + " , 1fr" }
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
					on:mouseleave={() => focusedOptionIdx = undefined}
				>
					{#if icon}
						<i class={icon} style:color={color}> </i>
					{/if}
					<div class="loope" style:background-color={color ? color : "var(--spectrum-global-color-gray-200)"}>
						{#if selected}
							<i class="ri-check-line" />
						{/if}
					</div>
					{label}
				</div>
			{/each}
    </div>
	{:else if cellOptions.controlType == 'switch' && options.length > 0 }
    <div 
      class="options checkboxes" 
      style:grid-template-columns={ "repeat( " + cellOptions.optionsArrangement  + " , 1fr" }
    >
			{#each options as option, idx (idx)}
				{@const color = getOptionColor(option)}
				{@const label = getOptionLabel(option)}
				{@const selected = localValue.includes(option)}
				<div class="option">
					<div class="spectrum-Switch spectrum-Switch--emphasized"
					style:--spectrum-switch-m-emphasized-handle-border-color-selected = { color ? color : "var(--spectrum-global-color-blue-500)" }
					style:--spectrum-switch-m-emphasized-track-color-selected={ selected && color ? color : "var(--spectrum-global-color-blue-500)"}
					style:--spectrum-switch-m-emphasized-track-color-selected-hover={ color ? color : "var(--spectrum-global-color-blue-600)"}
					>
						<input
							checked={localValue.includes(option)}
							on:change={(e) => editorState.toggleOption(idx)}
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
	{:else if inEdit && cellOptions.addNew}
		<input
			class="editor"
			class:placeholder={!value}
			style:padding-left={ cellOptions.icon ? "32px" : cellOptions.padding }
			style:padding-right={ cellOptions.clearValueIcon ? "32px" : cellOptions.padding }
			style:border={"none"}
			bind:value={localValue[0]}
			placeholder={ cellOptions.placeholder ?? "Enter..." }
			on:blur={(e) => {
				dispatch("change", localValue)
				setTimeout(handleBlur, 20, e)
			}}
			use:focus
		/>
			<i 
			class="ri-arrow-down-s-line" 
			style="min-width: 1.5rem;"
			on:click|stopPropagation={editorState.toggle}>
		</i>
	{:else if inEdit}
		<div
			class="editor"
			class:placeholder={localValue?.length < 1}
			style:padding-left={cellOptions.icon ? '32px' : cellOptions.padding}
			style:padding-right={cellOptions.padding}
			on:click|stopPropagation={() => {if (!cellOptions.addNew) editorState.toggle()}}
		>
			<div class="items" class:simpleView style:justify-content={cellOptions.align ?? 'flex-start'}>
				{#if options.length < 1 && !filterValue}
					No Available Options
				{:else if localValue.length < 1}
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
				{#if options.length < 1 && !filterValue}
					No Available Options
				{:else if localValue.length < 1}
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
							<div class="loope" style:background-color={color} />
						{/if}
							<span> {label} </span>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{/if}

	{#if cellOptions.controlType == "select"}
		<Popover
			{anchor}
			dismissible={false}
			useAnchorWidth
			open={$editorState == "Open"}
		>
			<div bind:this={picker} class="options" on:wheel={(e) => e.stopPropagation()}>

				{#if cellOptions.autocomplete}
					<div class="search">
						<i class="ri-search-line icon"> </i>
						<input 
							bind:value={filterValue}
							bind:this={filterBar}
							class="editor" 
							type="text"
							on:blur={editorState.close}
						> 
					</div>
				{/if}

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
						{#if option == 'Clear Selection'}
							<div
								class="option"
								style:color={'var(--primaryColor)'}
								class:focused={focusedOptionIdx === idx}
								on:mouseenter={() => (focusedOptionIdx = idx)}
								on:mousedown|preventDefault|stopPropagation={(e) => editorState.toggleOption(idx)}
							>
								<i class="ri-close-line" style="font-size: 16px;" />
								{label}
							</div>
						{:else}
							<div
								class="option"
								class:focused={focusedOptionIdx === idx}
								on:mousedown|preventDefault|stopPropagation={(e) => editorState.toggleOption(idx)}
								on:mouseenter={() => (focusedOptionIdx = idx)}
							>
								{#if multi || color }
									<div class="loope" style:background-color={color}>
										{#if localValue?.includes(option)}
											<i class="ri-check-line" />
										{/if}
									</div>
								{/if}
								{label}
							</div>
						{/if}
					{/each}
				{/if}
			</div>
		</Popover>
	{/if}

</div>



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
    padding: 0.25rem 0.5rem;
  }

	.option {
		height: 1.75rem;
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
		border-radius: 2px;
		display: grid;
		align-items: center;
		justify-items: center;
		font-size: 12px;
		border: 1px solid var(--spectrum-global-color-gray-300);
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
