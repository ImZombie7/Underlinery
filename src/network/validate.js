export function validateMessage(raw) {
  if (raw.length > 1024) return null;

  let msg;
  try {
    msg = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!msg || typeof msg !== "object") return null;
  if (typeof msg.type !== "string") return null;

  const { type, payload } = msg;

  if (type === "PLACE_NUMBER") {
    if (!payload ||
        !Number.isInteger(payload.r) ||
        !Number.isInteger(payload.c) ||
        !Number.isInteger(payload.number))
      return null;
  }

  if (type === "CALL_NUMBER") {
    if (!payload || !Number.isInteger(payload.number))
      return null;
  }

  if (type === "LOCK_GRID") {
    return { type };
  }

  return msg;
}