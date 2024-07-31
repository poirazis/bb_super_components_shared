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
  let originalValue = value;
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
      focus() {
        if (!cellOptions.readonly && !cellOptions.disabled) return "Editing";
      },
    },
    Disabled: {},
    Error: { check: "View" },
    Readonly: { check: "View" },
    Editing: {
      _enter() {
        originalValue = value;
        dispatch("enteredit");
      },
      _exit() {
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
        if (originalValue != value) {
          dispatch("change", value);
        }
        return "View";
      },
      cancel() {
        value = originalValue;
        if (cellOptions.debounce) dispatch("change", value);
        dispatch("cancel");
        return "View";
      },
      handleKeyboard(e) {
        if (e.key == "Enter") this.submit();
        if (e.key == "Escape") this.cancel();
      },
    },
  });

  $: inEdit = $cellState == "Editing";
  $: formattedValue = cellOptions?.template
    ? processStringSync(cellOptions.template, { value })
    : undefined;

  const debounce = (e) => {
    value = e.target.value;
    if (cellOptions?.debounce) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        dispatch("change", value);
      }, cellOptions.debounce ?? 0);
    }
  };

  const focus = (node) => {
    node?.focus();
  };

  onMount(() => {
    if (autofocus) setTimeout(() => editor?.focus(), 150);
  });
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="superCell"
  class:inEdit
  class:focused={inEdit}
  class:inline={cellOptions.role == "inlineInput"}
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
>
  {#if cellOptions.icon}
    <i class={cellOptions.icon + " frontIcon"}></i>
  {/if}

  {#if inEdit}
    <input
      bind:this={editor}
      tabindex="0"
      class="editor"
      class:placeholder={!value && !formattedValue}
      style:padding-left={cellOptions.icon ? "32px" : cellOptions.padding}
      style:padding-right={cellOptions.clearValueIcon
        ? "32px"
        : cellOptions.padding}
      value={value ?? ""}
      placeholder={cellOptions.placeholder ?? "Enter..."}
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
      on:focusin={cellState.focus}
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
