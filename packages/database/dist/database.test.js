import { describe, expect, test } from 'vitest';
import { assertAccountStateTransition, canTransitionAccountState, createAesGcmFieldEncryptor, normalizeUsername, } from './index.js';
describe('database domain boundaries', () => {
    test('normalizes usernames consistently', () => expect(normalizeUsername('  ADA_1 ')).toBe('ada_1'));
    test('validates account transitions', () => {
        expect(canTransitionAccountState('active', 'suspended')).toBe(true);
        expect(() => assertAccountStateTransition('deleted', 'active')).toThrow(/Invalid account state transition/);
    });
    test('encrypts birth dates without retaining plaintext', () => {
        const encryptor = createAesGcmFieldEncryptor(new Uint8Array(32).fill(7), 'test-v1');
        const encrypted = encryptor.encrypt('2000-01-02');
        expect(encrypted.ciphertext).not.toContain('2000-01-02');
        expect(encryptor.decrypt(encrypted)).toBe('2000-01-02');
    });
});
