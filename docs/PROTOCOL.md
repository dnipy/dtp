# DTP Protocol Specification

**Protocol:** Daniel Transfer Protocol  
**Identifier:** DTP  
**Version:** 1  
**Transport:** TCP  
**Default Port:** 4040  
**Payload Format:** JSON encoded as UTF-8

This document specifies the DTP v1 wire format, framing rules, message structures, supported commands, and error responses.

- [Project Overview](../README.md)
- [Architecture](ARCHITECTURE.md)

---

## 1. Overview

DTP is a custom application-layer protocol designed to communicate over TCP.

Each message consists of a fixed-size binary header followed by a JSON payload.

The binary header provides protocol identification and message framing. JSON provides a structured representation of requests and responses.

A DTP message consists of:

1. A 4-byte magic signature.
2. A 4-byte payload length.
3. A variable-length JSON payload.

## 2. Transport

DTP uses TCP as its transport protocol.

TCP provides reliable, ordered byte delivery over a connection. It does not preserve application-level message boundaries.

DTP therefore implements its own framing mechanism.

Default connection:

| Property  | Value       |
| --------- | ----------- |
| Host      | `127.0.0.1` |
| Port      | `4040`      |
| Transport | TCP         |

Port 4040 is the default used by this project. It is not an officially assigned DTP port.

## 3. Message Framing

Every DTP message uses this binary structure:

```text
+---------------------------+
| Magic Signature           | 4 bytes
+---------------------------+
| Payload Length            | 4 bytes
+---------------------------+
| JSON Payload              | N bytes
+---------------------------+
```

### 3.1 Magic Signature

The first four bytes contain the ASCII string:

```text
DTP1
```

This identifies the DTP v1 framing format.

### 3.2 Payload Length

The next four bytes represent the payload length.

Properties:

- Unsigned 32-bit integer.
- Big-endian byte order.
- Represents the payload length in bytes.
- Excludes the 8-byte header.

The maximum payload size is:

```text
1,048,576 bytes (1 MiB)
```

### 3.3 JSON Payload

The payload is a UTF-8 encoded JSON object.

The payload length must represent the actual UTF-8 byte count, not the number of characters.

### 3.4 Header Size

The header is always 8 bytes.

## 4. Common Message Fields

Every DTP message contains these common fields:

| Field     | Type   | Description                     |
| --------- | ------ | ------------------------------- |
| `version` | number | Protocol version                |
| `id`      | number | Request/response correlation ID |
| `type`    | string | Message type                    |
| `payload` | object | Command-specific data           |

The current implementation accepts positive safe integer message IDs.

A response must use the same ID as its corresponding request.

## 5. Request Messages

A request has the following structure:

```json
{
  "version": 1,
  "id": 1,
  "type": "REQUEST",
  "command": "PING",
  "payload": {}
}
```

| Field     | Type   | Description           |
| --------- | ------ | --------------------- |
| `version` | number | Must be `1`           |
| `id`      | number | Positive safe integer |
| `type`    | string | Must be `REQUEST`     |
| `command` | string | Command name          |
| `payload` | object | Command arguments     |

Command names are case-insensitive in the current server implementation.

## 6. Response Messages

A successful response:

```json
{
  "version": 1,
  "id": 1,
  "type": "RESPONSE",
  "status": "OK",
  "payload": {
    "message": "PONG"
  }
}
```

An error response:

```json
{
  "version": 1,
  "id": 2,
  "type": "RESPONSE",
  "status": "ERROR",
  "payload": {
    "code": "UNKNOWN_COMMAND",
    "message": "Unknown command: DELETE_ALL"
  }
}
```

| Field     | Type   | Description             |
| --------- | ------ | ----------------------- |
| `version` | number | Protocol version        |
| `id`      | number | Matching request ID     |
| `type`    | string | Must be `RESPONSE`      |
| `status`  | string | `OK` or `ERROR`         |
| `payload` | object | Result or error details |

