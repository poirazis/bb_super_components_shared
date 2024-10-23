<script>
  import { createEventDispatcher } from "svelte";
  import fsm from "svelte-fsm";
  import SuperPopover from "../SuperPopover/SuperPopover.svelte";
  import CellLinkPickerTable from "./CellLinkPickerTable.svelte";
  import CellLinkPickerTree from "./CellLinkPickerTree.svelte";
  import CellLinkPickerSelect from "./CellLinkPickerSelect.svelte";
  import SuperList from "../SuperList/SuperList.svelte";
  const dispatch = createEventDispatcher();

  export let value;
  export let fieldSchema;
  export let cellOptions;
  export let simpleView = true;
  export let filter = {};
  export let limit = 100;

  let originalValue = JSON.stringify(value);

  let searchTerm;
  let anchor;

  // Whether a DnD operation is giong on
  let inactive;

  export let cellState = fsm(cellOptions.initialState ?? "View", {
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
        originalValue = JSON.stringify(localValue);
        if (!expanded) editorState.open();
        else anchor?.focus();
        dispatch("enteredit");
      },
      _exit() {
        dispatch("exitedit");
      },
      focusout(e) {
        if (
          document.activeElement == anchor ||
          anchor.contains(e.target) ||
          anchor.contains(e.explicitOriginalTarget)
        ) {
          editorState.close();
        } else {
          this.submit();
        }
      },
      clear() {
        localValue = [];
      },
      submit() {
        if (isDirty)
          dispatch(
            "change",
            returnSingle && localValue ? localValue[0] : localValue
          );

        editorState.close();
        return "View";
      },
      cancel() {
        editorState.close();
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

  $: multi = !fieldSchema.type.includes("_single");
  $: isUser = fieldSchema.type.includes("bb_reference");
  $: localValue = enrichValue(value);
  $: inEdit = $cellState == "Editing";
  $: isDirty = inEdit && originalValue != JSON.stringify(localValue);
  $: simpleView = cellOptions.relViewMode == "text";
  $: inline = cellOptions.role == "inlineInput";
  $: expanded = cellOptions.controlType == "expanded";
  $: multirow =
    cellOptions.controlType == "expanded" && (localValue?.length > 1 || inEdit);
  $: singleSelect =
    fieldSchema?.relationshipType == "one-to-many" ||
    fieldSchema?.relationshipType == "many-to-one" ||
    fieldSchema?.relationshipType == "self" ||
    !multi;

  $: returnSingle = isUser && !multi;

  const handleKeyboard = (e) => {
    if (e.keyCode == 32 && $cellState == "Editing") {
      e.preventDefault();
      e.stopPropagation();
      editorState.toggle();
    }
  };

  const handleChange = (e) => {
    localValue = e.detail;
    let val = returnSingle ? (localValue[0] ?? {}) : localValue;

    if (expanded) {
      dispatch("change", val);
    }

    if (singleSelect) anchor?.focus();
  };

  const enrichValue = (x) => {
    if (fieldSchema.relationshipType == "self" && x) {
      return safeParse(x);
    } else if (multi) {
      return value ? [...value] : [];
    } else {
      return value ? [value] : [];
    }
  };

  const safeParse = (x) => {
    let res;
    try {
      res = JSON.parse(x);
    } catch {
      res = undefined;
    }
    return res;
  };
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="superCell"
  bind:this={anchor}
  tabindex={"0"}
  class:inEdit
  class:isDirty={isDirty && cellOptions.showDirty}
  class:focused={$cellState == "Editing"}
  class:inline
  class:multirow
  class:tableCell={cellOptions.role == "tableCell"}
  class:formInput={cellOptions.role == "formInput"}
  class:disabled={cellOptions.disabled}
  class:readonly={cellOptions.readonly}
  class:error={cellOptions.error}
  style:color={cellOptions.color}
  style:background={inEdit && !expanded
    ? "var(--spectrum-global-color-gray-100)"
    : cellOptions.background}
  style:font-weight={cellOptions.fontWeight}
  on:keydown={handleKeyboard}
  on:focusin={cellState.focus}
  on:mousedown={() => {
    if (!expanded) editorState.toggle();
  }}
  on:focusout={($editorState == "Open" && cellOptions.search) ||
  (expanded && !inactive)
    ? () => {}
    : cellState.submit}
>
  {#if cellOptions?.icon}
    <i class={cellOptions.icon + " frontIcon"}></i>
  {/if}

  {#if expanded}
    <SuperList
      items={localValue}
      listItemKey={"_id"}
      createNew={cellOptions.createNew}
      itemButtons={cellOptions.itemButtons}
      draggable={cellOptions.reordering}
      numbering={cellOptions.numbering}
      {editorState}
      {cellState}
      bind:inactive
      on:change={handleChange}
      on:reorder={() => anchor?.focus()}
      on:addrow={editorState.open}
      on:createNew={cellOptions?.onCreateNew}
    />
  {:else}
    <div
      class="value"
      class:placeholder={localValue?.length < 1}
      style:padding-left={cellOptions?.icon ? "32px" : cellOptions?.padding}
      style:padding-right={cellOptions.padding}
    >
      <div class="items" class:simpleView>
        {#if localValue?.length < 1}
          {cellOptions.placeholder || ""}
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
      {#if cellOptions.clearValueIcon && inEdit && localValue?.length}
        <i
          class="ri-close-line actionIcon"
          on:mousedown|self|stopPropagation|preventDefault={cellState.clear}
        ></i>
      {/if}
      {#if cellOptions.role == "formInput" || inEdit}
        <i class="ri-arrow-down-s-line"></i>
      {/if}
    </div>
  {/if}
</div>

{#if inEdit}
  <SuperPopover
    {anchor}
    useAnchorWidth
    open={$editorState == "Open"}
    dismissible={false}
  >
    {#if cellOptions.controlType == "treeSelect" || fieldSchema.relationshipType == "self" || cellOptions.joinColumn}
      <CellLinkPickerTree
        {fieldSchema}
        {filter}
        {searchTerm}
        {limit}
        joinColumn={cellOptions.joinColumn}
        value={localValue}
        multi={false}
        on:change={handleChange}
        on:focusout={(e) => setTimeout(cellState.focusout, 20, e)}
      />
    {:else if cellOptions.controlType == "tableSelect"}
      <CellLinkPickerTable
        {value}
        datasource={{ type: "table", tableId: fieldSchema.tableId }}
        {filter}
        pickerColumns={cellOptions?.pickerColumns}
        searchColumns={cellOptions?.searchColumns}
        {limit}
        {searchTerm}
        multi={fieldSchema?.relationshipType != "many-to-one"}
        on:change={(e) => (localValue = e.detail)}
      />
    {:else}
      <CellLinkPickerSelect
        {fieldSchema}
        {filter}
        {singleSelect}
        value={localValue}
        wide={cellOptions.controlType != "expanded"}
        search={cellOptions.search}
        on:change={handleChange}
        on:focusout={(e) => setTimeout(cellState.focusout, 20, e)}
      />
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
    min-width: 2rem;
    font-size: 16px;
    transition: all 130ms;
    margin-right: 8px;
  }
  .actionIcon:hover {
    cursor: pointer;
    background-color: var(--spectrum-global-color-gray-75);
    color: var(--spectrum-global-color-red-500);
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
