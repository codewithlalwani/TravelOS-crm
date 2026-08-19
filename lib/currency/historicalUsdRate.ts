interface FrankfurterRateResponse {
  rate?: number;
}

const rateCache = new Map<string, Promise<number | null>>();

/** Returns the reference rate from one unit of `currency` to USD for a calendar date. */
export function getHistoricalUsdRate(currency: string, date: string): Promise<number | null> {
  const normalizedCurrency = currency.toUpperCase();
  if (normalizedCurrency === "USD") return Promise.resolve(1);

  const key = `${date}:${normalizedCurrency}`;
  const cached = rateCache.get(key);
  if (cached) return cached;

  const request = fetch(
    `https://api.frankfurter.dev/v2/rate/${encodeURIComponent(normalizedCurrency)}/USD?date=${encodeURIComponent(date)}`,
    { cache: "force-cache", signal: AbortSignal.timeout(8_000) },
  )
    .then(async (response) => {
      if (!response.ok) return null;
      const data = await response.json() as FrankfurterRateResponse;
      return typeof data.rate === "number" && Number.isFinite(data.rate) ? data.rate : null;
    })
    .catch(() => null);

  rateCache.set(key, request);
  return request;
}
