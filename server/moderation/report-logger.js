export function logReport(report) {
  // TODO(v2): persist to a moderation store and add an escalation queue.
  // TODO(v2): add repeat-offender throttling without creating durable identity profiles.
  console.info(JSON.stringify({ event: 'moderation.report', ...report }))
}
