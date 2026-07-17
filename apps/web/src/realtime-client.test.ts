import { beforeEach, describe, expect, test, vi } from "vitest";

const { api } = vi.hoisted(() => ({ api: vi.fn() }));

vi.mock("./auth.js", () => ({ api }));

import { RealtimeClient } from "./realtime-client.js";

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static instances: FakeWebSocket[] = [];
  readyState = FakeWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  send = vi.fn();
  close = vi.fn();

  constructor(readonly url: URL) {
    FakeWebSocket.instances.push(this);
  }

  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }
}

describe("RealtimeClient", () => {
  beforeEach(() => {
    api.mockReset();
    api.mockResolvedValue({ ticket: "ticket-value-that-is-long-enough" });
    FakeWebSocket.instances = [];
    vi.stubGlobal("WebSocket", FakeWebSocket);
  });

  test("does not resolve connect until the WebSocket opens", async () => {
    const statuses: string[] = [];
    const client = new RealtimeClient(vi.fn(), (status) =>
      statuses.push(status),
    );
    let connected = false;
    const connection = client.connect().then(() => {
      connected = true;
    });

    await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
    expect(connected).toBe(false);
    expect(statuses).toEqual(["connecting"]);

    FakeWebSocket.instances[0]!.open();
    await connection;

    expect(connected).toBe(true);
    expect(statuses).toEqual(["connecting", "connected"]);
  });

  test("sends only after the connection is open", async () => {
    const client = new RealtimeClient(vi.fn(), vi.fn());
    const connection = client.connect();
    await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));

    expect(() =>
      client.send("match.join", {
        mode: "video",
        allowPreferenceRelaxation: false,
      }),
    ).toThrow("Realtime is not connected");

    const socket = FakeWebSocket.instances[0]!;
    socket.open();
    await connection;
    client.send("match.join", {
      mode: "video",
      allowPreferenceRelaxation: false,
    });

    expect(socket.send).toHaveBeenCalledOnce();
  });
});
