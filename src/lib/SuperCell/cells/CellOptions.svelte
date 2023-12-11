<script>
  import Popover from "../../../../node_modules/@budibase/bbui/src/Popover/Popover.svelte"
  import fsm from "svelte-fsm";
  import { createEventDispatcher ,beforeUpdate } from "svelte"
  import { flip } from 'svelte/animate';

  export let cellState
  export let cellOptions
  export let value;
  export let fieldSchema;
  export let multi

  export let useOptionColors = false
  export let defaultOptionColor = "var(--spectrum-global-color-green-400)"
  export let isHovered = false
  export let placeholder = multi ? "Choose options" : "Choose an option";
  export let fadeToColor = "var(--spectrum-global-color-gray-50)"
  export let optionIcon = "ri-loope"


  const dispatch = createEventDispatcher()

  let anchor
  let valueAnchor
  let overflow
  let focusedOptionIdx 

  export let editorState = fsm( "Closed", {
    "*": {
      handleKeyboard( e ) { }
    },
    Open: {  
      toggle() { cellState.closeEditor(); anchor.focus(); return "Closed" },
      toggleOption ( idx ) { 
        toggleOption(options[idx]); 
        dispatch("change", value )
        if (!multi) this.close.debounce(100)
      },
      highlightNext () { 
        if ( focusedOptionIdx == options.length - 1 )
          focusedOptionIdx = 0
        else if ( focusedOptionIdx != undefined )
          focusedOptionIdx = focusedOptionIdx + 1; 
        else 
          focusedOptionIdx = 0;
      },
      highlightPrevious () { 
        if ( focusedOptionIdx == 0 ) 
          focusedOptionIdx = options.length - 1  
        else if ( focusedOptionIdx == undefined )
          focusedOptionIdx = options.length - 1
        else
          focusedOptionIdx = focusedOptionIdx -1;
      },
    },
    Closed: {
      toggle() { cellState.openEditor(); return "Open" },
      highlightNext () { return "Open" },
    }
  });

  $: value = Array.isArray(value) ? value : value ? [ value ] : []
  $: options = fieldSchema?.constraints?.inclusion || [];
  $: optionColors = fieldSchema?.optionColors || {};
  $: allowNull = !fieldSchema?.constraints?.presence ?? false;
  $: if (allowNull && options.length > 1) options = [ "Clear Selection", ...options ]
  $: inEdit = $cellState == "Editing"
  $: if ( inEdit && anchor && editorState == "Closed" ) anchor?.focus() 

  const getOptionColor = (value) => {
    return defaultOptionColor;
  };

  const handleKeyboard = ( e ) => {
    if ( $editorState == "Open" ) {  
      if ( e.key == "ArrowDown" ) editorState.highlightNext( e.preventDefault() );
      if ( e.key == "ArrowUp" ) editorState.highlightPrevious();
      if ( e.key == "Escape" ) editorState.close( e.stopPropagation() ) ;
      if ( e.key == "Enter" ) editorState.close( e.stopPropagation() ) ;
      if ( e.key == "Tab" ) editorState.close();
      if ( e.keyCode == 32 ) {
        e.preventDefault();
        e.stopPropagation();
        focusedOptionIdx != undefined ? editorState.toggleOption(focusedOptionIdx) : editorState.toggle();
      }  
    } else if ( $cellState == "Editing") {
      if ( e.keyCode == 32 ) editorState.toggle( e.preventDefault() );
    }
  }

  const toggleOption = ( option ) => {
    if (option == "Clear Selection") {
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
  }

  beforeUpdate ( () => { 
    overflow = valueAnchor ? valueAnchor.clientWidth != valueAnchor.scrollWidth : true
  } )

</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div 
  bind:this={anchor} 
  tabindex="0"
  class="superCell"
  class:inEdit
  class:inline={ cellOptions?.role == "inline" }  
  class:tableCell={ cellOptions?.role == "tableCell" } 
  class:formInput={ cellOptions?.role == "formInput" } 
  style:color={ cellOptions?.color }
  style:background={ cellOptions?.background }
  style:font-weight={ cellOptions?.fontWeight }
  on:keydown={handleKeyboard} 
  on:click={ () => { if ( $cellState == "Editing" ) editorState.toggle() } }
  on:blur={() => { cellState.lostFocus() } }
>
  <div bind:this={valueAnchor} class="value" >
    {#if value.length < 1 && inEdit}
      <span class="placeholder">{ cellOptions?.placeholder ?? placeholder } </span>
    {:else if value.length > 0}
      {#each value as val (val)}
        {@const color = optionColors[val] || getOptionColor(val)}
          <div class="item" animate:flip={{ duration: 130 }}  style="--color: {color}">
            <span> {val} </span>
          </div>
      {/each}
    {/if}

    {#if inEdit}
      <i class="ri-arrow-down-s-line" style="font-size: 20px;" on:click|stopPropagation={(e) => editorState.toggle()}/>
    {/if}
  </div>



  <Popover 
    {anchor} 
    useAnchorWidth={!multi}
    dismissible
    align={"left"} 
    open={ $editorState == "Open" && inEdit }
    on:close={ () => { editorState.toggle() } }
  >
    <div class="options" on:wheel={(e) => e.stopPropagation()}>
      {#if options.length < 1}
        No Available Options
      {:else}
        {#each options as option,idx (idx)}
        {@const color = optionColors[option] || getOptionColor(option)}
          {#if (option == "Clear Selection") }
            <div
              class="option"
              style:color={"var(--primaryColor)"}
              class:focused={focusedOptionIdx === idx}
              on:mouseenter={() => (focusedOptionIdx = idx)}
              on:click|preventDefault={(e) => editorState.toggleOption(idx)}
            >
              <div class="option text">
                <i class={optionIcon} />
                {option}
              </div>
            </div>
          {:else}
            <div
              class="option"
              class:focused={focusedOptionIdx === idx}
              on:mousedown|preventDefault|stopPropagation={(e) => editorState.toggleOption(idx)}
              on:mouseenter={() => (focusedOptionIdx = idx)}
            >
              <div class="option text">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={color} stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>
                {option}
              </div>
              {#if value?.includes(option)}
                <i class="ri-check-line" />
              {/if}
            </div>
          {/if}
        {/each}
      {/if}
    </div>
  </Popover>
</div>

<style>
    .value {
    flex: auto;
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    align-items: center;
  }
  .text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .options {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;
    overflow-y: auto;
    padding: 0.3rem;
    gap: 0rem;
  }
  .option {
    padding: 0.15rem;
    display: flex;
    gap: 0.3rem;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
  }
  .option:hover,
  .option.focused {
    background-color: var(--spectrum-global-color-gray-200);
    border-radius: 4px;
  }
</style>