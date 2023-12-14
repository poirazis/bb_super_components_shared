<script>
    /**
   * The complete set of options that can be passed to a Super Cell.
   * @typedef {Object} cellOptions
   * @property {Object} schema - The schema of the Cell ( as per Budibase Field Schema ). if Not set, the Cell will render as String
   * @property {string} mode - Can be Field / TableCell / or Unstyled
   * @property {string} state - The State of the Cell. Can be View / Edit / Disabled 
   * @property {string} placeholder - The Cell Placeholder Text
   * @property {string} align - Horizontal Alignment
   * @property {string} color - Use Font Color
   * @property {string} weight - Use Font Weight
   * @property {string} bgColor - The Background Color
   * @property {string} padding - The padding to be applied to the Cell
   * @property {boolean} hovered - To enter hovered state
   * @property {string} iconFront - The icon class name to render in from of the value
   * @property {boolean} clearValueIcon - Wether to show an in line X mark that clears the value 
   * @property {number} debounce - The debounce time in ms before the cell send the change event
  */

  import { getContext , createEventDispatcher } from "svelte";
  import fsm from "svelte-fsm"

  import CellString from "./cells/CellString.svelte";
  import CellLink from "./cells/CellLink.svelte";
  import CellDatetime from "./cells/CellDatetime.svelte";
  import CellBoolean from "./cells/CellBoolean.svelte"
  import CellAttachment from "./cells/CellAttachment.svelte";
  import CellOptions from "./cells/CellOptions.svelte";
  import CellNumber from "./cells/CellNumber.svelte";
  import CellJson from "./cells/CellJSON.svelte";

  const { processStringSync } = getContext("sdk");
  const dispatch = createEventDispatcher();

  export let value 
  export let valueTemplate
  export let fieldSchema
  export let editable
  export let initialState = "View"
  export let lockState = false
  export let isHovered
  export let multi = true

  export const focus = () => { cellState.focus() }

  /** @type {cellOptions} */
  export let cellOptions

  export let cellState = fsm( initialState , {
    "*": {
      goTo( state ) { return state }
    },
    View: { 
      focus () { 
        return editable ? "Editing" : "Focused" 
      }
    },
    Hovered: { cancel: () => { return "View" }},
    Focused: { 
      unfocus() { return lockState ? initialState : "View" },
    },
    Error: { check : "View" },
    Editing: { 
      unfocus() { return lockState ? initialState : "View" },
      lostFocus() { return lockState ? initialState : "View" },
      submit() { if ( value != originalValue ) acceptChange() ; return "View" }, 
      cancel() { value = Array.isArray(originalValue) ? [ ... originalValue ] : originalValue ; return "View" },
    }
  })

  const getCellValue = (value, template) => {
    if (!valueTemplate) {
      return value
    }
    return processStringSync(template, { value })
  }
</script>

{#if fieldSchema.type === "string" || fieldSchema.type === "longform" || fieldSchema.type === "formula"} 
  <CellString
    {cellOptions}
    {cellState}
    {fieldSchema}
    {value}
    formattedValue = { getCellValue(value, valueTemplate) }
    on:change
    on:blur
  />
{:else if fieldSchema.type === "array" || fieldSchema.type === "options"  }
  <CellOptions
    {cellState}
    {cellOptions}
    {fieldSchema}
    {value}
    multi={fieldSchema.type == "array" && multi}
    formattedValue = { getCellValue(value, valueTemplate) }
    on:change
    on:blur
  />
{:else if fieldSchema.type === "number" || fieldSchema.type == "bigint" }
  <CellNumber
    {cellState}
    {cellOptions}
    {value}
    {fieldSchema}
    formattedValue = { getCellValue(value, valueTemplate) }
    on:change
  />
{:else if fieldSchema.type === "datetime"}
  <CellDatetime
    {cellState}
    {cellOptions}
    {value}
    {fieldSchema}
    formattedValue = { getCellValue(value, valueTemplate) }
    on:change
    on:blur
  />
{:else if fieldSchema.type === "link" || fieldSchema.type === "bb_reference"  }
  <CellLink
    {cellState}
    {cellOptions}
    {value}
    {fieldSchema}
    {isHovered}
    on:change
    on:blur
  />
{:else if fieldSchema.type === "attachment"  }
  <CellAttachment
    {cellOptions}
    {cellState}
    {value}
    {fieldSchema}
    formattedValue = { getCellValue(value, valueTemplate) }
    on:change
  />
{:else if fieldSchema.type === "boolean"  }
  <CellBoolean
    {cellOptions}
    {cellState}
    {value}
    {fieldSchema}
    formattedValue = { getCellValue(value, valueTemplate) }
    on:change
  />
{:else if fieldSchema.type === "json"  }
  <CellJson
    {cellOptions}
    {cellState}
    {value}
    {fieldSchema}
    formattedValue = { getCellValue(value, valueTemplate) } 
    on:change
  />
{/if}

<style>
  :global(.superCell ) {
    min-height: 2rem;
    min-width: 80px;
    width: 100%;
    display: flex;
    align-items: center;
    position: relative;
  }
  :global(.superCell:focus ) {
    outline: none;
  }

  :global( .superCell > .frontIcon) {
    position: absolute;
    left: 0.5rem;
    font-size: 16px;
    color: var(--spectrum-global-color-gray-300);
  }
  :global( .superCell.inEdit > .frontIcon) {
    color: var(--spectrum-alias-border-color-mouse-focus);
  }
  :global( .superCell > .endIcon) {
    position: absolute;
    right: 0.5rem;
  }
  :global(.superCell > .value ) {
      flex: auto;
      padding: 0.3rem 0.85rem;
      min-width: 0;
  }
  :global(.superCell > .value.placeholder ) {
    font-style: italic;
    font-weight: 400;
    color: var(--spectrum-global-color-gray-500);
  }
  :global(.superCell > .value > .item ) {
    flex: 1 1 auto;
    height: 1.45rem;
    display: flex;
    align-items: center;
    border-radius: 4px;
    background-color: var(--color, var(--spectrum-global-color-gray-300));
    color: var(--spectrum-global-color-gray-800);
    padding-left: 0.5rem;
    padding-right: 0.5rem;
    gap: 0.5rem;
    overflow: hidden;
  }
  :global(.superCell > .value > .item > span) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  :global(.superCell > .editor ) {
    padding: 0.3rem 0.85rem;
  }
  :global(.superCell > input ) {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    outline: none;
    background: none;
    color: inherit;
    border: none;
    cursor: pointer;
    overflow: hidden;
    min-width: unset;
    padding: 0.3rem 0.85rem;
  }
  :global(.superCell.tableCell ) {
    border: none;
  }
  :global(.superCell.formInput ) {
    max-height: 2rem;
    border: 1px solid var(--spectrum-global-color-gray-300);
    background: var(--spectrum-global-color-gray-50);
  }
  :global(.superCell.formInput:focus-within ) {
    border-color: var(--spectrum-alias-border-color-mouse-focus);
  }
  :global(.superCell.formInput > .value > .item ) {
    height: 1.25rem;
  }
  :global(.superCell.inline ) {
    border: 1px solid pink;
  }

</style>