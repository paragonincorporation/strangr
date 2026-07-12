import type { AccountState } from "@paramingle/contracts";
export declare function canTransitionAccountState(from: AccountState, to: AccountState): boolean;
export declare function assertAccountStateTransition(from: AccountState, to: AccountState): void;
