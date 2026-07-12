export class MediaManager {
  stream: MediaStream | null = null;
  async acquire() {
    if (!navigator.mediaDevices?.getUserMedia)
      throw new Error("media_unsupported");
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    return this.stream;
  }
  setAudio(enabled: boolean) {
    this.stream?.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }
  setVideo(enabled: boolean) {
    this.stream?.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }
  stop() {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }
}
