# Unit 4 contracts and configuration

`@strangr/contracts` is the transport-neutral source for implemented HTTP and realtime boundaries. Event envelopes use protocol version 1. Additive response/event fields must be optional for old clients; removing, renaming, changing meaning, or making a field required needs a new protocol version and coordinated deployment.

The namespaces `connection`, `presence`, `match`, `rtc`, `chat`, `friend`, `call`, `report`, and `error` are reserved. Reservation does not validate a message: every accepted command needs a discriminated Zod payload schema first.

`@strangr/config` separates server-only configuration from the four allowed browser-public values. Production has no secret defaults and startup errors identify variable names and validation reasons without echoing values. OpenAPI is available at `/documentation` in local/test environments only; production requires a future admin-authorized exposure path.
