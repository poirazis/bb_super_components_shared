<script>
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let size = "M";
  export let menuItem = false;
  export let menuAlign = "right";
  export let icon;
  export let fillOnHover;
  export let iconOnly;
  export let iconColor;
  export let hoverIcon;
  export let hoverIconColor;
  export let disabledIcon;
  export let text;
  export let quiet;
  export let selected;
  export let disabled;
  export let onClick;
  export let context;
  export let type = "primary";

  export let actionsMode;
  export let condition;
  export let onTrueCondition;
  export let onFalseCondition;
  export let loopSource;
  export let loopDelay;
  export let loopEvent;
  export let onLoopStart;
  export let onLoopEnd;

  export let fullWidth;

  export let anchor;

  $: useIcon = icon;
  $: useColor = iconColor;

  let working;

  async function handleClick() {
    working = true;
    useIcon = disabledIcon ? disabledIcon : icon;

    if (actionsMode == "loop") {
      if (onLoopStart) await onLoopStart({ iterations: loopSource?.length });
      if (Array.isArray(loopSource) && loopEvent) {
        for (var i = 0; i < loopSource.length; i++) {
          await loopEvent({ idx: i, value: loopSource[i] });
          await sleep(loopDelay);
        }
      }
      if (onLoopEnd) await onLoopEnd();
    } else if (actionsMode == "conditional") {
      if (condition == true) await onTrueCondition?.();
      else await onFalseCondition?.();
    } else if (onClick) {
      await onClick(context);
    }

    working = false;
    useIcon = hoverIcon
      ? hoverIcon
      : fillOnHover
        ? icon.replace("line", "fill")
        : icon;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
</script>

<button
  bind:this={anchor}
  on:click={() => {
    dispatch("click", anchor);
    handleClick();
  }}
  on:mouseleave={!disabled && (hoverIcon || fillOnHover || hoverIconColor)
    ? () => {
        useIcon = icon;
        useColor = iconColor;
      }
    : () => {}}
  on:mouseenter={!disabled && (hoverIcon || fillOnHover || hoverIconColor)
    ? () => {
        useIcon = hoverIcon
          ? hoverIcon
          : fillOnHover
            ? icon?.replace("line", "fill")
            : icon;
        useColor = hoverIconColor || iconColor;
      }
    : () => {}}
  class:is-selected={selected}
  class:cta={type == "cta" && !disabled}
  class:warning={type == "warning"}
  class:primary={type == "primary"}
  class:secondary={type == "secondary"}
  class:quiet
  class:full-width={fullWidth}
  class:menu-item={menuItem}
  class:menu-item-right={menuItem && menuAlign == "right"}
  class="spectrum-ActionButton spectrum-ActionButton--size{size}"
  style:--iconColor={disabled
    ? "var(--spectrum-global-color-gray-400)"
    : useColor}
  class:disabled={disabled || working}
>
  {#if !iconOnly && icon}
    <i
      style:padding-right={text && text != "" ? "0.5rem" : "0rem"}
      class={disabled && disabledIcon ? disabledIcon : useIcon}
    />
    <span class="spectrum-ActionButton-label">{text ?? ""}</span>
  {:else if iconOnly && icon}
    <i class={disabled && disabledIcon ? disabledIcon : useIcon} />
  {:else}
    <span class="spectrum-ActionButton-label">{text ?? ""}</span>
  {/if}
</button>

<style>
  .full-width {
    width: 100%;
  }
  .menu-item {
    width: 100%;
    justify-content: flex-start;
  }
  .menu-item-right {
    width: 100%;
    justify-content: flex-end !important;
  }
  i {
    color: var(--iconColor);
    transition: all 230ms ease-in-out;
  }

  .cta {
    background-color: var(--spectrum-global-color-blue-100);
    border: 1px solid var(--spectrum-global-color-blue-100);
    color: var(--spectrum-global-color-gray-800);
    font-weight: 600;

    &.quiet {
      border-color: transparent !important;
      background-color: transparent;
      color: var(--spectrum-global-color-blue-400);
    }
    &:hover,
    &:focus {
      background-color: var(--spectrum-global-color-blue-100);
      border: 1px solid var(--spectrum-global-color-blue-400);
    }
  }
  .primary {
    background-color: var(--spectrum-global-color-gray-800);
    border: 1px solid var(--spectrum-global-color-gray-800);
    color: var(--spectrum-global-color-gray-50);
    font-weight: 600;

    &.quiet {
      border-color: transparent;
      background-color: transparent;
      color: var(--spectrum-global-color-gray-800);
      &:hover {
        color: var(--spectrum-global-color-gray-50);
        background-color: var(--spectrum-global-color-gray-800);
      }
    }
  }

  .secondary {
    background-color: var(--spectrum-global-color-gray-300);
    border-color: var(--spectrum-global-color-gray-300);

    &.quiet {
      border-color: transparent;
      background-color: transparent;

      &:hover {
        background-color: var(--spectrum-global-color-gray-200);
        border-color: transparent;
      }
    }

    &:hover {
      border-color: var(--spectrum-global-color-gray-600);
    }
  }

  .warning {
    border: 1px solid var(--spectrum-global-color-red-100);
    color: var(--spectrum-global-color-red-700);
    font-weight: 600;
    &.quiet {
      border-color: transparent !important;
      background-color: transparent;
      color: var(--spectrum-global-color-red-400);

      &:hover {
        background-color: var(--spectrum-global-color-red-100);
      }
    }
    &:hover {
      border-color: var(--spectrum-global-color-red-600);
    }
  }

  .disabled {
    background-color: var(--spectrum-global-color-gray-200) !important;
    color: var(--spectrum-global-color-gray-400) !important;
  }
</style>
