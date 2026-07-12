export class PeerConnection extends EventTarget {
  constructor({ iceServers, localStream, sendSignal }) {
    super();
    this.sendSignal = sendSignal;
    this.remoteStream = new MediaStream();
    this.pendingCandidates = [];
    this.closed = false;
    this.pc = new RTCPeerConnection({ iceServers });

    localStream
      ?.getTracks()
      .forEach((track) => this.pc.addTrack(track, localStream));
    this.pc.addEventListener("track", (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        if (!this.remoteStream.getTracks().includes(track))
          this.remoteStream.addTrack(track);
      });
      this.dispatchEvent(
        new CustomEvent("remote.stream", {
          detail: { stream: this.remoteStream },
        }),
      );
    });
    this.pc.addEventListener("icecandidate", (event) => {
      if (event.candidate) this.sendSignal({ candidate: event.candidate });
    });
    this.pc.addEventListener("connectionstatechange", () => {
      this.dispatchEvent(
        new CustomEvent("connection.state", {
          detail: { state: this.pc.connectionState },
        }),
      );
    });
  }

  async start(role) {
    if (role !== "initiator" || this.closed) return;
    const offer = await this.pc.createOffer({ iceRestart: false });
    await this.pc.setLocalDescription(offer);
    this.sendSignal({ description: this.pc.localDescription });
  }

  async handleSignal(signal) {
    if (this.closed) return;
    if (signal.description) {
      await this.pc.setRemoteDescription(signal.description);
      await this.#flushCandidates();
      if (signal.description.type === "offer") {
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.sendSignal({ description: this.pc.localDescription });
      }
    }
    if (signal.candidate) {
      if (this.pc.remoteDescription)
        await this.pc.addIceCandidate(signal.candidate);
      else this.pendingCandidates.push(signal.candidate);
    }
  }

  close() {
    this.closed = true;
    this.pendingCandidates = [];
    this.remoteStream.getTracks().forEach((track) => track.stop());
    this.pc.close();
  }

  async #flushCandidates() {
    for (const candidate of this.pendingCandidates.splice(0)) {
      await this.pc.addIceCandidate(candidate);
    }
  }
}
