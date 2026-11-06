# DTP — Daniel Transfer Protocol

A custom application-layer protocol built on top of TCP using TypeScript and Node.js.

DTP is an educational networking project exploring how application-layer protocols work, how messages are framed over TCP streams, and how clients and servers communicate through a custom wire format.

It includes a TCP server, a reusable TypeScript client, a binary message encoder and decoder, request/response correlation, structured errors, and an interactive CLI.

> DTP is a learning and demonstration project, not a production-ready network protocol.

## Features

- Custom binary message framing over TCP
- JSON payloads encoded as UTF-8
- 8-byte protocol header
- TCP stream decoding and message reassembly
- Partial and multiple message handling
- Request/response correlation using message IDs
- Promise-based TypeScript client
- Multiple outstanding requests over one connection
- Request timeouts
- Structured protocol errors
- In-memory key-value storage
- Interactive command-line client
- One-shot CLI commands
- Configurable server host and port
- Docker support for running the server
- Unit and integration tests

## Architecture

```text
                 DTP Client
                     |
                 DTP Encoder
                     |
                TCP Connection
                     |
                 DTP Server
                     |
                 DTP Decoder
                     |
                Command Handler
                     |
               In-memory Store
```

DTP uses a binary header followed by a JSON payload.

Read the [Protocol Specification](docs/PROTOCOL.md) for the exact wire format.

Read [Architecture](docs/ARCHITECTURE.md) for the internal implementation and data flow.

## Requirements

- Node.js 20+
- npm

For Docker usage:

- Docker

## Installation

Clone the repository:

```bash
git clone <YOUR_REPOSITORY_URL>
cd dtp
npm install
```

## Running the Server

Start the DTP TCP server:

```bash
npm run server
```

Default server address:

```text
0.0.0.0:4040
```

The server accepts TCP connections and processes DTP requests.

### Server Configuration

The server supports environment-based configuration:

| Variable   | Description               | Default   |
| ---------- | ------------------------- | --------- |
| `DTP_HOST` | Host interface to bind to | `0.0.0.0` |
| `DTP_PORT` | TCP listening port        | `4040`    |

For example, on PowerShell:

```powershell
$env:DTP_PORT=5050
npm run server
```

Or on Linux/macOS:

```bash
DTP_PORT=5050 npm run server
```

## Running with Docker

Docker provides a simple way to preview and run the DTP server without manually starting the Node.js application.

Build the image:

```bash
docker build -t dtp-server .
```

Run the container:

```bash
docker run --rm \
  --name dtp-server \
  -p 4040:4040 \
  dtp-server
```

The server will be accessible from your host machine at:

```text
127.0.0.1:4040
```

### Custom Port

You can configure the server port through environment variables:

```bash
docker run --rm \
  --name dtp-server \
  -p 5050:5050 \
  -e DTP_PORT=5050 \
  dtp-server
```

The server will now listen on port `5050`.

### Connecting with the CLI

Docker only runs the server. The DTP CLI runs independently on your host machine.

In another terminal:

```bash
npm run dtp -- --host 127.0.0.1 --port 5050
```

You can now interact with the Dockerized server using the normal DTP commands.

## Using the DTP CLI

DTP includes an interactive CLI inspired by tools such as `redis-cli` and `psql`.

Start the interactive shell:

```bash
npm run dtp
```

You should see:

```text
Connected to DTP server.
Type HELP for available commands.
dtp>
```

### Available commands

| Command             | Description               |
| ------------------- | ------------------------- |
| `PING`              | Check server connectivity |
| `ECHO <message>`    | Echo a message            |
| `TIME`              | Get server time           |
| `SET <key> <value>` | Store a value             |
| `GET <key>`         | Retrieve a value          |
| `HELP`              | Show help                 |
| `EXIT` / `QUIT`     | Close the CLI             |

Example interactive session:

```text
dtp> PING
PONG

dtp> ECHO Hello from DTP
Hello from DTP

dtp> SET username daniel
OK

dtp> GET username
daniel

dtp> GET unknown-key
(nil)

dtp> TIME
2026-11-06T13:33:09.771Z

dtp> EXIT
```

