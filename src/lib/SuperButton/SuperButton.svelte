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
  export let textColor = "var(--spectrum-global-color-gray-700)";
  export let emphasized;
  export let quiet;
  export let selected;
  export let disabled;
  export let onClick;
  export let context;
  export let type;

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
  class:cta={type == "cta"}
  class:warning={type == "warning"}
  class:secondary={type == "secondary"}
  class:spectrum-ActionButton--emphasized={emphasized}
  class:spectrum-ActionButton--quiet={quiet}
  class:full-width={fullWidth}
  class:menu-item={menuItem}
  class:menu-item-right={menuItem && menuAlign == "right"}
  class="spectrum-ActionButton spectrum-ActionButton--size{size}"
  style:--iconColor={disabled
    ? "var(--spectrum-global-color-gray-400)"
    : useColor}
  disabled={disabled || working}
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
    background-color: var(--spectrum-global-color-gray-800);
    border-color: var(--spectrum-global-color-gray-800);
    color: var(--spectrum-global-color-gray-50);
    font-weight: 600;
  }

  .warning {
    color: var(--spectrum-global-color-red-500);
  }

  .secondary {
    background-color: var(--spectrum-global-color-gray-300);
    border-color: var(--spectrum-global-color-gray-300);
  }
</style>
