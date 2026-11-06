export { DTPClient } from "./client/client";
export { DTPError } from "./client/errors";

export { encode } from "./protocol/encoder";
export { DTPDecoder } from "./protocol/decoder";

export {
  DTP_MAGIC,
  DTP_VERSION,
  HEADER_SIZE,
  MAX_PAYLOAD_SIZE,
} from "./protocol/constants";

export { createResponse } from "./protocol/types";

export type { DTPMessage, DTPRequest, DTPResponse } from "./protocol/types";
