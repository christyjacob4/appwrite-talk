<script>
  import "../app.css";
  import { SvelteToast } from "@zerodevx/svelte-toast";
  import { getAccount } from "../service";
  import { user } from "../store";
  import { onDestroy, onMount } from "svelte";

  let loading = true;

  onMount(async () => {
    try {
      let res = await getAccount();
      user.set(res);
    } catch (err) {
      console.log(err);
    } finally {
      loading = false;
    }
  });

  onDestroy(() => {
    user.set(null);
  });
</script>

<SvelteToast />
<div class="h-screen font-poppins text-[#7B7171] overflow-clip">
  {#if loading}
    <div class="flex flex-col items-center justify-center h-full">
      <div class="w-1/2 h-1 bg-[#7B7171] animate-pulse" />
      <div class="mt-4 text-center">
        <p class="text-[#7B7171]">Loading...</p>
      </div>
    </div>
  {:else}
    <slot />
  {/if}
</div>
