import test from "node:test";
import assert from "node:assert/strict";
import { DTP_MAGIC, HEADER_SIZE } from "../../src/protocol/constants";
import { encode } from "../../src/protocol/encoder";
import type { DTPRequest } from "../../src/protocol/types";

test("encodes a DTP message with the correct header", () => {
  const message: DTPRequest = {
    version: 1,
    id: 1,
    type: "REQUEST",
    command: "PING",
    payload: {},
  };

  const frame = encode(message);

  const magic = frame.toString("ascii", 0, 4);
  const payloadLength = frame.readUInt32BE(4);

  assert.equal(magic, DTP_MAGIC);
  assert.equal(frame.length, HEADER_SIZE + payloadLength);

  const payload = JSON.parse(frame.subarray(HEADER_SIZE).toString("utf-8"));

  assert.deepEqual(payload, message);
});

test("uses UTF-8 byte length for the payload", () => {
  const message: DTPRequest = {
    version: 1,
    id: 2,
    type: "REQUEST",
    command: "ECHO",
    payload: {
      message: "Hello 🌍",
    },
  };

  const frame = encode(message);

  const payloadLength = frame.readUInt32BE(4);

  assert.equal(
    payloadLength,
    Buffer.byteLength(JSON.stringify(message), "utf-8")
  );
});

test("rejects payloads larger than the maximum size", () => {
  const message: DTPRequest = {
    version: 1,
    id: 3,
    type: "REQUEST",
    command: "ECHO",
    payload: {
      message: "a".repeat(1024 * 1024),
    },
  };

  assert.throws(() => encode(message), /payload is too large/);
});
