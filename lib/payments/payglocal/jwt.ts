import crypto from "node:crypto";
import { CompactEncrypt, CompactSign, compactVerify, importPKCS8, importSPKI } from "jose";
import { getPayGlocalConfig } from "./config";

/**
 * JWE/JWS construction mirrors PayGlocal's official payglocal-js-client and payglocal-php-sdk
 * reference implementations byte-for-byte (header field names, algorithms, digest shape) —
 * these are undocumented on developer.payglocal.in itself, so deviating from the reference
 * SDKs' exact field names silently breaks signature verification on PayGlocal's side.
 *
 * The GET/status digest scheme (`buildGetRequestToken`) isn't covered by either reference SDK
 * at all (their `generateJWS` helper is documented as signing an already-encrypted JWE token,
 * not a bodyless GET) — its "digest the request path" behavior was reverse-engineered against
 * the UAT sandbox, not read from any spec.
 */
const JWE_ALGORITHM = "RSA-OAEP-256";
const JWE_ENCRYPTION_METHOD = "A128CBC-HS256";
const JWS_ALGORITHM = "RS256";
const DIGEST_ALGORITHM = "SHA-256";
const TOKEN_EXPIRY_MS = 300000;

function digestOf(payload: string): string {
  return crypto.createHash("sha256").update(payload).digest("base64");
}

async function signDigest(payload: string): Promise<string> {
  const { merchantId, parentMerchantId, privateKeyPem, privateKeyId } = getPayGlocalConfig();
  const key = await importPKCS8(privateKeyPem, JWS_ALGORITHM);

  const digestObject = {
    digest: digestOf(payload),
    digestAlgorithm: DIGEST_ALGORITHM,
    exp: TOKEN_EXPIRY_MS,
    iat: `${Date.now()}`,
  };

  const header = {
    alg: JWS_ALGORITHM,
    kid: privateKeyId,
    "x-gl-merchantId": merchantId,
    "issued-by": merchantId,
    "is-digested": "true",
    // PayGlocal's reference SDKs hardcode this "true" unconditionally — even the standalone,
    // non-encrypted GET/JWS-only path — so it isn't a real encrypted/not-encrypted flag despite
    // the name. Sending "false" here (as this code used to for GET requests) gets rejected by
    // PayGlocal as "invalid internal token".
    "x-gl-enc": "true",
    // Partner flow: the keys above belong to the parent MID, and this child MID transacts
    // under it — PayGlocal needs x-gl-kid-mid to know whose keys signed the request.
    ...(parentMerchantId ? { "x-gl-kid-mid": parentMerchantId } : {}),
  };

  return new CompactSign(new TextEncoder().encode(JSON.stringify(digestObject)))
    .setProtectedHeader(header)
    .sign(key);
}

/** Encrypts `payload` for PayGlocal (JWE) and signs the resulting token (JWS) — used for every POST body. */
export async function buildRequestTokens(
  payload: Record<string, unknown>
): Promise<{ body: string; jwsToken: string }> {
  const { merchantId, publicKeyPem, publicKeyId } = getPayGlocalConfig();
  const key = await importSPKI(publicKeyPem, JWE_ALGORITHM);

  const header = {
    "issued-by": merchantId,
    enc: JWE_ENCRYPTION_METHOD,
    exp: TOKEN_EXPIRY_MS,
    iat: `${Date.now()}`,
    alg: JWE_ALGORITHM,
    kid: publicKeyId,
  };

  const jweToken = await new CompactEncrypt(new TextEncoder().encode(JSON.stringify(payload)))
    .setProtectedHeader(header)
    .encrypt(key);

  const jwsToken = await signDigest(jweToken);
  return { body: jweToken, jwsToken };
}

/**
 * GET calls (status check) carry no body to encrypt — PayGlocal instead expects the digest to
 * cover the request path itself (confirmed against the UAT sandbox; signing an empty string gets
 * rejected as "invalid internal token").
 */
export async function buildGetRequestToken(path: string): Promise<string> {
  return signDigest(path);
}

/** Verifies + decodes the `x-gl-token` PayGlocal posts to merchantCallbackURL, using PayGlocal's public cert. */
export async function verifyCallbackToken(token: string): Promise<Record<string, unknown>> {
  const { publicKeyPem } = getPayGlocalConfig();
  const key = await importSPKI(publicKeyPem, JWS_ALGORITHM);
  const { payload } = await compactVerify(token, key);
  return JSON.parse(new TextDecoder().decode(payload));
}
