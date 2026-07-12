import { describe, expect, test } from "vitest";
import { avatarUploadInitRequestSchema, clientRealtimeEnvelopeSchema, directMessageSendSchema, MAX_REALTIME_MESSAGE_BYTES, onboardingRequestSchema, parseClientRealtimeMessage, } from "./index.js";
describe("contracts", () => {
    test("round trips a valid onboarding request and rejects unsafe usernames", () => {
        const value = {
            step: "profile",
            username: "Ada_1",
            displayName: "Ada",
            isPrivate: true,
        };
        expect(onboardingRequestSchema.parse(value)).toEqual(value);
        expect(onboardingRequestSchema.safeParse({ ...value, username: "../ada" })
            .success).toBe(false);
    });
    test("limits avatar uploads before storage allocation", () => {
        expect(avatarUploadInitRequestSchema.safeParse({
            byteSize: 5 * 1024 * 1024 + 1,
            contentType: "image/png",
        }).success).toBe(false);
        expect(avatarUploadInitRequestSchema.safeParse({
            byteSize: 100,
            contentType: "image/svg+xml",
        }).success).toBe(false);
    });
    test.each([
        [
            "unknown command",
            JSON.stringify({
                version: 1,
                type: "match.join",
                requestId: "request_123",
                payload: {},
            }),
        ],
        [
            "unsupported version",
            JSON.stringify({
                version: 2,
                type: "connection.ping",
                requestId: "request_123",
                payload: { sentAt: new Date().toISOString() },
            }),
        ],
        [
            "malformed id",
            JSON.stringify({
                version: 1,
                type: "connection.ping",
                requestId: "!",
                payload: { sentAt: new Date().toISOString() },
            }),
        ],
    ])("rejects %s", (_name, input) => expect(parseClientRealtimeMessage(input).success).toBe(false));
    test("rejects oversized input before parsing", () => {
        expect(parseClientRealtimeMessage("x".repeat(MAX_REALTIME_MESSAGE_BYTES + 1))).toEqual({
            success: false,
            error: "payload_too_large",
        });
    });
    test("validates persistent message and direct-call envelopes", () => {
        expect(clientRealtimeEnvelopeSchema.safeParse({
            version: 1,
            type: "call.rtc.offer",
            requestId: "request_12345678",
            payload: { callId: "11111111-1111-4111-8111-111111111111", sdp: "v=0" },
        }).success).toBe(true);
        expect(directMessageSendSchema.safeParse({
            clientMessageId: "22222222-2222-4222-8222-222222222222",
            body: "<script>alert(1)</script>",
        }).success).toBe(true);
        expect(directMessageSendSchema.safeParse({
            clientMessageId: "33333333-3333-4333-8333-333333333333",
            body: "x".repeat(2_001),
        }).success).toBe(false);
    });
});
