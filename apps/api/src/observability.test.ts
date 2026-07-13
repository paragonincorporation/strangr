import { describe, expect, test } from "vitest";
import { redactLogValue } from "./observability.js";

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
});
