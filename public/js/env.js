const runtime = window.__STRANGR_RUNTIME__ || {}
const socketProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
const defaultSocketUrl = `${socketProtocol}//${window.location.hostname}:${runtime.wsPort || 8080}`

export const ENV = Object.freeze({
  wsUrl: runtime.wsUrl || defaultSocketUrl,
  iceServers: Array.isArray(runtime.iceServers) ? runtime.iceServers : [],
  reconnectGraceMs: Number(runtime.reconnectGraceMs) || 60_000,
})
