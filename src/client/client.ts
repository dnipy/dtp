import net from "node:net";
import { DTPDecoder } from "../protocol/decoder";
import { encode } from "../protocol/encoder";
import type { DTPRequest, DTPResponse } from "../protocol/types";
import { DTPClientOptions, PendingRequest } from "./types";
import { DTPError } from "./errors";

export class DTPClient {
  private socket: net.Socket | null = null;

  private decoder = new DTPDecoder();

  private nextId = 1;

  private pending = new Map<number, PendingRequest>();

  private connectPromise: Promise<void> | null = null;

  constructor(private readonly options: DTPClientOptions) {}

  // Establish the TCP connection
  async connect(): Promise<void> {
    if (
      this.socket &&
      !this.socket.destroyed &&
      this.socket.readyState === "open"
    ) {
      return;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    const socket = net.createConnection({
      host: this.options.host,
      port: this.options.port,
    });

    this.socket = socket;
    this.decoder = new DTPDecoder();

    const connectionPromise = new Promise<void>((resolve, reject) => {
      let connected = false;

      socket.once("connect", () => {
        connected = true;
        console.log("[DTP CLIENT] Connected");
        resolve();
      });

      socket.on("data", (chunk) => {
        this.handleData(chunk, socket);
      });

      socket.on("error", (error) => {
        if (!connected) {
          reject(error);
        }

        this.rejectAll(error);
      });

      socket.on("close", () => {
        console.log("[DTP CLIENT] Connection closed");

        this.rejectAll(new Error("DTP connection closed"));

        if (this.socket === socket) {
          this.socket = null;
        }
      });
    });

    this.connectPromise = connectionPromise;

    try {
      await connectionPromise;
    } finally {
      if (this.connectPromise === connectionPromise) {
        this.connectPromise = null;
      }
    }
  }

  // Handle incoming TCP data and match responses
  private handleData(chunk: Buffer, socket: net.Socket): void {
    try {
      const messages = this.decoder.push(chunk);

      for (const message of messages) {
        if (message.type !== "RESPONSE") {
          throw new Error("Expected a DTP response");
        }

        const pending = this.pending.get(message.id);

        // Ignore responses that don't match a pending request.
        if (!pending) {
          continue;
        }

        clearTimeout(pending.timer);
        this.pending.delete(message.id);

        if (message.status === "ERROR") {
          const code =
            typeof message.payload.code === "string"
              ? message.payload.code
              : "UNKNOWN_ERROR";

          const errorMessage =
            typeof message.payload.message === "string"
              ? message.payload.message
              : "The DTP server returned an error";

          pending.reject(new DTPError(errorMessage, code, message.id));

          continue;
        }

        pending.resolve(message);
      }
    } catch (error) {
      socket.destroy(
        error instanceof Error ? error : new Error("Invalid DTP response")
      );
    }
  }

  // Send a request and wait for its response
  async request(
    command: string,
    payload: Record<string, unknown> = {},
    timeoutMs = 5000
  ): Promise<DTPResponse> {
    await this.connect();

    const socket = this.socket;

    if (!socket || socket.destroyed) {
      throw new Error("DTP client is not connected");
    }

    const id = this.nextId++;

    const request: DTPRequest = {
      version: 1,
      id,
      type: "REQUEST",
      command,
      payload,
    };

    return new Promise<DTPResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.rejectRequest(id, new Error(`Request timed out: ${command}`));
      }, timeoutMs);

      this.pending.set(id, {
        resolve,
        reject,
        timer,
      });

      try {
        socket.write(encode(request), (error) => {
          if (error) {
            this.rejectRequest(id, error);
          }
        });
      } catch (error) {
        this.rejectRequest(
          id,
          error instanceof Error
            ? error
            : new Error("Failed to send DTP request")
        );
      }
    });
  }

  // Reject one pending request
  private rejectRequest(id: number, error: Error): void {
    const pending = this.pending.get(id);

    if (!pending) {
      return;
    }

    clearTimeout(pending.timer);
    this.pending.delete(id);

    pending.reject(error);
  }

  // Reject all pending requests
  private rejectAll(error: Error): void {
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(error);
      this.pending.delete(id);
    }
  }

  // Convenience methods
  ping(): Promise<DTPResponse> {
    return this.request("PING");
  }

  echo(message: string): Promise<DTPResponse> {
    return this.request("ECHO", { message });
  }

  time(): Promise<DTPResponse> {
    return this.request("TIME");
  }

  set(key: string, value: unknown): Promise<DTPResponse> {
    return this.request("SET", { key, value });
  }

  get(key: string): Promise<DTPResponse> {
    return this.request("GET", { key });
  }

  // Gracefully close the TCP connection
  async disconnect(): Promise<void> {
    const socket = this.socket;

    if (!socket || socket.destroyed) {
      return;
    }

    await new Promise<void>((resolve) => {
      socket.once("close", () => resolve());
      socket.end();
    });
  }
}
