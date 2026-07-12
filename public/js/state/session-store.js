export class SessionStore {
  constructor() {
    this.reset();
  }

  reset() {
    this.mode = "video";
    this.pairId = null;
    this.role = null;
    this.reportToken = null;
    this.latestRemoteText = "";
    this.waitStartedAt = null;
    this.pendingAction = null;
  }

  setMatch(payload) {
    this.pairId = payload.pairId;
    this.role = payload.role;
    this.mode = payload.mode;
    this.reportToken = payload.reportToken;
    this.latestRemoteText = "";
  }

  clearPair() {
    this.pairId = null;
    this.role = null;
    this.reportToken = null;
    this.latestRemoteText = "";
  }
}
