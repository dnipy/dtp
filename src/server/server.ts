import net from "node:net";
import { DTPDecoder } from "../protocol/decoder";
import { encode } from "../protocol/encoder";
import type { DTPRequest } from "../protocol/types";
import { handleCommand } from "./handler";
import { serverConfig } from "./config";

const HOST = "127.0.0.1";
const PORT = 4040;

const server = net.createServer((socket) => {
  console.log(
    `[DTP] Client connected: ${socket.remoteAddress}:${socket.remotePort}`
  );

  // Every connection gets its own decoder.
  const decoder = new DTPDecoder();

  socket.on("data", (chunk) => {
    try {
      // Decode incoming TCP bytes.
      const messages = decoder.push(chunk);

      for (const message of messages) {
        // Only requests are valid client messages.
        if (message.type !== "REQUEST") {
          throw new Error("Expected a REQUEST message");
        }

        const request = message as DTPRequest;

        console.log(`[DTP] Received command: ${request.command}`);

        // Execute the requested command.
        const response = handleCommand(request);

        // Encode the response.
        const frame = encode(response);

        // Send response over TCP.
        socket.write(frame);
      }
    } catch (error) {
      console.error("[DTP] Protocol error:", error);

      // Malformed protocol data closes this connection.
      socket.destroy();
    }
  });

  socket.on("end", () => {
    console.log("[DTP] Client ended connection");
  });

  socket.on("error", (error) => {
    console.error("[DTP] Socket error:", error.message);
  });

  socket.on("close", () => {
    console.log("[DTP] Client disconnected");
  });
});

server.listen(serverConfig.port, serverConfig.host, () => {
  console.log(
    `[DTP] Server listening on ${serverConfig.host}:${serverConfig.port}`
  );
});
