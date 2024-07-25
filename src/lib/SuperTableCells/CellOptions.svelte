<script>
  import fsm from "svelte-fsm";
  import { getContext, createEventDispatcher } from "svelte";
  import { flip } from "svelte/animate";
  import SuperPopover from "../SuperPopover/SuperPopover.svelte";
  import CellSkeleton from "./CellSkeleton.svelte";

  import "./CellCommon.css";

  const dispatch = createEventDispatcher();
  const { API, QueryUtils, fetchData, processStringSync, memo } =
    getContext("sdk");

  export let cellOptions;
  export let value;
  export let fieldSchema;
  export let multi = false;

  let originalValue = value;
  let timer;

  // We always keep an internal value as an array
  $: localValue = Array.isArray(value) ? value : value ? [value] : [];

  let anchor = null;
  let editor;
  let options = [];
  let optionColors = {};
  let optionIcons = {};
  let optionLabels = {};
  let filteredOptions = [];
  let focusedOptionIdx = -1;
  let picker;
  let fetch;

  let colorsArray = [
    "hsla(0, 90%, 75%, 0.3)",
    "hsla(50, 80%, 75%, 0.3)",
    "hsla(120, 90%, 75%, 0.3)",
    "hsla(200, 90%, 75%, 0.3)",
    "hsla(240, 90%, 75%, 0.3)",
    "hsla(320, 90%, 75%, 0.3)",
  ];

  export let cellState = fsm("View", {
    "*": {
      goTo(state) {
        return state;
      },
      loadOptions() {
        if (
          !cellOptions.fullTable &&
          cellOptions.optionsSource == "data" &&
          !fetch
        ) {
          fetch = createFetch(cellOptions.datasource);
        }
      },
      fetchOptions() {
        if (cellOptions.fullTable) {
          return;
        } else if (cellOptions.optionsSource == "data" && $fetch?.loaded) {
          options = $fetch.rows.map((x) => x[cellOptions.valueColumn]);
          $fetch.rows.forEach((row) => {
            optionColors[row[cellOptions.valueColumn]] =
              cellOptions.colorTemplate
                ? processStringSync(cellOptions.colorTemplate, { row })
                : null;
            optionIcons[row[cellOptions.valueColumn]] = cellOptions.iconTemplate
              ? processStringSync(cellOptions.iconTemplate, { row })
              : null;
            optionLabels[row[cellOptions.valueColumn]] = cellOptions.labelColumn
              ? row[cellOptions.labelColumn]
              : row[cellOptions.valueColumn];
          });
        } else if (cellOptions.optionsSource == "data" && !$fetch?.loaded) {
          options = [];
        } else if (cellOptions.optionsSource == "custom") {
          options = [];
          if (cellOptions.customOptions.length) {
            options = cellOptions.customOptions.map((x) => x.value || x);
            cellOptions.customOptions.forEach((e) => {
              optionLabels[e.value || e] = e.label || e;
            });
          }
        } else {
          options = fieldSchema?.constraints?.inclusion || [];
          optionColors = fieldSchema?.optionColors || {};
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
        if (fetch?.loaded) this.fetchOptions(fetch?.loaded);
      },
      focus() {
        if (!cellOptions.readonly && !cellOptions.disabled) {
          if (
            cellOptions.optionsSource == "data" &&
            !fetch &&
            !cellOptions.fullTable
          ) {
            this.loadOptions();
            return "Loading";
          }

          if (
            cellOptions.optionsSource == "data" &&
            cellOptions.cache == false
          ) {
            fetch = undefined;
            this.loadOptions();
            return "Loading";
          }
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
        dispatch("enteredit");
        if (cellOptions.autocomplete || cellOptions.role != "formInput") return;
        if (cellOptions.controlType == "select") editorState.open();
      },
      _exit() {
        editorState.close();
        dispatch("exitedit");
      },
      change() {
        if (cellOptions.role == "inline") dispatch("change", localValue);
      },
      handleKeyboard(e) {},
      focusout(e) {
        if (
          picker?.contains(
            e.explicitOriginalTarget || picker?.contains(e.relatedTarget)
          )
        )
          return;
        if (anchor?.contains(e.explicitOriginalTarget) && !e.relatedTarget)
          return;

        if (
          /** 
          !arrayEquals(originalValue, localValue) &&
          originalValue != localValue[0] &&
          */
          !cellOptions.debounce
        ) {
          if (multi) dispatch("change", localValue);
          else dispatch("change", localValue[0]);
        }

        dispatch("focusout");
        return "View";
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
        if (!cellOptions.addNew && idx < 0) return;

        let option = options[idx] ?? searchTerm;

        if (multi && localValue.includes(option)) {
          localValue.splice(localValue.indexOf(option), 1);
          localValue = localValue;
        } else if (multi) {
          localValue = [...localValue, option];
        } else {
          localValue = [option];
        }

        if (cellOptions.role == "inline" || cellOptions.debounce) {
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
        this.refocus.debounce(10);
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

  $: columns = cellOptions.optionsArrangement || 1;
  $: inEdit = $cellState == "Editing";
  $: simpleView = cellOptions.optionsViewMode != "pills";
  $: if (cellOptions.prefetch || cellOptions.controlType != "select") {
    cellState.loadOptions("View");
  }
  $: cellState.fetchOptions(cellOptions);
  $: cellState.syncFetch($fetch);

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
    if (cellOptions.useOptionColors) color = optionColors[value];

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

  const arrayEquals = (a, b) => {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((val, index) => val === b[index])
    );
  };

  const focus = (node) => {
    node?.focus();
  };
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div
  bind:this={anchor}
  class="superCell"
  class:inEdit
  class:disabled={cellOptions.disabled}
  class:readonly={cellOptions.readonly}
  class:error={cellOptions.error}
  class:focused={$cellState == "Editing"}
  class:inline={cellOptions.role == "inline"}
  class:tableCell={cellOptions.role == "tableCell"}
  class:formInput={cellOptions.role == "formInput"}
  class:large={cellOptions.controlType != "select"}
  style:color={cellOptions.color}
  style:background={inEdit
    ? "var(--spectrum-global-color-gray-50"
    : cellOptions.background}
  style:font-weight={cellOptions.fontWeight}
>
  {#if $cellState == "Loading"}
    <CellSkeleton>Initializing ..</CellSkeleton>
  {:else}
    {#if cellOptions.icon && cellOptions.controlType == "select"}
      <i class={cellOptions.icon + " frontIcon"}></i>
    {/if}

    {#if cellOptions.controlType == "checkbox"}
      <div
        class="options checkboxes editor"
        tabindex="0"
        bind:this={editor}
        on:focusout={cellState.focusout}
        on:focus={cellState.focus}
        style:grid-template-columns={"repeat( " + columns + " , 1fr"}
        on:mouseleave={() => (focusedOptionIdx = -1)}
      >
        {#each options as option, idx (idx)}
          {@const color = getOptionColor(option)}
          {@const label = getOptionLabel(option)}
          {@const icon = getOptionIcon(option)}
          {@const selected = localValue?.includes(option)}
          <div
            class="option"
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
              style:background-color={color
                ? color
                : "var(--spectrum-global-color-gray-100)"}
            >
              {#if selected}
                <i class="ri-check-line" />
              {/if}
            </div>
            {label}
          </div>
        {/each}
      </div>
    {:else if cellOptions.controlType == "radio"}
      <div
        class="options checkboxes editor"
        tabindex="0"
        bind:this={editor}
        on:focusout={cellState.focusout}
        on:focus={cellState.focus}
        style:grid-template-columns={"repeat( " + columns + " , 1fr"}
        on:mouseleave={() => (focusedOptionIdx = -1)}
      >
        {#each options as option, idx (idx)}
          {@const color = getOptionColor(option)}
          {@const label = getOptionLabel(option)}
          {@const icon = getOptionIcon(option)}
          {@const selected = localValue?.includes(option)}
          <div
            class="option"
            class:selected
            class:focused={focusedOptionIdx === idx}
            on:click={(e) => editorState.toggleOption(idx)}
            on:mouseenter={() =>
              (focusedOptionIdx = cellOptions.disabled ? null : idx)}
          >
            {#if icon}
              <i class={icon} style:color> </i>
            {/if}

            <div
              class="loope round"
              style:background-color={color
                ? color
                : "var(--spectrum-global-color-gray-100)"}
            >
              {#if selected}
                <div class="dot" />
              {/if}
            </div>

            {label}
          </div>
        {/each}
      </div>
    {:else if cellOptions.controlType == "switch"}
      <div
        class="options checkboxes editor"
        bind:this={editor}
        tabindex="0"
        on:focusout={cellState.focusout}
        on:focus={cellState.focus}
        on:mouseleave={() => (focusedOptionIdx = -1)}
        style:grid-template-columns={"repeat( " + columns + " , 1fr"}
      >
        {#each options as option, idx (idx)}
          {@const color = getOptionColor(option)}
          {@const label = getOptionLabel(option)}
          {@const selected = localValue.includes(option)}
          <div
            class="option"
            class:focused={focusedOptionIdx === idx}
            style:max-height={"1.75rem"}
            on:click={(e) => editorState.toggleOption(idx, e.stopPropagation())}
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
    {:else if $cellState == "Editing"}
      {#if cellOptions.autocomplete}
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
          value={multi ? "" : localValue[0] ?? ""}
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
          class="editor"
          tabindex="0"
          bind:this={editor}
          class:placeholder={localValue?.length < 1}
          style:padding-left={cellOptions.icon ? "32px" : cellOptions.padding}
          style:padding-right={cellOptions.padding}
          style:cursor={"pointer"}
          on:click={editorState.toggle}
          on:keydown={editorState.handleKeyboard}
          on:focusout={cellState.focusout}
          use:focus
        >
          <div
            class="items"
            class:simpleView
            style:justify-content={cellOptions.align ?? "flex-start"}
          >
            {#if localValue.length < 1}
              {cellOptions?.placeholder}
            {:else if localValue.length > 0}
              {#each localValue as val (val)}
                {@const color = getOptionColor(val)}
                {@const label = getOptionLabel(val)}
                {@const icon = getOptionIcon(val)}
                <div
                  class="item"
                  animate:flip={{ duration: 130 }}
                  style:background-color={!simpleView ? color : "unset"}
                  style:border={getOptionColor(val) || simpleView
                    ? undefined
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
          <i class="ri-arrow-down-s-line" style:font-size={"18px"}></i>
        </div>
      {/if}
    {:else}
      <div
        class="value"
        tabindex={cellOptions.disabled || cellOptions.readonly ? "-1" : "0"}
        on:focusin={cellState.focus}
        class:placeholder={localValue?.length < 1}
        style:padding-left={cellOptions.icon ? "32px" : cellOptions.padding}
        style:padding-right={cellOptions.padding}
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
                  <div class="loope small" style:background-color={color}></div>
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
        {#if cellOptions.role != "tableCell"}
          <i class="ri-arrow-down-s-line" style="font-size: 18px;"></i>
        {/if}
      </div>
    {/if}
  {/if}
</div>

{#if cellOptions.controlType == "select" && $cellState == "Editing"}
  <SuperPopover
    {anchor}
    useAnchorWidth
    dismissible={false}
    open={$editorState == "Open"}
  >
    <!-- svelte-ignore a11y-no-static-element-interactions -->
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
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div
            class="option"
            class:focused={focusedOptionIdx === idx}
            on:click|stopPropagation={(e) => editorState.toggleOption(idx)}
            on:mouseenter={() => (focusedOptionIdx = idx)}
          >
            {#if multi || (color && !icon)}
              <div class="loope small" style:background-color={color}>
                {#if localValue?.includes(option)}
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
    padding: 0.25rem;
  }

  .options.checkboxes {
    display: grid;
    padding: 0.25rem 0.25rem;
  }
  .option {
    line-height: 18px;
    padding: 0.25rem;
    display: flex;
    gap: 0.5rem;
    flex-direction: row;
    align-items: center;
    cursor: pointer;
    color: var(--spectrum-global-color-gray-700);
  }

  .option > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .option.selected {
    color: var(--spectrum-global-color-gray-900);
  }

  .loope {
    min-height: 14px;
    min-width: 14px;
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
