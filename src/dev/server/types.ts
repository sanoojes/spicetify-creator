import type { Message } from "esbuild";

export type BuildEvent =
  | { type: "build-error"; errors: Message[]; warnings: Message[] }
  | { type: "build-success"; errors: Message[]; warnings: Message[] };

export type HMRMessage = string[] | BuildEvent;

export type BroadcastFunction = (data: HMRMessage) => void;

export type HMRServer = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  broadcast: BroadcastFunction;
  port: number;
  isRunning: boolean;
  link: string;
  wsLink: string;
};
