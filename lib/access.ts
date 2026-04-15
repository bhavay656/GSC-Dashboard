const COOKIE_NAME = "dashboard_access";

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export async function createAccessProof(password: string, secret: string) {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`${password}:${secret}`)
  );

  return toHex(buffer);
}

export function getAccessCookieName() {
  return COOKIE_NAME;
}