### One-shot commands

You can also execute a command without entering interactive mode:

```bash
npm run dtp -- PING
npm run dtp -- ECHO "Hello from DTP"
npm run dtp -- SET username daniel
npm run dtp -- GET username
npm run dtp -- TIME
```

The CLI connects, executes the command, prints the result, and disconnects.

### Connection options

The CLI uses `127.0.0.1:4040` by default.

You can override the connection:

```bash
npm run dtp -- --host 127.0.0.1 --port 4040 PING
```

Or start an interactive session against another server:

```bash
npm run dtp -- --host 192.168.1.10 --port 4040
```

Show CLI help:

```bash
npm run dtp -- --help
```

## Using the TypeScript Client

DTP also exposes a reusable client API through `src/index.ts`.

```typescript
import { DTPClient, DTPError } from "./src";

const client = new DTPClient({
  host: "127.0.0.1",
  port: 4040,
});

async function main() {
  try {
    await client.connect();

    const pong = await client.ping();
    console.log(pong);

    await client.set("username", "daniel");

    const user = await client.get("username");
    console.log(user);

    const [time, echo] = await Promise.all([
      client.time(),
      client.echo("Hello from DTP"),
    ]);

    console.log(time);
    console.log(echo);
  } catch (error) {
    if (error instanceof DTPError) {
      console.error(error.code, error.message);
    } else {
      console.error(error);
    }
  } finally {
    await client.disconnect();
  }
}

main();
```

## Error Handling

DTP uses structured error responses.

The client converts remote error responses into `DTPError` exceptions.

```typescript
try {
  await client.request("UNKNOWN_COMMAND");
} catch (error) {
  if (error instanceof DTPError) {
    console.error(error.code);
    console.error(error.message);
    console.error(error.requestId);
  }
}
```

## Testing

DTP uses Node.js's built-in test runner.

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Check TypeScript types:

```bash
npm run typecheck
```

Build the project:

```bash
npm run build
```

Tests cover:

- Binary message encoding
- UTF-8 payload length
- Maximum payload size
- TCP stream fragmentation
- Multiple frames in one chunk
- Invalid frames and JSON
- Command handling
- Client/server communication
- Concurrent requests
- Remote error handling

## Project Structure

```text
dtp/
├── src/
│   ├── protocol/
│   │   ├── constants.ts
│   │   ├── types.ts
│   │   ├── encoder.ts
│   │   └── decoder.ts
│   ├── server/
│   │   ├── config.ts
│   │   ├── handler.ts
│   │   └── server.ts
│   ├── client/
│   │   ├── client.ts
│   │   └── errors.ts
│   │   └── types.ts
│   └── index.ts
├── scripts/
│   └── dtp-cli.ts
├── tests/
│   ├── protocol/
│   ├── server/
│   └── client/
├── docs/
│   ├── PROTOCOL.md
│   └── ARCHITECTURE.md
├── Dockerfile
├── .dockerignore
├── README.md
├── package.json
├── package-lock.json
├── tsconfig.json
└── tsconfig.build.json
```

## Documentation

- [Protocol Specification](docs/PROTOCOL.md) — wire format, framing, message types, commands, and errors.
- [Architecture](docs/ARCHITECTURE.md) — internal design, client/server flow, decoder, and request correlation.

## Current Limitations

DTP is intentionally small and educational.

Current limitations include:

- No authentication or authorization
- No TLS encryption
- No persistent storage
- No protocol negotiation
- No production-grade connection management
- No advanced backpressure handling
- No connection-level buffer limits or idle timeouts
- Synchronous command processing
- Limited command set

Do not expose the current implementation directly to untrusted networks.

## Possible Future Improvements

- Authentication and authorization
- TLS support
- Connection lifecycle improvements
- Backpressure handling
- Stronger protocol validation
- Asynchronous command processing
- Protocol version negotiation
- Additional commands and data types

## Project Goals

The goal of DTP is to understand the engineering behind application-layer protocols rather than simply using existing protocols and libraries.

It explores TCP communication, binary framing, serialization, stream parsing, request correlation, and client-server architecture.

## License

MIT
