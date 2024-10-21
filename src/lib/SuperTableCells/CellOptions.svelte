<script>
  import fsm from "svelte-fsm";
  import { getContext, createEventDispatcher, onMount } from "svelte";
  import { flip } from "svelte/animate";
  import SuperPopover from "../SuperPopover/SuperPopover.svelte";
  import CellSkeleton from "./CellSkeleton.svelte";
  const dispatch = createEventDispatcher();
  const { API, QueryUtils, fetchData, memo, derivedMemo } = getContext("sdk");

  export let cellOptions;
  export let value;
  export let fieldSchema;
  export let multi = true;
  export let autofocus;

  let anchor;
  let editor;
  let options = memo([]);
  let labels = {};
  let optionColors = {};
  let filteredOptions = [];
  let focusedOptionIdx = -1;
  let timer;
  let picker;

  const colors = derivedMemo(options, ($options) => {
    let obj = {};
    $options.forEach(
      (option, index) =>
        (obj[option] = optionColors[option] || colorsArray[index % 14])
    );
    return obj;
  });

  const colorsArray = [
    "hsla(0, 90%, 75%, 0.35)",
    "hsla(25, 90%, 75%, 0.35)",
    "hsla(50, 80%, 75%, 0.35)",
    "hsla(75, 80%, 75%, 0.35)",
    "hsla(100, 80%, 75%, 0.35)",
    "hsla(125, 90%, 75%, 0.35)",
    "hsla(150, 90%, 75%, 0.35)",
    "hsla(175, 90%, 75%, 0.35)",
    "hsla(200, 90%, 75%, 0.35)",
    "hsla(225, 90%, 75%, 0.35)",
    "hsla(250, 90%, 75%, 0.35)",
    "hsla(275, 90%, 75%, 0.35)",
    "hsla(300, 90%, 75%, 0.35)",
    "hsla(325, 90%, 75%, 0.35)",
    "hsla(350, 90%, 75%, 0.35)",
  ];

  let originalValue = JSON.stringify(
    Array.isArray(value) ? value : value ? [value] : []
  );

  $: ({
    autocomplete,
    optionsSource,
    labelColumn,
    valueColumn,
    customOptions,
    optionsViewMode,
    icon,
    padding,
    role,
    readonly,
    disabled,
    error,
    color,
    background,
  } = cellOptions);

  // Handle Options from Data Source
  const dataSourceStore = memo(cellOptions?.datasource ?? {});
  $: dataSourceStore.set(cellOptions.datasource);
  $: fetch = optionsSource == "data" ? createFetch($dataSourceStore) : memo({});
  $: cellState.syncFetch($fetch);

  // React to property changes
  $: cellState.refresh(
    optionsSource,
    labelColumn,
    valueColumn,
    $dataSourceStore
  );

  // We always keep an internal value as an array
  $: localValue = Array.isArray(value) ? value : value ? [value] : [];
  $: isDirty = inEdit && originalValue !== JSON.stringify(localValue);
  $: inEdit = $cellState == "Editing";
  $: pills = optionsViewMode == "pills";
  $: multi = fieldSchema.type == "array" && multi;

  export let cellState = fsm("Loading", {
    "*": {
      goTo(state) {
        return state;
      },
      refresh() {
        $options = [];
        return "Loading";
      },
      loadSchemaOptions() {
        optionColors = fieldSchema?.optionColors || {};
        $options = fieldSchema?.constraints?.inclusion || [];
      },
      loadDataOptions(rows) {
        if (rows && rows.length) {
          rows.forEach((row) => {
            $options.push(row[valueColumn]);
            labels[row[valueColumn]] =
              row[labelColumn || $fetch.definition.primaryDisplay];
          });
        }
        $options = $options;
      },
      loadCustomOptions() {
        if (customOptions?.length) {
          customOptions.forEach((row) => {
            $options.push(row.value);
            labels[row.value] = row.label;
          });
        }
        $options = $options;
      },
      clearFilters() {
        filteredOptions = $options;
      },
    },
    Loading: {
      _enter() {
        if (cellOptions.optionsSource != "data")
          this.goTo.debounce(10, cellOptions.initialState || "View");
      },
      _exit() {
        if (cellOptions.optionsSource == "custom") this.loadCustomOptions();
        else if (optionsSource == "data") () => {};
        else this.loadSchemaOptions();

        filteredOptions = $options;
      },
      syncFetch(fetch) {
        if (fetch?.loaded) {
          this.loadDataOptions(fetch?.rows);
          if (cellOptions.initialState) return cellOptions.initialState;
          else return "View";
        }
      },
    },
    View: {
      _enter() {},
      focus() {
        if (!cellOptions.readonly && !cellOptions.disabled) {
          return "Editing";
        }
      },
    },
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
        this.clearFilters();
        dispatch("exitedit");
      },
      handleKeyboard(e) {},
      focusout(e) {
        if (e.relatedTarget?.contains(picker)) return;
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
      focus() {
        editorState.toggle();
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
        let option = $options[idx];
        let pos = localValue.indexOf(option);

        if (multi && pos > -1) {
          localValue.splice(pos, 1);
          localValue = [...localValue];
        } else if (multi) {
          localValue = [...localValue, option];
        } else {
          if (localValue[0] == option) localValue.length = 0;
          else localValue[0] = option;
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
          this.close.debounce(10);
          anchor?.focus();
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
          filteredOptions = $options.filter((x) =>
            x?.startsWith(e.target.value)
          );
        } else filteredOptions = $options;
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
        if (e.key == "Escape") this.close(e.stopPropagation());
      },
      highlightNext() {
        focusedOptionIdx += 1;
        if (focusedOptionIdx > $options.length - 1) focusedOptionIdx = 0;
      },
      highlightPrevious() {
        focusedOptionIdx -= 1;
        if (focusedOptionIdx < 0) focusedOptionIdx = $options.length - 1;
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

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div
  bind:this={anchor}
  class="superCell"
  tabindex={cellOptions?.disabled ? "-1" : "0"}
  class:inEdit
  class:isDirty={isDirty && cellOptions.showDirty}
  class:disabled
  class:readonly
  class:error
  style:color
  style:background
  style:font-weight={cellOptions.fontWeight}
  class:inline={role == "inlineInput"}
  class:tableCell={role == "tableCell"}
  class:formInput={role == "formInput"}
  on:focusin={cellState.focus}
  on:focusout={cellState.focusout}
  on:keydown={editorState.handleKeyboard}
  on:mousedown={editorState.toggle}
>
  {#if $cellState == "Loading"}
    <CellSkeleton>Initializing ..</CellSkeleton>
  {:else}
    {#if icon}
      <i class={icon + " icon"} />
    {/if}
    {#if inEdit && autocomplete}
      {#if multi}
        {#if localValue.length > 0}
          <div
            class="editor"
            style:width={"auto"}
            style:padding-left={cellOptions.icon ? "32px" : cellOptions.padding}
          >
            <div
              class="items"
              class:pills
              style:justify-content={cellOptions.align ?? "flex-start"}
            >
              {#each localValue as val (val)}
                <div
                  class="item"
                  style:--option-color={$colors[val]}
                  animate:flip={{ duration: 130 }}
                >
                  {#if pills}
                    <div class="loope" />
                  {/if}
                  <span> {labels[val] || val} </span>
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
        class:with-icon={icon}
        class:placeholder={localValue?.length < 1}
        style:padding-right={padding}
      >
        {#if optionsViewMode != "text"}
          <div
            class="items"
            class:pills
            class:colorText={optionsViewMode == "colorText"}
            style:justify-content={cellOptions.align ?? "flex-start"}
          >
            {#if localValue.length < 1}
              {cellOptions.placeholder ?? ""}
            {:else}
              {#each localValue as val (val)}
                <div
                  class="item"
                  style:--option-color={$colors[val]}
                  animate:flip={{ duration: 130 }}
                >
                  {#if optionsViewMode == "colorText"}
                    <div class="loope" />
                  {/if}
                  <span> {labels[val] || val} </span>
                </div>
              {/each}
            {/if}
          </div>
        {:else}
          <span> {localValue.toString() || cellOptions.placeholder} </span>
        {/if}
        {#if (role == "tableCell" && inEdit) || role != "tableCell"}
          <i class="ri-arrow-down-s-line" style="margin-left: 8px;"></i>
        {/if}
      </div>
    {/if}
  {/if}
</div>

<!-- svelte-ignore a11y-no-static-element-interactions -->
{#if inEdit}
  <SuperPopover
    {anchor}
    useAnchorWidth
    maxHeight={400}
    open={$editorState == "Open"}
  >
    <div
      bind:this={picker}
      class="options"
      on:wheel={(e) => e.stopPropagation()}
      on:mouseleave={() => (focusedOptionIdx = -1)}
    >
      {#if filteredOptions?.length < 1}
        <div class="option">
          <span>
            <i class="ri-close-line" />
            No Options Found
          </span>
        </div>
      {:else}
        {#each filteredOptions as option, idx (idx)}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div
            class="option"
            class:focused={focusedOptionIdx === idx}
            class:selected={localValue?.includes(option)}
            style:--option-color={$colors[option]}
            on:click|preventDefault|stopPropagation={(e) =>
              editorState.toggleOption(idx)}
            on:mouseenter={() => (focusedOptionIdx = idx)}
          >
            <span>
              <div class="loope" />
              {labels[option] || option}
            </span>
            {#if localValue?.includes(option)}
              <i class="ri-checkbox-circle-fill" />
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  </SuperPopover>
{/if}

<style>
  .options {
    flex: auto;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    overflow-y: auto;
    color: var(--spectrum-global-color-gray-700);
  }

  .option {
    min-height: 1.75rem;
    display: flex;
    gap: 0.5rem;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    padding: 0 0.5rem;

    &.selected {
      color: var(--spectrum-global-color-gray-800);
      background-color: var(--spectrum-global-color-gray-75);
    }

    &.focused {
      background-color: var(--spectrum-global-color-gray-200);
      color: var(--spectrum-global-color-gray-800);
      border-radius: 4px;
    }
  }
  .option > span {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .option > i {
    font-size: 14px;
    color: var(--spectrum-global-color-green-400);
  }
  .loope {
    background-color: var(--option-color);
    min-height: 14px;
    min-width: 14px;
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
