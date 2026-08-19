import fs from "node:fs";
import path from "node:path";

type PayGlocalEnv = "uat" | "prod";

const BASE_URLS: Record<PayGlocalEnv, string> = {
  uat: "https://api.uat.payglocal.in",
  prod: "https://api.prod.payglocal.in",
};

export interface PayGlocalConfig {
  merchantId: string;
  /** Parent MID whose keys sign/encrypt every request (set only for a child-MID/partner setup). */
  parentMerchantId: string | null;
  publicKeyPem: string;
  publicKeyId: string;
  privateKeyPem: string;
  privateKeyId: string;
  baseUrl: string;
  callbackUrl: string;
}

function readKeyFile(envVar: string): string {
  const configuredPath = process.env[envVar];
  if (!configuredPath) {
    throw new Error(`${envVar} is not set — required for PAYGLOCAL_MODE=live`);
  }
  const resolved = path.isAbsolute(configuredPath) ? configuredPath : path.join(process.cwd(), configuredPath);
  return fs.readFileSync(resolved, "utf-8");
}

let cached: PayGlocalConfig | null = null;

/** Loads merchant credentials + PayGlocal keys lazily so mock mode never needs them present. */
export function getPayGlocalConfig(): PayGlocalConfig {
  if (cached) return cached;

  const merchantId = process.env.PG_MERCHANT_ID;
  const publicKeyId = process.env.PG_PUBLIC_KEY_KID;
  const privateKeyId = process.env.PG_PRIVATE_KEY_KID;
  if (!merchantId || !publicKeyId || !privateKeyId) {
    throw new Error(
      "PayGlocal live mode requires PG_MERCHANT_ID, PG_PUBLIC_KEY_KID and PG_PRIVATE_KEY_KID to be set"
    );
  }

  const env: PayGlocalEnv = process.env.PAYGLOCAL_ENV === "prod" ? "prod" : "uat";

  cached = {
    merchantId,
    parentMerchantId: process.env.PG_PARENT_MERCHANT_ID || null,
    publicKeyId,
    privateKeyId,
    publicKeyPem: readKeyFile("PG_PUBLIC_KEY_PATH"),
    privateKeyPem: readKeyFile("PG_PRIVATE_KEY_PATH"),
    baseUrl: process.env.PAYGLOCAL_BASE_URL || BASE_URLS[env],
    callbackUrl: `${process.env.APP_BASE_URL || "http://localhost:3000"}/api/payglocal/webhook`,
  };
  return cached;
}
