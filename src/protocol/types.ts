export type DTPRequest = {
  version: 1;
  id: number;
  type: "REQUEST";
  command: string;
  payload: Record<string, unknown>;
};

export type DTPResponse = {
  version: 1;
  id: number;
  type: "RESPONSE";
  status: "OK" | "ERROR";
  payload: Record<string, unknown>;
};

export type DTPMessage = DTPRequest | DTPResponse;

export function createResponse(
  id: number,
  status: "OK" | "ERROR",
  payload: Record<string, unknown>
): DTPResponse {
  return {
    version: 1,
    id,
    type: "RESPONSE",
    status,
    payload,
  };
}
