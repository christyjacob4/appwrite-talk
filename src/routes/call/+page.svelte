<script>
  import { Query } from "appwrite";
  import { onDestroy, onMount } from "svelte";
  import { client } from "../../client";
  import {
    APPWRITE_DATABASE_ID,
    COLLECTION_MESSAGES,
    servers,
  } from "../../constants";
  import {
    createAccount,
    getAccount,
    getMessages,
    getRoom,
    sendToServer,
    updateRoom,
  } from "../../service";
  import { user } from "../../store";
  import { log, parseMessage } from "../../utils";

  let videoLocal;
  let videoRemote;
  let hangupButton;

  let webcamStream;

  let targetUsername = null;
  let myUsername = $user ? $user.$id : null;
  let room = null;

  let transceiver = null;
  let mediaConstraints = {};

  let myPeerConnection;

  let unsubscribe;

  onMount(async () => {
    mediaConstraints = window.constraints = {
      audio: false,
      video: true,
    };

    room = new URLSearchParams(window.location.search).get("room");
    if (!room) {
      alert("Room not specified");
      return;
    }

    if (!$user) {
      await createAccount();
      let res = await getAccount();
      myUsername = res.$id;
      user.set(res);
    }

    targetUsername = new URLSearchParams(window.location.search).get("caller");

    /**
     * Logic for the callee
     *
     * */
    if (!targetUsername) {
      let { documents } = await getMessages([
        Query.equal("target", myUsername),
        Query.equal("room", room),
        Query.equal("type", "video-offer"),
        Query.limit(1),
      ]);

      // Handle the video offer message if it already exists in the database
      if (documents.length > 0) {
        await handleMessage(documents[0]);
      }
    } else {
      /**
       * Logic for the caller
       *
       * */
      let res = await getRoom(room);
      await updateRoom(room, res.caller, $user.$id);
      await invite();

      // setTimeout(async () => {
      //   if (myPeerConnection && myPeerConnection.signalingState != 'stable')
      //     await myPeerConnection.restartIce();
      // }, 5000);
    }

    unsubscribe = client.subscribe(
      `databases.${APPWRITE_DATABASE_ID}.collections.${COLLECTION_MESSAGES}.documents`,
      async ({ payload }) => {
        if (payload.target == myUsername && payload.room == room) {
          await handleMessage(payload);
        }
      }
    );
  });

  const handleMessage = async (message) => {
    message = await parseMessage(message);
    message = {
      type: message.type,
      source: message.source,
      target: message.target,
      ...message.payload,
    };
    switch (message.type) {
      // Signaling messages: these messages are used to trade WebRTC
      // signaling information during negotiations leading up to a video
      // call.
      case "video-offer": // Invitation and offer to chat
        await handleVideoOfferMsg(message);
        break;
      case "video-answer": // Callee has answered our offer
        await handleVideoAnswerMsg(message);
        break;
      case "new-ice-candidate": // A new ICE candidate has been received
        await handleNewICECandidateMsg(message);
        break;
      case "hang-up":
        await handleHangUpMsg(message);
        break;
      default:
        log_error("Unknown message received:");
        log_error(message);
    }
  };

  async function handleVideoOfferMsg(msg) {
    targetUsername = msg.source;

    log("Received video chat offer from " + targetUsername);
    if (!myPeerConnection) {
      createPeerConnection();
    }

    var desc = new RTCSessionDescription(msg.sdp);
    if (myPeerConnection.signalingState != "stable") {
      log("  - But the signaling state isn't stable, so triggering rollback");
      //   await myPeerConnection.setLocalDescription({ type: "rollback" });
      //   await myPeerConnection.setRemoteDescription(desc);
      await myPeerConnection.createOffer({ iceRestart: true });
      //   location.reload(true);
      return;
    } else {
      log("  - Setting remote description");
      try {
        await myPeerConnection.setRemoteDescription(desc);
      } catch (e) {
        reportError(e);
        //   await myPeerConnection.createOffer({ iceRestart: true })
        log("  - m Lines are in a different order, so triggering rollback");
        // await myPeerConnection.setLocalDescription({ type: "rollback" });
        // await myPeerConnection.setRemoteDescription(desc);
        location.reload(true);
      }
      //   await myPeerConnection.setRemoteDescription(desc);
    }

    if (!webcamStream) {
      try {
        webcamStream = await navigator.mediaDevices.getUserMedia(
          mediaConstraints
        );
      } catch (err) {
        handleGetUserMediaError(err);
        return;
      }
      videoLocal.srcObject = webcamStream;
      try {
        webcamStream.getTracks().forEach(
          (transceiver = (track) =>
            myPeerConnection.addTransceiver(track, {
              streams: [webcamStream],
            }))
        );
      } catch (err) {
        handleGetUserMediaError(err);
      }
    }

    log("---> Creating and sending answer to caller");
    await myPeerConnection.setLocalDescription(
      await myPeerConnection.createAnswer()
    );
    sendToServer({
      room,
      source: myUsername,
      target: targetUsername,
      type: "video-answer",
      payload: {
        sdp: myPeerConnection.localDescription,
      },
    });
  }

  async function handleVideoAnswerMsg(msg) {
    log("*** Call recipient has accepted our call");
    var desc = new RTCSessionDescription(msg.sdp);
    if (myPeerConnection.signalingState != "stable") {
      await myPeerConnection.setRemoteDescription(desc).catch(reportError);
    }
  }

  async function handleNewICECandidateMsg(msg) {
    var candidate = new RTCIceCandidate(msg.candidate);
    log("*** Adding received ICE candidate: " + JSON.stringify(candidate));
    try {
      myPeerConnection && (await myPeerConnection.addIceCandidate(candidate));
    } catch (err) {
      reportError(err);
    }
  }

  const createPeerConnection = async () => {
    myPeerConnection = new RTCPeerConnection(servers);
    myPeerConnection.onicecandidate = handleICECandidateEvent;
    myPeerConnection.ontrack = handleTrackEvent;
    myPeerConnection.onnegotiationneeded = handleNegotiationNeededEvent;
    myPeerConnection.onremovetrack = handleRemoveTrackEvent;
    myPeerConnection.onsignalingstatechange = handleSignalChangeEvent;
  };

  function handleSignalChangeEvent(event) {
    log(
      "*** WebRTC signaling state changed to: " +
        myPeerConnection.signalingState
    );
  }

  function handleRemoveTrackEvent(event) {
    const stream = videoRemote.srcObject;
    const trackList = stream.getTracks();
    if (trackList.length === 0) {
      closeVideoCall();
    }
  }

  function handleICECandidateEvent(event) {
    if (event.candidate) {
      sendToServer({
        room,
        type: "new-ice-candidate",
        target: targetUsername,
        payload: {
          candidate: event.candidate,
        },
      });
    }
  }

  function handleTrackEvent(event) {
    videoRemote.srcObject = event.streams[0];
    hangupButton.disabled = false;
  }

  async function handleNegotiationNeededEvent() {
    log("*** Negotiation needed");
    try {
      log("---> Creating offer");

      const offer = await myPeerConnection.createOffer();
      if (myPeerConnection.signalingState != "stable") {
        log("     -- The connection isn't stable yet; postponing...");
        return;
      }

      log("---> Setting local description to the offer");
      await myPeerConnection.setLocalDescription(offer);

      log("---> Sending the offer to the remote peer");
      sendToServer({
        room,
        source: myUsername,
        target: targetUsername,
        type: "video-offer",
        payload: {
          sdp: myPeerConnection.localDescription,
        },
      });
    } catch (err) {
      log(
        "*** The following error occurred while handling the negotiationneeded event:"
      );
      reportError(err);
    }
  }

  async function invite() {
    log("Starting to prepare an invitation");
    if (myPeerConnection) {
      alert("You can't start a call because you already have one open!");
    } else {
      // Record the username being called for future reference
      log("Inviting user " + targetUsername);

      log("Setting up connection to invite user: " + targetUsername);
      createPeerConnection();

      try {
        webcamStream = await navigator.mediaDevices.getUserMedia(
          mediaConstraints
        );
        videoLocal.srcObject = webcamStream;
      } catch (err) {
        handleGetUserMediaError(err);
        return;
      }

      try {
        webcamStream.getTracks().forEach(
          (transceiver = (track) =>
            myPeerConnection.addTransceiver(track, {
              streams: [webcamStream],
            }))
        );
      } catch (err) {
        handleGetUserMediaError(err);
      }
    }
  }

  const handleGetUserMediaError = (e) => {
    switch (e.name) {
      case "NotFoundError":
        alert(
          "Unable to open your call because no camera and/or microphone" +
            "were found."
        );
        break;
      case "SecurityError":
      case "PermissionDeniedError":
        // Do nothing; this is the same as the user canceling the call.
        break;
      default:
        alert(`Error opening your camera and/or microphone: ${e.message}`);
        break;
    }
    closeVideoCall();
  };

  async function hangUpCall() {
    await sendToServer({
      room,
      source: myUsername,
      target: targetUsername ?? "",
      type: "hang-up",
      payload: {},
    });

    closeVideoCall();
  }

  function handleHangUpMsg(msg) {
    log("*** Received hang up notification from other peer");
    closeVideoCall();
  }

  function closeVideoCall() {
    log("Closing the call");

    if (myPeerConnection) {
      log("--> Closing the peer connection");

      myPeerConnection.onicecandidate = null;
      myPeerConnection.ontrack = null;
      myPeerConnection.onnegotiationneeded = null;
      myPeerConnection.onremovetrack = null;

      myPeerConnection.getTransceivers().forEach((transceiver) => {
        transceiver.stop();
      });

      if (videoLocal && videoLocal.srcObject) {
        videoLocal.pause();
        videoLocal.srcObject.getTracks().forEach((track) => {
          track.stop();
        });
      }
      myPeerConnection.close();
      myPeerConnection = null;
      webcamStream = null;
    }

    targetUsername = null;

    if (hangupButton) hangupButton.disabled = true;

    alert("The call has ended. You will be redirected back to the home page");

    window.location.href = "/";
  }

  onDestroy(async () => {
    unsubscribe && unsubscribe();
    await hangUpCall();
  });
</script>

<div class="h-screen relative flex flex-col bg-black">
  <div class="absolute top-4 right-4 z-10 bg-black rounded-xl">
    <video
      class="rounded-xl border border-white max-w-[200px] lg:max-w-[400px] max-h-24"
      autoplay
      muted
      bind:this={videoLocal}
    >
      <track kind="captions" src="" />
    </video>
    <p
      class="absolute bottom-3 left-3 text-white text-xs tracking-wider bg-gray-900 px-4 py-2 rounded-xl truncate"
    >
      You
    </p>
  </div>

  <div class="flex flex-1 items-center justify-center">
    <video class="bg-gray-700 w-full" autoplay bind:this={videoRemote}>
      <track kind="captions" src="" />
    </video>
  </div>

  <div class="p-4 flex w-full items-center justify-center ">
    <button
      class="bg-red-500 text-white py-4 px-10 rounded-lg"
      bind:this={hangupButton}
      on:click={hangUpCall}
    >
      Hang Up
    </button>
  </div>
</div>

<style>
  video {
    -webkit-transform: scaleX(-1);
    transform: scaleX(-1);
  }
</style>
