import { createHmac } from "crypto";

/**
 * Signs a serialised payload string with HMAC-SHA256 using the shared secret.
 *
 * @param {string} rawBody   - The exact JSON string that will be sent as the
 *                             request body (produced by JSON.stringify(payload)).
 * @param {string} secret    - The merchant's shared webhook secret.
 * @returns {string}           Hex-encoded HMAC-SHA256 digest.
 */
export function signPayload(rawBody, secret) {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

/**
 * Sends a signed webhook POST request to `url`.
 *
 * When WEBHOOK_SECRET is set (or a per-call `secret` is provided) the
 * serialised body is signed and the signature is attached as:
 *
 *   Stellar-Signature: sha256=<hex-digest>
 *
 * Merchants verify authenticity by computing the same HMAC over the raw
 * request body and comparing it to this header value.
 *
 * @param {string} url        - Merchant webhook endpoint.
 * @param {object} payload    - Data to send (will be JSON-serialised).
 * @param {string} [secret]   - Overrides the WEBHOOK_SECRET env var when
 *                              supplied (useful for per-merchant secrets).
 * @returns {Promise<{ok:boolean, skipped?:boolean, status?:number, body?:string, error?:string, signed?:boolean}>}
 */
export async function sendWebhook(url, payload, secret) {
  if (!url) return { ok: false, skipped: true };

  const signingSecret = secret || process.env.WEBHOOK_SECRET || "";
  const rawBody = JSON.stringify(payload);

  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "stellar-payment-api/0.1"
  };

  if (signingSecret) {
    const signature = signPayload(rawBody, signingSecret);
    headers["Stellar-Signature"] = `sha256=${signature}`;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: rawBody
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return { ok: false, status: response.status, body: text, signed: !!signingSecret };
    }

    return { ok: true, status: response.status, signed: !!signingSecret };
  } catch (err) {
    return { ok: false, error: err.message, signed: !!signingSecret };
  }
}