## 7. Supported Commands

### PING

Checks whether the server is responding.

Request payload:

```json
{}
```

Successful response payload:

```json
{
  "message": "PONG"
}
```

### ECHO

Returns the supplied message.

Request payload:

```json
{
  "message": "Hello DTP"
}
```

Successful response payload:

```json
{
  "message": "Hello DTP"
}
```

### TIME

Returns the server's current time as an ISO 8601 string.

Successful response payload:

```json
{
  "time": "2026-11-06T13:33:09.771Z"
}
```

### SET

Stores a key-value pair in the server's in-memory store.

Request payload:

```json
{
  "key": "username",
  "value": "daniel"
}
```

Successful response payload:

```json
{
  "message": "Value stored"
}
```

The current implementation accepts any JavaScript value as `value` that can be serialized into JSON.

### GET

Retrieves a value by key.

Request payload:

```json
{
  "key": "username"
}
```

Successful response payload:

```json
{
  "value": "daniel"
}
```

A missing key returns:

```json
{
  "value": null
}
```

## 8. Error Handling

DTP distinguishes between successful and unsuccessful command responses using the `status` field.

Current command error codes:

| Code              | Description                          |
| ----------------- | ------------------------------------ |
| `UNKNOWN_COMMAND` | The requested command does not exist |
| `COMMAND_ERROR`   | The command failed during execution  |

An error response includes a machine-readable code and a human-readable message.

The TypeScript client converts remote error responses into `DTPError` exceptions.

Framing and decoding errors are connection-level protocol failures, not command error responses.

## 9. TCP Stream Handling

DTP operates over a TCP byte stream.

A receiver must not assume that one TCP data event contains exactly one complete DTP message.

### Partial message

```text
TCP chunk 1:
[Header][Partial payload]

TCP chunk 2:
[Remaining payload]
```

The decoder must retain incomplete bytes until the complete frame arrives.

### Multiple messages

```text
TCP chunk:
[Message 1][Message 2][Message 3]
```

The decoder must extract every complete frame.

### Mixed messages

```text
TCP chunk 1:
[Message 1][Partial Message 2]

TCP chunk 2:
[Remaining Message 2][Message 3]
```

The decoder must emit complete messages and retain the incomplete remainder.

## 10. Request/Response Correlation

DTP supports multiple outstanding requests over a single TCP connection.

Each request has an ID. Its response must carry the same ID.

The client tracks pending requests and uses response IDs to resolve or reject the correct Promise.

```text
Client                         Server

REQUEST ID 1  ---------------->
REQUEST ID 2  ---------------->
REQUEST ID 3  ---------------->

              <---------------- RESPONSE ID 1
              <---------------- RESPONSE ID 2
              <---------------- RESPONSE ID 3
```

The protocol uses IDs for correlation rather than requiring the client to associate responses only by arrival order.

The current server processes commands synchronously. Out-of-order response delivery is not currently demonstrated by this implementation.

## 11. Protocol Limits

| Property         | Value                      |
| ---------------- | -------------------------- |
| Protocol version | 1                          |
| Magic signature  | `DTP1`                     |
| Header size      | 8 bytes                    |
| Payload encoding | UTF-8                      |
| Payload format   | JSON                       |
| Maximum payload  | 1 MiB                      |
| Payload length   | Unsigned 32-bit big-endian |
| Transport        | TCP                        |

## 12. Versioning

DTP v1 requires the JSON `version` field to equal `1`.

The `DTP1` magic signature identifies the framing format.

Incompatible future changes should use a new protocol version and be documented separately.

## 13. Security Considerations

DTP v1 is an educational protocol.

It does not provide:

- Authentication
- Authorization
- Encryption
- TLS support
- Application-level integrity protection

It should only be used in trusted development environments.

Do not expose the current implementation directly to untrusted networks.

---

## Related Documentation

- [README](../README.md)
- [Architecture](ARCHITECTURE.md)
