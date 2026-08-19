export interface GeoPoint {
  latitude: number;
  longitude: number;
  country?: string | null;
  city?: string | null;
}

export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function isPrivateIp(ip: string | null): boolean {
  if (!ip) return true;
  const normalized = ip.replace(/^::ffff:/, "");
  return normalized === "::1" || normalized === "127.0.0.1" || normalized.startsWith("10.") ||
    normalized.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[01])\./.test(normalized);
}

export async function geolocateIp(ip: string | null): Promise<GeoPoint | null> {
  const token = process.env.IPINFO_TOKEN;
  if (!ip || isPrivateIp(ip)) return null;
  const url = token
    ? `https://api.ipinfo.io/lookup/${encodeURIComponent(ip)}?token=${encodeURIComponent(token)}`
    : `https://ipwho.is/${encodeURIComponent(ip)}`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(4000),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const data = await response.json() as {
    success?: boolean;
    latitude?: number;
    longitude?: number;
    loc?: string;
    country?: string;
    city?: string;
    country_name?: string;
  };
  if (data.success === false) return null;
  const [locLatitude, locLongitude] = (data.loc ?? "").split(",").map(Number);
  const latitude = typeof data.latitude === "number" ? data.latitude : locLatitude;
  const longitude = typeof data.longitude === "number" ? data.longitude : locLongitude;
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? { latitude, longitude, country: data.country_name ?? data.country ?? null, city: data.city ?? null }
    : null;
}
