import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanChatText, parseEnvelope } from '../../server/signaling/protocol.js'

test('protocol rejects malformed or unknown envelopes', () => {
  assert.equal(parseEnvelope(Buffer.from('{')).ok, false)
  assert.equal(parseEnvelope(Buffer.from(JSON.stringify({ type: 'admin.delete', payload: {} }))).ok, false)
  assert.equal(parseEnvelope(Buffer.from(JSON.stringify({ type: 'match.join', payload: { mode: 'video' } }))).ok, true)
})

test('chat cleaner strips control bytes and caps length without interpreting HTML', () => {
  const value = cleanChatText(`\u0000<script>alert(1)</script>${'x'.repeat(600)}`)
  assert.equal(value.startsWith('<script>'), true)
  assert.equal(value.length, 500)
})
