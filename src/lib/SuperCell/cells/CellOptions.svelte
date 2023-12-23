<script>
	import Popover from '../../../../node_modules/@budibase/bbui/src/Popover/Popover.svelte';
	import fsm from 'svelte-fsm';
	import { getContext, createEventDispatcher } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fetchData } from '../../../../node_modules/@budibase/frontend-core/src/fetch/index.js';

	const dispatch = createEventDispatcher();
	const { API } = getContext('sdk');

	export let cellState;
	export let cellOptions;
	export let value;
	export let fieldSchema;
	export let multi;

	export let placeholder = multi ? 'Choose options' : 'Choose an option';

	let anchor;
	let picker;
	let options;
	let focusedOptionIdx;
	let fetch;
	let query = {};
	let limit = 100;
	let paginate = false;
	let filter = {};
	let sortColumn;
	let sortOrder;

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
				dispatch('change', value);
				if (!multi) this.close.debounce(100);
			}
		},
		Open: {
			toggle() {
				focusedOptionIdx = undefined;
				anchor.focus();
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
				return 'Open';
			},
			highlightNext() {
				return 'Open';
			}
		}
	});

	$: if (!fetch && cellOptions.optionsSource == 'datasource') {
		fetch = createFetch(cellOptions.datasource);
	}

	$: if (fetch && $fetch.loaded) {
		options = $fetch.rows.map((x) => x[cellOptions.labelField]);
	} else if (fetch) {
		options = [];
	} else if (cellOptions.optionsSource == 'custom') {
		options = cellOptions.customOptions.map( (x) => x.label );
	} else {
		options = fieldSchema?.constraints?.inclusion || [];
	}

	$: value = Array.isArray(value) ? value : value ? [value] : [];
	$: optionColors = fieldSchema?.optionColors || {};
	$: allowNull = !fieldSchema?.constraints?.presence ?? false;
	$: if (allowNull && options.length > 1) options = ['Clear Selection', ...options];
	$: inEdit = $cellState == 'Editing';
	$: if (inEdit && anchor && editorState == 'Closed') anchor?.focus();
	$: simpleView = cellOptions.optionsViewMode == 'text';

	const getOptionColor = (value) => {
		if (cellOptions.optionsViewMode != 'text') {
			return cellOptions.useOptionColors
				? optionColors[value] ?? 'var(--spectrum-global-color-gray-300)'
				: 'var(--spectrum-global-color-gray-300)';
		} else {
			return 'unset';
		}
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
			value = multi ? [] : null;
			return;
		}

		if (!multi) {
			value = [option];
			editorState.toggle();
		} else {
			if (value.includes(option)) {
				value.splice(value.indexOf(option), 1);
				value = value;
			} else {
				value = [...value, option];
			}
		}
	};

	const createFetch = (datasource) => {
		return fetchData({
			API,
			datasource,
			options: {
				query,
				sortColumn,
				sortOrder,
				limit,
				paginate
			}
		});
	};

	const handleBlur = (e) => {
		if (!picker?.contains(e.relatedTarget)) {
			editorState.close();
			dispatch('blur');
		}
	};

  $: console.log(cellOptions)
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	bind:this={anchor}
	tabindex="0"
	class="superCell"
	class:inEdit
	class:inline={cellOptions?.role == 'inline'}
	class:tableCell={cellOptions?.role == 'tableCell'}
	class:formInput={cellOptions?.role == 'formInput'}
	style:color={cellOptions?.color}
	style:background={cellOptions?.background}
	style:font-weight={cellOptions?.fontWeight}
  style:max-height={() => { if ( cellOptions.controlType == "select" ) return "unset" }}
	on:keydown={handleKeyboard}
	on:focusout={handleBlur}
	on:focusin={cellState.focus}
