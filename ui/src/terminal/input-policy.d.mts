// Type declarations for the ONE terminal control's input policy and mount model
// (milestone 46 / story 03 / task 04 — ADR-002). Framework-free by contract.

import type { SessionSource } from "./source-table.mjs";

export declare const POSTURE_INTERACTIVE: "interactive";
export declare const POSTURE_READ_ONLY: "read-only";
export type MountPostureName = "interactive" | "read-only";
export declare const POSTURES: readonly MountPostureName[];

export declare const KEYSTROKE_SINK: "onData";
export declare const SEND_PATH: "socket.send";
export declare const READ_ONLY_LABEL: "read-only";
export declare const READ_ONLY_LABEL_TITLE: string;

export interface MountDeclaration {
  readonly posture: MountPostureName;
  readonly readOnly: boolean;
}

export declare function mountPosture(posture: unknown): MountDeclaration;
export declare const MOUNT_INTERACTIVE: MountDeclaration;
export declare const MOUNT_READ_ONLY: MountDeclaration;

export interface InputPolicy {
  readonly canInput: boolean;
  readonly readOnly: boolean;
  readonly posture: MountPostureName;
  readonly inputEnabled: boolean;
  readonly disableStdin: boolean;
}

export declare function inputPolicyFor(
  source: Partial<SessionSource> | null | undefined,
  mount: MountDeclaration | MountPostureName | { readOnly?: boolean } | null | undefined,
): InputPolicy;

export interface MountHeaderModel {
  readonly readOnlyLabel: string | null;
  readonly readOnlyLabelTitle: string | null;
}

export interface MountModel extends MountHeaderModel {
  readonly posture: MountPostureName;
  readonly readOnly: boolean;
  readonly inputEnabled: boolean;
  readonly disableStdin: boolean;
  readonly stdin: "enabled" | "disabled";
  readonly keystrokeSinks: readonly string[];
  readonly sendPath: string | null;
  readonly cursor: { readonly blink: boolean; readonly style: "block" | "underline" };
  readonly inlineHeader: MountHeaderModel;
  readonly expandedHeader: MountHeaderModel;
  readonly inputRegion: null;
  readonly providerPickerOffered: boolean;
}

export declare function mountModelFor(input?: {
  source?: Partial<SessionSource> | null;
  mount?: MountDeclaration | MountPostureName | { readOnly?: boolean } | null;
}): MountModel;
