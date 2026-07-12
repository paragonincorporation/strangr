export function createRuntimeEnvHandler(config) {
  return (_request, response) => {
    response.type("application/javascript");
    response.setHeader("Cache-Control", "no-store");
    response.send(
      `window.__PARAMINGLE_RUNTIME__ = ${JSON.stringify({
        wsUrl: config.publicWsUrl,
        wsPort: config.wsPort,
        iceServers: config.iceServers,
        reconnectGraceMs: config.reconnectGraceMs,
      })};`,
    );
  };
}
