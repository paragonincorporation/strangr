import { describe, expect, test, vi } from "vitest";
import { applySenderPolicy, STANDARD_MEDIA_POLICY } from "./media.js";

describe("media quality policy", () => {
  test("applies bounded sender bitrate when supported", async () => {
    const setParameters = vi.fn().mockResolvedValue(undefined);
    const sender = {
      track: { kind: "video" },
      getParameters: () => ({ encodings: [{}] }),
      setParameters,
    } as unknown as RTCRtpSender;
    expect(await applySenderPolicy(sender, STANDARD_MEDIA_POLICY)).toBe(true);
    expect(setParameters).toHaveBeenCalledWith(
      expect.objectContaining({
        encodings: [expect.objectContaining({ maxBitrate: 900_000 })],
      }),
    );
  });
  test("falls back without breaking unsupported browsers", async () => {
    const sender = {
      track: { kind: "video" },
      getParameters: () => ({}),
      setParameters: vi.fn().mockRejectedValue(new Error("unsupported")),
    } as unknown as RTCRtpSender;
    expect(await applySenderPolicy(sender, STANDARD_MEDIA_POLICY)).toBe(false);
  });
});
