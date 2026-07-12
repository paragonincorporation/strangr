import { ENV } from "./env.js";
import { SessionMachine } from "./state/session-machine.js";
import { SessionStore } from "./state/session-store.js";
import { MediaManager } from "./rtc/media-manager.js";
import { PeerConnection } from "./rtc/peer-connection.js";
import { SocketClient } from "./ws/socket-client.js";
import { ViewController } from "./ui/view-controller.js";

const ui = new ViewController(document);
const machine = new SessionMachine();
const store = new SessionStore();
const media = new MediaManager();

let socket = null;
let peer = null;
let waitTimer = null;
let reconnectTimer = null;
let typingTimer = null;
let sessionStarting = false;

const consent = document.querySelector("[data-consent]");
const gateForm = document.querySelector("[data-gate-form]");
const gateSubmit = document.querySelector('[data-action="accept-gate"]');
const chatForm = document.querySelector("[data-chat-form]");
const chatInput = document.querySelector("[data-chat-input]");
const reportForm = document.querySelector("[data-report-form]");

consent.addEventListener("change", () => {
  gateSubmit.disabled = !consent.checked;
});

gateForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!consent.checked || sessionStarting) return;
  ui.modals.close("gate");
  beginSession();
});

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = chatInput.value.trim().slice(0, 500);
  if (!text || !store.pairId || !socket?.ready) return;
  if (socket.send("chat.message", { pairId: store.pairId, text })) {
    ui.chat.addMessage(text, true);
    chatInput.value = "";
    socket.send("chat.typing", { typing: false });
  }
});

chatInput.addEventListener("input", () => {
  if (!store.pairId || !socket?.ready) return;
  socket.send("chat.typing", { typing: true });
  clearTimeout(typingTimer);
  typingTimer = setTimeout(
    () => socket?.send("chat.typing", { typing: false }),
    800,
  );
});

reportForm.addEventListener("submit", submitReport);
media.addEventListener("change", (event) => {
  ui.updateMedia(event.detail);
  if (store.pairId) socket?.send("media.state", event.detail);
});

document.addEventListener("click", (event) => {
  const actionElement = event.target.closest("[data-action]");
  if (!actionElement) return;
  const action = actionElement.dataset.action;

  if (action === "open-gate") ui.modals.open("gate");
  if (action === "close-gate") ui.modals.close("gate");
  if (action === "open-how") ui.modals.open("how");
  if (action === "close-how") ui.modals.close("how");
  if (action === "open-guidelines") {
    ui.modals.close("gate");
    ui.modals.open("guidelines");
  }
  if (action === "close-guidelines") {
    ui.modals.close("guidelines");
    ui.modals.open("gate");
  }
  if (action === "toggle-audio") toggleMedia("audio");
  if (action === "toggle-video") toggleMedia("video");
  if (action === "toggle-chat") {
    const open = ui.chat.toggle();
    document.querySelector("[data-chat-count]").textContent = open
      ? "OPEN"
      : "CLOSED";
  }
  if (action === "next") nextStranger();
  if (action === "notice-wait") {
    ui.hideNotice();
    ui.toast("Holding the room. You can still skip from the dock.");
  }
  if (action === "open-report") ui.modals.open("report");
  if (action === "close-report") ui.modals.close("report");
  if (action === "cancel-match") endSession("Search cancelled.", true);
  if (action === "end") endSession("No history. No awkward goodbye.", true);
  if (action === "restart") beginSession();
  if (action === "home") goHome();
});

async function beginSession() {
  if (sessionStarting) return;
  sessionStarting = true;
  clearTimers();
  peer?.close();
  peer = null;
  store.reset();
  if (machine.state === "ended") machine.transition("START");
  else if (machine.state === "idle") machine.transition("START");
  ui.show("matching");
  ui.matching("media", "video");
  startWaitClock();

  try {
    if (MediaManager.supported()) {
      const stream = await media.acquire();
      store.mode = "video";
      ui.videos.setLocal(stream);
    } else {
      store.mode = "text";
      ui.toast("Video isn’t supported here. Text mode is ready.");
    }
  } catch {
    store.mode = "text";
    media.stop();
    ui.toast("Camera or mic blocked. Switching to text-only chat.");
  }

  ui.matching("socket", store.mode);
  createSocket();
  socket.connect();
  sessionStarting = false;
}

