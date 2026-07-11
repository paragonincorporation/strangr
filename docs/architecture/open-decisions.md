# Open beta decisions

These decisions do not block the Unit 1 workspace foundation. A feature must remain disabled or use a safe non-production adapter until its decision has an owner and an approved ADR/policy update.

| Decision                          | Recommended starting point                                                   | Owner                               | Required before              |
| --------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------- | ---------------------------- |
| Launch countries                  | One or a small set of legally reviewed regions near Singapore infrastructure | Product + legal (unassigned)        | Public registration          |
| Initial terms/guidelines versions | Versioned documents accepted during onboarding                               | Product + safety (unassigned)       | Unit 7                       |
| Moderation reason taxonomy        | Small fixed taxonomy mapped to an approved sanction matrix                   | Safety (unassigned)                 | Unit 18                      |
| Delete-for-everyone window        | Short server-time window with tombstones                                     | Product + privacy (unassigned)      | Unit 16                      |
| Admin MFA method                  | Provider-supported phishing-resistant MFA where practical                    | Security (unassigned)               | Unit 19                      |
| TURN vendor                       | Managed-first; Twilio NTS is the initial candidate                           | Engineering/operations (unassigned) | Production WebRTC in Unit 11 |
| Premium plan name and price       | One monthly plan; no annual plan initially                                   | Product/business (unassigned)       | Unit 21                      |
| Ad network and consent platform   | Provider must explicitly accept 16+ random-chat UGC; approved CMP required   | Business + legal (unassigned)       | Unit 23                      |
| Capacity ceiling                  | Set from load tests and moderation coverage                                  | Engineering + safety (unassigned)   | Unit 28                      |
| Launch approval authority         | Named product, safety, engineering, and legal approvers                      | Leadership (unassigned)             | Unit 28                      |

“Unassigned” is deliberate: no accountable people are identified in the repository yet. Agents must not replace it with their own names.
