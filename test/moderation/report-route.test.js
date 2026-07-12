import test from "node:test";
import assert from "node:assert/strict";
import { createReportHandler } from "../../server/moderation/report-route.js";
import { TokenBucket } from "../../server/moderation/rate-limiter.js";

function responseRecorder() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("report handler validates pair token and truncates logged text", () => {
  const session = { id: "session-1", pairId: "pair-1", reportToken: "token-1" };
  const sessions = { sessions: new Map([[session.id, session]]) };
  const reports = [];
  const handler = createReportHandler({
    sessions,
    reportLimiter: new TokenBucket({ capacity: 2, refillEveryMs: 30_000 }),
    logger: (report) => reports.push(report),
    now: () => 0,
  });
  const response = responseRecorder();
  handler(
    {
      body: {
        reportToken: "token-1",
        reason: "harassment",
        note: "n".repeat(700),
        snippet: "<script>alert(1)</script>".repeat(20),
      },
    },
    response,
  );

  assert.equal(response.statusCode, 202);
  assert.equal(reports.length, 1);
  assert.equal(reports[0].note.length, 500);
  assert.equal(reports[0].snippet.length, 160);
  assert.equal("video" in reports[0], false);
});

test("report handler rejects invalid reasons and tokens", () => {
  const sessions = { sessions: new Map() };
  const handler = createReportHandler({
    sessions,
    reportLimiter: new TokenBucket({ capacity: 1, refillEveryMs: 1_000 }),
  });
  const response = responseRecorder();
  handler({ body: { reportToken: "bad", reason: "other" } }, response);
  assert.equal(response.statusCode, 401);
});
