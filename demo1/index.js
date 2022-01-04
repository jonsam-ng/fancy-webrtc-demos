const sleep = (delay) =>
  new Promise((resolve) => setTimeout(() => resolve(true), delay));

((window) => {
  const { document, navigator } = window;
  // find elements
  const localVideoEle = document.querySelector("#localVideo");
  const remoteVideoEle = document.querySelector("#remoteVideo");
  const startButton = document.getElementById("startButton");
  const callButton = document.getElementById("callButton");
  const hangupButton = document.getElementById("hangupButton");
  // constraints for media
  const constraints = { video: true };
  // connections manager, keep first local connection
  const connections = [];
  let localStream = null;

  // init action buttons
  callButton.disabled = true;
  hangupButton.disabled = true;

  function onicecandidate(event) {
    // add current ice candidates to other connections
    const { target: connection, candidate } = event;
    if (!candidate) {
      return;
    }
    connections.forEach((conn) => {
      if (conn !== connection) {
        conn.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });
  }

  function oniceconnectionstatechange() {}

  function setDescSuccess() {}

  function setDescError(error) {
    console.error("Set description failed", { error });
  }

  function createOfferSuccess(description) {
    const [localConnection, remoteConnection] = connections;
    if (!localConnection) {
      console.error("Local PeerConnection not init yet");
      return;
    }
    localConnection
      .setLocalDescription(description)
      .then(setDescSuccess)
      .catch(setDescError);
    remoteConnection
      ?.setRemoteDescription(description)
      .then(setDescSuccess)
      .catch(setDescError);
    // create answer from remote connection
    remoteConnection.createAnswer().then((description) => {
      remoteConnection
        .setLocalDescription(description)
        .then(setDescSuccess)
        .catch(setDescError);
      localConnection
        .setRemoteDescription(description)
        .then(setDescSuccess)
        .catch(setDescError);
    });
  }

  function start() {
    startButton.disabled = true;
    callButton.disabled = false;
    if (navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia(constraints)
        .then((stream) => {
          // init local video
          localVideoEle.srcObject = stream;
          localStream = stream;
        })
        .catch((error) => {
          console.error("failed to get user media", { error });
        });
    }
  }

  function call() {
    callButton.disabled = true;
    hangupButton.disabled = false;

    // show tracks we are streaming
    const videoLabel = localStream.getVideoTracks()[0]?.label;
    const audioLabel = localStream.getAudioTracks()[0]?.label;

    console.log(
      `We are streaming video: ${videoLabel} and audio: ${audioLabel}`
    );

    if (RTCPeerConnection) {
      // init peer connections
      const localConnection = new RTCPeerConnection();
      const remoteConnection = new RTCPeerConnection();

      connections.push(localConnection, remoteConnection);

      // listen icon events
      connections.forEach((connection) => {
        connection.onicecandidate = onicecandidate;
        connection.oniceconnectionstatechange = oniceconnectionstatechange;
      });

      // listen stream for remote
      remoteConnection.addEventListener("addstream", (event) => {
        const { stream } = event;
        remoteVideoEle.srcObject = stream;
      });

      // add local stream to local connection
      localConnection.addStream(localStream);

      // send offer
      localConnection
        .createOffer()
        .then(createOfferSuccess)
        .catch((error) => {
          console.log("Create offer failed", { error });
        });
    }
  }

  function hangup() {
    hangupButton.disabled = true;
    startButton.disabled = false;
    connections.forEach((conn) => conn.close());
    connections.length = 0;
    localStream = null;
  }

  // binding actions
  startButton.onclick = start;
  callButton.onclick = call;
  hangupButton.onclick = hangup;
})(window);
