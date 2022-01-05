((window) => {
  const { document, navigator } = window;
  // find elements
  const areaSend = document.querySelector("textarea#dataChannelSend");
  const areaReceive = document.querySelector("textarea#dataChannelReceive");
  const startButton = document.querySelector("button#startButton");
  const sendButton = document.querySelector("button#sendButton");
  const closeButton = document.querySelector("button#closeButton");
  // constraints for media
  const constraints = { video: true };
  // connections manager, keep first local connection
  const connections = [];
  let channel;

  function onicecandidate(event) {
    const { candidate, target } = event;
    if (!candidate) return;
    // add candidate to other connections
    connections.forEach((conn) => {
      if (conn !== target) {
        target.addIceCandidate(candidate);
      }
    });
  }

  function start() {
    // init connections
    const localConnection = new RTCPeerConnection(constraints);
    const remoteConnection = new RTCPeerConnection(constraints);

    connections.push(localConnection, remoteConnection);

    // listen to ice event
    connections.forEach((conn) => {
      conn.onicecandidate = onicecandidate;
    });

    // local connection seed offer
    localConnection.createOffer().then((desc) => {
      localConnection.setLocalDescription(desc);
      remoteConnection.setRemoteDescription(desc);

      // remote connection send answer
      remoteConnection.createAnswer((desc) => {
        localConnection.setRemoteDescription(desc);
        remoteConnection.setLocalDescription(desc);
      });
    });

    // init data chanel
    channel = localConnection.createDataChannel("seedChannel");
    channel.onopen = () => {
      if (channel.readyState === "open") {
        // init textarea
        areaSend.disabled = false;
        startButton.disabled = true;
        sendButton.disabled = false;
      }
    };
    // remote listen to ondatachannel event
    remoteConnection.ondatachannel = (event) => {
      const { channel } = event;
      console.log("==>", { channel, event });
      channel.onmessage = (evt) => {
        const { data } = evt;
        areaReceive.value = data;
      };
    };
  }

  function send() {
    sendButton.disabled = true;
    closeButton.disabled = false;

    channel.send(areaSend.value);
  }

  //  bind events
  startButton.disabled = false;
  startButton.onclick = start;
  sendButton.onclick = send;
})(window);
