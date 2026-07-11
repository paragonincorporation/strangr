# ADR 0007: managed-first TURN

Status: accepted by `plan.md`  
Date: July 11, 2026

## Decision

Keep peer-to-peer WebRTC media, use development STUN locally, and begin production with a managed TURN service. The authenticated API issues short-lived credentials. Document coturn as the later cost-control alternative.

## Consequences

Permanent TURN credentials never enter a client bundle or repository. Relay success, region, bandwidth, and cost per call-hour become launch metrics. The final managed provider remains an open operational decision.
