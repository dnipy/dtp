import test from "node:test";
import assert from "node:assert/strict";
import net from "node:net";

import type { AddressInfo } from "node:net";

import { DTPClient } from "../../src/client/client";
import { DTPError } from "../../src/client/errors";

import { DTPDecoder } from "../../src/protocol/decoder";
import { encode } from "../../src/protocol/encoder";

import { handleCommand } from "../../src/server/handler";

test("client communicates with a DTP server", async () => {
  const server = net.createServer((socket) => {
    const decoder = new DTPDecoder();

    socket.on("data", (chunk) => {
      const messages = decoder.push(chunk);

      for (const message of messages) {
        if (message.type !== "REQUEST") {
          continue;
        }

        const response = handleCommand(message);

        socket.write(encode(response));
      }
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);

    server.listen(0, "127.0.0.1", () => {
      resolve();
    });
  });

  const address = server.address() as AddressInfo;

  const client = new DTPClient({
    host: "127.0.0.1",
    port: address.port,
  });

  try {
    await client.connect();

    // Test a normal request.
    const pong = await client.ping();

    assert.equal(pong.status, "OK");
    assert.deepEqual(pong.payload, {
      message: "PONG",
    });

    // Test concurrent requests.
    const [ping, time, echo] = await Promise.all([
      client.ping(),
      client.time(),
      client.echo("Concurrent test"),
    ]);

    assert.equal(ping.status, "OK");
    assert.equal(time.status, "OK");
    assert.equal(echo.status, "OK");

    assert.deepEqual(echo.payload, {
      message: "Concurrent test",
    });

    // Test remote error handling.
    await assert.rejects(
      client.request("UNKNOWN_COMMAND"),
      (error: unknown) => {
        return error instanceof DTPError && error.code === "UNKNOWN_COMMAND";
      }
    );
  } finally {
    await client.disconnect();

    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
});
