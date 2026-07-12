import type { AccountState } from "@paramingle/contracts";

const transitions: Readonly<Record<AccountState, readonly AccountState[]>> = {
  pending_verification: ["onboarding", "banned", "deletion_pending"],
  onboarding: ["active", "banned", "deletion_pending"],
  active: ["limited", "suspended", "banned", "deletion_pending"],
  limited: ["active", "suspended", "banned", "deletion_pending"],
  suspended: ["active", "limited", "banned", "deletion_pending"],
  deletion_pending: ["active", "deleted"],
  banned: ["active", "deleted"],
  deleted: [],
};

export function canTransitionAccountState(
  from: AccountState,
  to: AccountState,
): boolean {
  return from === to || transitions[from].includes(to);
}

export function assertAccountStateTransition(
  from: AccountState,
  to: AccountState,
): void {
  if (!canTransitionAccountState(from, to))
    throw new Error(`Invalid account state transition: ${from} -> ${to}`);
}
