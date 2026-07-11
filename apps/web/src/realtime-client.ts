import {
  PROTOCOL_VERSION,
  serverRealtimeEnvelopeSchema,
  type ClientRealtimeEnvelope,
} from '@strangr/contracts'
import { api } from './auth.js'

export class RealtimeClient {
  socket: WebSocket | null = null
  private attempts = 0
  private stopped = false
  private reconnectTimer: number | null = null
  constructor(
    private onEvent: (event: unknown) => void,
    private onStatus: (status: 'connected' | 'reconnecting' | 'ended') => void,
  ) {}
  async connect() {
    const { ticket } = await api<{ ticket: string }>('/v1/realtime/tickets', { method: 'POST' })
    const configured = import.meta.env.VITE_API_URL as string | undefined
    const apiUrl = new URL(configured ?? location.origin)
    apiUrl.protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:'
    apiUrl.pathname = '/ws'
    apiUrl.search = `ticket=${encodeURIComponent(ticket)}`
    this.socket = new WebSocket(apiUrl)
    this.socket.onopen = () => {
      this.attempts = 0
      this.onStatus('connected')
    }
    this.socket.onmessage = (message) => {
      const parsed = serverRealtimeEnvelopeSchema.safeParse(JSON.parse(String(message.data)))
      if (parsed.success) this.onEvent(parsed.data)
    }
    this.socket.onclose = () => this.reconnect()
  }
  send(type: ClientRealtimeEnvelope['type'], payload: ClientRealtimeEnvelope['payload']) {
    if (this.socket?.readyState !== WebSocket.OPEN) throw new Error('Realtime is not connected')
    this.socket.send(
      JSON.stringify({ version: PROTOCOL_VERSION, type, requestId: crypto.randomUUID(), payload }),
    )
  }
  stop() {
    this.stopped = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.socket?.close(1000, 'Client leaving')
    this.socket = null
  }
  private reconnect() {
    if (this.stopped) return
    if (this.attempts >= 5) {
      this.onStatus('ended')
      return
    }
    this.onStatus('reconnecting')
    const delay = Math.min(10_000, 500 * 2 ** this.attempts++) + Math.random() * 250
    this.reconnectTimer = window.setTimeout(
      () => void this.connect().catch(() => this.reconnect()),
      delay,
    )
  }
}
