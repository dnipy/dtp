import { DTP_MAGIC, HEADER_SIZE, MAX_PAYLOAD_SIZE } from "./constants";
import type { DTPMessage } from "./types";

export class DTPDecoder {
  private buffer = Buffer.alloc(0);

  push(chunk: Buffer): DTPMessage[] {
    // Append newly received bytes to previous bytes.
    this.buffer = Buffer.concat([this.buffer, chunk]);

    const messages: DTPMessage[] = [];

    let offset = 0;

    // A complete header must be available first.
    while (this.buffer.length - offset >= HEADER_SIZE) {
      // 1. Read and validate protocol signature.
      const magic = this.buffer.toString("ascii", offset, offset + 4);

      if (magic !== DTP_MAGIC) {
        throw new Error("Invalid DTP magic signature");
      }

      // 2. Read payload length.
      const payloadLength = this.buffer.readUInt32BE(offset + 4);

      // 3. Protect against oversized messages.
      if (payloadLength > MAX_PAYLOAD_SIZE) {
        throw new Error("DTP payload exceeds maximum size");
      }

      // 4. Calculate complete frame size.
      const frameLength = HEADER_SIZE + payloadLength;

      // 5. Wait for more bytes if frame is incomplete.
      if (this.buffer.length - offset < frameLength) {
        break;
      }

      // 6. Extract payload.
      const payloadBuffer = this.buffer.subarray(
        offset + HEADER_SIZE,
        offset + frameLength
      );

      // 7. Decode JSON.
      let parsed: unknown;

      try {
        parsed = JSON.parse(payloadBuffer.toString("utf-8"));
      } catch {
        throw new Error("Invalid DTP JSON payload");
      }

      // 8. Validate message structure.
      const message = this.validateMessage(parsed);

      messages.push(message);

      // Move to the next frame.
      offset += frameLength;
    }

    // Preserve incomplete bytes for the next TCP chunk.
    this.buffer = Buffer.from(this.buffer.subarray(offset));

    return messages;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private validateMessage(value: unknown): DTPMessage {
    if (!this.isRecord(value)) {
      throw new Error("Invalid DTP message: expected an object");
    }

    if (value.version !== 1) {
      throw new Error("Unsupported DTP version");
    }

    if (!Number.isSafeInteger(value.id) || (value.id as number) < 1) {
      throw new Error("Invalid DTP message ID");
    }

    if (!this.isRecord(value.payload)) {
      throw new Error("Invalid DTP payload");
    }

    if (value.type === "REQUEST") {
      if (typeof value.command !== "string" || value.command.length === 0) {
        throw new Error("Invalid DTP command");
      }

      return value as unknown as DTPMessage;
    }

    if (value.type === "RESPONSE") {
      if (value.status !== "OK" && value.status !== "ERROR") {
        throw new Error("Invalid DTP response status");
      }

      return value as unknown as DTPMessage;
    }

    throw new Error("Unknown DTP message type");
  }
}
