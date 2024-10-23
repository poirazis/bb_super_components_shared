<script>
  import { createEventDispatcher, getContext, onMount } from "svelte";
  import fsm from "svelte-fsm";
  const dispatch = createEventDispatcher();
  const { processStringSync } = getContext("sdk");

  export let value = null;
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
        if (cellOptions.debounce) dispatch("change", null);
        value = null;
      },
      focusout(e) {
        if (e.explicitOriginalTarget != clearIcon) this.submit();
      },
      submit() {
        if (isDirty && localValue) {
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

  $: localValue = value ?? null;
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
      }, 50);
  });
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="superCell"
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
>
  {#if cellOptions.icon}
    <i class={cellOptions.icon + " icon"}></i>
  {/if}

  {#if inEdit}
    <input
      bind:this={editor}
      tabindex="0"
      class="editor"
      class:with-icon={cellOptions.icon}
      class:placeholder={!value && !formattedValue && !localValue}
      value={localValue}
      placeholder={cellOptions?.placeholder ?? ""}
      on:input={debounce}
      on:focusout={cellState.focusout}
      on:keydown={cellState.handleKeyboard}
      use:focus
    />
    {#if localValue}
      <i
        bind:this={clearIcon}
        class="ri-close-line endIcon"
        on:mousedown|preventDefault={cellState.clear}
      />
    {/if}
  {:else}
    <div
      class="value"
      tabindex={cellOptions.readonly || cellOptions.disabled ? "-1" : "0"}
      class:with-icon={cellOptions.icon}
      class:placeholder={!value}
      style:justify-content={cellOptions.align}
      on:focusin={cellState.focus}
    >
      <span>
        {formattedValue || value || cellOptions?.placeholder || ""}
      </span>
    </div>
  {/if}
</div>
