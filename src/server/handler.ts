import type { DTPRequest, DTPResponse } from "../protocol/types";
import { createResponse } from "../protocol/types";

const storage = new Map<string, unknown>();

export function handleCommand(request: DTPRequest): DTPResponse {
  const { id, command, payload } = request;

  try {
    switch (command.toUpperCase()) {
      case "PING": {
        return createResponse(id, "OK", {
          message: "PONG",
        });
      }

      case "ECHO": {
        return createResponse(id, "OK", {
          message: payload.message ?? null,
        });
      }

      case "TIME": {
        return createResponse(id, "OK", {
          time: new Date().toISOString(),
        });
      }

      case "SET": {
        const { key, value } = payload;

        if (typeof key !== "string" || key.length === 0) {
          throw new Error("SET requires a valid key");
        }

        storage.set(key, value);

        return createResponse(id, "OK", {
          message: "Value stored",
        });
      }

      case "GET": {
        const { key } = payload;

        if (typeof key !== "string" || key.length === 0) {
          throw new Error("GET requires a valid key");
        }

        const value = storage.get(key);

        return createResponse(id, "OK", {
          value: value ?? null,
        });
      }

      default: {
        return createResponse(id, "ERROR", {
          code: "UNKNOWN_COMMAND",
          message: `Unknown command: ${command}`,
        });
      }
    }
  } catch (error) {
    return createResponse(id, "ERROR", {
      code: "COMMAND_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
