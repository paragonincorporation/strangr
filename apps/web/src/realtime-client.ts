import {
  PROTOCOL_VERSION,
  serverRealtimeEnvelopeSchema,
  type ClientRealtimeEnvelope,
} from "@paramingle/contracts";
import { api } from "./auth.js";

export class RealtimeClient {
  socket: WebSocket | null = null;
  private attempts = 0;
  private stopped = false;
  private reconnectTimer: number | null = null;
  constructor(
    private onEvent: (event: unknown) => void,
    private onStatus: (
      status: "connecting" | "connected" | "reconnecting" | "ended",
    ) => void,
  ) {}
  async connect() {
    this.onStatus(this.attempts === 0 ? "connecting" : "reconnecting");
    const { ticket } = await api<{ ticket: string }>("/v1/realtime/tickets", {
      method: "POST",
    });
    const configured = import.meta.env.VITE_API_URL as string | undefined;
    const apiUrl = new URL(configured ?? location.origin);
    apiUrl.protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
    apiUrl.pathname = "/ws";
    apiUrl.search = `ticket=${encodeURIComponent(ticket)}`;
    const socket = new WebSocket(apiUrl);
    this.socket = socket;
    await new Promise<void>((resolve, reject) => {
      let opened = false;
      socket.onopen = () => {
        opened = true;
        this.attempts = 0;
        this.onStatus("connected");
        resolve();
      };
      socket.onmessage = (message) => {
        try {
          const parsed = serverRealtimeEnvelopeSchema.safeParse(
            JSON.parse(String(message.data)),
          );
          if (parsed.success) this.onEvent(parsed.data);
        } catch {
          // Invalid server messages are ignored; the socket remains usable.
        }
      };
      socket.onerror = () => {
        if (!opened) reject(new Error("Realtime connection failed"));
      };
      socket.onclose = () => {
        if (!opened) reject(new Error("Realtime connection closed"));
        else this.reconnect();
      };
    });
  }
  send(
    type: ClientRealtimeEnvelope["type"],
    payload: ClientRealtimeEnvelope["payload"],
  ) {
    if (this.socket?.readyState !== WebSocket.OPEN)
      throw new Error("Realtime is not connected");
    this.socket.send(
      JSON.stringify({
        version: PROTOCOL_VERSION,
        type,
        requestId: crypto.randomUUID(),
        payload,
      }),
    );
  }
  stop() {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.socket?.close(1000, "Client leaving");
    this.socket = null;
  }
  private reconnect() {
    if (this.stopped) return;
    this.socket = null;
    if (this.attempts >= 5) {
      this.onStatus("ended");
      return;
    }
    this.onStatus("reconnecting");
    const delay =
      Math.min(10_000, 500 * 2 ** this.attempts++) + Math.random() * 250;
    this.reconnectTimer = window.setTimeout(
      () => void this.connect().catch(() => this.reconnect()),
      delay,
    );
  }
}
