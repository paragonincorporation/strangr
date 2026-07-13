import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import WebSocket from "ws";

const apiUrl = new URL(process.env.LOAD_API_URL ?? "http://127.0.0.1:3000");
const origin = process.env.LOAD_ORIGIN ?? "http://localhost:5173";
const tokenFile = resolve(process.env.LOAD_TOKENS_FILE ?? ".load-tokens.json");
const durationMs = Number(process.env.LOAD_DURATION_SECONDS ?? 30) * 1_000;
const requestedSockets = Number(process.env.LOAD_SOCKETS ?? 20);
const outputFile = resolve(
  process.env.LOAD_OUTPUT ?? `artifacts/load/${Date.now()}.json`,
);
const mode = process.env.LOAD_MODE === "video" ? "video" : "text";
const environment = process.env.LOAD_ENVIRONMENT ?? "staging";
const scenario = process.env.LOAD_SCENARIO ?? "steady";
const ratingsEnabled = process.env.LOAD_RATINGS === "true";
const holdMs =
  Number(process.env.LOAD_HOLD_SECONDS ?? (mode === "text" ? 26 : 5)) * 1_000;

if (!Number.isInteger(requestedSockets) || requestedSockets < 2)
  throw new Error("LOAD_SOCKETS must be an integer of at least 2");
if (!Number.isFinite(durationMs) || durationMs < 5_000)
  throw new Error("LOAD_DURATION_SECONDS must be at least 5");
if (apiUrl.protocol !== "http:" && apiUrl.protocol !== "https:")
  throw new Error("LOAD_API_URL must use http or https");
if (environment === "production")
  throw new Error("The load harness refuses production targets");
if (!["steady", "churn", "skip-storm"].includes(scenario))
  throw new Error("LOAD_SCENARIO must be steady, churn, or skip-storm");
if (!Number.isFinite(holdMs) || holdMs < 1_000)
  throw new Error("LOAD_HOLD_SECONDS must be at least 1");
if (ratingsEnabled && durationMs < 125_000)
  throw new Error("LOAD_RATINGS=true requires at least 125 seconds");

const fixture = JSON.parse(await readFile(tokenFile, "utf8"));
const tokens = Array.isArray(fixture) ? fixture : fixture.tokens;
if (!Array.isArray(tokens) || tokens.some((token) => typeof token !== "string"))
  throw new Error(
    "LOAD_TOKENS_FILE must contain a JSON string array or {tokens: []}",
  );
if (tokens.length < requestedSockets)
  throw new Error(
    `Need ${requestedSockets} distinct adult test tokens; found ${tokens.length}`,
  );

const startedAt = new Date();
const latencies = [];
const counters = {
  requestedSockets,
  opened: 0,
  ready: 0,
  queued: 0,
  matched: 0,
  connected: 0,
  chatSent: 0,
  matchesEnded: 0,
  nextSent: 0,
  leaveSent: 0,
  cooldownRejected: 0,
  reconnects: 0,
  ratingsSubmitted: 0,
  ratingErrors: 0,
  pongs: 0,
  errors: 0,
  unexpectedErrors: 0,
  closed: 0,
};
const clients = [];
let finishing = false;

function envelope(type, payload) {
  return JSON.stringify({ version: 1, type, requestId: randomUUID(), payload });
}

async function ticket(token) {
  const response = await fetch(new URL("/v1/realtime/tickets", apiUrl), {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      origin,
      "x-device-label": "approved-staging-load-harness",
    },
  });
  if (!response.ok)
    throw new Error(`Ticket request failed with ${response.status}`);
  return /** @type {{ticket: string}} */ (await response.json()).ticket;
}

async function submitRating(token, matchId) {
  const response = await fetch(
    new URL(`/v1/encounters/${encodeURIComponent(matchId)}/rating`, apiUrl),
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        origin,
        "content-type": "application/json",
        "x-device-label": "approved-staging-load-harness",
      },
      body: JSON.stringify({ outcome: "like" }),
    },
  );
  if (!response.ok) throw new Error(`Rating failed with ${response.status}`);
}

