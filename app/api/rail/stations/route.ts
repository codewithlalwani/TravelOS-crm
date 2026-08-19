import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { can, getPermissions } from "@/lib/auth/rbac";
import { VIA_RAIL_STATIONS } from "@/lib/rail/viaRailStations";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  const permissions = await getPermissions(session);
  if (!session || !can(permissions, "flights.create")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = (new URL(request.url).searchParams.get("q") || "").trim().toLocaleLowerCase();
  if (query.length < 2) return NextResponse.json({ suggestions: [] });

  const suggestions = VIA_RAIL_STATIONS.filter((station) =>
    station.name.toLocaleLowerCase().includes(query) || station.code.toLocaleLowerCase().includes(query)
  )
    .sort((a, b) => {
      const aExact = a.code.toLocaleLowerCase() === query || a.name.toLocaleLowerCase() === query;
      const bExact = b.code.toLocaleLowerCase() === query || b.name.toLocaleLowerCase() === query;
      return Number(bExact) - Number(aExact) || a.name.localeCompare(b.name);
    })
    .slice(0, 20);

  return NextResponse.json({ suggestions });
}
