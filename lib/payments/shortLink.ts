import { randomInt } from "node:crypto";
import { PaymentLink } from "../../models/PaymentLink";

const CODE_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomCode(length: number): string {
  let code = "";
  for (let i = 0; i < length; i++) code += CODE_CHARS[randomInt(CODE_CHARS.length)];
  return code;
}

/** 6 base-62 chars ~ 56 billion combinations; retries on the rare collision. */
export async function generateUniqueShortCode(length = 6): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomCode(length);
    const existing = await PaymentLink.findOne({ where: { shortCode: code } });
    if (!existing) return code;
  }
  return randomCode(10);
}

/** Public-facing short link that redirects to the real gateway URL — this is what we share with customers. */
export function buildShortPayUrl(shortCode: string): string {
  const base = process.env.APP_BASE_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/pay/${shortCode}`;
}
