import "dotenv/config";

const numberFromEnv = (name, fallback) => {
  const value = Number.parseInt(process.env[name] || "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const listFromEnv = (name, fallback = []) => {
  const value = process.env[name];
  if (!value) return fallback;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const stunUrls = listFromEnv("STUN_URLS", [
  "stun:stun.l.google.com:19302",
  "stun:stun1.l.google.com:19302",
]);

const iceServers = stunUrls.length ? [{ urls: stunUrls }] : [];

if (process.env.TURN_URL) {
  iceServers.push({
    urls: process.env.TURN_URL,
    username: process.env.TURN_USERNAME || "",
    credential: process.env.TURN_CREDENTIAL || "",
  });
}

export const config = Object.freeze({
  serverPort: numberFromEnv("SERVER_PORT", 3000),
  wsPort: numberFromEnv("WS_PORT", 8080),
  publicWsUrl: process.env.PUBLIC_WS_URL || "",
  queueEntryTtlMs: numberFromEnv("QUEUE_ENTRY_TTL_MS", 120_000),
  recentPairTtlMs: numberFromEnv("RECENT_PAIR_TTL_MS", 60_000),
  reconnectGraceMs: Math.min(
    numberFromEnv("RECONNECT_GRACE_MS", 60_000),
    60_000,
  ),
  heartbeatIntervalMs: numberFromEnv("HEARTBEAT_INTERVAL_MS", 15_000),
  iceServers,
});
