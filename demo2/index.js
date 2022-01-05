((window) => {
  const { document, navigator } = window;
  // find elements
  const areaSend = document.querySelector("textarea#dataChannelSend");
  const areaReceive = document.querySelector("textarea#dataChannelReceive");
  const startButton = document.querySelector("button#startButton");
  const sendButton = document.querySelector("button#sendButton");
  const closeButton = document.querySelector("button#closeButton");
  // connections manager, keep first local connection
  const connections = [];
  let channel;

  function onicecandidate(event) {
    const { candidate, target } = event;
    if (!candidate) return;
    // add candidate to other connections
    connections.forEach((conn) => {
      if (conn !== target) {
        conn.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });
  }

  function start() {
    // init connections
    const localConnection = new RTCPeerConnection();
    // init data chanel before ice negotiation
    // @note create channel
    channel = localConnection.createDataChannel("seedChannel");
    const remoteConnection = new RTCPeerConnection();

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
      remoteConnection.createAnswer().then((desc) => {
        localConnection.setRemoteDescription(desc);
        remoteConnection.setLocalDescription(desc);
      });
    });

    channel.onopen = (e) => {
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
      channel.onmessage = (evt) => {
        const { data } = evt;
        areaReceive.value = data;
      };
    };
  }

  function send() {
    closeButton.disabled = false;
    const data = areaSend.value;
    if (!data) return;
    channel.send(data);
  }

  function stop() {
    closeButton.disabled = true;
    sendButton.disabled = true;
    startButton.disabled = false;
    [areaSend, areaReceive].forEach((area) => {
      area.value = "";
      area.disabled = true;
    });

    channel.close();
    connections.forEach((conn) => conn.close());
    connections.length = 0;
  }

  //  bind events
  startButton.disabled = false;
  startButton.onclick = start;
  sendButton.onclick = send;
  closeButton.onclick = stop;
})(window);
