import net from "node:net";
import { describe, expect, test } from "vitest";

function connect(port: number): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    socket.setTimeout(3_000);
    socket.once("connect", () => resolve(socket));
    socket.once("error", reject);
    socket.once("timeout", () =>
      reject(new Error(`Timed out connecting to ${port}`)),
    );
  });
}

describe("local integration services", () => {
  test("Postgres accepts a TCP connection", async () => {
    const socket = await connect(Number(process.env.POSTGRES_PORT || 5432));
    expect(socket.remotePort).toBe(Number(process.env.POSTGRES_PORT || 5432));
    socket.destroy();
  });

  test("Redis answers PING", async () => {
    const socket = await connect(Number(process.env.REDIS_PORT || 6379));
    const response = new Promise<string>((resolve, reject) => {
      socket.once("data", (data) => resolve(data.toString()));
      socket.once("error", reject);
    });
    socket.write("*1\r\n$4\r\nPING\r\n");
    await expect(response).resolves.toBe("+PONG\r\n");
    socket.destroy();
  });
});