>
	{#if cellOptions?.iconFront}
		<i class={cellOptions.iconFront + ' frontIcon'}></i>
	{/if}

	{#if cellOptions.controlType == 'checkbox'}
    <div 
      class="options checkboxes" 
      style:grid-template-columns={ "repeat( " + cellOptions.optionsArrangement  + " , 1fr" }
    >
      {#if options.length < 1}
        <div class="option">
          <div class="option text">
            <i class="ri-close-line" />
            No Available Options
          </div>
        </div>
      {:else}
        {#each options as option, idx (idx)}
          {#if option != 'Clear Selection'}
            <div
              class="option"
              class:focused={focusedOptionIdx === idx}
              on:mousedown|preventDefault|stopPropagation={(e) => editorState.toggleOption(idx)}
              on:mouseenter={() => (focusedOptionIdx = idx)}
            >
              <div class="loope" style:background-color={getOptionColor(option)}>
                {#if value?.includes(option)}
                  <i class="ri-check-line" />
                {/if}
              </div>
              {option}
            </div>
          {/if}
        {/each}
      {/if}
    </div>
	{:else if cellOptions.controlType == 'switch'}
    <div 
      class="options checkboxes" 
      style:grid-template-columns={ "repeat( " + cellOptions.optionsArrangement  + " , 1fr" }
    >
      {#if options.length < 1}
        <div class="option">
          <div class="option text">
            <i class="ri-close-line" />
            No Available Options
          </div>
        </div>
      {:else}
        {#each options as option, idx (idx)}
          {#if option != 'Clear Selection'}
          <div class="option">
            <div class="spectrum-Switch spectrum-Switch--emphasized">
              <input
                checked={value.includes(option)}
                on:change={(e) => toggleOption(option)}
                type="checkbox"
                class="spectrum-Switch-input"
                id={idx}
              />
              <span class="spectrum-Switch-switch" />
              <label class="spectrum-Switch-label" for={idx}>{option}</label>
            </div>
          </div>
          {/if}
        {/each}
      {/if}
    </div>
	{:else if inEdit}
		<div
			class="editor"
			class:placeholder={value?.length < 1}
			style:padding-left={cellOptions?.iconFront ? '32px' : cellOptions?.padding}
			on:click={editorState.toggle}
		>
			<div class="items" class:simpleView style:justify-content={cellOptions.align ?? 'flex-start'}>
				{#if value.length < 1}
					{cellOptions?.placeholder ?? placeholder}
				{:else if value.length > 0}
					{#each value as val (val)}
						<div
							class="item"
							animate:flip={{ duration: 130 }}
							style:background-color={getOptionColor(val)}
						>
							<span> {val} </span>
						</div>
					{/each}
				{/if}
			</div>
			<i class="ri-arrow-down-s-line"></i>
		</div>
	{:else}
		<div
			class="value"
			class:placeholder={value?.length < 1}
			style:padding-left={cellOptions?.iconFront ? '32px' : cellOptions?.padding}
		>
			<div class="items" class:simpleView style:justify-content={cellOptions.align ?? 'flex-start'}>
				{#if value.length < 1}
					{cellOptions?.placeholder ?? placeholder}
				{:else if value.length > 0}
					{#each value as val (val)}
						<div
							class="item"
							animate:flip={{ duration: 130 }}
							style:background-color={getOptionColor(val)}
						>
							<span> {val} </span>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>

{#if inEdit && cellOptions.controlType == "select"}
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<Popover
		{anchor}
		useAnchorWidth
		dismissible
		open={$editorState == 'Open'}
		on:close={editorState.close}
	>
		<div bind:this={picker} class="options" on:wheel={(e) => e.stopPropagation()}>
			{#if options.length < 1}
				<div class="option">
					<div class="option text">
						<i class="ri-close-line" />
						No Available Options
					</div>
				</div>
			{:else}
				{#each options as option, idx (idx)}
					{#if option == 'Clear Selection'}
						<div
							class="option"
							style:color={'var(--primaryColor)'}
							class:focused={focusedOptionIdx === idx}
							on:mouseenter={() => (focusedOptionIdx = idx)}
							on:mousedown|preventDefault|stopPropagation={(e) => editorState.toggleOption(idx)}
						>
							<i class="ri-close-line" style="font-size: 16px;" />
							{option}
						</div>
					{:else}
						<div
							class="option"
							class:focused={focusedOptionIdx === idx}
							on:mousedown|preventDefault|stopPropagation={(e) => editorState.toggleOption(idx)}
							on:mouseenter={() => (focusedOptionIdx = idx)}
						>
							<div class="loope" style:background-color={getOptionColor(option)}>
								{#if value?.includes(option)}
									<i class="ri-check-line" />
								{/if}
							</div>
							{option}
						</div>
					{/if}
				{/each}
			{/if}
		</div>
	</Popover>
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
    padding: 0.5rem;
  }

	.option {
		height: 1.75rem;
		padding: 0.25rem;
		display: flex;
		gap: 0.5rem;
		flex-direction: row;
		align-items: center;
		cursor: pointer;
	}

	.loope {
		height: 14px;
		width: 14px;
		border-radius: 2px;
		display: grid;
		align-items: center;
		justify-items: center;
		font-size: 12px;
	}
	.option:hover,
	.option.focused {
		background-color: var(--spectrum-global-color-gray-200);
		border-radius: 4px;
	}
</style>
