import { describe, expect, test } from 'vitest';
import { avatarUploadInitRequestSchema, MAX_REALTIME_MESSAGE_BYTES, onboardingRequestSchema, parseClientRealtimeMessage, } from './index.js';
describe('contracts', () => {
    test('round trips a valid onboarding request and rejects unsafe usernames', () => {
        const value = {
            step: 'profile',
            username: 'Ada_1',
            displayName: 'Ada',
            isPrivate: true,
        };
        expect(onboardingRequestSchema.parse(value)).toEqual(value);
        expect(onboardingRequestSchema.safeParse({ ...value, username: '../ada' }).success).toBe(false);
    });
    test('limits avatar uploads before storage allocation', () => {
        expect(avatarUploadInitRequestSchema.safeParse({
            byteSize: 5 * 1024 * 1024 + 1,
            contentType: 'image/png',
        }).success).toBe(false);
        expect(avatarUploadInitRequestSchema.safeParse({ byteSize: 100, contentType: 'image/svg+xml' })
            .success).toBe(false);
    });
    test.each([
        [
            'unknown command',
            JSON.stringify({ version: 1, type: 'match.join', requestId: 'request_123', payload: {} }),
        ],
        [
            'unsupported version',
            JSON.stringify({
                version: 2,
                type: 'connection.ping',
                requestId: 'request_123',
                payload: { sentAt: new Date().toISOString() },
            }),
        ],
        [
            'malformed id',
            JSON.stringify({
                version: 1,
                type: 'connection.ping',
                requestId: '!',
                payload: { sentAt: new Date().toISOString() },
            }),
        ],
    ])('rejects %s', (_name, input) => expect(parseClientRealtimeMessage(input).success).toBe(false));
    test('rejects oversized input before parsing', () => {
        expect(parseClientRealtimeMessage('x'.repeat(MAX_REALTIME_MESSAGE_BYTES + 1))).toEqual({
            success: false,
            error: 'payload_too_large',
        });
    });
});
