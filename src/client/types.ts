import { DTPResponse } from "../protocol/types";

export type DTPClientOptions = {
  host: string;
  port: number;
};

export type PendingRequest = {
  resolve: (response: DTPResponse) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};
