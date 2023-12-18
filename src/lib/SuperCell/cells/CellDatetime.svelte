<script>
	import { createEventDispatcher } from 'svelte';
	import Popover from '../../../../node_modules/@budibase/bbui/src/Popover/Popover.svelte';
	import { DatePicker } from 'date-picker-svelte';

	export let value;
	export let cellState;
	export let formattedValue;
	export let cellOptions;

	const dispatch = new createEventDispatcher();

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
			{formattedValue || innerDate?.toDateString() || cellOptions?.placeholder || ""}
			<i
				class="ri-calendar-line"
				class:endIcon={true} 
			></i>
		</div>
	{:else}
		<div
			class="value"
			class:placeholder={!value}
			style:padding-left={cellOptions?.iconFront ? '32px' : cellOptions?.padding}
		>
			{formattedValue || innerDate?.toDateString() || cellOptions?.placeholder || ""}	
		</div>
  {/if}
</div>

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
