import { describe, expect, test } from "vitest";
import { Observability, redactLogValue } from "./observability.js";

describe("observability redaction", () => {
  test("removes sensitive fields recursively without removing safe tags", () => {
    expect(
      redactLogValue({
        environment: "staging",
        authorization: "Bearer x",
        nested: { message: "private", count: 2 },
      }),
    ).toEqual({
      environment: "staging",
      authorization: "[REDACTED]",
      nested: { message: "[REDACTED]", count: 2 },
    });
  });

  test("keeps a structured provider error code while redacting its message", () => {
    const cause = Object.assign(new Error("connection details"), {
      code: "ECONNRESET",
    });
    expect(new Observability({ environment: "test" }).error(cause)).toEqual({
      event: "application_error",
      environment: "test",
      error: {
        name: "Error",
        message: "[REDACTED]",
        code: "ECONNRESET",
      },
      context: {},
    });
  });
});
