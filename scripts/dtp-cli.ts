import { createInterface } from "node:readline";
import { DTPClient, DTPError } from "../src";

type CLIOptions = {
  host: string;
  port: number;
  command: string[];
};

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 4040;

function printHelp(): void {
  console.log(`
    DTP CLI - Daniel Transfer Protocol

    Usage:
      npm run dtp
      npm run dtp -- [options] <command> [arguments]

    Connection options:
      --host <host>       Server hostname (default: ${DEFAULT_HOST})
      --port <port>       Server port (default: ${DEFAULT_PORT})
      --help              Show this help

    Commands:
      PING                    Check server connectivity
      ECHO <message>          Echo a message
      TIME                    Get server time
      SET <key> <value>       Store a value
      GET <key>               Retrieve a value
      HELP                    Show available commands
      EXIT, QUIT              Exit interactive mode

    Examples:
      npm run dtp
      npm run dtp -- PING
      npm run dtp -- ECHO "Hello DTP"
      npm run dtp -- SET username daniel
      npm run dtp -- GET username
      npm run dtp -- --host 127.0.0.1 --port 4040 PING
`);
}

function parseOptions(args: string[]): CLIOptions | null {
  const options: CLIOptions = {
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    command: [],
  };

  const remaining: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;

    if (arg === "--help" || arg === "-h") {
      printHelp();
      return null;
    }

    if (arg === "--host") {
      const host = args[++i];

      if (!host) {
        throw new Error("--host requires a value");
      }

      options.host = host;
      continue;
    }

    if (arg.startsWith("--host=")) {
      options.host = arg.slice("--host=".length);
      continue;
    }

    if (arg === "--port" || arg === "-p") {
      const port = Number(args[++i]);

      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("--port must be between 1 and 65535");
      }

      options.port = port;
      continue;
    }

    if (arg.startsWith("--port=")) {
      const port = Number(arg.slice("--port=".length));

      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("--port must be between 1 and 65535");
      }

      options.port = port;
      continue;
    }

    remaining.push(arg);
  }

  // Windows npm argument-forwarding fallback:
  // npm may forward the values without their option names.
  if (remaining.length === 2 && /^\d+$/.test(remaining[1]!)) {
    const port = Number(remaining[1]);

    if (port >= 1 && port <= 65535) {
      options.host = remaining[0]!;
      options.port = port;
      remaining.length = 0;
    }
  }

  options.command = remaining;

  return options;
}

// Split an interactive command while preserving quoted arguments.
function tokenize(input: string): string[] {
  const tokens = input.match(/"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|\S+/g) ?? [];

  return tokens.map((token) => {
    if (
      (token.startsWith('"') && token.endsWith('"')) ||
      (token.startsWith("'") && token.endsWith("'"))
    ) {
      return token.slice(1, -1).replace(/\\(["'\\])/g, "$1");
    }

    return token;
  });
}

function printResult(command: string, payload: Record<string, unknown>): void {
  switch (command) {
    case "PING":
    case "ECHO":
      console.log(payload.message ?? "");
      return;

    case "TIME":
      console.log(payload.time ?? "");
      return;

    case "SET":
      console.log("OK");
      return;

    case "GET": {
      const value = payload.value;

      if (value === null || value === undefined) {
        console.log("(nil)");
      } else if (typeof value === "string") {
        console.log(value);
      } else {
        console.log(JSON.stringify(value));
      }

      return;
    }

    default:
      console.log(JSON.stringify(payload, null, 2));
  }
}

async function executeCommand(
  client: DTPClient,
  input: string[]
): Promise<boolean> {
  if (input.length === 0) {
    return true;
  }

  const command = input?.at(0)?.toUpperCase();
  const args = input.slice(1);

  if (command === "HELP") {
    printHelp();
    return true;
  }

  if (command === "EXIT" || command === "QUIT") {
    return false;
  }

  try {
    let response;

    switch (command) {
      case "PING": {
        if (args.length !== 0) {
          throw new Error("Usage: PING");
        }

        response = await client.ping();
        break;
      }

      case "ECHO": {
        if (args.length === 0) {
          throw new Error("Usage: ECHO <message>");
        }

        response = await client.echo(args.join(" "));
        break;
      }

      case "TIME": {
        if (args.length !== 0) {
          throw new Error("Usage: TIME");
        }

        response = await client.time();
        break;
      }

      case "SET": {
        if (args.length < 2) {
          throw new Error("Usage: SET <key> <value>");
        }

        const [key, ...valueParts] = args;

        response = await client.set(key!, valueParts.join(" "));

        break;
      }

      case "GET": {
        if (args.length !== 1) {
          throw new Error("Usage: GET <key>");
        }

        response = await client.get(args.at(0)!);
        break;
      }

      default:
        throw new Error(
          `Unknown command: ${command}. Type HELP for available commands.`
        );
    }

    printResult(command, response.payload);
  } catch (error) {
    if (error instanceof DTPError) {
      console.error(`(error) ${error.code}: ${error.message}`);
    } else {
      console.error(
        `(error) ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return true;
}

async function runInteractive(client: DTPClient): Promise<void> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "dtp> ",
  });

  console.log("Connected to DTP server.");
  console.log("Type HELP for available commands.\n");

  rl.prompt();

  try {
    for await (const line of rl) {
      const tokens = tokenize(line);
      const shouldContinue = await executeCommand(client, tokens);

      if (!shouldContinue) {
        break;
      }

      rl.prompt();
    }
  } finally {
    rl.close();
  }
}

async function main(): Promise<void> {
  console.log("CLI ARGS:", process.argv.slice(2));

  const options = parseOptions(process.argv.slice(2));

  if (!options) {
    return;
  }

  const client = new DTPClient({
    host: options.host,
    port: options.port,
  });

  try {
    await client.connect();

    if (options.command.length > 0) {
      await executeCommand(client, options.command);
    } else {
      await runInteractive(client);
    }
  } catch (error) {
    console.error(
      `[DTP] ${error instanceof Error ? error.message : "Connection failed"}`
    );

    process.exitCode = 1;
  } finally {
    await client.disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
