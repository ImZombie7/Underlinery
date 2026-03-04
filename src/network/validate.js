// ================================
// Message Validator (Transport Layer)
// ================================

const MAX_MESSAGE_SIZE = 1024;

const ALLOWED_TYPES = new Set([
  "PLACE_NUMBER",
  "CALL_NUMBER",
  "LOCK_GRID"
]);

export function validateMessage(raw) {
  // Size guard (anti-spam / anti-abuse)
  if (typeof raw !== "string" || raw.length > MAX_MESSAGE_SIZE) {
    return null;
  }

  let msg;

  try {
    msg = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!msg || typeof msg !== "object") return null;
  if (typeof msg.type !== "string") return null;
  if (!ALLOWED_TYPES.has(msg.type)) return null;

  // Payload must exist for all actions
  const { type, payload } = msg;

  if (!payload || typeof payload !== "object") return null;

  // Version is mandatory for ALL state mutations
  if (!Number.isInteger(payload.version)) return null;

  switch (type) {
    case "PLACE_NUMBER":
      if (
        !Number.isInteger(payload.r) ||
        !Number.isInteger(payload.c) ||
        !Number.isInteger(payload.number)
      ) {
        return null;
      }

      return {
        type,
        payload: {
          r: payload.r,
          c: payload.c,
          number: payload.number,
          version: payload.version
        }
      };

    case "CALL_NUMBER":
      if (!Number.isInteger(payload.number)) {
        return null;
      }

      return {
        type,
        payload: {
          number: payload.number,
          version: payload.version
        }
      };

    case "LOCK_GRID":
      return {
        type,
        payload: {
          version: payload.version
        }
      };

    default:
      return null;
  }
}