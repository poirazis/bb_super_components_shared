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
	let flag;

	$: inEdit = $cellState == 'Editing';
	$: inEdit ? anchor?.focus() : null;

	const handleKeyboard = (e) => {
		if (e.keyCode == 32) {
			e.stopPropagation();
			e.preventDefault();
			open = !open;
		}
	};

	const handleBlur = (e) => {
    if (!picker?.contains(e.relatedTarget)) {
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
	on:focus={cellState.focus}
	on:blur={handleBlur}
	on:keypress={handleKeyboard}
>
	{#if cellOptions?.iconFront}
		<i class={cellOptions.iconFront + ' frontIcon'}></i>
	{/if}

	<div
		class="value"
		class:placeholder={!value}
		style:padding-left={cellOptions?.iconFront ? '32px' : cellOptions?.padding}
	>
		{formattedValue || innerDate?.toDateString() || cellOptions?.placeholder  }
	</div>
  {#if inEdit && !open}
    <i
      class="ri-calendar-line"
      class:endIcon={true} 
      on:click={() => {
        if (inEdit) {
          open = !open;
          flag = false;
        }
      }}
    ></i>
  {:else if inEdit && open}
    {#if cellOptions.clearValueIcon}  
      <i 
        class="ri-close-line" 
        class:endIcon={true} 
        on:mousedown|preventDefault={ ()=> dispatch("change", null )}>
      </i>
    {/if}
  {/if}
</div>

<Popover {anchor} dismissible bind:open align="left">
  <div 
    bind:this={picker}
    style:--date-picker-background="var(--spectrum-alias-background-color-default)"
    style:--date-picker-foreground="var(--spectrum-global-color-gray-800)"
    style:--date-picker-selected-background="var(--accent-color)"
  >
  <DatePicker
    bind:value={innerDate}
    browseWithoutSelecting
    on:select={(e) => {
      dispatch('change', e.detail);
      anchor.focus();
      flag = true;
      open = false;
    }}
  />
  </div>
</Popover>

<style>
	.value {
		flex: auto;
		display: flex;
		white-space: nowrap;
		justify-content: space-between;
		align-items: center;
		text-overflow: ellipsis;
		overflow: hidden;
		gap: 1rem;
	}

	.placeholder {
		font-style: italic;
		color: var(--spectrum-global-color-gray-700);
	}
</style>
