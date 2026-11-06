import { DTP_MAGIC, HEADER_SIZE, MAX_PAYLOAD_SIZE } from "./constants";

import type { DTPMessage } from "./types";

export function encode(message: DTPMessage): Buffer {
  // 1. Convert the message into JSON
  const json = JSON.stringify(message);

  // 2. Convert JSON into UTF-8 bytes
  const payload = Buffer.from(json, "utf-8");

  // 3. Validate payload size
  if (payload.length > MAX_PAYLOAD_SIZE) {
    throw new Error("DTP payload is too large");
  }

  // 4. Allocate the complete frame
  const frame = Buffer.alloc(HEADER_SIZE + payload.length);

  // 5. Write protocol signature
  frame.write(DTP_MAGIC, 0, 4, "ascii");

  // 6. Write payload length (unsigned 32-bit, big-endian)
  frame.writeUInt32BE(payload.length, 4);

  // 7. Write payload after the header
  payload.copy(frame, HEADER_SIZE);

  return frame;
}
