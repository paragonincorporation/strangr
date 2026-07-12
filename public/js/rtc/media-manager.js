export class MediaManager extends EventTarget {
  constructor() {
    super();
    this.stream = null;
  }

  static supported() {
    return Boolean(
      navigator.mediaDevices?.getUserMedia && window.RTCPeerConnection,
    );
  }

  async acquire() {
    if (!MediaManager.supported()) throw new Error("media_unsupported");
    this.stop();
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user",
      },
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    this.#emit();
    return this.stream;
  }

  toggle(kind) {
    const tracks =
      kind === "audio"
        ? this.stream?.getAudioTracks()
        : this.stream?.getVideoTracks();
    if (!tracks?.length) return false;
    const next = !tracks[0].enabled;
    tracks.forEach((track) => {
      track.enabled = next;
    });
    this.#emit();
    return next;
  }

  state() {
    return {
      audio: Boolean(
        this.stream
          ?.getAudioTracks()
          .some((track) => track.enabled && track.readyState === "live"),
      ),
      video: Boolean(
        this.stream
          ?.getVideoTracks()
          .some((track) => track.enabled && track.readyState === "live"),
      ),
    };
  }

  stop() {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.#emit();
  }

  #emit() {
    this.dispatchEvent(new CustomEvent("change", { detail: this.state() }));
  }
}
