import { NextResponse } from "next/server";
import path from "node:path";
import { readStoredFile } from "@/lib/storage/FileStorageAdapter";
import { getCurrentSession } from "@/lib/auth/session";
import { can, getPermissions } from "@/lib/auth/rbac";
import { getBookingType } from "@/services/bookingQueryService";

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { path: segments } = await context.params;
  const relativePath = segments.join("/");

  if (relativePath.includes("..")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const bookingId = Number(segments[0]);
  const bookingType = Number.isInteger(bookingId) ? await getBookingType(bookingId) : null;
  if (!bookingType) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const perms = await getPermissions(session);
  const viewPermission = bookingType === "hotel" ? "hotels.view" : "flights.view";
  if (!can(perms, viewPermission)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const buffer = await readStoredFile(relativePath);
    const ext = path.extname(relativePath).toLowerCase();
    const contentType =
      ext === ".pdf"
        ? "application/pdf"
        : ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
        ? "image/jpeg"
        : "application/octet-stream";
    return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": contentType } });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
