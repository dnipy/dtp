import test from "node:test";
import assert from "node:assert/strict";
import { handleCommand } from "../../src/server/handler";
import type { DTPRequest } from "../../src/protocol/types";

function createRequest(
  command: string,
  payload: Record<string, unknown> = {},
  id = 1
): DTPRequest {
  return {
    version: 1,
    id,
    type: "REQUEST",
    command,
    payload,
  };
}

test("PING returns PONG", () => {
  const response = handleCommand(createRequest("PING"));

  assert.equal(response.status, "OK");
  assert.deepEqual(response.payload, {
    message: "PONG",
  });
});

test("ECHO returns the provided message", () => {
  const response = handleCommand(
    createRequest("ECHO", {
      message: "Hello DTP",
    })
  );

  assert.equal(response.status, "OK");
  assert.deepEqual(response.payload, {
    message: "Hello DTP",
  });
});

test("SET stores a value and GET retrieves it", () => {
  const key = `test-user-${Date.now()}`;

  const setResponse = handleCommand(
    createRequest("SET", {
      key,
      value: "daniel",
    })
  );

  assert.equal(setResponse.status, "OK");

  const getResponse = handleCommand(
    createRequest("GET", {
      key,
    })
  );

  assert.equal(getResponse.status, "OK");
  assert.deepEqual(getResponse.payload, {
    value: "daniel",
  });
});

test("GET returns null for a missing key", () => {
  const response = handleCommand(
    createRequest("GET", {
      key: `missing-${Date.now()}`,
    })
  );

  assert.equal(response.status, "OK");
  assert.deepEqual(response.payload, {
    value: null,
  });
});

test("returns an error for unknown commands", () => {
  const response = handleCommand(createRequest("DELETE_ALL"));

  assert.equal(response.status, "ERROR");
  assert.equal(response.payload.code, "UNKNOWN_COMMAND");
});

test("returns an error when SET receives an invalid key", () => {
  const response = handleCommand(
    createRequest("SET", {
      key: "",
      value: "test",
    })
  );

  assert.equal(response.status, "ERROR");
  assert.equal(response.payload.code, "COMMAND_ERROR");
});
