<script>
  import fsm from "svelte-fsm";
  import { getContext, createEventDispatcher, onMount } from "svelte";
  import { flip } from "svelte/animate";
  import SuperPopover from "../SuperPopover/SuperPopover.svelte";
  import CellSkeleton from "./CellSkeleton.svelte";
  import SuperList from "../SuperList/SuperList.svelte";

  import "./CellCommon.css";
  import { writable } from "svelte/store";

  const dispatch = createEventDispatcher();
  const { API, QueryUtils, fetchData, processStringSync, memo } =
    getContext("sdk");

  export let cellOptions;
  export let value;
  export let fieldSchema;
  export let multi = false;
  export let autofocus;

  let anchor;
  let editor;
  let options = [];
  let optionColors = {};
  let optionIcons = {};
  let optionLabels = {};
  let filteredOptions = [];
  let focusedOptionIdx = -1;
  let picker;
  let inactive = true;

  let colorsArray = [
    "hsla(0, 90%, 75%, 0.3)",
    "hsla(25, 90%, 75%, 0.3)",
    "hsla(50, 80%, 75%, 0.3)",
    "hsla(75, 80%, 75%, 0.3)",
    "hsla(100, 80%, 75%, 0.3)",
    "hsla(125, 90%, 75%, 0.3)",
    "hsla(150, 90%, 75%, 0.3)",
    "hsla(175, 90%, 75%, 0.3)",
    "hsla(200, 90%, 75%, 0.3)",
    "hsla(225, 90%, 75%, 0.3)",
    "hsla(250, 90%, 75%, 0.3)",
    "hsla(275, 90%, 75%, 0.3)",
    "hsla(300, 90%, 75%, 0.3)",
    "hsla(325, 90%, 75%, 0.3)",
    "hsla(350, 90%, 75%, 0.3)",
  ];

  let timer;
  let originalValue = JSON.stringify(
    Array.isArray(value) ? value : value ? [value] : []
  );

  $: ({
    optionsSource,
    labelColumn,
    valueColumn,
    customOptions,
    controlType,
    useOptionColors,
  } = cellOptions);

  // Handle Options from Data Source
  const dataSourceStore = memo(cellOptions?.datasource ?? {});
  $: dataSourceStore.set(cellOptions.datasource);
  $: fetch =
    optionsSource == "data" ? createFetch($dataSourceStore) : writable({});
  $: optionsSource == "data" && $fetch
    ? cellState.syncFetch($fetch)
    : optionsSource == "custom"
      ? cellState.loadCustomOptions(customOptions)
      : cellState.loadSchemaOptions();

  // React to property changes
  $: cellState.refresh(optionsSource);

  // We always keep an internal value as an array
  $: localValue = Array.isArray(value) ? value : value ? [value] : [];
  $: isDirty = inEdit && originalValue !== JSON.stringify(localValue);
  $: columns = cellOptions.optionsArrangement || 1;
  $: inEdit = $cellState == "Editing";
  $: inline = cellOptions.role == "inlineInput";
  $: simpleView = cellOptions.optionsViewMode != "pills";

  export let cellState = fsm("View", {
    "*": {
      goTo(state) {
        return state;
      },
      refresh() {
        optionsSource == "data" && $fetch
          ? this.syncFetch($fetch)
          : optionsSource == "custom"
            ? this.loadCustomOptions(customOptions)
            : optionsSource == "schema"
              ? cellState.loadSchemaOptions()
              : () => {};
      },
      loadSchemaOptions() {
        options = fieldSchema?.constraints?.inclusion || [];
        optionColors = fieldSchema?.optionColors || {};
        filteredOptions = options;
      },
      loadDataOptions(rows) {
        if (rows && rows.length) {
          options = rows.map((x) => x[valueColumn]);
          rows.forEach((row, idx) => {
            optionColors[row[valueColumn]] = cellOptions.colorTemplate
              ? processStringSync(cellOptions.colorTemplate, { row })
              : colorsArray[idx % colorsArray.length];
            optionIcons[row[valueColumn]] = cellOptions.iconTemplate
              ? processStringSync(cellOptions.iconTemplate, { row })
              : null;
            optionLabels[row[valueColumn]] = labelColumn
              ? row[labelColumn]
              : row[valueColumn];
          });
        }
        filteredOptions = options;
      },
      loadCustomOptions() {
        if (customOptions?.length) {
          options = [];
          options = customOptions?.map((x) => x.value || x);
          options.forEach((e, idx) => {
            optionLabels[e.value || e] = e.label || e;
            optionColors[e.value || e] = colorsArray[idx % 15];
          });
        }
        filteredOptions = options;
      },
    },
    Loading: {
      _enter() {},
      syncFetch(fetch) {
        if (fetch?.loaded) {
          this.fetchOptions(fetch?.loaded);
          if (cellOptions.initialState) return cellOptions.initialState;
          else return "Editing";
        }
      },
    },
    View: {
      _enter() {},
      syncFetch(fetch) {
        if (optionsSource == "data" && fetch?.loaded)
          this.loadDataOptions($fetch?.rows);
      },
      focus() {
        if (!cellOptions.readonly && !cellOptions.disabled) {
          return "Editing";
        }
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
        if (!cellOptions.autocomplete) anchor?.focus();
        originalValue = JSON.stringify(
          Array.isArray(value) ? value : value ? [value] : []
        );
        if (cellOptions.controlType == "select") editorState.open();
        dispatch("enteredit");
      },
      _exit() {
        editorState.close();
        dispatch("exitedit");
      },
      handleKeyboard(e) {},
      focusout(e) {
        if (anchor?.matches(":focus-within") || !inactive) {
          return;
        }

        editorState.close();
        this.submit();
        dispatch("focusout");
        return "View";
      },
      submit() {
        if (isDirty && !cellOptions.debounce) {
          if (multi) dispatch("change", localValue);
          else dispatch("change", localValue[0]);
        }
      },
      cancel() {
        return "View";
      },
    },
  });

  let editorState = fsm("Closed", {
    "*": {
      close() {
        editor?.focus();
        return "Closed";
      },
      refocus() {
        editor?.focus();
      },
      toggleOption(idx) {
        if (cellOptions.disabled || cellOptions.readonly) return;
        let option = options[idx];
        let pos = localValue.indexOf(option);

        if (multi && pos > -1) {
          localValue.splice(pos, 1);
          localValue = [...localValue];
        } else if (multi) {
          localValue = [...localValue, option];
        } else {
          localValue = [option];
        }

        if (cellOptions.debounce) {
          clearTimeout(timer);
          timer = setTimeout(() => {
            dispatch("change", multi ? localValue : localValue[0]);
          }, cellOptions.debounce ?? 0);
        }

        if (cellOptions.autocomplete) {
          if (multi) {
            editor.value = "";
            this.filterOptions();
          }
        }
        if (!multi) {
          this.close.debounce(30);
        }
      },
    },
    Open: {
      _enter() {
        focusedOptionIdx = -1;
        this.refocus.debounce(10);
      },
      _exit() {
        editor?.focus();
      },
      filterOptions(e) {
        if (e && e.target.value != "") {
          filteredOptions = options.filter((x) =>
            x?.startsWith(e.target.value)
          );
        } else cellState.fetchOptions();
      },
      toggle() {
        editor?.focus();
        return "Closed";
      },
      handleKeyboard(e) {
        if (e.keyCode == 32) {
          if (focusedOptionIdx > -1) {
            this.toggleOption(focusedOptionIdx, e.preventDefault());
            if (!multi) this.close(e.preventDefault());
          } else if (!cellOptions.autocomplete) {
            this.close(e.preventDefault());
          }
        }

        if (!cellOptions.autocomplete) {
          if (e.key == "Backspace" || e.key == "Delete") {
            e.stopPropagation();
            localValue = [];
            dispatch("change", localValue);
          }
        }

        if (e.key == "Escape") {
          this.cancel();
        }

        if (e.key == "Enter") {
          if (multi) {
            this.toggleOption(focusedOptionIdx, e.preventDefault());
            this.close();
          } else {
            this.toggleOption(focusedOptionIdx);
          }
        }

        if (e.key == "ArrowDown")
          this.highlightNext(e.preventDefault(), e.stopPropagation());
        if (e.key == "ArrowUp")
          this.highlightPrevious(e.preventDefault(), e.stopPropagation());
        if (e.key == "ArrowLeft")
          this.highlightLeft(e.preventDefault(), e.stopPropagation());
        if (e.key == "ArrowRight")
          this.highlightRight(e.preventDefault(), e.stopPropagation());
        if (e.key == "Escape") this.close(e.stopPropagation());
      },
      highlightNext() {
        if (cellOptions.coltrolType == "select") {
          focusedOptionIdx = focusedOptionIdx + 1;
        } else {
          if (focusedOptionIdx + columns < options.length) {
            focusedOptionIdx =
              focusedOptionIdx == -1 ? 0 : focusedOptionIdx + columns;
          } else {
            focusedOptionIdx = focusedOptionIdx % columns;
          }
        }
        if (focusedOptionIdx > options.length - 1) focusedOptionIdx = 0;
      },
      highlightPrevious() {
        let rows = Math.ceil(options.length / columns);

        if (cellOptions.coltrolType == "select") {
          focusedOptionIdx = focusedOptionIdx - 1;
        } else {
          if (focusedOptionIdx - columns > -1) {
            focusedOptionIdx = focusedOptionIdx - columns;
          } else {
            focusedOptionIdx =
              (rows - 1) * columns + focusedOptionIdx < options.length
                ? (rows - 1) * columns + focusedOptionIdx
                : (rows - 2) * columns + focusedOptionIdx;
          }
        }

        if (focusedOptionIdx < 0) focusedOptionIdx = options.length - 1;
      },
      highlightRight() {
        if (cellOptions.coltrolType != "select") {
          if ((focusedOptionIdx + 1) % columns == 0)
            focusedOptionIdx = focusedOptionIdx - columns + 1;
          else
            focusedOptionIdx =
              focusedOptionIdx + 1 == options.length
                ? options.length - 1
                : (focusedOptionIdx += 1);
        }
      },
      highlightLeft() {
        if (cellOptions.coltrolType != "select") {
          if (focusedOptionIdx % columns == 0)
            focusedOptionIdx =
              focusedOptionIdx + columns - 1 > options.length
                ? options.length - 1
                : focusedOptionIdx + columns - 1;
          else focusedOptionIdx = focusedOptionIdx - 1;
        }
      },
    },
    Closed: {
      toggle() {
        return "Open";
      },
      open() {
        return "Open";
      },
      filterOptions(e) {
        this.open();
        this.filterOptions(e);
      },
      handleKeyboard(e) {
        if (!cellOptions.autocomplete) {
          if (e.keyCode == 32) {
            e.preventDefault();
            e.stopPropagation();
            this.toggle();
          }

          if (e.key == "Backspace" || e.key == "Delete") {
            e.stopPropagation();
            localValue = [];
            dispatch("change", localValue);
          }
        }

        if (e.key == "ArrowDown") editorState.open();
      },
    },
  });

  const createFetch = (datasource) => {
    return fetchData({
      API,
      datasource,
      options: {
        query: QueryUtils.buildQuery(cellOptions.filter),
        sortColumn: cellOptions.sortColumn,
        sortOrder: cellOptions.sortOrder,
        limit: cellOptions.limit,
      },
    });
  };

  const getOptionColor = (value) => {
    let color;
    if (useOptionColors)
      color = optionColors[value] ?? colorsArray[getRandom(0, 15)];

    if (
      cellOptions.controlType == "select" &&
      cellOptions.optionsViewMode == "pills" &&
      !color
    )
      color = "var(--spectrum-global-color-gray-300)";

    return color;
  };

  const getOptionLabel = (value) => {
    return optionLabels[value] || value;
  };

  const getOptionIcon = (value) => {
    return cellOptions.optionsIcon
      ? cellOptions.optionsIcon
      : optionIcons[value];
  };

  const focus = (node) => {
    node?.focus();
  };
  function getRandom(min, max) {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled);
  }

  onMount(() => {
    if (autofocus)
      setTimeout(() => {
        cellState.focus();
        editor?.focus();
      }, 30);
  });
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div
  bind:this={anchor}
  tabindex={cellOptions?.disabled ? "-1" : "0"}
  class="superCell"
  class:inEdit
  class:isDirty={isDirty && cellOptions.showDirty}
  class:disabled={cellOptions.disabled}
  class:readonly={cellOptions.readonly}
  class:error={cellOptions.error}
  class:focused={inEdit}
  class:inline
  class:tableCell={cellOptions.role == "tableCell"}
  class:formInput={cellOptions.role == "formInput"}
  class:large={cellOptions.controlType != "select"}
  style:color={cellOptions.color}
  style:background={inEdit && !inline
    ? "var(--spectrum-global-color-gray-50"
    : cellOptions.background}
  style:font-weight={cellOptions.fontWeight}
  on:focusin={cellState.focus}
  on:focusout={cellState.focusout}
  on:keydown={editorState.handleKeyboard}
