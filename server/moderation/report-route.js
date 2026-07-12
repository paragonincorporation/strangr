import { randomUUID } from "node:crypto";
import { logReport } from "./report-logger.js";

export const REPORT_REASONS = new Set([
  "harassment",
  "sexual-content",
  "hate-or-abuse",
  "spam-or-scam",
  "underage-concern",
  "other",
]);

const clean = (value, max) =>
  typeof value === "string"
    ? value
        .replace(/[\u0000-\u001F\u007F]/g, " ")
        .trim()
        .slice(0, max)
    : "";

export function createReportHandler({
  sessions,
  reportLimiter,
  logger = logReport,
  now = Date.now,
}) {
  return (request, response) => {
    const { reportToken, reason } = request.body || {};
    const session = [...sessions.sessions.values()].find(
      (candidate) => candidate.reportToken === reportToken,
    );

    if (!session || !session.pairId) {
      return response.status(401).json({ error: "invalid_report_token" });
    }
    if (!REPORT_REASONS.has(reason)) {
      return response.status(400).json({ error: "invalid_reason" });
    }

    const limit = reportLimiter.consume(session.id);
    if (!limit.allowed) {
      response.setHeader(
        "Retry-After",
        String(Math.ceil(limit.retryAfterMs / 1000)),
      );
      return response
        .status(429)
        .json({ error: "rate_limited", retryAfterMs: limit.retryAfterMs });
    }

    logger({
      reportId: randomUUID(),
      timestamp: new Date(now()).toISOString(),
      sessionId: session.id,
      pairId: session.pairId,
      reason,
      note: clean(request.body.note, 500),
      snippet: clean(request.body.snippet, 160),
    });

    // TODO(v2): block the reported peer for the reporter before their next match.
    return response.status(202).json({ accepted: true });
  };
}
