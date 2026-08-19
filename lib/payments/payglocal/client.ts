import { getPayGlocalConfig } from "./config";
import { buildGetRequestToken, buildRequestTokens } from "./jwt";

/** Generic envelope every PayGlocal endpoint responds with (see PayGlocal API quick reference). */
export interface PayGlocalResponse<TData = Record<string, unknown>> {
  gid: string;
  status: string;
  message: string;
  timestamp: string;
  reasonCode?: string;
  data?: TData;
  errors?: unknown;
}

async function postSigned<TData>(path: string, payload: Record<string, unknown>): Promise<PayGlocalResponse<TData>> {
  const { baseUrl, merchantId, parentMerchantId } = getPayGlocalConfig();
  const { body, jwsToken } = await buildRequestTokens(payload);

  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "x-gl-token-external": jwsToken,
      "Content-Type": "text/plain",
      // Only needed for a child MID transacting under a parent's keys.
      ...(parentMerchantId && parentMerchantId !== merchantId ? { "x-gl-kid-mid": parentMerchantId } : {}),
    },
    body,
  });

  const json = (await res.json()) as PayGlocalResponse<TData>;
  if (!res.ok) {
    throw new Error(
      `PayGlocal ${path} failed (${res.status}): ${json?.message || res.statusText}${json?.errors ? ` — ${JSON.stringify(json.errors)}` : ""}`
    );
  }
  return json;
}

async function getSigned<TData>(path: string): Promise<PayGlocalResponse<TData>> {
  const { baseUrl, merchantId, parentMerchantId } = getPayGlocalConfig();
  const jwsToken = await buildGetRequestToken(path);

  const res = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers: {
      "x-gl-token-external": jwsToken,
      accept: "application/json",
      ...(parentMerchantId && parentMerchantId !== merchantId ? { "x-gl-kid-mid": parentMerchantId } : {}),
    },
  });

  const json = (await res.json()) as PayGlocalResponse<TData>;
  if (!res.ok) {
    throw new Error(
      `PayGlocal ${path} failed (${res.status}): ${json?.message || res.statusText}${json?.errors ? ` — ${JSON.stringify(json.errors)}` : ""}`
    );
  }
  return json;
}

export interface InitiatePayCollectParams {
  merchantTxnId: string;
  merchantUniqueId: string;
  totalAmount: string;
  txnCurrency: string;
  billingData?: Record<string, unknown>;
  shippingData?: Record<string, unknown>;
  riskData?: Record<string, unknown>;
  standingInstruction?: Record<string, unknown>;
}

export interface InitiatePayCollectData {
  redirectUrl: string;
  statusUrl: string;
}

/** POST /gl/v1/payments/initiate/paycollect — hosted-page checkout; `data.redirectUrl` is the SDK link to open. */
export function initiatePayCollect(params: InitiatePayCollectParams) {
  const { callbackUrl } = getPayGlocalConfig();
  return postSigned<InitiatePayCollectData>("/gl/v1/payments/initiate/paycollect", {
    merchantTxnId: params.merchantTxnId,
    merchantUniqueId: params.merchantUniqueId,
    paymentData: {
      totalAmount: params.totalAmount,
      txnCurrency: params.txnCurrency,
      ...(params.billingData ? { billingData: params.billingData } : {}),
      ...(params.shippingData ? { shippingData: params.shippingData } : {}),
    },
    ...(params.riskData ? { riskData: params.riskData } : {}),
    ...(params.standingInstruction ? { standingInstruction: params.standingInstruction } : {}),
    merchantCallbackURL: callbackUrl,
  });
}

export interface PaymentStatusData {
  siStatus?: string;
  detailedMessage?: string;
  transactionCreationTime?: string;
  Amount?: string;
  Currency?: string;
  merchantTxnId?: string;
  status?: string;
  maskedMandateId?: string;
  siId?: string;
}

/** GET /gl/v1/payments/{id}/status — `id` is either the `gid` or `merchantUniqueId`. */
export function getPaymentStatus(id: string) {
  return getSigned<PaymentStatusData>(`/gl/v1/payments/${encodeURIComponent(id)}/status`);
}

export interface RefundParams {
  merchantTxnId: string;
  merchantUniqueId: string;
  refundType: "P" | "F";
  /** Required only for a partial refund. */
  totalAmount?: string;
}

export interface RefundData {
  Amount?: string;
  Currency?: string;
  merchantTxnId?: string;
}

/** POST /gl/v1/payments/{gid}/refund */
export function refundPayment(gid: string, params: RefundParams) {
  return postSigned<RefundData>(`/gl/v1/payments/${encodeURIComponent(gid)}/refund`, {
    merchantTxnId: params.merchantTxnId,
    merchantUniqueId: params.merchantUniqueId,
    refundType: params.refundType,
    ...(params.totalAmount ? { paymentData: { totalAmount: params.totalAmount } } : {}),
  });
}

export interface AuthorizeParams {
  totalAmount: string;
  txnCurrency: string;
  cardData: Record<string, unknown>;
  authenticationData?: Record<string, unknown>;
  billingData?: Record<string, unknown>;
}

/**
 * POST /gl/v1/payments/auth — direct card authorization (PayDirect flow). Requires the merchant's
 * application to collect raw card data, which puts it in PCI-DSS scope; this CRM only builds the
 * PayCollect (hosted-page) flow today, so this is exposed for future direct-card work, not wired in.
 */
export function authorizePayment(params: AuthorizeParams) {
  return postSigned("/gl/v1/payments/auth", {
    paymentData: {
      totalAmount: params.totalAmount,
      txnCurrency: params.txnCurrency,
      cardData: params.cardData,
      ...(params.authenticationData ? { authenticationData: params.authenticationData } : {}),
      ...(params.billingData ? { billingData: params.billingData } : {}),
    },
  });
}

export interface CaptureParams {
  merchantTxnId: string;
  captureType: "P" | "F";
  /** Required only for a partial capture. */
  totalAmount?: string;
}

/** POST /gl/v1/payments/{gid}/capture — captures a prior authorization (see `authorizePayment`). */
export function capturePayment(gid: string, params: CaptureParams) {
  return postSigned(`/gl/v1/payments/${encodeURIComponent(gid)}/capture`, {
    merchantTxnId: params.merchantTxnId,
    ...(params.totalAmount ? { paymentData: { totalAmount: params.totalAmount } } : {}),
    captureType: params.captureType,
  });
}
