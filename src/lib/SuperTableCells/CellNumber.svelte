<script>
  import { createEventDispatcher, getContext } from "svelte";
  import fsm from "svelte-fsm";

  const { processStringSync } = getContext("sdk");
  const dispatch = createEventDispatcher();

  export let value = "";
  export let formattedValue;
  export let cellOptions;

  let originalValue = value;
  let inEdit;
  let localValue = value ?? "";

  $: inEdit = $cellState == "Editing";
  $: inline = cellOptions.role == "inlineInput";
  $: isDirty = inEdit && originalValue != localValue;
  $: formattedValue = cellOptions.template
    ? processStringSync(cellOptions.template, { value })
    : "";

  export let cellState = fsm(cellOptions.initialState ?? "View", {
    "*": {
      goTo(state) {
        return state;
      },
    },
    View: {
      focus() {
        if (!cellOptions.readonly && !cellOptions.disabled) return "Editing";
      },
    },
    Hovered: {
      cancel: () => {
        return "View";
      },
    },
    Focused: {
      unfocus() {
        return "View";
      },
    },
    Error: { check: "View" },
    Editing: {
      _enter() {
        originalValue = localValue;
        dispatch("enteredit");
      },
      _exit() {
        dispatch("exitedit");
      },
      focusout() {
        if (isDirty && !cellOptions.debounce) dispatch("change", localValue);

        dispatch("focusout");
        return "View";
      },
      cancel() {
        value = originalValue;
      },
    },
  });

  let timer;
  const debounce = (e) => {
    // Abort Invalid Keys
    if (
      (e.key.length === 1 && e.key !== "." && isNaN(e.key) && !e.ctrlKey) ||
      e.keyCode == 32 ||
      (e.key === "." && e.target.value.toString().indexOf(".") > -1)
    ) {
      e.preventDefault();
      return;
    }
    if (cellOptions.debounce) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        dispatch("change", localValue);
      }, cellOptions.debounce ?? 0);
    }
  };

  function focus(element) {
    element?.focus();
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="superCell"
  class:error={cellOptions.error}
  class:readonly={cellOptions.readonly}
  class:disabled={cellOptions.disabled}
  class:inEdit
  class:isDirty
  class:inline
  class:tableCell={cellOptions?.role == "tableCell"}
  class:formInput={cellOptions?.role == "formInput"}
  style:color={cellOptions?.color}
  style:background={inEdit
    ? "var(--spectrum-global-color-gray-50)"
    : cellOptions?.background}
  style:font-weight={cellOptions?.fontWeight}
  tabIndex="0"
  on:focusin={cellState.focus}
>
  {#if cellOptions?.icon}
    <i class={cellOptions.icon + " frontIcon"}></i>
  {/if}

  {#if $cellState == "Editing"}
    <input
      class="editor"
      type="text"
      style:padding-left={cellOptions?.icon ? "32px" : cellOptions?.padding}
      style:padding-right={cellOptions?.clearValueIcon
        ? "32px"
        : cellOptions?.padding}
      style:text-align={"right"}
      placeholder={cellOptions?.placeholder}
      bind:value={localValue}
      on:keydown={(e) => debounce(e)}
      on:focusout={cellState.focusout}
      use:focus
    />
    {#if cellOptions.clearValueIcon}
      <i
        class="ri-close-line"
        class:endIcon={true}
        on:mousedown|preventDefault={() => dispatch("change", null)}
      >
      </i>
    {/if}
  {:else}
    <div
      class="value"
      class:placeholder={!value && !formattedValue}
      style:padding-left={cellOptions?.icon ? "32px" : cellOptions?.padding}
      style:padding-right={cellOptions.padding}
    >
      {formattedValue || value || cellOptions?.placeholder || ""}
    </div>
  {/if}
</div>

<style>
  .value {
    flex: auto;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    box-sizing: border-box;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }
</style>