async function openClient(client, reconnect = false) {
  const issuedAt = performance.now();
  const value = await ticket(client.token);
  const wsUrl = new URL("/ws", apiUrl);
  wsUrl.protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
  wsUrl.searchParams.set("ticket", value);
  const socket = new WebSocket(wsUrl, { origin });
  client.socket = socket;
  client.activeMatchId = null;
  client.skipAttempted = false;
  socket.on("open", () => {
    counters.opened++;
    if (reconnect) counters.reconnects++;
    socket.send(
      envelope("match.join", { mode, allowPreferenceRelaxation: false }),
    );
  });
  socket.on("pong", () => counters.pongs++);
  socket.on("message", (raw) => {
    const message = JSON.parse(raw.toString());
    if (message.type === "connection.ready") counters.ready++;
    if (message.type === "connection.pong") counters.pongs++;
    if (message.type === "match.queued") counters.queued++;
    if (message.type === "match.found") {
      counters.matched++;
      latencies.push(performance.now() - issuedAt);
      client.activeMatchId = message.payload.matchId;
      socket.send(envelope("match.ack", { matchId: message.payload.matchId }));
    }
    if (message.type === "match.connected") {
      counters.connected++;
      const matchId = message.payload.matchId;
      client.activeMatchId = matchId;
      socket.send(
        envelope("chat.send", {
          matchId,
          clientMessageId: randomUUID(),
          text: `load-${randomUUID()}`,
        }),
      );
      counters.chatSent++;
      if (scenario === "skip-storm" && !client.skipAttempted) {
        client.skipAttempted = true;
        socket.send(envelope("match.next", { matchId }));
        counters.nextSent++;
      }
      if (ratingsEnabled)
        setTimeout(() => {
          if (!finishing && client.activeMatchId === matchId)
            void submitRating(client.token, matchId)
              .then(() => counters.ratingsSubmitted++)
              .catch(() => counters.ratingErrors++);
        }, 121_000);
      setTimeout(
        () => {
          if (
            finishing ||
            socket.readyState !== WebSocket.OPEN ||
            client.activeMatchId !== matchId
          )
            return;
          const action =
            scenario === "skip-storm" || ratingsEnabled
              ? "match.leave"
              : "match.next";
          socket.send(envelope(action, { matchId }));
          if (action === "match.next") counters.nextSent++;
          else counters.leaveSent++;
        },
        ratingsEnabled ? 123_000 : holdMs,
      );
    }
    if (message.type === "match.ended") {
      counters.matchesEnded++;
      client.activeMatchId = null;
      client.skipAttempted = false;
      if (
        !finishing &&
        message.payload.reason !== "next" &&
        socket.readyState === WebSocket.OPEN
      )
        setTimeout(() => {
          if (!finishing && socket.readyState === WebSocket.OPEN)
            socket.send(
              envelope("match.join", {
                mode,
                allowPreferenceRelaxation: false,
              }),
            );
        }, 100);
    }
    if (message.type === "error") {
      counters.errors++;
      if (message.payload?.code === "cooldown_active")
        counters.cooldownRejected++;
      else counters.unexpectedErrors++;
    }
  });
  socket.on("error", () => {
    counters.errors++;
    counters.unexpectedErrors++;
  });
  socket.on("close", () => {
    counters.closed++;
    if (!finishing && client.reopen) {
      client.reopen = false;
      void openClient(client, true).catch(() => counters.unexpectedErrors++);
    }
  });
}

for (const token of tokens.slice(0, requestedSockets))
  clients.push({
    token,
    socket: null,
    activeMatchId: null,
    skipAttempted: false,
    reopen: false,
  });
await Promise.all(clients.map((client) => openClient(client)));
const pulse = setInterval(() => {
  for (const { socket } of clients)
    if (socket?.readyState === WebSocket.OPEN)
      socket.send(
        envelope("connection.ping", { sentAt: new Date().toISOString() }),
      );
}, 5_000);
if (scenario === "churn")
  setTimeout(
    () => {
      for (const [index, client] of clients.entries())
        if (index % 2 === 0 && client.socket?.readyState === WebSocket.OPEN) {
          client.reopen = true;
          client.socket.close(1012, "approved load reconnect exercise");
        }
    },
    Math.max(2_000, durationMs / 3),
  );
await new Promise((resolveWait) => setTimeout(resolveWait, durationMs));
finishing = true;
clearInterval(pulse);
for (const { socket } of clients) socket?.close(1000, "load run complete");
await new Promise((resolveWait) => setTimeout(resolveWait, 250));

latencies.sort((a, b) => a - b);
const percentile = (p) =>
  latencies.length
    ? Math.round(latencies[Math.ceil(latencies.length * p) - 1])
    : null;
const report = {
  schemaVersion: 2,
  target: apiUrl.origin,
  environment,
  origin,
  mode,
  scenario,
  ratingsEnabled,
  holdSeconds: holdMs / 1_000,
  startedAt: startedAt.toISOString(),
  durationSeconds: durationMs / 1_000,
  counters,
  matchLatencyMs: {
    p50: percentile(0.5),
    p95: percentile(0.95),
    p99: percentile(0.99),
    max: latencies.at(-1) ?? null,
  },
  process: { rssBytes: process.memoryUsage().rss },
  note: "Correlate this client report with API, Redis, PostgreSQL, worker, TURN, and provider cost dashboards.",
};
await mkdir(dirname(outputFile), { recursive: true });
await writeFile(outputFile, `${JSON.stringify(report, null, 2)}\n`, {
  mode: 0o600,
});
console.log(JSON.stringify(report, null, 2));
if (
  counters.opened < requestedSockets ||
  counters.unexpectedErrors > 0 ||
  counters.ratingErrors > 0
)
  process.exitCode = 1;
