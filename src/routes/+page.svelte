<script>
  import { ID } from "appwrite";
  import { goto } from "$app/navigation";
  import { createAccount, createRoom, getAccount } from "../service";
  import { user } from "../store";
  import { createToastError, createToastSuccess } from "../utils";

  let room = "";
  let link = "";

  const handleCreateRoom = async () => {
    if (!$user) {
      await createAccount();
      let res = await getAccount();
      user.set(res);
    }
    let res = await createRoom(room ? room : ID.unique(), $user.$id);
    console.log(res);
    room = res.$id;
    link = `${window.location.origin}/call?room=${room}&caller=${$user.$id}`;
  };

  const handleJoinRoom = async () => {
    try {
      await navigator.clipboard.writeText(link);
      createToastSuccess("Content copied to clipboard");
      goto(`call?room=${room}`);
    } catch (err) {
      createToastError(err.message);
      console.error("Failed to copy: ", err);
    }
  };
</script>

<div class="grid justify-center items-center bg-pink-light h-full">
  <div>
    <img
      src="/appwrite-logo.svg"
      alt=""
    />
    <p class="text-5xl text-center text-gray-700">talk</p>
  </div>
  {#if link}
    <div class="flex flex-col space-y-6">
      <input
        type="text"
        class="border border-gray-200 rounded-md px-6 py-4 outline-none"
        bind:value={link}
      />
      <button
        class="bg-pink text-white py-4 px-10 rounded-lg"
        on:click={handleJoinRoom}>Copy Link and Join</button
      >
    </div>
  {:else}
    <div class="flex flex-col space-y-6">
      <input
        type="text"
        placeholder="Enter Room ID"
        class="border border-gray-200 rounded-md px-6 py-4 outline-none"
        bind:value={room}
      />
      <button
        class="bg-pink text-white py-4 px-10 rounded-lg"
        on:click={handleCreateRoom}>Create Room</button
      >
    </div>
  {/if}
</div>
