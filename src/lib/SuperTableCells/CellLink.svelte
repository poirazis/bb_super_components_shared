<script>
  import { createEventDispatcher } from "svelte";
  import fsm from "svelte-fsm";
  import SuperPopover from "../SuperPopover/SuperPopover.svelte";
  import CellLinkPickerTable from "./CellLinkPickerTable.svelte";
  import CellLinkPickerTree from "./CellLinkPickerTree.svelte";
  import CellLinkPickerSelect from "./CellLinkPickerSelect.svelte";

  import "./CellCommon.css";

  const dispatch = createEventDispatcher();

  export let value = [];
  export let fieldSchema;
  export let cellOptions;
  export let simpleView = true;
  export let parentColumn;
  export let pickerColumns;
  export let searchColumns;
  export let filter;
  export let limit;

  let originalValue = [...value];
  let localValue = [...value];
  let anchor;
  let searchTerm;

  export let cellState = fsm("View", {
    "*": {
      goTo(state) {
        return state;
      },
    },
    View: {
      _enter() {
        open = false;
      },
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
        dispatch("enteredit");
      },
      _exit() {
        dispatch("exitedit");
      },
      focusout(e) {
        this.submit();
      },
      submit() {
        dispatch("change", localValue);
        editorState.close();
        return "View";
      },
      cancel() {
        value = [...originalValue];
        return "View";
      },
    },
  });

  const editorState = fsm("Closed", {
    Open: {
      close() {
        return "Closed";
      },
      toggle() {
        return "Closed";
      },
      lostFocus() {
        cellState.focusout();
      },
    },
    Closed: {
      open() {
        return "Open";
      },
      toggle() {
        return "Open";
      },
    },
  });

  $: inEdit = $cellState == "Editing";
  $: simpleView = cellOptions.relViewMode == "text";

  const handleKeyboard = (e) => {
    if (e.keyCode == 32 && $cellState == "Editing") {
      e.preventDefault();
      e.stopPropagation();
      editorState.toggle();
    }
  };

  const focus = (e) => {
    e?.focus();
  };

  const handleChange = (e) => {
    localValue = [...e.detail];
  };
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="superCell"
  bind:this={anchor}
  tabindex={cellOptions.disabled ? "-1" : "0"}
  class:inEdit
  class:focused={inEdit}
  class:inline={cellOptions.role == "inline"}
  class:tableCell={cellOptions.role == "tableCell"}
  class:formInput={cellOptions.role == "formInput"}
  class:disabled={cellOptions.disabled}
  class:readonly={cellOptions.readonly}
  class:error={cellOptions.error}
  style:color={cellOptions.color}
  style:background={inEdit && cellOptions.role != "inline"
    ? "var(--spectrum-global-color-gray-50)"
    : cellOptions.background}
  style:font-weight={cellOptions.fontWeight}
  on:keydown={handleKeyboard}
  on:focus={cellState.focus}
  on:focusout={$editorState == "Open" ? () => {} : cellState.submit}
>
  {#if cellOptions?.icon}
    <i class={cellOptions.icon + " frontIcon"}></i>
  {/if}

  {#if inEdit && cellOptions.autocomplete}
    <input
      class="editor"
      class:placeholder={!searchTerm}
      style:padding-left={cellOptions.icon ? "32px" : cellOptions.padding}
      style:padding-right={cellOptions.clearValueIcon
        ? "32px"
        : cellOptions.padding}
      style:padding-top={0}
      style:padding-bottom={0}
      style:border={"none"}
      bind:value={searchTerm}
      placeholder={cellOptions.placeholder ?? "Enter..."}
      use:focus
    />
    <i class="ri-add-line actionIcon" on:click={(e) => (open = true)}></i>
  {:else if inEdit}
    <div
      class="editor"
      class:placeholder={localValue?.length < 1}
      style:padding-left={cellOptions?.icon ? "32px" : cellOptions?.padding}
      style:padding-right={cellOptions?.padding}
      on:click={editorState.toggle}
    >
      <div class="items" class:simpleView>
        {#if localValue?.length < 1}
          {cellOptions?.placeholder || "Select " + fieldSchema.name}
        {:else if localValue?.length > 0}
          {#each localValue as val, idx}
            <div class="item" class:rel-pills={!simpleView}>
              {#if !simpleView}
                <i
                  class={fieldSchema.type == "link"
                    ? "ri-links-line"
                    : "ri-user-line"}
                />
              {/if}
              <span>{val.primaryDisplay}</span>
            </div>
          {/each}
        {/if}
      </div>
      <i class="ri-add-line"></i>
    </div>
  {:else}
    <div
      class="value"
      class:placeholder={value?.length < 1}
      style:padding-left={cellOptions?.icon ? "32px" : cellOptions?.padding}
      style:padding-right={cellOptions.padding}
    >
      <div class="items" class:simpleView>
        {#if localValue?.length < 1}
          {cellOptions?.placeholder || "Select " + fieldSchema.name}
        {:else if localValue?.length > 0}
          {#each localValue as val}
            <div
              class="item"
              class:rel-pills={!simpleView}
              class:rel-bb-reference={!simpleView && fieldSchema.type != "link"}
            >
              {#if !simpleView}
                <i
                  class={fieldSchema.type == "link"
                    ? "ri-links-line"
                    : "ri-user-line"}
                />
              {/if}
              <span>{val.primaryDisplay}</span>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>

{#if inEdit}
  <SuperPopover
    {anchor}
    dismissible
    useAnchorWidth
    open={$editorState == "Open"}
    on:close={cellState.focusout}
  >
    {#if cellOptions.controlType == "tableSelect"}
      <CellLinkPickerTable
        {value}
        datasource={{ type: "table", tableId: fieldSchema.tableId }}
        {filter}
        {pickerColumns}
        {searchColumns}
        {limit}
        {searchTerm}
        multi={fieldSchema?.relationshipType != "many-to-one"}
        on:change={(e) => (localValue = e.detail)}
      />
    {:else if cellOptions.controlType == "treeSelect"}
      <CellLinkPickerTree
        tableId={fieldSchema.tableId}
        parentColumn={parentColumn || fieldSchema.name}
        {filter}
        {searchTerm}
        {limit}
        {value}
        multi={fieldSchema?.relationshipType != "one-to-many"}
        on:change={handleChange}
      />
    {:else}
      <CellLinkPickerSelect {fieldSchema} {value} on:change={handleChange} />
    {/if}
  </SuperPopover>
{/if}

<style>
  .rel-pills {
    background-color: var(--spectrum-global-color-gray-200);
  }
  .rel-bb-reference {
    background-color: var(--spectrum-global-color-gray-200);
  }

  .actionIcon {
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    border-left: 1px solid var(--spectrum-global-color-blue-500);
    min-width: 2rem;
    font-size: 16px;
    transition: all 130ms;
  }
  .actionIcon:hover {
    cursor: pointer;
    background-color: var(--spectrum-global-color-gray-75);
    font-weight: 800;
  }

  .loader {
    width: 120px;
    height: 20px;
    background: linear-gradient(90deg, #0001 33%, #0005 50%, #0001 66%) #f2f2f2;
    background-size: 300% 100%;
    animation: l1 1s infinite linear;
  }
  @keyframes l1 {
    0% {
      background-position: right;
    }
  }
</style>
