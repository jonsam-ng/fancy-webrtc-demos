// the end char from chunks of message
const END_OF_MESSAGE = "EOF";
// size of single message (bytes)
const SIZE_OF_MESSAGE = 65535;

((window) => {
  const { document, navigator } = window;
  const { URL } = window;

  // connections manager, keep first local connection
  const connections = [];
  let fileChannel;
  // find elements
  const sendFile = document.querySelector("#sendFile");
  const sendFileButton = document.querySelector("#sendFileButton");
  const startFileButton = document.querySelector("#startFileButton");
  const downloadFileButton = document.querySelector("#downloadFile");
  let chunks = [];
  let file;
  let filename;

  // binding events
  startFileButton.onclick = startFile;
  sendFileButton.onclick = sendFileFn;
  downloadFileButton.onclick = downloadFile;
  startFileButton.disabled = false;

  function startFile() {
    startFileButton.disabled = true;
    sendFileButton.disabled = false;

    // init connections
    const localConnection = new RTCPeerConnection();
    const remoteConnection = new RTCPeerConnection();

    connections.push(localConnection, remoteConnection);

    // init file channel
    fileChannel = localConnection.createDataChannel("fileChannel");

    // ice negotiation，then peers location found
    connections.forEach((conn) => {
      conn.onicecandidate = ({ target, candidate }) => {
        if (!candidate) return;
        // add current candidate to other connections
        connections.forEach((c) => {
          if (target !== c) c.addIceCandidate(new RTCIceCandidate(candidate));
        });
      };
    });

    // offer & answer，then peers joined
    localConnection.createOffer().then((desc) => {
      localConnection.setLocalDescription(desc);
      remoteConnection.setRemoteDescription(desc);
      remoteConnection.createAnswer().then((d) => {
        localConnection.setRemoteDescription(d);
        remoteConnection.setLocalDescription(d);
      });
    });

    // when connection finished, channel finished, then remote will found the channel
    remoteConnection.ondatachannel = ({ channel }) => {
      // remote want data from channel
      channel.onmessage = ({ data }) => {
        try {
          // chunks will be merged
          if (typeof data === "string" && data.indexOf(END_OF_MESSAGE) > -1) {
            // all file finished, merge chunks, file is data of chunks
            const buffer = chunks.reduce((prev, cur) => {
              const temp = new Uint8Array(prev.byteLength + cur.byteLength);
              temp.set(new Uint8Array(prev), 0);
              temp.set(new Uint8Array(cur), prev.byteLength);
              return temp;
            }, new Uint8Array());
            file = new Blob([buffer]);
            filename = data.split(":").pop();
            downloadFileButton.innerHTML = `download: ${filename}`;
          } else chunks.push(data);
        } catch (error) {
          console.error("receive data failed.", { error });
        }
      };
    };
  }

  async function sendFileFn() {
    downloadFileButton.disabled = false;
    const file = sendFile.files[0];
    if (!file) {
      alert("Not select file yet!");
      return;
    }
    // convert file to arrayBuffer
    const buffer = await file.arrayBuffer();
    try {
      for (let i = 0; i < buffer.byteLength; i += SIZE_OF_MESSAGE) {
        fileChannel.send(buffer.slice(i, i + SIZE_OF_MESSAGE));
      }
    } catch (error) {
      console.error("send data failed.", { error });
    }
    fileChannel.send(`${END_OF_MESSAGE}:${file.name}`);
  }

  function downloadFile() {
    if (!file) {
      alert("No file to download");
      return;
    }
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "untitled";
    link.click();
    URL.revokeObjectURL(url);
    link.remove();
  }
})(window);
