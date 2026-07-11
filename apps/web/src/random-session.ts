export type RandomSessionState =
  | { status: 'idle' }
  | { status: 'requesting_media'; mode: 'video' }
  | { status: 'queued'; mode: 'text' | 'video' }
  | {
      status: 'matched' | 'connecting' | 'connected' | 'reconnecting'
      mode: 'text' | 'video'
      matchId: string
      peerId: string
    }
  | { status: 'leaving' | 'next'; mode: 'text' | 'video'; matchId: string }
  | { status: 'ended'; reason: string }

export type RandomSessionEvent =
  | { type: 'START'; mode: 'text' | 'video' }
  | { type: 'MEDIA_READY' | 'QUEUED'; mode: 'text' | 'video' }
  | { type: 'MATCHED'; mode: 'text' | 'video'; matchId: string; peerId: string }
  | { type: 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' }
  | { type: 'LEAVE' | 'NEXT' }
  | { type: 'END'; reason: string }

export function transition(
  state: RandomSessionState,
  event: RandomSessionEvent,
): RandomSessionState {
  if (event.type === 'END') return { status: 'ended', reason: event.reason }
  if (state.status === 'idle' && event.type === 'START')
    return event.mode === 'video'
      ? { status: 'requesting_media', mode: 'video' }
      : { status: 'queued', mode: 'text' }
  if (state.status === 'requesting_media' && event.type === 'MEDIA_READY')
    return { status: 'queued', mode: event.mode }
  if (state.status === 'queued' && event.type === 'MATCHED')
    return { status: 'matched', mode: event.mode, matchId: event.matchId, peerId: event.peerId }
  if (state.status === 'matched' && event.type === 'CONNECTING')
    return { ...state, status: 'connecting' }
  if (
    (state.status === 'matched' ||
      state.status === 'connecting' ||
      state.status === 'reconnecting') &&
    event.type === 'CONNECTED'
  )
    return { ...state, status: 'connected' }
  if (
    (state.status === 'matched' || state.status === 'connecting' || state.status === 'connected') &&
    event.type === 'RECONNECTING'
  )
    return { ...state, status: 'reconnecting' }
  if ('matchId' in state && 'mode' in state && event.type === 'LEAVE')
    return { status: 'leaving', mode: state.mode, matchId: state.matchId }
  if ('matchId' in state && 'mode' in state && event.type === 'NEXT')
    return { status: 'next', mode: state.mode, matchId: state.matchId }
  return state
}
