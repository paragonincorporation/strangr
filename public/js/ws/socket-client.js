import { createEnvelope, parseServerMessage } from "./protocol.js";

const SESSION_KEY = "paramingle.socket-session";

export class SocketClient extends EventTarget {
  constructor(url) {
    super();
    this.url = url;
    this.socket = null;
    this.intentionalClose = false;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
  }

  get ready() {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  connect() {
    if (this.ready || this.socket?.readyState === WebSocket.CONNECTING) return;
    this.intentionalClose = false;
    this.#status("opening");
    const socket = new WebSocket(this.url);
    this.socket = socket;

    socket.addEventListener("open", () => {
      this.reconnectAttempts = 0;
      this.#status("open");
      const credentials = this.#credentials();
      if (credentials) this.send("session.resume", credentials);
    });

    socket.addEventListener("message", (event) => {
      const envelope = parseServerMessage(event.data);
      if (!envelope) return;
      if (envelope.type === "session.ready")
        this.#saveCredentials(envelope.payload);
      if (envelope.type === "session.resume_failed")
        sessionStorage.removeItem(SESSION_KEY);
      this.dispatchEvent(new CustomEvent("message", { detail: envelope }));
      this.dispatchEvent(
        new CustomEvent(envelope.type, { detail: envelope.payload }),
      );
    });

    socket.addEventListener("close", () => {
      if (this.socket === socket) this.socket = null;
      this.#status("closed");
      if (!this.intentionalClose) this.#scheduleReconnect();
    });

    socket.addEventListener("error", () => {
      this.#status("error");
    });
  }

  send(type, payload = {}) {
    if (!this.ready) return false;
    this.socket.send(JSON.stringify(createEnvelope(type, payload)));
    return true;
  }

  close({ clearSession = true } = {}) {
    this.intentionalClose = true;
    clearTimeout(this.reconnectTimer);
    if (clearSession) sessionStorage.removeItem(SESSION_KEY);
    if (this.ready) this.socket.close(1000, "Client ended");
    else this.socket?.close();
    this.socket = null;
  }

  #scheduleReconnect() {
    const delays = [500, 1_000, 2_000, 4_000, 8_000];
    const delay = delays[Math.min(this.reconnectAttempts, delays.length - 1)];
    this.reconnectAttempts += 1;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
    this.dispatchEvent(
      new CustomEvent("reconnect.scheduled", { detail: { delay } }),
    );
  }

  #credentials() {
    try {
      const value = JSON.parse(sessionStorage.getItem(SESSION_KEY));
      return value?.sessionId && value?.resumeToken ? value : null;
    } catch {
      return null;
    }
  }

  #saveCredentials(payload) {
    if (!payload.sessionId || !payload.resumeToken) return;
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        sessionId: payload.sessionId,
        resumeToken: payload.resumeToken,
      }),
    );
  }

  #status(status) {
    this.dispatchEvent(
      new CustomEvent("socket.status", { detail: { status } }),
    );
  }
}
