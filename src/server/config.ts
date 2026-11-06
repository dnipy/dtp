const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_PORT = 4040;

function getPort(): number {
  const value = process.env.DTP_PORT;

  if (!value) {
    return DEFAULT_PORT;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("DTP_PORT must be a valid port between 1 and 65535");
  }

  return port;
}

export const serverConfig = {
  host: process.env.DTP_HOST || DEFAULT_HOST,
  port: getPort(),
};
