# Unit 3: React shells and visual system

The user and admin applications now render from React Router and TypeScript without the legacy DOM controller. `packages/ui` owns the shared visual tokens, accessible controls, dialogs, status region, tabs, skeleton, and responsive application frame.

The user application separates public, onboarding, signed-in, and conversation route families. TanStack Query owns server-state plumbing; Zustand is limited to transient call controls. The conversation preview includes text and video modes, media-permission fallback, report and block confirmation, focus restoration, and reachable safety controls at phone widths.

The admin application is a separately mounted router with its own login boundary and placeholder operational routes. Privileged controls remain visibly unavailable until later authorization and moderation units implement them.

Component and route tests cover dialog focus/cancel behavior, tabs, status announcements, reduced motion, navigation, mobile navigation, permission fallback, report choices, error recovery, and admin isolation. Manual browser checks cover desktop, tablet, and phone layouts.

These shells are intentionally non-authoritative. Authentication, entitlements, profile records, realtime identity, and enforcement decisions arrive in their scheduled units and must be sourced from the API rather than client state.
