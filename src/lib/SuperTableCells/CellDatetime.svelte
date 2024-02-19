<script>
	import { createEventDispatcher } from 'svelte';
	import SuperPopover from '../SuperPopover/SuperPopover.svelte';
	import { DatePicker } from 'date-picker-svelte';
	const dispatch = new createEventDispatcher();
	import fsm from "svelte-fsm"
	import "./CellCommon.css"

	export let value;
	export let formattedValue;
	export let cellOptions;

	let originalValue

	export let cellState = fsm( "View" , {
    "*": {
      goTo( state ) { return state }
    },
    View: { 
      focus () { 
        if (!cellOptions.readonly) return "Editing"  
      }
    },
    Hovered: { cancel: () => { return "View" }},
    Focused: { 
      unfocus() { return "View" },
    },
    Error: { check : "View" },
    Editing: { 
			_enter () { 
				originalValue = value;
				dispatch("enteredit");
			 },
			 _exit() {
				dispatch("exitedit");
			 },
      handleKeyboard (e)  {
				if (e.keyCode == 32) {
					e.stopPropagation();
					e.preventDefault();
					open = !open;
				}
			},
      focusout( e ) { 
				if ( !picker?.contains(e.relatedTarget) ) {
					open = false;
					if ( value != originalValue ) {
						dispatch ("change", value)
					};
					return "View";
				};
			},
      cancel() { value = Array.isArray(originalValue) ? [ ... originalValue ] : originalValue ; return "View" },
    }
  })

	let anchor;
	let picker;
	let open;

	$: innerDate = value ? new Date(value) : new Date();
	$: inEdit = $cellState == 'Editing';
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  bind:this={anchor}
	tabindex="0"
	class="superCell"
	class:inEdit
	class:focused={open}
	class:disabled={cellOptions.disabled}
	class:inline={cellOptions?.role == 'inline'}
	class:tableCell={cellOptions?.role == 'tableCell'}
	class:formInput={cellOptions?.role == 'formInput'}
	style:color={cellOptions?.color}
	style:background={ $cellState == "Editing" && cellOptions.role != "inline" ? "var(--spectrum-global-color-gray-50)" : cellOptions.background }
	style:font-weight={cellOptions?.fontWeight}
	on:focus={cellState.focus}
	on:focusout={cellState.focusout}
	on:keypress={cellState.handleKeyboard}
>
	{#if cellOptions?.icon}
		<i class={cellOptions.icon + ' frontIcon'}></i>
	{/if}

	{#if inEdit}
		<div class="editor"
			class:placeholder={!value}
			style:padding-left={cellOptions?.iconFront ? '32px' : cellOptions?.padding}
			style:padding-right={cellOptions?.padding}
			on:click={() => open = !open }
		>
			<div class="items" style:justify-content={cellOptions.align ?? "flex-start"}>
				{formattedValue || innerDate?.toDateString() || cellOptions?.placeholder || ""}
			</div>
			<i class="ri-calendar-line" style="font-size: 16px;"></i>
		</div>
	{:else}
		<div
			class="value"
			class:placeholder={!value}
			style:padding-left={cellOptions?.icon ? '32px' : cellOptions?.padding}
			style:padding-right={cellOptions.padding}
			style:justify-content={cellOptions.align ?? "flex-start"}
		> 
			<span>
				{formattedValue || value ? innerDate.toDateString() : null || cellOptions?.placeholder || ""}	
			</span>
		</div>
  {/if}
</div>

{#if inEdit}
	<SuperPopover {anchor} dismissible={false} open={open} align="right" >
		<div 
			bind:this={picker}
			style:--date-picker-background="var(--spectrum-alias-background-color-default)"
			style:--date-picker-foreground="var(--spectrum-global-color-gray-800)"
			style:--date-picker-selected-background="var(--accent-color)"
		>
		<DatePicker
			bind:value={innerDate}
			on:select={(e) => {
				value = e.detail;
				anchor?.focus();
				open = false;
			}}
		/>
		</div>
	</SuperPopover>
{/if}