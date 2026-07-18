const SENSITIVE_KEYS =
  /authorization|cookie|token|secret|password|birth|email|body|message|sdp|candidate|stripe-signature/i;

export function redactLogValue(value: unknown, key = ""): unknown {
  if (SENSITIVE_KEYS.test(key)) return "[REDACTED]";
  if (Array.isArray(value)) return value.map((item) => redactLogValue(item));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        redactLogValue(v, k),
      ]),
    );
  return value;
}

/** A provider-neutral metrics boundary. Provider exporters are configured only after H16. */
export class Observability {
  private counters = new Map<string, number>();
  constructor(private tags: Record<string, string>) {}
  increment(name: string, value = 1) {
    this.counters.set(name, (this.counters.get(name) ?? 0) + value);
  }
  observe(name: string, value: number) {
    if (!Number.isFinite(value) || value < 0) return;
    this.increment(`${name}.count`);
    this.increment(`${name}.sum`, value);
    this.counters.set(
      `${name}.max`,
      Math.max(this.counters.get(`${name}.max`) ?? 0, value),
    );
  }
  snapshot() {
    return Object.fromEntries(this.counters);
  }
  error(error: unknown, context: Record<string, unknown> = {}) {
    const errorCode =
      error instanceof Error &&
      "code" in error &&
      ["string", "number"].includes(typeof error.code)
        ? error.code
        : undefined;
    return {
      event: "application_error",
      ...this.tags,
      error: redactLogValue(
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              ...(errorCode === undefined ? {} : { code: errorCode }),
            }
          : error,
      ),
      context: redactLogValue(context),
    };
  }
}
