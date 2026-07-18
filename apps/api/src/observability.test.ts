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

  test("keeps nested provider codes from wrapped database errors", () => {
    const provider = Object.assign(new Error("relation does not exist"), {
      code: "42P01",
    });
    const cause = new Error("Failed query", { cause: provider });
    expect(new Observability({ environment: "test" }).error(cause)).toEqual({
      event: "application_error",
      environment: "test",
      error: {
        name: "Error",
        message: "[REDACTED]",
        cause: {
          name: "Error",
          message: "[REDACTED]",
          code: "42P01",
        },
      },
      context: {},
    });
  });
});