function createSocket() {
  if (socket && !socket.intentionalClose) return;
  socket = new SocketClient(ENV.wsUrl);

  socket.addEventListener("session.ready", () => {
    if (machine.state === "matching") joinQueue();
  });

  socket.addEventListener("session.resumed", (event) => {
    const data = event.detail;
    if (store.pendingAction === "next") {
      store.pendingAction = null;
      socket.send("match.next", {});
      return;
    }
    if (data.pairId) {
      store.setMatch(data);
      if (machine.state === "reconnecting") machine.transition("RESTORED");
      ui.hideNotice();
      ui.status.set("Connected", "connected");
    } else if (machine.state === "matching") {
      joinQueue();
    }
  });

  socket.addEventListener("socket.status", (event) => {
    const { status } = event.detail;
    if (
      status === "closed" &&
      ["connected", "reconnecting"].includes(machine.state)
    ) {
      if (machine.state === "connected") machine.transition("SOCKET_LOST");
      showReconnectNotice(
        "YOUR SIGNAL DIPPED.",
        "We’re retrying now. Wait here or skip as soon as the channel returns.",
      );
      ui.status.set("Reconnecting", "waiting");
    }
    if (status === "error" && machine.state === "matching")
      ui.matching("socket", store.mode);
  });

  socket.addEventListener("match.queued", () => {
    store.waitStartedAt ||= Date.now();
    ui.matching("queued", store.mode);
  });

  socket.addEventListener("match.found", (event) => onMatch(event.detail));
  socket.addEventListener("match.timeout", () => {
    if (machine.state === "matching") joinQueue();
  });
  socket.addEventListener("rtc.signal", (event) => {
    peer?.handleSignal(event.detail.signal).catch(() => handleRtcFailure());
  });
  socket.addEventListener("chat.message", (event) => {
    const text = String(event.detail.text || "").slice(0, 500);
    if (!text) return;
    store.latestRemoteText = text;
    ui.chat.addMessage(text, false);
  });
  socket.addEventListener("chat.typing", (event) =>
    ui.chat.setTyping(Boolean(event.detail.typing)),
  );
  socket.addEventListener("media.state", (event) => {
    document.querySelector("[data-peer-media]").textContent = event.detail.video
      ? "CAMERA ON"
      : "CAMERA OFF";
  });
  socket.addEventListener("peer.status", (event) => onPeerStatus(event.detail));
  socket.addEventListener("rate_limited", (event) => {
    ui.toast("Easy. Give it a second.");
    if (event.detail.scope === "matching" && machine.state === "matching") {
      setTimeout(joinQueue, Math.max(250, event.detail.retryAfterMs || 1_000));
    }
  });
  socket.addEventListener("error", (event) => {
    if (event.detail?.code !== "stale_pair")
      ui.toast(event.detail?.message || "Something got crossed. Retrying.");
  });
}

function joinQueue() {
  if (machine.state !== "matching" || !socket?.ready) return;
  ui.matching("queued", store.mode);
  socket.send("match.join", { mode: store.mode });
}

async function onMatch(data) {
  clearInterval(waitTimer);
  store.setMatch(data);
  if (machine.state === "matching") machine.transition("MATCHED");
  ui.enterRoom(store.mode);
  ui.videos.setLocal(media.stream);
  ui.updateMedia(media.state());

  if (store.mode === "text") {
    ui.status.set("Text connected", "connected");
    return;
  }

  try {
    peer?.close();
    peer = new PeerConnection({
      iceServers: ENV.iceServers,
      localStream: media.stream,
      sendSignal: (signal) =>
        socket?.send("rtc.signal", { pairId: store.pairId, signal }),
    });
    peer.addEventListener("remote.stream", (event) =>
      ui.videos.setRemote(event.detail.stream),
    );
    peer.addEventListener("connection.state", (event) =>
      onRtcState(event.detail.state),
    );
    await peer.start(store.role);
  } catch {
    handleRtcFailure();
  }
}

function onRtcState(state) {
  if (state === "connected") ui.status.set("Connected", "connected");
  if (state === "connecting") ui.status.set("Linking video", "waiting");
  if (state === "disconnected") ui.status.set("Signal unstable", "waiting");
  if (state === "failed") handleRtcFailure();
}

function handleRtcFailure() {
  ui.status.set("Video lost", "danger");
  ui.showNotice({
    title: "VIDEO LINK LOST.",
    copy: "The peer channel couldn’t recover. Move on and we’ll find someone new.",
    canWait: false,
  });
}

