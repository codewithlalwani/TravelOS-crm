import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { can, getPermissions } from "@/lib/auth/rbac";
import { getHotelSearchAdapter } from "@/lib/hotels";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  const perms = await getPermissions(session);
  if (!session || !can(perms, "hotels.create")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = new URL(request.url).searchParams;
  const query = (searchParams.get("q") || "").trim();
  const checkInDate = searchParams.get("checkInDate") || "";
  const checkOutDate = searchParams.get("checkOutDate") || "";
  const adults = Math.min(9, Math.max(1, Number(searchParams.get("adults")) || 1));
  const children = Math.min(8, Math.max(0, Number(searchParams.get("children")) || 0));

  const minPriceParam = Number(searchParams.get("minPrice"));
  const minPrice = Number.isFinite(minPriceParam) && minPriceParam > 0 ? minPriceParam : undefined;
  const maxPriceParam = Number(searchParams.get("maxPrice"));
  const maxPrice = Number.isFinite(maxPriceParam) && maxPriceParam > 0 ? maxPriceParam : undefined;
  const hotelClass = (searchParams.get("hotelClass") || "")
    .split(",")
    .map((v) => Number(v))
    .filter((v) => v >= 2 && v <= 5);
  const minRatingParam = Number(searchParams.get("minRating"));
  const minRating = [3.5, 4, 4.5].includes(minRatingParam) ? (minRatingParam as 3.5 | 4 | 4.5) : undefined;

  if (!query || !checkInDate || !checkOutDate) {
    return NextResponse.json({ error: "q, checkInDate and checkOutDate are required" }, { status: 400 });
  }

  try {
    const result = await getHotelSearchAdapter().searchHotels({
      query,
      checkInDate,
      checkOutDate,
      adults,
      children,
      currency: "USD",
      minPrice,
      maxPrice,
      hotelClass: hotelClass.length ? hotelClass : undefined,
      minRating,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Hotel search failed" },
      { status: 502 }
    );
  }
}
