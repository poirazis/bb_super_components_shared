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
      return undefined
    }
    return processStringSync(template, { value })
  }

  $: cellOptions.role == "tableCell" ? cellOptions.placeholder = " " : null
</script>

  {#if fieldSchema.type == "string" || fieldSchema.type == "longform" || fieldSchema.type == "formula"} 
    <CellString
      {cellOptions}
      {cellState}
      {fieldSchema}
      {value}
      formattedValue = { getCellValue(value, valueTemplate) }
      on:change
      on:blur
    />
  {:else if fieldSchema.type == "array" || fieldSchema.type == "options"  }
    <CellOptions
      {cellOptions}
      {fieldSchema}
      {value}
      multi={fieldSchema.type == "array" && multi}
      formattedValue = { getCellValue(value, valueTemplate) }
      on:change
      on:blur
    />
  {:else if fieldSchema.type == "number" || fieldSchema.type == "bigint" }
    <CellNumber
      {cellState}
      {cellOptions}
      {value}
      {fieldSchema}
      formattedValue = { getCellValue(value, valueTemplate) }
      on:change
      on:blur
    />
  {:else if fieldSchema.type == "datetime"}
    <CellDatetime
      {cellState}
      {cellOptions}
      {value}
      {fieldSchema}
      formattedValue = { getCellValue(value, valueTemplate) }
      on:change
      on:blur
    />
  {:else if fieldSchema.type == "link" || fieldSchema.type == "bb_reference"  }
    <CellLink
      {cellState}
      {cellOptions}
      {value}
      {fieldSchema}
      {isHovered}
      on:change
      on:blur
    />
  {:else if fieldSchema.type == "attachment"  }
    <CellAttachment
      {cellOptions}
      {cellState}
      {value}
      {fieldSchema}
      formattedValue = { getCellValue(value, valueTemplate) }
      on:change
    />
  {:else if fieldSchema.type == "boolean"  }
    <CellBoolean
      {cellOptions}
      {cellState}
      {value}
      {fieldSchema}
      formattedValue = { getCellValue(value, valueTemplate) }
      on:change
      on:blur
    />
  {:else if fieldSchema.type == "json"  }
    <CellJson
      {cellOptions}
      {cellState}
      {value}
      {fieldSchema}
      formattedValue = { getCellValue(value, valueTemplate) } 
      on:change
      on:blur
    />
  {/if}