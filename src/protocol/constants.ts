export const DTP_MAGIC = "DTP1";

export const DTP_VERSION = 1;

// Magic (4 bytes) + Payload Length (4 bytes)
export const HEADER_SIZE = 8;

// Maximum payload size: 1 MB
export const MAX_PAYLOAD_SIZE = 1024 * 1024;