>
  {#key useOptionColors}
    {#if $cellState == "Loading"}
      <CellSkeleton>Initializing ..</CellSkeleton>
    {:else}
      {#if cellOptions.icon && controlType == "select"}
        <i class={cellOptions.icon + " frontIcon"}></i>
      {/if}

      {#if controlType == "list"}
        <SuperList
          items={localValue}
          itemsColors={optionColors}
          showColors={cellOptions.useOptionColors}
          createNew={cellOptions.createNew}
          itemButtons={cellOptions.itemButtons}
          numbering={cellOptions.numbering}
          reorderOnly={cellOptions.reorderOnly}
          placeholder={cellOptions.placeholder}
          {editorState}
          {cellState}
          bind:inactive
          on:togglePicker={editorState.toggle}
          on:change={(e) => {
            localValue = [...e.detail];
            anchor?.focus();
          }}
        />
      {:else if controlType == "checkbox" || controlType == "radio"}
        <div
          class="radios"
          class:column={cellOptions.direction == "column"}
          on:mouseleave={() => (focusedOptionIdx = -1)}
        >
          {#each options as option, idx (idx)}
            {@const color = getOptionColor(option)}
            {@const label = getOptionLabel(option)}
            {@const icon = getOptionIcon(option)}
            {@const selected = localValue?.includes(option)}
            <div
              class="radio"
              class:selected
              class:focused={focusedOptionIdx === idx}
              on:mousedown={(e) => editorState.toggleOption(idx)}
              on:mouseenter={() => (focusedOptionIdx = idx)}
            >
              {#if icon}
                <i class={icon} style:color> </i>
              {/if}
              <div
                class="loope"
                class:round={controlType == "radio"}
                style:background-color={color
                  ? color
                  : "var(--spectrum-global-color-gray-100)"}
              >
                {#if selected}
                  {#if controlType == "checkbox"}
                    <i class="ri-check-line" />
                  {:else}
                    <div class="dot" />
                  {/if}
                {/if}
              </div>
              {label}
            </div>
          {/each}
        </div>
      {:else if controlType == "switch"}
        <div
          class="radios"
          class:column={cellOptions.direction == "column"}
          on:mouseleave={() => (focusedOptionIdx = -1)}
        >
          {#each options as option, idx (idx)}
            {@const color = getOptionColor(option)}
            {@const label = getOptionLabel(option)}
            {@const selected = localValue.includes(option)}
            <div
              class="radio"
              class:selected
              class:focused={focusedOptionIdx === idx}
              style:max-height={"1.75rem"}
              on:click={(e) =>
                editorState.toggleOption(idx, e.stopPropagation())}
              on:mouseenter={() => (focusedOptionIdx = idx)}
            >
              <div
                class="spectrum-Switch spectrum-Switch--emphasized"
                style:--spectrum-switch-m-emphasized-handle-border-color-selected={color
                  ? color
                  : "var(--spectrum-global-color-blue-500)"}
                style:--spectrum-switch-m-emphasized-track-color-selected={selected &&
                color
                  ? color
                  : "var(--spectrum-global-color-blue-500)"}
                style:--spectrum-switch-m-emphasized-track-color-selected-hover={color
                  ? color
                  : "var(--spectrum-global-color-blue-600)"}
              >
                <input
                  checked={localValue.includes(option)}
                  type="checkbox"
                  class="spectrum-Switch-input"
                  id={idx}
                />
                <span class="spectrum-Switch-switch" />
                <label class="spectrum-Switch-label" class:selected for={idx}
                  >{label}</label
                >
              </div>
            </div>
          {/each}
        </div>
      {:else if inEdit && cellOptions.autocomplete}
        {#if multi}
          {#if localValue.length > 0}
            <div
              class="editor"
              style:width={"auto"}
              style:padding-left={cellOptions.icon
                ? "32px"
                : cellOptions.padding}
            >
              <div
                class="items"
                class:simpleView
                style:justify-content={cellOptions.align ?? "flex-start"}
              >
                {#each localValue as val (val)}
                  {@const color = getOptionColor(val)}
                  {@const label = getOptionLabel(val)}
                  <div
                    class="item"
                    animate:flip={{ duration: 130 }}
                    style:background-color={!simpleView ? color : "unset"}
                    style:border={getOptionColor(val) || simpleView
                      ? undefined
                      : "1px solid var(--spectrum-global-color-gray-300)"}
                  >
                    {#if simpleView && color}
                      <div class="loope" style:background-color={color} />
                    {/if}
                    <span> {label} </span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        {/if}

        <input
          tabindex="0"
          bind:this={editor}
          class="editor"
          class:placeholder={localValue == []}
          style:padding-left={cellOptions.icon && !localValue?.length
            ? "32px"
            : cellOptions.padding}
          style:padding-right={cellOptions.padding}
          style:padding-top={0}
          style:padding-bottom={0}
          style:border={"none"}
          use:focus
          on:focusout={cellState.focusout}
          value={multi ? "" : (localValue[0] ?? "")}
          on:input={editorState.filterOptions}
          on:keydown={editorState.handleKeyboard}
          placeholder={cellOptions.placeholder ?? "Enter..."}
        />
        <div
          id="btn_toggle"
          class="actionIcon"
          on:click|stopPropagation={editorState.toggle}
        >
          <i class="ri-arrow-down-s-line"></i>
        </div>
      {:else}
        <div
          class="value"
          class:placeholder={localValue?.length < 1 && !inEdit}
          style:padding-left={cellOptions.icon ? "32px" : cellOptions.padding}
          style:padding-right={cellOptions.padding}
          on:mousedown={inEdit ? editorState.toggle : () => {}}
        >
          <div
            class="items"
            class:simpleView
            style:justify-content={cellOptions.align ?? "flex-start"}
          >
            {#if localValue.length < 1}
              {cellOptions.placeholder ?? ""}
            {:else if localValue.length > 0}
              {#each localValue as val (val)}
                {@const color = getOptionColor(val)}
                {@const label = getOptionLabel(val)}
                {@const icon = getOptionIcon(val)}
                <div
                  class="item"
                  animate:flip={{ duration: 130 }}
                  style:background-color={!simpleView ? color : "unset"}
                  style:border={color || simpleView
                    ? "unset"
                    : "1px solid var(--spectrum-global-color-gray-300)"}
                >
                  {#if color && !icon && simpleView}
                    <div
                      class="loope small"
                      style:background-color={color}
                    ></div>
                  {/if}
                  {#if icon}
                    <i
                      class={icon}
                      style:color={simpleView
                        ? color
                        : "var(--spectrum-global-color-gray-800)"}
                    />
                  {/if}
                  <span> {label} </span>
                </div>
              {/each}
            {/if}
          </div>
          {#if cellOptions.role != "tableCell" && !cellOptions.readonly}
            <i
              class="ri-arrow-down-s-line"
              style="font-size: 18px; margin-left: 8px;"
            ></i>
          {/if}
        </div>
      {/if}
    {/if}
  {/key}
</div>
<!-- svelte-ignore a11y-no-static-element-interactions -->
{#if inEdit && (controlType == "select" || controlType == "list")}
  <SuperPopover
    {anchor}
    useAnchorWidth
    maxHeight={400}
    open={$editorState == "Open"}
    on:close={editorState.close}
  >
    <div
      bind:this={picker}
      class="options"
      on:wheel={(e) => e.stopPropagation()}
      on:mouseleave={() => (focusedOptionIdx = -1)}
    >
      {#if filteredOptions?.length < 1}
        <div class="option">
          <i class="ri-close-line" />
          No Available Options
        </div>
      {:else}
        {#each filteredOptions as option, idx (idx)}
          {@const color = getOptionColor(option)}
          {@const label = getOptionLabel(option)}
          {@const icon = getOptionIcon(option)}
          {@const selected = localValue?.includes(option)}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div
            class="option"
            style:display={cellOptions.controlType == "list" && selected
              ? "none"
              : "flex"}
            class:focused={focusedOptionIdx === idx}
            on:mousedown|preventDefault={(e) => editorState.toggleOption(idx)}
            on:mouseenter={() => (focusedOptionIdx = idx)}
          >
            {#if multi || (color && !icon)}
              <div class="loope small" style:background-color={color}>
                {#if selected}
                  <i class="ri-check-line" />
                {/if}
              </div>
            {/if}
            {#if icon}
              <i class={icon} style:color />
            {/if}
            <span>{label}</span>
          </div>
        {/each}
      {/if}
    </div>
  </SuperPopover>
{/if}

<style>
  .options {
    flex: 1 0 auto;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;
    overflow-y: auto;
    color: var(--spectrum-global-color-gray-700);
  }

  .option {
    min-height: 1.75rem;
    line-height: 20px;
    display: flex;
    gap: 0.5rem;
    flex-direction: row;
    align-items: center;
    cursor: pointer;
    padding: 0 0.35rem;
  }

  .radios {
    flex: auto;
    display: flex;
    flex-wrap: wrap;
    justify-items: flex-start;
    gap: 0.25rem;
    color: var(--spectrum-global-color-gray-700);
  }
  .radios.column {
    gap: 0rem;
    flex-direction: column;
  }
  .radio {
    min-height: 1.75rem;
    display: flex;
    gap: 0.5rem;
    flex-direction: row;
    align-items: center;
    cursor: pointer;
    padding: 0 0.5rem;
  }
  .radio:hover {
    background-color: var(--spectrum-global-color-gray-100);
  }
  .option > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .selected {
    color: var(--spectrum-global-color-gray-900);
  }
  .loope {
    height: 14px;
    width: 14px;
    line-height: 12px;
    border-radius: 2px;
    display: grid;
    align-items: center;
    justify-items: center;
    font-size: 12px;
    font-weight: 700;
    border: 1px solid var(--spectrum-global-color-gray-500);
  }
  .loope.round {
    border-radius: 50%;
  }
  .loope.small {
    min-height: 12px;
    min-width: 12px;
    line-height: 10px;
    font-size: 10px;
    font-weight: 700;
  }
  .dot {
    border-radius: 50%;
    height: 6px;
    width: 6px;
    background-color: var(--spectrum-global-color-gray-800);
  }
  .option:hover,
  .option.focused {
    background-color: var(--spectrum-global-color-gray-200);
    border-radius: 4px;
  }

  .spectrum-Switch-label {
    color: var(--spectrum-global-color-gray-700);
  }

  .spectrum-Switch-label.selected {
    color: var(--spectrum-global-color-gray-900);
  }

  .search {
    display: flex;
    justify-content: stretch;
    align-items: center;
    position: relative;
    margin-bottom: 8px;
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
  .icon {
    position: absolute;
    left: 0.5rem;
  }
  input {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    outline: none;
    background: none;
    color: inherit;
    border: 1px solid var(--spectrum-global-color-gray-300);
    cursor: text;
    overflow: hidden;
    min-width: unset;
    padding: 0.3rem 0.5rem 0.3rem 2rem;
  }

  input:focus {
    border: 1px solid var(--spectrum-global-color-blue-500);
  }
</style>
