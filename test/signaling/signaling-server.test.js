import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import WebSocket from "ws";
import { TokenBucket } from "../../server/moderation/rate-limiter.js";
import { RecentPairs } from "../../server/queue/recent-pairs.js";
import { MatchmakingQueue } from "../../server/queue/matchmaking-queue.js";
import { SessionRegistry } from "../../server/signaling/session-registry.js";
import { SignalingServer } from "../../server/signaling/signaling-server.js";

function waitForType(socket, expectedType, timeoutMs = 2_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off("message", onMessage);
      reject(new Error(`Timed out waiting for ${expectedType}`));
    }, timeoutMs);
    const onMessage = (raw) => {
      const message = JSON.parse(raw.toString());
      if (message.type !== expectedType) return;
      clearTimeout(timer);
      socket.off("message", onMessage);
      resolve(message.payload);
    };
    socket.on("message", onMessage);
  });
}

const send = (socket, type, payload = {}) =>
  socket.send(JSON.stringify({ type, payload }));

test("real sockets pair, relay chat, and cleanly next without stale state", async () => {
  const sessions = new SessionRegistry({ reconnectGraceMs: 200 });
  const recentPairs = new RecentPairs({ ttlMs: 1_000 });
  const queue = new MatchmakingQueue({
    ttlMs: 5_000,
    recentPairs,
    random: () => 0,
  });
  const server = new SignalingServer({
    port: 0,
    sessions,
    queue,
    recentPairs,
    pairLimiter: new TokenBucket({ capacity: 10, refillEveryMs: 10 }),
    chatLimiter: new TokenBucket({ capacity: 10, refillEveryMs: 10 }),
    reconnectGraceMs: 200,
    heartbeatIntervalMs: 10_000,
  });
  if (!server.address()) await once(server.wss, "listening");
  const port = server.address().port;
  const first = new WebSocket(`ws://127.0.0.1:${port}`);
  const second = new WebSocket(`ws://127.0.0.1:${port}`);

  await Promise.all([once(first, "open"), once(second, "open")]);
  await Promise.all([
    waitForType(first, "session.ready"),
    waitForType(second, "session.ready"),
  ]);

  const firstQueued = waitForType(first, "match.queued");
  send(first, "match.join", { mode: "text" });
  await firstQueued;

  const firstMatched = waitForType(first, "match.found");
  const secondMatched = waitForType(second, "match.found");
  send(second, "match.join", { mode: "text" });
  const [firstMatch, secondMatch] = await Promise.all([
    firstMatched,
    secondMatched,
  ]);
  assert.equal(firstMatch.pairId, secondMatch.pairId);
  assert.notEqual(firstMatch.role, secondMatch.role);

  const relayedChat = waitForType(second, "chat.message");
  send(first, "chat.message", {
    pairId: firstMatch.pairId,
    text: "<b>still plain text</b>",
  });
  assert.equal((await relayedChat).text, "<b>still plain text</b>");

  const peerLeft = waitForType(second, "peer.status");
  const requeued = waitForType(first, "match.queued");
  send(first, "match.next");
  assert.equal((await peerLeft).status, "left");
  assert.equal((await requeued).mode, "text");

  first.close();
  second.close();
  await Promise.all([once(first, "close"), once(second, "close")]);
  await server.close();
});

test("a paired session resumes on a new socket inside the grace window", async () => {
  const sessions = new SessionRegistry({ reconnectGraceMs: 1_000 });
  const recentPairs = new RecentPairs({ ttlMs: 1_000 });
  const queue = new MatchmakingQueue({ ttlMs: 5_000, recentPairs });
  const server = new SignalingServer({
    port: 0,
    sessions,
    queue,
    recentPairs,
    pairLimiter: new TokenBucket({ capacity: 10, refillEveryMs: 10 }),
    chatLimiter: new TokenBucket({ capacity: 10, refillEveryMs: 10 }),
    reconnectGraceMs: 1_000,
    heartbeatIntervalMs: 10_000,
  });
  if (!server.address()) await once(server.wss, "listening");
  const port = server.address().port;
  const first = new WebSocket(`ws://127.0.0.1:${port}`);
  const second = new WebSocket(`ws://127.0.0.1:${port}`);
  await Promise.all([once(first, "open"), once(second, "open")]);
  const [firstCredentials] = await Promise.all([
    waitForType(first, "session.ready"),
    waitForType(second, "session.ready"),
  ]);

  const queued = waitForType(first, "match.queued");
  send(first, "match.join", { mode: "text" });
  await queued;
  const firstMatched = waitForType(first, "match.found");
  const secondMatched = waitForType(second, "match.found");
  send(second, "match.join", { mode: "text" });
  const [match] = await Promise.all([firstMatched, secondMatched]);

  const peerReconnecting = waitForType(second, "peer.status");
  first.close();
  await once(first, "close");
  assert.equal((await peerReconnecting).status, "reconnecting");

  const replacement = new WebSocket(`ws://127.0.0.1:${port}`);
  await once(replacement, "open");
  const resumed = waitForType(replacement, "session.resumed");
  const peerResumed = waitForType(second, "peer.status");
  send(replacement, "session.resume", firstCredentials);
  assert.equal((await resumed).pairId, match.pairId);
  assert.equal((await peerResumed).status, "resumed");

  const relayedChat = waitForType(second, "chat.message");
  send(replacement, "chat.message", {
    pairId: match.pairId,
    text: "back online",
  });
  assert.equal((await relayedChat).text, "back online");

  replacement.close();
  second.close();
  await Promise.all([once(replacement, "close"), once(second, "close")]);
  await server.close();
});
