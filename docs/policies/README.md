# Beta policy publication checklist

The repository stores policy version identifiers and acceptance records. It does not contain approved legal text yet.

Public registration stays closed until named human owners supply and approve:

- Terms of Service;
- Privacy Policy;
- Community Guidelines;
- cookie and analytics notice;
- subscription, cancellation, and refund terms;
- moderation and appeals policy;
- retention schedule;
- legal entity and support contact details.

For each release, set `CURRENT_TERMS_VERSION`, `CURRENT_PRIVACY_VERSION`, and `CURRENT_GUIDELINES_VERSION` to the published immutable versions. The web client reads the active identifiers from `GET /v1/policies/current`. A mismatch deliberately returns a conflict and prevents activation.

Material policy changes require a reacceptance design before their version is promoted. Agents may implement approved text and version transitions, but they must not draft legal approval into existence or mark this checklist complete without the named owners' sign-off.
