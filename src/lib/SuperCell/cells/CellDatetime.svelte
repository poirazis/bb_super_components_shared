<script>
	import { createEventDispatcher } from 'svelte';
	import Popover from '../../../../node_modules/@budibase/bbui/src/Popover/Popover.svelte';
	import { DatePicker } from 'date-picker-svelte';
	const dispatch = new createEventDispatcher();
	import fsm from "svelte-fsm"

	export let value;
	export let formattedValue;
	export let cellOptions;

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
      unfocus() { return "View" },
      lostFocus() { return "View" },
      submit() { if ( value != originalValue ) acceptChange() ; return "View" }, 
      cancel() { value = Array.isArray(originalValue) ? [ ... originalValue ] : originalValue ; return "View" },
    }
  })

	let anchor;
	let picker;
	let open;

	$: innerDate = value ? new Date(value) : null;
	$: inEdit = $cellState == 'Editing';

	const handleKeyboard = (e) => {
		if (e.keyCode == 32) {
			e.stopPropagation();
			e.preventDefault();
			open = !open;
		}
	};

	const handleBlur = (e) => {
    if (!picker?.contains(e.relatedTarget)) {
			open = false
      dispatch("blur")
    }
  }

</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
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
  style:min-width={"8rem"}
	on:focusin={cellState.focus}
	on:focusout={ handleBlur }
	on:keypress={handleKeyboard}
>
	{#if cellOptions?.iconFront}
		<i class={cellOptions.iconFront + ' frontIcon'}></i>
	{/if}

	{#if inEdit}
		<div class="editor"
			class:placeholder={!value}
			style:padding-left={cellOptions?.iconFront ? '32px' : cellOptions?.padding}
			on:click={() => open = !open }
		>
			<div class="items" style:justify-content={cellOptions.align ?? "flex-end"}>
				{formattedValue || innerDate?.toDateString() || cellOptions?.placeholder || ""}
			</div>
			<i class="ri-calendar-line" style="font-size: 16px;"></i>
		</div>
	{:else}
		<div
			class="value"
			class:placeholder={!value}
			style:padding-left={cellOptions?.iconFront ? '32px' : cellOptions?.padding}
			style:justify-content={cellOptions.align ?? "flex-end"}
		>
			{formattedValue || innerDate?.toDateString() || cellOptions?.placeholder || ""}	
		</div>
  {/if}
</div>

{#if inEdit}
	<Popover {anchor} dismissible bind:open align="left" >
		<div 
			bind:this={picker}
			style:--date-picker-background="var(--spectrum-alias-background-color-default)"
			style:--date-picker-foreground="var(--spectrum-global-color-gray-800)"
			style:--date-picker-selected-background="var(--accent-color)"
		>
		<DatePicker
			bind:value={innerDate}
			browseWithoutSelecting
			on:focusout={() => open = false }
			on:select={(e) => {
				dispatch('change', e.detail);
				anchor.focus();
				open = false;
			}}
		/>
		</div>
	</Popover>
{/if}