function onPeerStatus(data) {
  if (data.status === "reconnecting") {
    if (machine.state === "connected") machine.transition("SOCKET_LOST");
    showReconnectNotice(
      "STRANGER DROPPED.",
      "Their signal is shaky. Wait here or move on now.",
      data.graceMs,
    );
    ui.status.set("Peer reconnecting", "waiting");
  }
  if (data.status === "resumed") {
    clearInterval(reconnectTimer);
    if (machine.state === "reconnecting") machine.transition("RESTORED");
    ui.hideNotice();
    ui.status.set("Connected", "connected");
    ui.chat.addStatus("Stranger is back.");
  }
  if (data.status === "left") {
    clearInterval(reconnectTimer);
    peer?.close();
    peer = null;
    store.clearPair();
    if (machine.state === "connected" || machine.state === "reconnecting")
      machine.transition("PEER_LEFT");
    ui.status.set("Stranger left", "danger");
    ui.showNotice({
      title: "STRANGER LEFT.",
      copy: "That one’s over. Find someone new whenever you’re ready.",
      canWait: false,
    });
    document.querySelector("[data-reconnect-countdown]").textContent =
      "No chat history was saved.";
  }
}

function showReconnectNotice(title, copy, graceMs = ENV.reconnectGraceMs) {
  clearInterval(reconnectTimer);
  const deadline =
    Date.now() + Math.min(graceMs || ENV.reconnectGraceMs, 60_000);
  const tick = () => {
    const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1_000));
    ui.updateCountdown(`${seconds}s left to recover`);
    if (seconds === 0) clearInterval(reconnectTimer);
  };
  ui.showNotice({ title, copy, countdown: "", canWait: true });
  tick();
  reconnectTimer = setInterval(tick, 1_000);
}

function nextStranger() {
  if (!["connected", "reconnecting", "ended"].includes(machine.state)) return;
  peer?.close();
  peer = null;
  clearInterval(reconnectTimer);
  ui.hideNotice();
  ui.show("matching");
  ui.matching("pairing", store.mode);
  store.waitStartedAt = Date.now();
  startWaitClock();

  const hadPair = Boolean(store.pairId);
  store.clearPair();
  if (machine.state === "ended") machine.transition("START");
  else machine.transition("NEXT");

  if (!socket?.ready) {
    store.pendingAction = hadPair ? "next" : "join";
    return;
  }
  socket.send(
    hadPair ? "match.next" : "match.join",
    hadPair ? {} : { mode: store.mode },
  );
}

function toggleMedia(kind) {
  if (store.mode !== "video") {
    ui.toast("This is a text-only room.");
    return;
  }
  media.toggle(kind);
}

async function submitReport(event) {
  event.preventDefault();
  const reason = document.querySelector("[data-report-reason]").value;
  const note = document.querySelector("[data-report-note]").value.trim();
  const error = document.querySelector("[data-report-error]");
  error.hidden = true;

  if (!reason || !store.reportToken) {
    error.textContent = "Choose a reason first.";
    error.hidden = false;
    return;
  }

  try {
    const response = await fetch("/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportToken: store.reportToken,
        reason,
        note,
        snippet: store.latestRemoteText.slice(0, 160),
      }),
    });
    if (!response.ok) throw new Error("report_failed");
    ui.modals.close("report");
    reportForm.reset();
    ui.toast("Report logged. Moving you on.");
    nextStranger();
  } catch {
    error.textContent = "Couldn’t send that report. Try once more.";
    error.hidden = false;
  }
}

function endSession(copy, showEnded) {
  clearTimers();
  peer?.close();
  peer = null;
  media.stop();
  ui.videos.clear();
  if (socket) {
    socket.send("session.end", {});
    socket.close();
  }
  store.reset();
  if (machine.state !== "ended") machine.transition("END");
  if (showEnded) {
    document.querySelector("[data-ended-copy]").textContent = copy;
    ui.show("ended");
  }
}

function goHome() {
  if (machine.state !== "idle") endSession("", false);
  if (machine.state === "ended") machine.transition("RESET");
  consent.checked = false;
  gateSubmit.disabled = true;
  ui.show("landing");
}

function startWaitClock() {
  clearInterval(waitTimer);
  store.waitStartedAt = Date.now();
  const update = () => {
    const totalSeconds = Math.floor((Date.now() - store.waitStartedAt) / 1_000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    ui.waitTime(`${minutes}:${seconds}`);
  };
  update();
  waitTimer = setInterval(update, 1_000);
}

function clearTimers() {
  clearInterval(waitTimer);
  clearInterval(reconnectTimer);
  clearTimeout(typingTimer);
}

window.addEventListener("pagehide", () => {
  clearTimers();
  peer?.close();
  media.stop();
  socket?.send("session.end", {});
  socket?.close();
});
