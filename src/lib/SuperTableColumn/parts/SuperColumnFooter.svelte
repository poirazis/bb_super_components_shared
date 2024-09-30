<script>
  import { getContext } from "svelte";
  const columnOptions = getContext("stColumnOptions");
</script>

<div
  class="super-column-footer"
  style:justify-content={$columnOptions?.headerAlign}
>
  <span>
    {$columnOptions.displayName ?? $columnOptions.name ?? ""}
  </span>
</div>
