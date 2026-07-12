const TRANSITIONS = {
  idle: { START: "matching", END: "ended" },
  matching: {
    MATCHED: "connected",
    SOCKET_LOST: "reconnecting",
    CANCEL: "ended",
    END: "ended",
  },
  connected: {
    NEXT: "matching",
    SOCKET_LOST: "reconnecting",
    PEER_LEFT: "ended",
    END: "ended",
  },
  reconnecting: {
    RESTORED: "connected",
    NEXT: "matching",
    TIMEOUT: "ended",
    PEER_LEFT: "ended",
    END: "ended",
  },
  ended: { START: "matching", RESET: "idle" },
};

export class SessionMachine extends EventTarget {
  constructor(initial = "idle") {
    super();
    this.state = initial;
  }

  can(event) {
    return Boolean(TRANSITIONS[this.state]?.[event]);
  }

  transition(event, detail = {}) {
    const next = TRANSITIONS[this.state]?.[event];
    if (!next) return false;
    const previous = this.state;
    this.state = next;
    this.dispatchEvent(
      new CustomEvent("change", {
        detail: { previous, state: next, event, ...detail },
      }),
    );
    return true;
  }
}
