<script>
	import fsm from 'svelte-fsm';
	import { getContext, createEventDispatcher } from 'svelte';
	import { flip } from 'svelte/animate';
	import SuperPopover from '../SuperPopover/SuperPopover.svelte';
	import CellSkeleton from "./CellSkeleton.svelte"
	import SuperTable from '../SuperTable/SuperTable.svelte';

	import "./CellCommon.css"

	const dispatch = createEventDispatcher();
	const { API, LuceneUtils, fetchData } = getContext('sdk');

	export let cellOptions;
	export let value;
	export let fieldSchema;
	export let multi = false

	const originalValue = value

	// We always keep an internal value as an array
	$: localValue = Array.isArray(value) ? value : value ? [value] : [];

	let anchor = null
	let editor
	let options = []
	let optionColors = {}
	let optionIcons = {}
	let optionLabels = {}
	let focusedOptionIdx = -1
	let picker
	let tableOptions

	export let cellState = fsm("Loading", {
    "*": {
      goTo( state ) { return state },
			fetchOptions() {
				if (cellOptions.richData) {
					return;
				} else if (cellOptions.optionsSource == 'data' && fetch && $fetch.loaded) {
					options = $fetch.rows.map( (x) => x[cellOptions.valueColumn] )
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
				}
			},
    },
		Loading: {
			_enter() { 
				if (cellOptions.optionsSource != "data") 
				{
					this.fetchOptions();
					return cellOptions.initialState ?? "View";
				}
			},
			syncFetch( fetch ) {
				if ( fetch?.loaded ) {
					this.fetchOptions();
					if (cellOptions.initialState) 
						return cellOptions.initialState
					else 
						return "View";
				}
			},
		},
    View: { 
			_enter() { },
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
				dispatch("enteredit");
				if ( cellOptions.autocomplete || cellOptions.role != "formInput") return;
				editorState.open();
			},
			_exit() {
				dispatch("exitedit")
			},
			change() { 
				if (cellOptions.role == "inline")
					dispatch("change", localValue)
			},
			handleKeyboard( e ) {

			},
      focusout( e ) {
				let target = e.relatedTarget ? e.relatedTarget : e.explicitOriginalTarget;

				if ( !anchor.contains(target)) {
					if ( !arrayEquals(originalValue, localValue ) && originalValue != localValue[0]) {
						if (multi)
							dispatch("change", localValue);
						else 
							dispatch("change", localValue[0]);
					};

					dispatch("focusout");
					editorState.close();
					return "View";
				}
			}, 
      cancel() { return "View" },
    }
  })

	let editorState = fsm('Closed', {
		'*': {
			close() {
				return 'Closed';
			},
      toggleOption(idx) {
				if (!cellOptions.addNew && idx < 0 ) return;

				let option = options[idx] ?? searchTerm;

				if (multi && localValue.includes(option))  {
						localValue.splice(localValue.indexOf(option), 1);
						localValue = localValue;
				} else if (multi) {
						localValue = [...localValue, option];
				} else {
					localValue = [option];
				};

				if (cellOptions.role == "inline") dispatch("change", localValue);
				
				if ( cellOptions.autocomplete ) {
					if (multi) {
						editor.value = "";
						this.filterOptions();
					};
					editor?.focus();
				}
				if ( !multi ) this.close();
			},
		},
		Open: {
			_enter() { 
				focusedOptionIdx = -1;
				editor?.focus();
			},
			_exit() {
				editor?.focus();
			},
			filterOptions( e ) {
				console.log("Filter for ", e.target.value);

				if ( e && e.target.value != "" ) {
					options = options.filter( (x) => x?.startsWith(e.target.value) );
				} else cellState.fetchOptions();
			},
			toggle() {
				editor?.focus();
				return 'Closed';
			},
			handleKeyboard ( e ) {
				console.log(e);


				if ( e.keyCode == 32 ) {
					if ( focusedOptionIdx > -1 ) {
						this.toggleOption(focusedOptionIdx, e.preventDefault())
						if ( !multi ) this.close(e.preventDefault())
					} else if (!cellOptions.autocomplete) {
						this.close(e.preventDefault())
					}
				};

				if ( !cellOptions.autocomplete ) {
					if ( e.key == "Backspace" || e.key == "Delete"  ) {
							e.stopPropagation();
							localValue = [];
							dispatch("change", localValue)
					};
				}

				if ( e.key == "Escape") {
					this.cancel();
				};

				if ( e.key == "Enter" ) {
					if ( multi ) {
						this.toggleOption(focusedOptionIdx, e.preventDefault());
						this.close();
					}
					else {
						this.toggleOption(focusedOptionIdx);
					}
				};

				if (e.key == 'ArrowDown') this.highlightNext(e.preventDefault(), e.stopPropagation());
				if (e.key == 'ArrowUp') this.highlightPrevious(e.preventDefault(), e.stopPropagation());
				if (e.key == 'ArrowLeft') this.highlightLeft(e.preventDefault(), e.stopPropagation());
				if (e.key == 'ArrowRight') this.highlightRight(e.preventDefault(), e.stopPropagation());
				if (e.key == "Escape") this.close(e.stopPropagation());
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
			toggle() {
				return 'Open'
			},
			open() {
				return 'Open';
			},
			filterOptions ( e ) {
				this.open();
				this.filterOptions(e);
			},
			handleKeyboard( e ) {
				if ( !cellOptions.autocomplete ) 
				{
					if (e.keyCode == 32) {
						e.preventDefault();
						e.stopPropagation();
						this.toggle();
					}

					if ( e.key == "Backspace" || e.key == "Delete"  ) {
							e.stopPropagation();
							localValue = [];
							dispatch("change", localValue)
					};
				};

				if (e.key == 'ArrowDown') editorState.open(); 
			}
		}
	});

	$: columns = cellOptions.optionsArrangement || 1
	$: inEdit = $cellState == 'Editing';
	$: simpleView = cellOptions.optionsViewMode != 'pills';
	$: fetch = createFetch ( cellOptions.optionsSource == "data" && !cellOptions.richData ? cellOptions.datasource : null )
	$: cellState.syncFetch($fetch)

	const createFetch = ( datasource ) => {
				return fetchData({
					API,
					datasource,
					options: {
						query: LuceneUtils.buildLuceneQuery(cellOptions.filter),
						sortColumn : cellOptions.sortColumn,
						sortOrder : cellOptions.sortOrder, 
						limit : cellOptions.limit
					},
				});
	}

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

	const arrayEquals = (a, b) => {
		return Array.isArray(a) &&
			Array.isArray(b) &&
			a.length === b.length &&
			a.every((val, index) => val === b[index]); 
	}

	const focus = node => {
		node?.focus()
	}

	$: if ( cellOptions.richData ) tableOptions = {
      superColumnsPos: "first",
      columnSizing : "flexible",
      columnMaxWidth: "auto",
      debounce: 500,
      visibleRowCount: 7,
      rowSelectMode: multi ? "multi" : "single",
      selectionColumn : false,
      dividers: "horizontal",
      dividersColor: null,
      baseFontSize: 12,
      rowHeight: 32,
      showFooter : false,
      showHeader : true,
      features: {
        canFilter: false,
        canSort: true,
        canEdit: false,
        canDelete: false,
        canInsert: false,
        canResize: false,
      },
      data: { 
        datasource : cellOptions.datasource,
        idColumn : cellOptions.valueColumn,
        filter: cellOptions.filter,
        sortColumn: null,
        sortOrder: null,
        limit : cellOptions.limit,
        paginate : false,
        autoRefresh: false,
        autoRefreshRate: 10
      },
      columns: cellOptions.columns,
      appearance: {
        theme : "budibase",
        size : "S",
        cellPadding: "0.5rem",
        useOptionColors: true,
        optionsViewMode: "text",
        relViewMode : "text"
      },
      events: {
        onRowSelect : ( arr ) => {
          var val = arr.map(( x ) => { return { _id: x[valueColumn], primaryDisplay : x[labelColumn]} })
          dispatch("change", val)
        }
      }
  };
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	bind:this={anchor}
	class="superCell"
	class:inEdit
	class:disabled = { cellOptions.disabled }
	class:error = { cellOptions.error }
	class:focused = { inEdit || $editorState == "Open" }
	class:inline={ cellOptions.role == 'inline' }
	class:tableCell={cellOptions.role == 'tableCell'}
	class:formInput={cellOptions.role == 'formInput'}
	style:color={cellOptions.color}
	style:background={ inEdit ? "var(--spectrum-global-color-gray-50" : cellOptions.background}
	style:font-weight={cellOptions.fontWeight}
	style:max-height={cellOptions.coltrolType == "select" ? "2rem" : "auto"}
>
	{#if $cellState == "Loading"}
		<CellSkeleton> Initializing .. </CellSkeleton>
	{:else}
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
		{:else if $cellState == "Editing"}
			{#if cellOptions.autocomplete}
				{#if multi}
					{#if localValue.length > 0 }
						<div 
							class="editor" 
							style:width={"auto"}
							style:padding-left={ cellOptions.icon ? "32px" : cellOptions.padding }
							>
							<div class="items" class:simpleView style:justify-content={cellOptions.align ?? 'flex-start'}>
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
							</div>
						</div>
					{/if}
				{/if}

				<input
					tabindex="0"
					bind:this={editor}
					class="editor"
					class:placeholder={localValue == []}
					style:padding-left={ cellOptions.icon && !localValue?.length ? "32px" : cellOptions.padding }
					style:padding-right={ cellOptions.padding }
					style:padding-top={0}
					style:padding-bottom={0}
					style:border={"none"}
					use:focus
					on:focusout={cellState.focusout}
					value={multi ? "" : localValue[0] ?? ""}
					on:input={editorState.filterOptions}
					on:keydown={editorState.handleKeyboard}
					placeholder={ cellOptions.placeholder ?? "Enter..." }
				/>
				<div id="btn_toggle" class="actionIcon" on:click={editorState.toggle}>
					<i class="ri-arrow-down-s-line" ></i> 
				</div>
			{:else}
				<div
					class="editor"
					tabindex="0"
					class:placeholder={localValue?.length < 1}
					style:padding-left={cellOptions.icon ? '32px' : cellOptions.padding}
					style:padding-right={cellOptions.padding}
					style:cursor={"pointer"}
					on:click|preventDefault={editorState.toggle}
					on:keydown={editorState.handleKeyboard}
					on:focusout={cellState.focusout}
					use:focus
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
					<i class="ri-arrow-down-s-line" style:color={"var(--spectrum-global-color-gray-800)"}></i>
				</div>
			{/if}
		{:else}
			<div
				class="value"
				tabindex="0"
				on:focusin={cellState.focus}
				class:placeholder={localValue?.length < 1}
				style:padding-left={ cellOptions.icon ? "32px" : cellOptions.padding }
				style:padding-right={ cellOptions.padding }
			>
				<div class="items" class:simpleView style:justify-content={cellOptions.align ?? 'flex-start'}>
					{#if localValue.length < 1}
						{cellOptions.placeholder ?? ""}
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
	{/if}
</div>

<!-- svelte-ignore a11y-no-static-element-interactions -->
{#if cellOptions.controlType == "select" && $cellState == 'Editing'}
	<SuperPopover
		anchor={anchor}
		useAnchorWidth
		dismissible={false}
		maxHeight={400}
		open={ $editorState == "Open" }
		>
			{#if cellOptions.richData}
				<SuperTable {tableOptions} />
			{:else}
				<div bind:this={picker}  class="options" on:wheel={(e) => e.stopPropagation()}  on:mouseleave={() => focusedOptionIdx = -1} >
					{#if options.length < 1}
						<div class="option">
								<i class="ri-close-line"></i>
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
			{/if}
	</SuperPopover>
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
		min-height: 14px;
		min-width: 14px;
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
		min-height: 12px;
		min-width: 12px;
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
