export class VideoTiles {
  constructor(root) {
    this.remoteVideo = root.querySelector('[data-remote-video]')
    this.localVideo = root.querySelector('[data-local-video]')
    this.remoteEmpty = root.querySelector('[data-remote-empty]')
    this.localEmpty = root.querySelector('[data-local-empty]')
    this.remoteLabel = root.querySelector('[data-remote-label]')
  }

  setLocal(stream) {
    this.localVideo.srcObject = stream
    this.localEmpty.hidden = Boolean(stream)
  }

  setRemote(stream) {
    this.remoteVideo.srcObject = stream
    this.remoteEmpty.hidden = Boolean(stream?.getTracks().length)
  }

  setTextMode(enabled) {
    this.remoteLabel.textContent = enabled ? 'TEXT ONLY · NO CAMERA' : 'Connecting stranger'
    this.remoteEmpty.hidden = false
  }

  clear() {
    this.remoteVideo.srcObject = null
    this.localVideo.srcObject = null
    this.remoteEmpty.hidden = false
    this.localEmpty.hidden = false
  }
}
