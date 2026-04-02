/**
 * src/lib/paynow.ts
 *
 * Thin typed wrapper around the `paynow` npm SDK.
 * The SDK ships no TypeScript definitions, so we declare what we need here.
 */

// ─── Manual type declarations for the paynow SDK ────────────────────────────

interface PaynowPayment {
  reference: string;
  authEmail: string;
  add(name: string, amount: number): void;
  total(): number;
  info(): string;
  items: { length(): number };
}

export interface PaynowInitResponse {
  success: boolean;
  error?: string;
  /**
   * Raw Paynow status string returned by pollTransaction().
   * For poll responses this is e.g. "paid", "pending", "cancelled".
   * For initiation responses this is "ok" or "error".
   */
  status?: string;
  /** Redirect the user here to complete payment on the Paynow site. */
  redirectUrl?: string;
  /** URL to poll for payment status. Store in the Payment record. */
  pollUrl?: string;
}

export interface PaynowStatusResponse {
  /** Raw Paynow status string: "Paid", "Awaiting Delivery", "Cancelled", etc. */
  status: string;
  reference: string;
  amount: string;
  paynowReference: string;
  pollUrl: string;
  error?: string;
}

interface PaynowSdk {
  resultUrl: string;
  returnUrl: string;
  createPayment(reference: string, authEmail: string): PaynowPayment;
  send(payment: PaynowPayment): Promise<PaynowInitResponse>;
  sendMobile(
    payment: PaynowPayment,
    phone: string,
    method: "ecocash" | "telecash" | "onemoney"
  ): Promise<PaynowInitResponse>;
  pollTransaction(url: string): Promise<PaynowInitResponse>;
  /** Parse a URL-encoded webhook body and verify the Paynow HMAC hash. */
  parseStatusUpdate(raw: string): PaynowStatusResponse;
  verifyHash(values: Record<string, string>): boolean;
}

// ─── Singleton ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Paynow } = require("paynow") as { Paynow: new (...a: unknown[]) => PaynowSdk };

const globalForPaynow = globalThis as unknown as { paynow: PaynowSdk };

function createPaynowClient(): PaynowSdk {
  const id = process.env.PAYNOW_INTEGRATION_ID;
  const key = process.env.PAYNOW_INTEGRATION_KEY;
  const resultUrl = process.env.PAYNOW_RESULT_URL || "http://localhost:3000/api/payments/webhook";
  const returnUrl = process.env.PAYNOW_RETURN_URL || "http://localhost:3000/payment/success";

  if (!id || !key) {
    throw new Error(
      "PAYNOW_INTEGRATION_ID and PAYNOW_INTEGRATION_KEY must be set in environment variables"
    );
  }

  return new Paynow(id, key, resultUrl, returnUrl);
}

export const paynow: PaynowSdk =
  globalForPaynow.paynow ?? createPaynowClient();

if (process.env.NODE_ENV !== "production") globalForPaynow.paynow = paynow;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Initiate a web (redirect) payment.
 * Returns `{ success, redirectUrl, pollUrl }`.
 */
export async function initiatePaynowPayment(opts: {
  reference: string;
  description: string;
  amount: number;
  returnUrl?: string;
}): Promise<PaynowInitResponse> {
  // authEmail must be the merchant's registered email (required in test mode)
  const authEmail = process.env.PAYNOW_MERCHANT_EMAIL ?? "";
  // Allow per-request return URL so user lands back on the correct page
  const prevReturnUrl = paynow.returnUrl;
  if (opts.returnUrl) paynow.returnUrl = opts.returnUrl;
  try {
    const payment = paynow.createPayment(opts.reference, authEmail);
    payment.add(opts.description, opts.amount);
    const response = await paynow.send(payment);
    return response;
  } finally {
    paynow.returnUrl = prevReturnUrl;
  }
}

/**
 * Initiate a mobile (EcoCash / Telecash) payment.
 * Returns `{ success, pollUrl }` — no redirect for mobile.
 */
export async function initiatePaynowMobile(opts: {
  reference: string;
  description: string;
  amount: number;
  phone: string;
  method: "ecocash" | "telecash" | "onemoney";
}): Promise<PaynowInitResponse> {
  // authEmail must be the merchant's registered email (required in test mode)
  const authEmail = process.env.PAYNOW_MERCHANT_EMAIL ?? "";
  const payment = paynow.createPayment(opts.reference, authEmail);
  payment.add(opts.description, opts.amount);
  const response = await paynow.sendMobile(payment, opts.phone, opts.method);
  return response;
}

/**
 * Parse and verify the URL-encoded webhook body Paynow posts to our result URL.
 * Throws if the HMAC hash does not match (tampered request).
 */
export function parsePaynowWebhook(rawBody: string): PaynowStatusResponse {
  return paynow.parseStatusUpdate(rawBody);
}

/**
 * Poll a payment's current status from the Paynow poll URL.
 */
export async function pollPaynowTransaction(
  pollUrl: string
): Promise<PaynowInitResponse> {
  return paynow.pollTransaction(pollUrl);
}

/** Returns true when a Paynow status string means money was received. */
export function isPaynowPaid(status: string): boolean {
  const s = status.toLowerCase();
  return s === "paid" || s === "awaiting delivery";
}
