import test from 'node:test'
import assert from 'node:assert/strict'
import { SessionMachine } from '../../public/js/state/session-machine.js'

test('session machine follows the approved lifecycle and rejects stale events', () => {
  const machine = new SessionMachine()
  assert.equal(machine.transition('MATCHED'), false)
  assert.equal(machine.transition('START'), true)
  assert.equal(machine.state, 'matching')
  machine.transition('MATCHED')
  machine.transition('SOCKET_LOST')
  assert.equal(machine.state, 'reconnecting')
  machine.transition('RESTORED')
  assert.equal(machine.state, 'connected')
  machine.transition('END')
  assert.equal(machine.state, 'ended')
  machine.transition('RESET')
  assert.equal(machine.state, 'idle')
})
