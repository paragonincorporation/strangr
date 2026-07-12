export function createEnvelope(
  type,
  payload = {},
  requestId = crypto.randomUUID(),
) {
  return { type, requestId, payload };
}

export function parseServerMessage(raw) {
  try {
    const envelope = JSON.parse(raw);
    if (
      !envelope ||
      typeof envelope.type !== "string" ||
      typeof envelope.payload !== "object"
    )
      return null;
    return envelope;
  } catch {
    return null;
  }
}
