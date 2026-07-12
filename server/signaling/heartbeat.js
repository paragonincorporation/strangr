export function startHeartbeat(wss, intervalMs) {
  const interval = setInterval(() => {
    for (const socket of wss.clients) {
      if (socket.isAlive === false) {
        socket.terminate();
        continue;
      }
      socket.isAlive = false;
      socket.ping();
    }
  }, intervalMs);

  interval.unref?.();
  wss.on("close", () => clearInterval(interval));
  return interval;
}
