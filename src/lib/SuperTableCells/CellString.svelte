<script>
  import { createEventDispatcher, getContext, onMount } from "svelte";
  import fsm from "svelte-fsm";
  import "./CellCommon.css";
  const dispatch = createEventDispatcher();
  const { processStringSync } = getContext("sdk");

  export let value;
  export let formattedValue;
  export let cellOptions = {
    role: "formInput",
    initialState: "Editing",
    debounce: 250,
  };
  export let autofocus;

  let timer;
  let originalValue;

  let editor;
  let clearIcon;

  export let cellState = fsm(cellOptions?.initialState ?? "View", {
    "*": {
      goTo(state) {
        return state;
      },
    },
    Loading: {},
    View: {
      _enter() {
        localValue = value;
      },
      focus() {
        if (!cellOptions.readonly && !cellOptions.disabled) return "Editing";
        else return "Flashing";
      },
    },
    Flashing: {
      _enter() {
        this.returnToView.debounce(230);
      },
      returnToView() {
        return "View";
      },
    },
    Disabled: {},
    Focused: {},
    Error: { check: "View" },
    Readonly: { check: "View" },
    Editing: {
      _enter() {
        originalValue = value;
        dispatch("enteredit");
      },
      _exit() {
        originalValue = undefined;
        dispatch("exitedit");
        dispatch("focusout");
      },
      clear() {
        value = "";
        if (cellOptions.debounce) dispatch("change", value);
      },
      focusout(e) {
        if (e.explicitOriginalTarget != clearIcon) this.submit();
      },
      submit() {
        if (isDirty) {
          dispatch("change", localValue);
        }
        return "View";
      },
      cancel() {
        value = originalValue;
        dispatch("cancel");
        return "View";
      },
      handleKeyboard(e) {
        if (e.key == "Enter") this.submit();
        if (e.key == "Escape") this.cancel();
      },
    },
  });

  $: localValue = value;
  $: inline = cellOptions.role == "inlineInput";
  $: inEdit = $cellState == "Editing";
  $: isDirty = inEdit && originalValue != localValue;
  $: formattedValue = cellOptions?.template
    ? processStringSync(cellOptions.template, { value })
    : undefined;

  const debounce = (e) => {
    localValue = e.target.value;
    if (cellOptions?.debounce) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        dispatch("change", localValue);
      }, cellOptions.debounce ?? 0);
    }
  };

  const focus = (node) => {
    node?.focus();
  };

  onMount(() => {
    if (autofocus)
      setTimeout(() => {
        cellState.focus();
        editor?.focus();
      }, 30);
  });
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="superCell"
  tabindex="0"
  class:flashing={$cellState == "Flashing"}
  class:inEdit
  class:isDirty={isDirty && cellOptions.showDirty}
  class:focused={inEdit}
  class:inline
  class:tableCell={cellOptions.role == "tableCell"}
  class:formInput={cellOptions.role == "formInput"}
  class:disabled={cellOptions.disabled}
  class:readonly={cellOptions.readonly}
  class:error={cellOptions.error}
  style:color={cellOptions.color}
  style:background={inEdit && cellOptions.role != "inlineInput"
    ? "var(--spectrum-global-color-gray-50)"
    : cellOptions.background}
  style:font-weight={cellOptions.fontWeight}
  on:focusin={cellState.focus}
>
  {#if cellOptions.icon}
    <i class={cellOptions.icon + " frontIcon"}></i>
  {/if}

  {#if inEdit}
    <input
      bind:this={editor}
      tabindex="0"
      class="editor"
      class:placeholder={!value && !formattedValue && !localValue}
      style:padding-left={cellOptions.icon ? "32px" : cellOptions.padding}
      style:padding-right={cellOptions.clearValueIcon
        ? "32px"
        : cellOptions.padding}
      value={value ?? ""}
      placeholder={cellOptions.placeholder}
      on:input={debounce}
      on:focusout={cellState.focusout}
      on:keydown={cellState.handleKeyboard}
      use:focus
    />
    {#if cellOptions.clearValueIcon}
      <i
        bind:this={clearIcon}
        class="ri-close-line endIcon"
        on:mousedown|preventDefault={cellState.clear}
      >
      </i>
    {/if}
  {:else}
    <div
      class="value"
      tabIndex={cellOptions.readonly ? "-1" : "0"}
      class:placeholder={!value}
      style:padding-left={cellOptions.icon ? "32px" : cellOptions.padding}
      style:padding-right={cellOptions.padding}
      style:justify-content={cellOptions.align}
    >
      <span>
        {formattedValue || value || cellOptions?.placeholder || ""}
      </span>
    </div>
  {/if}
</div>

<style>
  .flashing {
    color: var(--spectrum-global-color-gray-400) !important;
  }
</style>
