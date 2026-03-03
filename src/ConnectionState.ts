import type { LogLevel } from "./LogLevel";

export type ConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "failed";

export type WebRTCCallbacks = {
  readonly onRemoteStream: (stream: MediaStream) => void;
  readonly onConnectionStateChange: (state: ConnectionState) => void;
  readonly onLog: (message: string, type?: LogLevel) => void;
};
