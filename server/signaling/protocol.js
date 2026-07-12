const CLIENT_TYPES = new Set([
  "session.resume",
  "match.join",
  "match.next",
  "match.cancel",
  "rtc.signal",
  "chat.message",
  "chat.typing",
  "media.state",
  "session.end",
]);

export const MAX_SOCKET_MESSAGE_BYTES = 16_384;
export const MAX_CHAT_LENGTH = 500;

export function parseEnvelope(raw) {
  if (raw.length > MAX_SOCKET_MESSAGE_BYTES) {
    return { ok: false, code: "message_too_large" };
  }

  try {
    const envelope = JSON.parse(raw.toString());
    if (
      !envelope ||
      typeof envelope !== "object" ||
      !CLIENT_TYPES.has(envelope.type)
    ) {
      return { ok: false, code: "invalid_message" };
    }
    return {
      ok: true,
      envelope: {
        type: envelope.type,
        requestId:
          typeof envelope.requestId === "string"
            ? envelope.requestId.slice(0, 80)
            : undefined,
        payload:
          envelope.payload && typeof envelope.payload === "object"
            ? envelope.payload
            : {},
      },
    };
  } catch {
    return { ok: false, code: "invalid_json" };
  }
}

export function send(socket, type, payload = {}, requestId) {
  if (!socket || socket.readyState !== 1) return false;
  socket.send(
    JSON.stringify({ type, ...(requestId ? { requestId } : {}), payload }),
  );
  return true;
}

export function cleanChatText(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, MAX_CHAT_LENGTH);
}
