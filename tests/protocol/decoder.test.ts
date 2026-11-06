import test from "node:test";
import assert from "node:assert/strict";
import { DTP_MAGIC, HEADER_SIZE } from "../../src/protocol/constants";
import { encode } from "../../src/protocol/encoder";
import { DTPDecoder } from "../../src/protocol/decoder";
import type { DTPRequest } from "../../src/protocol/types";

function createRequest(id: number, command: string): DTPRequest {
  return {
    version: 1,
    id,
    type: "REQUEST",
    command,
    payload: {},
  };
}

function createRawFrame(payload: string): Buffer {
  const payloadBuffer = Buffer.from(payload, "utf-8");
  const frame = Buffer.alloc(HEADER_SIZE + payloadBuffer.length);

  frame.write(DTP_MAGIC, 0, 4, "ascii");
  frame.writeUInt32BE(payloadBuffer.length, 4);
  payloadBuffer.copy(frame, HEADER_SIZE);

  return frame;
}

test("decodes a complete DTP frame", () => {
  const decoder = new DTPDecoder();

  const request = createRequest(1, "PING");
  const frame = encode(request);

  const messages = decoder.push(frame);

  assert.equal(messages.length, 1);
  assert.deepEqual(messages[0], request);
});

test("waits for the remaining bytes of an incomplete frame", () => {
  const decoder = new DTPDecoder();

  const request = createRequest(1, "PING");
  const frame = encode(request);

  const firstChunk = frame.subarray(0, 5);
  const secondChunk = frame.subarray(5);

  assert.deepEqual(decoder.push(firstChunk), []);

  const messages = decoder.push(secondChunk);

  assert.equal(messages.length, 1);
  assert.deepEqual(messages[0], request);
});

test("decodes multiple frames from one TCP chunk", () => {
  const decoder = new DTPDecoder();

  const first = encode(createRequest(1, "PING"));
  const second = encode(createRequest(2, "TIME"));

  const messages = decoder.push(Buffer.concat([first, second]));

  assert.equal(messages.length, 2);
  assert.equal(messages?.at(0)?.id, 1);
  assert.equal(messages?.at(1)?.id, 2);
});

test("rejects an invalid magic signature", () => {
  const decoder = new DTPDecoder();

  const frame = encode(createRequest(1, "PING"));
  frame.write("XXXX", 0, 4, "ascii");

  assert.throws(() => decoder.push(frame), /Invalid DTP magic/);
});

test("rejects payloads larger than the maximum size", () => {
  const decoder = new DTPDecoder();

  const header = Buffer.alloc(HEADER_SIZE);

  header.write("DTP1", 0, 4, "ascii");
  header.writeUInt32BE(2 * 1024 * 1024, 4);

  assert.throws(() => decoder.push(header), /maximum size/);
});

test("rejects invalid JSON payloads", () => {
  const decoder = new DTPDecoder();

  const frame = createRawFrame("{invalid json}");

  assert.throws(() => decoder.push(frame), /Invalid DTP JSON/);
});

test("rejects invalid message IDs", () => {
  const decoder = new DTPDecoder();

  const frame = createRawFrame(
    JSON.stringify({
      version: 1,
      id: 0,
      type: "REQUEST",
      command: "PING",
      payload: {},
    })
  );

  assert.throws(() => decoder.push(frame), /Invalid DTP message ID/);
});
